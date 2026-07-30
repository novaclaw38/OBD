package com.skillhouse.obdscanner.protocol

/** A decoded Diagnostic Trouble Code plus its human-readable meaning. */
data class Dtc(
    val code: String,          // e.g. "P0301"
    val description: String,   // e.g. "Cylinder 1 Misfire Detected"
    val pending: Boolean,      // true if from mode 07 (pending), false if mode 03 (stored)
) {
    /** Broad subsystem this code belongs to, derived from the leading letter. */
    val system: String
        get() = when (code.firstOrNull()) {
            'P' -> "Powertrain"
            'C' -> "Chassis"
            'B' -> "Body"
            'U' -> "Network"
            else -> "Unknown"
        }
}

/**
 * Decodes mode 03 (stored) and mode 07 (pending) trouble-code responses and
 * maps codes to descriptions.
 */
object DtcDecoder {

    /**
     * Parse a raw mode 03/07 response into a list of DTC codes.
     *
     * @param modeByte 0x43 for stored (mode 03) or 0x47 for pending (mode 07).
     */
    fun parse(response: ObdResponse, modeByte: Int, pending: Boolean): List<Dtc> {
        if (response.isError) return emptyList()
        val bytes = response.dataBytes()
        val start = bytes.indexOf(modeByte)
        if (start < 0) return emptyList()

        var payload = bytes.copyOfRange(start + 1, bytes.size)

        // On CAN (ISO 15765) the response carries a DTC-count byte after the mode
        // echo, giving an odd payload length; other protocols do not. Stripping the
        // leading byte on odd lengths realigns the pairs for both cases.
        if (payload.size % 2 == 1) {
            payload = payload.copyOfRange(1, payload.size)
        }

        val result = LinkedHashSet<Dtc>()
        var i = 0
        while (i + 1 < payload.size) {
            val b1 = payload[i]
            val b2 = payload[i + 1]
            i += 2
            if (b1 == 0 && b2 == 0) continue // padding / empty slot
            val code = decodeCode(b1, b2)
            result.add(Dtc(code, describe(code), pending))
        }
        return result.toList()
    }

    /** Turn two raw bytes into a canonical DTC string such as "P0301". */
    private fun decodeCode(b1: Int, b2: Int): String {
        val letter = when (b1 shr 6) {
            0 -> 'P'
            1 -> 'C'
            2 -> 'B'
            else -> 'U'
        }
        val firstDigit = (b1 shr 4) and 0x03
        val secondDigit = b1 and 0x0F
        val thirdDigit = (b2 shr 4) and 0x0F
        val fourthDigit = b2 and 0x0F
        return "%c%d%X%X%X".format(letter, firstDigit, secondDigit, thirdDigit, fourthDigit)
    }

    /**
     * Look up a description. Falls back to a subsystem-level description built
     * from the code structure when the specific code isn't in the table.
     */
    fun describe(code: String): String {
        DESCRIPTIONS[code]?.let { return it }
        val generic = code.length == 5 && code[1] == '0'
        val subsystem = when (code.firstOrNull()) {
            'P' -> when (code.getOrNull(2)) {
                '0', '2' -> "Fuel & Air Metering / Auxiliary Emission Controls"
                '1' -> "Fuel & Air Metering"
                '3' -> "Ignition System or Misfire"
                '4' -> "Auxiliary Emission Controls"
                '5' -> "Vehicle Speed, Idle Control & Auxiliary Inputs"
                '6' -> "Computer & Output Circuit"
                '7', '8', '9' -> "Transmission"
                else -> "Powertrain"
            }
            'C' -> "Chassis (ABS, traction, steering)"
            'B' -> "Body (airbags, lighting, comfort)"
            'U' -> "Network / Communication"
            else -> "Unknown subsystem"
        }
        val scope = if (generic) "Generic" else "Manufacturer-specific"
        return "$scope — $subsystem (no detailed description on file)"
    }

