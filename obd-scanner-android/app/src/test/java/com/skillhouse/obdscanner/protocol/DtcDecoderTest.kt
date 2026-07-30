package com.skillhouse.obdscanner.protocol

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class DtcDecoderTest {

    @Test
    fun decodesCanResponseWithCountByte() {
        // ISO 15765 (CAN): 43 <count=02> then two DTCs 0143, 0133.
        val codes = DtcDecoder.parse(ObdResponse("03", "43 02 01 43 01 33"), 0x43, pending = false)
        assertEquals(listOf("P0143", "P0133"), codes.map { it.code })
        assertTrue(codes.all { !it.pending })
    }

    @Test
    fun decodesLegacyResponseWithoutCountByte() {
        // ISO 9141 / KWP: 43 then DTCs, padded with 00 00.
        val codes = DtcDecoder.parse(ObdResponse("03", "43 01 33 00 00"), 0x43, pending = false)
        assertEquals(listOf("P0133"), codes.map { it.code })
    }

    @Test
    fun noStoredCodes() {
        val codes = DtcDecoder.parse(ObdResponse("03", "43 00"), 0x43, pending = false)
        assertTrue(codes.isEmpty())
    }

    @Test
    fun decodesEachSubsystemLetter() {
        // b1 top two bits select P/C/B/U.
        assertEquals("P0100", DtcDecoder.parse(ObdResponse("03", "43 01 00"), 0x43, false).firstOrNull { true }?.let { it.code })
        assertEquals("C0100", DtcDecoder.parse(ObdResponse("03", "43 41 00"), 0x43, false).first().code)
        assertEquals("B0100", DtcDecoder.parse(ObdResponse("03", "43 81 00"), 0x43, false).first().code)
        assertEquals("U0100", DtcDecoder.parse(ObdResponse("03", "43 C1 00"), 0x43, false).first().code)
    }

    @Test
    fun pendingFlagIsSet() {
        val codes = DtcDecoder.parse(ObdResponse("07", "47 01 43"), 0x47, pending = true)
        assertEquals("P0143", codes.first().code)
        assertTrue(codes.first().pending)
    }

    @Test
    fun knownCodeHasCuratedDescription() {
        assertEquals("Cylinder 1 Misfire Detected", DtcDecoder.describe("P0301"))
    }

    @Test
    fun unknownCodeFallsBackToSubsystem() {
        val desc = DtcDecoder.describe("P0abc".uppercase())
        assertTrue(desc.contains("—"))
    }
}
