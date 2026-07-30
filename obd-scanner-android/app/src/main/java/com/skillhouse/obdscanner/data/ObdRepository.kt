package com.skillhouse.obdscanner.data

import com.skillhouse.obdscanner.protocol.Dtc
import com.skillhouse.obdscanner.protocol.DtcDecoder
import com.skillhouse.obdscanner.protocol.Elm327
import com.skillhouse.obdscanner.protocol.Pid
import com.skillhouse.obdscanner.transport.ObdTransport
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.cancelAndJoin
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import java.io.IOException
import java.util.concurrent.Executors

/**
 * Single source of truth for the OBD connection. Owns the transport + ELM327,
 * runs the live-data polling loop, and services one-shot requests (read DTCs,
 * clear DTCs, read VIN).
 *
 * All adapter I/O is confined to [ioDispatcher] (a single background thread) and
 * further serialised with [commandMutex] so live polling never interleaves with
 * a DTC scan on the same wire.
 */
class ObdRepository {

    private val ioDispatcher = Executors.newSingleThreadExecutor { r ->
        Thread(r, "obd-io").apply { isDaemon = true }
    }.asCoroutineDispatcher()

    private val scope = CoroutineScope(SupervisorJob() + ioDispatcher)
    private val commandMutex = Mutex()

    private var transport: ObdTransport? = null
    private var elm: Elm327? = null
    private var pollJob: Job? = null

    private val _connectionState = MutableStateFlow<ConnectionState>(ConnectionState.Disconnected)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()

    private val _readings = MutableStateFlow<Map<String, Reading>>(emptyMap())
    val readings: StateFlow<Map<String, Reading>> = _readings.asStateFlow()

    private val _supportedPids = MutableStateFlow<List<Pid>>(emptyList())
    val supportedPids: StateFlow<List<Pid>> = _supportedPids.asStateFlow()

    private val _vehicleInfo = MutableStateFlow(VehicleInfo())
    val vehicleInfo: StateFlow<VehicleInfo> = _vehicleInfo.asStateFlow()

    private val _dtcs = MutableStateFlow<List<Dtc>>(emptyList())
    val dtcs: StateFlow<List<Dtc>> = _dtcs.asStateFlow()

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy.asStateFlow()

    private val _events = MutableSharedFlow<String>(extraBufferCapacity = 8)
    val events: SharedFlow<String> = _events.asSharedFlow()

    /**
     * Connect over the supplied transport, run the ELM327 handshake, detect
     * supported sensors, then start live polling. Idempotent-ish: any existing
     * connection is torn down first.
     */
    fun connect(newTransport: ObdTransport) {
        scope.launch {
            disconnectInternal()
            _connectionState.value = ConnectionState.Connecting(newTransport.description)
            _readings.value = emptyMap()
            try {
                withContext(ioDispatcher) {
                    newTransport.connect()
                    val elm327 = Elm327(newTransport)
                    elm327.initialize()
                    transport = newTransport
                    elm = elm327
                }
                _connectionState.value = ConnectionState.Connected(
                    target = newTransport.description,
                    protocol = elm?.describedProtocol,
                )
                _vehicleInfo.value = VehicleInfo(protocol = elm?.describedProtocol)
                detectSupportedPids()
                startPolling()
            } catch (e: IOException) {
                runCatching { newTransport.close() }
                transport = null
                elm = null
                _connectionState.value = ConnectionState.Error(e.message ?: "Connection failed")
            }
        }
    }

    fun disconnect() {
        scope.launch { disconnectInternal() }
    }

    private suspend fun disconnectInternal() {
        pollJob?.cancelAndJoin()
        pollJob = null
        withContext(ioDispatcher) {
            runCatching { transport?.close() }
        }
        transport = null
        elm = null
        _readings.value = emptyMap()
        _supportedPids.value = emptyList()
        _dtcs.value = emptyList()
        _connectionState.value = ConnectionState.Disconnected
    }

