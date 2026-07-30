package com.skillhouse.obdscanner.protocol

import com.skillhouse.obdscanner.transport.ObdTransport
import java.io.IOException

/**
 * Speaks the ELM327 AT + OBD-II command protocol over an [ObdTransport].
 *
 * The ELM327 is line-oriented and terminates every reply with a '>' prompt
 * character. A command exchange is therefore: write "<cmd>\r", then read bytes
 * until the '>' prompt appears.
 *
 * This class is NOT thread-safe. All access must be serialised — the repository
 * confines it to a single-threaded dispatcher.
 */
class Elm327(private val transport: ObdTransport) {

    /** Set true after [initialize] completes successfully. */
    var initialized = false
        private set

    /** The OBD protocol the adapter auto-detected, if known (e.g. "AUTO, ISO 15765-4 (CAN 11/500)"). */
    var describedProtocol: String? = null
        private set

    /**
     * Reset and configure the adapter, then verify a live link to the vehicle.
     *
     * @throws IOException if the adapter never responds or the vehicle can't be reached.
     */
    @Throws(IOException::class)
    fun initialize() {
        initialized = false
        // ATZ fully resets the chip; give it a moment and ignore its banner.
        sendRaw("ATZ", timeoutMs = 5_000)
        sendRaw("ATE0") // echo off — we don't want our own command echoed back
        sendRaw("ATL0") // linefeeds off
        sendRaw("ATS0") // spaces off — compact responses, faster parsing
        sendRaw("ATH0") // headers off — single-ECU responses stay clean
        sendRaw("ATAT1") // adaptive timing on — adapter tunes its own wait
        sendRaw("ATSP0") // set protocol to auto

        // A 0100 query forces the adapter to negotiate a protocol with the ECU.
        // A valid reply begins with "41 00"; anything else means no live vehicle.
        val probe = sendCommand("0100")
        if (probe.isError || !probe.cleaned.replace(" ", "").startsWith("4100")) {
            throw IOException(
                probe.error?.message
                    ?: "Adapter is responding but no vehicle ECU was found. " +
                    "Check the ignition is on and the dongle is fully seated.",
            )
        }

        describedProtocol = runCatching { sendRaw("ATDP").raw.trim() }.getOrNull()
        initialized = true
    }

    /**
     * Send an OBD command (e.g. "010C") and return the parsed response.
     */
    @Throws(IOException::class)
    fun sendCommand(command: String): ObdResponse = sendRaw(command)

    /**
     * Low-level exchange: write the command, read until the '>' prompt.
     */
    @Throws(IOException::class)
    private fun sendRaw(command: String, timeoutMs: Long = DEFAULT_TIMEOUT_MS): ObdResponse {
        transport.write((command + "\r").toByteArray(Charsets.US_ASCII))

        val sb = StringBuilder()
        val deadline = System.currentTimeMillis() + timeoutMs
        while (true) {
            if (System.currentTimeMillis() > deadline) {
                throw IOException("Timed out waiting for adapter response to '$command'")
            }
            val b = transport.readByte()
            if (b == -1) {
                // End of stream — the link dropped.
                throw IOException("Connection closed by adapter")
            }
            val c = b.toChar()
            if (c == PROMPT) {
                break
            }
            sb.append(c)
        }
        return ObdResponse(command, sb.toString())
    }

    companion object {
        private const val PROMPT = '>'
        private const val DEFAULT_TIMEOUT_MS = 4_000L
    }
}