    /**
     * Descriptions for the most frequently encountered generic OBD-II codes.
     * This is intentionally a curated subset; anything not listed still gets a
     * useful subsystem description from [describe].
     */
    private val DESCRIPTIONS: Map<String, String> = buildMap {
        // Fuel & air metering
        put("P0100", "Mass or Volume Air Flow Circuit Malfunction")
        put("P0101", "Mass or Volume Air Flow Circuit Range/Performance")
        put("P0102", "Mass or Volume Air Flow Circuit Low Input")
        put("P0103", "Mass or Volume Air Flow Circuit High Input")
        put("P0106", "Manifold Absolute Pressure Range/Performance")
        put("P0107", "Manifold Absolute Pressure Circuit Low Input")
        put("P0108", "Manifold Absolute Pressure Circuit High Input")
        put("P0110", "Intake Air Temperature Circuit Malfunction")
        put("P0111", "Intake Air Temperature Circuit Range/Performance")
        put("P0112", "Intake Air Temperature Circuit Low Input")
        put("P0113", "Intake Air Temperature Circuit High Input")
        put("P0115", "Engine Coolant Temperature Circuit Malfunction")
        put("P0116", "Engine Coolant Temperature Circuit Range/Performance")
        put("P0117", "Engine Coolant Temperature Circuit Low Input")
        put("P0118", "Engine Coolant Temperature Circuit High Input")
        put("P0120", "Throttle/Pedal Position Sensor A Circuit Malfunction")
        put("P0121", "Throttle Position Sensor A Circuit Range/Performance")
        put("P0122", "Throttle Position Sensor A Circuit Low Input")
        put("P0123", "Throttle Position Sensor A Circuit High Input")
        put("P0125", "Insufficient Coolant Temp for Closed Loop Fuel Control")
        put("P0128", "Coolant Thermostat Below Regulating Temperature")
        put("P0130", "O2 Sensor Circuit Malfunction (Bank 1 Sensor 1)")
        put("P0131", "O2 Sensor Circuit Low Voltage (Bank 1 Sensor 1)")
        put("P0132", "O2 Sensor Circuit High Voltage (Bank 1 Sensor 1)")
        put("P0133", "O2 Sensor Circuit Slow Response (Bank 1 Sensor 1)")
        put("P0134", "O2 Sensor Circuit No Activity (Bank 1 Sensor 1)")
        put("P0135", "O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 1)")
        put("P0136", "O2 Sensor Circuit Malfunction (Bank 1 Sensor 2)")
        put("P0137", "O2 Sensor Circuit Low Voltage (Bank 1 Sensor 2)")
        put("P0138", "O2 Sensor Circuit High Voltage (Bank 1 Sensor 2)")
        put("P0140", "O2 Sensor Circuit No Activity (Bank 1 Sensor 2)")
        put("P0141", "O2 Sensor Heater Circuit Malfunction (Bank 1 Sensor 2)")
        // Fuel system
        put("P0171", "System Too Lean (Bank 1)")
        put("P0172", "System Too Rich (Bank 1)")
        put("P0174", "System Too Lean (Bank 2)")
        put("P0175", "System Too Rich (Bank 2)")
        put("P0180", "Fuel Temperature Sensor A Circuit Malfunction")
        put("P0182", "Fuel Temperature Sensor A Circuit Low Input")
        // Misfires
        put("P0300", "Random/Multiple Cylinder Misfire Detected")
        put("P0301", "Cylinder 1 Misfire Detected")
        put("P0302", "Cylinder 2 Misfire Detected")
        put("P0303", "Cylinder 3 Misfire Detected")
        put("P0304", "Cylinder 4 Misfire Detected")
        put("P0305", "Cylinder 5 Misfire Detected")
        put("P0306", "Cylinder 6 Misfire Detected")
        put("P0307", "Cylinder 7 Misfire Detected")
        put("P0308", "Cylinder 8 Misfire Detected")
        // Ignition / knock
        put("P0325", "Knock Sensor 1 Circuit Malfunction (Bank 1)")
        put("P0327", "Knock Sensor 1 Circuit Low Input (Bank 1)")
        put("P0335", "Crankshaft Position Sensor A Circuit Malfunction")
        put("P0336", "Crankshaft Position Sensor A Range/Performance")
        put("P0340", "Camshaft Position Sensor A Circuit Malfunction")
        put("P0341", "Camshaft Position Sensor A Range/Performance")
        // Emissions
        put("P0401", "Exhaust Gas Recirculation Flow Insufficient")
        put("P0402", "Exhaust Gas Recirculation Flow Excessive")
        put("P0403", "Exhaust Gas Recirculation Circuit Malfunction")
        put("P0411", "Secondary Air Injection System Incorrect Flow")
        put("P0420", "Catalyst System Efficiency Below Threshold (Bank 1)")
        put("P0421", "Warm Up Catalyst Efficiency Below Threshold (Bank 1)")
        put("P0430", "Catalyst System Efficiency Below Threshold (Bank 2)")
        put("P0440", "Evaporative Emission Control System Malfunction")
        put("P0441", "EVAP System Incorrect Purge Flow")
        put("P0442", "EVAP System Leak Detected (Small Leak)")
        put("P0446", "EVAP System Vent Control Circuit Malfunction")
        put("P0455", "EVAP System Leak Detected (Large Leak / Loose Gas Cap)")
        put("P0456", "EVAP System Leak Detected (Very Small Leak)")
        // Speed / idle
        put("P0500", "Vehicle Speed Sensor Malfunction")
        put("P0505", "Idle Air Control System Malfunction")
        put("P0506", "Idle Control System RPM Lower Than Expected")
        put("P0507", "Idle Control System RPM Higher Than Expected")
        // Computer / output
        put("P0600", "Serial Communication Link Malfunction")
        put("P0601", "Internal Control Module Memory Check Sum Error")
        put("P0602", "Control Module Programming Error")
        put("P0606", "ECM/PCM Processor Fault")
        put("P0620", "Generator Control Circuit Malfunction")
        // Transmission
        put("P0700", "Transmission Control System Malfunction")
        put("P0701", "Transmission Control System Range/Performance")
        put("P0705", "Transmission Range Sensor Circuit Malfunction")
        put("P0715", "Input/Turbine Speed Sensor Circuit Malfunction")
        put("P0720", "Output Speed Sensor Circuit Malfunction")
        put("P0730", "Incorrect Gear Ratio")
        put("P0740", "Torque Converter Clutch Circuit Malfunction")
        put("P0741", "Torque Converter Clutch Circuit Performance/Stuck Off")
        put("P0750", "Shift Solenoid A Malfunction")
        put("P0755", "Shift Solenoid B Malfunction")
        // Network
        put("U0100", "Lost Communication With ECM/PCM A")
        put("U0101", "Lost Communication With TCM")
        put("U0121", "Lost Communication With ABS Control Module")
        put("U0155", "Lost Communication With Instrument Panel Cluster")
    }
}
