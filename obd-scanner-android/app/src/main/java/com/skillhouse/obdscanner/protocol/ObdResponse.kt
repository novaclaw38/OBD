package com.skillhouse.obdscanner.protocol

/**
 * The result of one command sent to the ELM327.
 *
 * [raw] is exactly what the adapter returned (minus the trailing '>' prompt).
 * [cleaned] is upper-cased with all whitespace, carriage returns and the
 * "SEARCHING..." banner removed — the form the decoders expect.
 */
data class ObdResponse(
    val command: String,
    val raw: String,
) {
    val cleaned: String = raw
        .replace("SEARCHING...", "")
        .replace(">", "")
        .replace("\r", " ")
        .replace("\n", " ")
        .uppercase()
        .replace(Regex("[^0-9A-F ]"), " ")
        .trim()

    /** Adapter-level error strings that mean "no usable data came back". */
    val error: ObdError? = when {
        raw.contains("NO DATA", true) -> ObdError.NO_DATA
        raw.contains("UNABLE TO CONNECT", true) -> ObdError.UNABLE_TO_CONNECT
        raw.contains("CAN ERROR", true) -> ObdError.BUS_ERROR
        raw.contains("BUS INIT", true) && raw.contains("ERROR", true) -> ObdError.BUS_ERROR
        raw.contains("STOPPED", true) -> ObdError.STOPPED
        raw.contains("?") -> ObdError.UNKNOWN_COMMAND
        else -> null
    }

    val isError: Boolean get() = error != null

    /**
     * The response split into individual byte values (0..255). Multi-frame
     * responses that the adapter returns across several lines are flattened here.
     */
    fun dataBytes(): IntArray {
        val tokens = cleaned.split(" ").filter { it.isNotBlank() }
        val bytes = ArrayList<Int>(tokens.size * 2)
        for (token in tokens) {
            // Tokens should be 2-hex-digit bytes once spaces are enabled off; but
            // guard against odd-length tokens from noisy adapters.
            var i = 0
            while (i + 1 < token.length) {
                bytes.add(token.substring(i, i + 2).toInt(16))
                i += 2
            }
            if (token.length % 2 == 1) {
                bytes.add(token.substring(token.length - 1).toInt(16))
            }
        }
        return bytes.toIntArray()
    }
}

enum class ObdError(val message: String) {
    NO_DATA("No data — sensor not supported by this vehicle"),
    UNABLE_TO_CONNECT("Unable to connect to the vehicle's ECU"),
    BUS_ERROR("Vehicle bus error"),
    STOPPED("Command interrupted"),
    UNKNOWN_COMMAND("Adapter did not understand the command"),
}
