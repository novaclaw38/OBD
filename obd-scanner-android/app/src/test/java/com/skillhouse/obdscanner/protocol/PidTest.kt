package com.skillhouse.obdscanner.protocol

import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

/** Verifies the SAE J1979 PID decode formulas against known raw ELM327 replies. */
class PidTest {

    private fun pid(key: String): Pid = Pid.LIVE.first { it.key == key }

    private fun decode(pid: Pid, raw: String): Double? =
        pid.decodeFrom(ObdResponse(pid.command, raw))

    @Test
    fun rpm_decodesQuarterCounts() {
        // 41 0C 1A F8 -> (256*0x1A + 0xF8) / 4 = 1726 rpm
        assertEquals(1726.0, decode(pid("rpm"), "410C1AF8")!!, 0.001)
    }

    @Test
    fun speed_isRawByte() {
        // 41 0D 50 -> 0x50 = 80 km/h
        assertEquals(80.0, decode(pid("speed"), "410D50")!!, 0.001)
    }

    @Test
    fun coolant_subtracts40() {
        // 41 05 5A -> 0x5A(90) - 40 = 50 C
        assertEquals(50.0, decode(pid("coolant"), "41055A")!!, 0.001)
    }

    @Test
    fun engineLoad_isPercentOf255() {
        // 41 04 FF -> 255 * 100 / 255 = 100 %
        assertEquals(100.0, decode(pid("load"), "4104FF")!!, 0.001)
    }

    @Test
    fun fuelTrim_isSignedAround128() {
        // 41 06 80 -> (128-128)*100/128 = 0 %
        assertEquals(0.0, decode(pid("stft"), "410680")!!, 0.001)
    }

    @Test
    fun spacesInReplyAreTolerated() {
        assertEquals(1726.0, decode(pid("rpm"), "41 0C 1A F8")!!, 0.001)
    }

    @Test
    fun noDataReturnsNull() {
        assertNull(decode(pid("rpm"), "NO DATA"))
    }

    @Test
    fun wrongPidHeaderReturnsNull() {
        // Reply is for 010D (speed) but we asked for RPM -> no match.
        assertNull(decode(pid("rpm"), "410D50"))
    }
}