    // ---- live polling ----

    private fun startPolling() {
        pollJob?.cancel()
        pollJob = scope.launch {
            var voltageCounter = 0
            while (isActive) {
                val pids = _supportedPids.value
                if (pids.isEmpty() || elm == null) {
                    delay(POLL_INTERVAL_MS)
                    continue
                }
                for (pid in pids) {
                    if (!isActive) break
                    val value = queryPid(pid) ?: continue
                    _readings.value = _readings.value.toMutableMap().apply {
                        put(pid.key, Reading(value))
                    }
                }
                // Battery voltage is cheap and useful; refresh it every few cycles.
                if (voltageCounter++ % 5 == 0) {
                    readBatteryVoltage()
                }
                delay(POLL_INTERVAL_MS)
            }
        }
    }

    private suspend fun queryPid(pid: Pid): Double? = withContext(ioDispatcher) {
        val elm327 = elm ?: return@withContext null
        commandMutex.withLock {
            try {
                pid.decodeFrom(elm327.sendCommand(pid.command))
            } catch (e: IOException) {
                onLinkDropped(e)
                null
            }
        }
    }

    private suspend fun readBatteryVoltage() = withContext(ioDispatcher) {
        val elm327 = elm ?: return@withContext
        commandMutex.withLock {
            try {
                // ATRV returns e.g. "12.4V" straight from the adapter's own sense line.
                val raw = elm327.sendCommand("ATRV").raw
                val v = Regex("([0-9]+\\.?[0-9]*)").find(raw)?.groupValues?.get(1)?.toDoubleOrNull()
                if (v != null) {
                    _vehicleInfo.value = _vehicleInfo.value.copy(batteryVoltage = v)
                }
            } catch (e: IOException) {
                onLinkDropped(e)
            }
        }
    }

    private fun onLinkDropped(e: IOException) {
        if (_connectionState.value is ConnectionState.Connected) {
            _connectionState.value = ConnectionState.Error(
                "Lost connection: ${e.message ?: "adapter stopped responding"}",
            )
            pollJob?.cancel()
            runCatching { transport?.close() }
            transport = null
            elm = null
        }
    }

    // ---- supported-PID discovery ----

    /**
     * Ask the ECU which mode-01 PIDs it supports (via the 00/20/40/60 bitmask
     * PIDs) so we only poll sensors the car actually reports. Falls back to the
     * full list if discovery fails.
     */
    private suspend fun detectSupportedPids() = withContext(ioDispatcher) {
        val elm327 = elm ?: return@withContext
        val supported = HashSet<Int>()
        commandMutex.withLock {
            var base = 0
            for (rangeCmd in listOf("0100", "0120", "0140", "0160")) {
                val resp = try {
                    elm327.sendCommand(rangeCmd)
                } catch (e: IOException) {
                    break
                }
                val bytes = resp.dataBytes()
                val pidByte = rangeCmd.substring(2, 4).toInt(16)
                val idx = indexOfHeader(bytes, 0x41, pidByte) ?: break
                if (idx + 4 >= bytes.size) break
                val mask = bytes.copyOfRange(idx + 2, idx + 6)
                var moreRanges = false
                for (k in 0..3) {
                    val b = mask[k]
                    for (bit in 0..7) {
                        if (b and (0x80 shr bit) != 0) {
                            val pidNum = base + k * 8 + bit + 1
                            supported.add(pidNum)
                            // The last PID of each block (0x20, 0x40, 0x60) signals
                            // that the next block is available.
                            if (pidNum == base + 0x20) moreRanges = true
                        }
                    }
                }
                base += 0x20
                if (!moreRanges) break
            }
        }

        _supportedPids.value = if (supported.isEmpty()) {
            Pid.LIVE // discovery failed — poll everything and let NO DATA filter it
        } else {
            Pid.LIVE.filter { pid ->
                val pidNum = pid.command.substring(2, 4).toInt(16)
                supported.contains(pidNum)
            }.ifEmpty { Pid.LIVE }
        }
    }

