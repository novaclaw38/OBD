package com.skillhouse.obdscanner.protocol

/**
 * A single OBD-II Parameter ID (PID) — one live sensor reading.
 *
 * [command] is the raw request (mode + pid, e.g. "010C" for engine RPM).
 * [decode] receives just the data payload (the bytes AFTER the "41 XX" echo
 * header) and returns the engineering value, or null if it can't be decoded.
 */
data class Pid(
    val command: String,
    val key: String,
    val label: String,
    val unit: String,
    val min: Double,
    val max: Double,
    val decode: (IntArray) -> Double?,
) {
    private val responseMode: Int = command.substring(0, 2).toInt(16) + 0x40
    private val pidByte: Int = command.substring(2, 4).toInt(16)

    /**
     * Locate this PID's payload inside a response and decode it.
     * Returns null on error, unsupported PID, or a malformed frame.
     */
    fun decodeFrom(response: ObdResponse): Double? {
        if (response.isError) return null
        val bytes = response.dataBytes()
        // Find the "responseMode pidByte" header, then decode what follows.
        var i = 0
        while (i + 1 < bytes.size) {
            if (bytes[i] == responseMode && bytes[i + 1] == pidByte) {
                val payload = bytes.copyOfRange(i + 2, bytes.size)
                return runCatching { decode(payload) }.getOrNull()
            }
            i++
        }
        return null
    }

    companion object {
        // ---- decoders (formulas straight from the SAE J1979 standard) ----
        private val calcLoad: (IntArray) -> Double? = { d -> d.getOrNull(0)?.let { it * 100.0 / 255.0 } }
        private val tempMinus40: (IntArray) -> Double? = { d -> d.getOrNull(0)?.let { it - 40.0 } }
        private val fuelTrim: (IntArray) -> Double? = { d -> d.getOrNull(0)?.let { (it - 128) * 100.0 / 128.0 } }
        private val rawA: (IntArray) -> Double? = { d -> d.getOrNull(0)?.toDouble() }
        private val percentA: (IntArray) -> Double? = { d -> d.getOrNull(0)?.let { it * 100.0 / 255.0 } }
        private val rpm: (IntArray) -> Double? = { d ->
            if (d.size >= 2) (256 * d[0] + d[1]) / 4.0 else null
        }
        private val timingAdvance: (IntArray) -> Double? = { d -> d.getOrNull(0)?.let { it / 2.0 - 64.0 } }
        private val maf: (IntArray) -> Double? = { d ->
            if (d.size >= 2) (256 * d[0] + d[1]) / 100.0 else null
        }
        private val controlVoltage: (IntArray) -> Double? = { d ->
            if (d.size >= 2) (256 * d[0] + d[1]) / 1000.0 else null
        }
        private val fuelRate: (IntArray) -> Double? = { d ->
            if (d.size >= 2) (256 * d[0] + d[1]) / 20.0 else null
        }
        private val word: (IntArray) -> Double? = { d ->
            if (d.size >= 2) (256 * d[0] + d[1]).toDouble() else null
        }

        /** The live sensors shown on the dashboard, in display order. */
        val LIVE: List<Pid> = listOf(
            Pid("010C", "rpm", "Engine RPM", "rpm", 0.0, 8000.0, rpm),
            Pid("010D", "speed", "Vehicle Speed", "km/h", 0.0, 255.0, rawA),
            Pid("0105", "coolant", "Coolant Temp", "°C", -40.0, 215.0, tempMinus40),
            Pid("0104", "load", "Engine Load", "%", 0.0, 100.0, calcLoad),
            Pid("0111", "throttle", "Throttle", "%", 0.0, 100.0, percentA),
            Pid("010F", "intake_temp", "Intake Air Temp", "°C", -40.0, 215.0, tempMinus40),
            Pid("0110", "maf", "Mass Air Flow", "g/s", 0.0, 655.0, maf),
            Pid("010B", "map", "Intake Pressure", "kPa", 0.0, 255.0, rawA),
            Pid("010E", "timing", "Timing Advance", "°", -64.0, 63.5, timingAdvance),
            Pid("0106", "stft", "Short Fuel Trim", "%", -100.0, 99.2, fuelTrim),
            Pid("0107", "ltft", "Long Fuel Trim", "%", -100.0, 99.2, fuelTrim),
            Pid("012F", "fuel_level", "Fuel Level", "%", 0.0, 100.0, percentA),
            Pid("0142", "module_voltage", "Module Voltage", "V", 0.0, 20.0, controlVoltage),
            Pid("0146", "ambient_temp", "Ambient Temp", "°C", -40.0, 215.0, tempMinus40),
            Pid("015C", "oil_temp", "Oil Temp", "°C", -40.0, 215.0, tempMinus40),
            Pid("015E", "fuel_rate", "Fuel Rate", "L/h", 0.0, 300.0, fuelRate),
            Pid("0133", "baro", "Barometric", "kPa", 0.0, 255.0, rawA),
            Pid("0131", "dist_since_clear", "Dist. since DTC clear", "km", 0.0, 65535.0, word),
        )
    }
}