    private fun indexOfHeader(bytes: IntArray, a: Int, b: Int): Int? {
        var i = 0
        while (i + 1 < bytes.size) {
            if (bytes[i] == a && bytes[i + 1] == b) return i
            i++
        }
        return null
    }

    // ---- diagnostic trouble codes ----

    fun readDtcs() {
        scope.launch {
            val elm327 = elm ?: return@launch
            _busy.value = true
            try {
                val stored = withContext(ioDispatcher) {
                    commandMutex.withLock {
                        DtcDecoder.parse(elm327.sendCommand("03"), 0x43, pending = false)
                    }
                }
                val pending = withContext(ioDispatcher) {
                    commandMutex.withLock {
                        DtcDecoder.parse(elm327.sendCommand("07"), 0x47, pending = true)
                    }
                }
                // Merge, de-duplicating a code that is both stored and pending.
                val storedCodes = stored.map { it.code }.toSet()
                _dtcs.value = stored + pending.filter { it.code !in storedCodes }
                _events.emit("Read ${_dtcs.value.size} trouble code(s)")
            } catch (e: IOException) {
                _events.emit("Failed to read codes: ${e.message}")
            } finally {
                _busy.value = false
            }
        }
    }

    fun clearDtcs() {
        scope.launch {
            val elm327 = elm ?: return@launch
            _busy.value = true
            try {
                val resp = withContext(ioDispatcher) {
                    commandMutex.withLock { elm327.sendCommand("04") }
                }
                if (resp.isError) {
                    _events.emit("Clear rejected: ${resp.error?.message}")
                } else {
                    _dtcs.value = emptyList()
                    _events.emit("Trouble codes cleared. Restart the engine to confirm.")
                }
            } catch (e: IOException) {
                _events.emit("Failed to clear codes: ${e.message}")
            } finally {
                _busy.value = false
            }
        }
    }

    // ---- vehicle identification ----

    fun readVin() {
        scope.launch {
            val elm327 = elm ?: return@launch
            _busy.value = true
            try {
                val vin = withContext(ioDispatcher) {
                    commandMutex.withLock { parseVin(elm327.sendCommand("0902")) }
                }
                if (vin != null) {
                    _vehicleInfo.value = _vehicleInfo.value.copy(vin = vin)
                    _events.emit("VIN: $vin")
                } else {
                    _events.emit("VIN not reported by this vehicle")
                }
            } catch (e: IOException) {
                _events.emit("Failed to read VIN: ${e.message}")
            } finally {
                _busy.value = false
            }
        }
    }

    /**
     * Extract the 17-character VIN from a mode 09 PID 02 response. The reply is a
     * multi-frame ISO-TP message; after stripping the "49 02 NN" frame headers the
     * remaining bytes are ASCII. We keep only valid VIN characters.
     */
    private fun parseVin(response: com.skillhouse.obdscanner.protocol.ObdResponse): String? {
        if (response.isError) return null
        val bytes = response.dataBytes()
        val sb = StringBuilder()
        var i = 0
        while (i < bytes.size) {
            // Skip a "49 02 NN" frame header wherever it appears.
            if (i + 2 < bytes.size && bytes[i] == 0x49 && bytes[i + 1] == 0x02) {
                i += 3
                continue
            }
            val c = bytes[i]
            if (c in 0x30..0x39 || c in 0x41..0x5A) {
                sb.append(c.toChar())
            }
            i++
        }
        val candidate = sb.toString()
        // A VIN is exactly 17 chars; if we captured more (leading padding), take the tail.
        return when {
            candidate.length >= 17 -> candidate.takeLast(17)
            else -> null
        }
    }

    companion object {
        private const val POLL_INTERVAL_MS = 200L
    }
}
