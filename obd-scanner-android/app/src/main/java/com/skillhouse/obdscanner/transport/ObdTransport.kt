package com.skillhouse.obdscanner.transport

import java.io.IOException

/**
 * A raw, byte-oriented bidirectional link to an ELM327-compatible OBD adapter.
 *
 * Implementations wrap either a Bluetooth Classic (SPP) socket or a TCP socket
 * for WiFi adapters. The protocol layer ([com.skillhouse.obdscanner.protocol.Elm327])
 * sits on top of this and knows nothing about the underlying medium.
 *
 * All calls are blocking and must be invoked from a background dispatcher.
 */
interface ObdTransport {

    /** Human-readable description of what this transport connects to. */
    val description: String

    /** True once [connect] has succeeded and [close] has not yet been called. */
    val isConnected: Boolean

    /**
     * Open the link. Blocks until the connection is established or fails.
     * @throws IOException if the adapter cannot be reached.
     */
    @Throws(IOException::class)
    fun connect()

    /**
     * Write the given ASCII command to the adapter. The ELM327 expects commands
     * terminated by a carriage return.
     */
    @Throws(IOException::class)
    fun write(bytes: ByteArray)

    /**
     * Read a single byte from the adapter, or -1 on end-of-stream.
     * The protocol layer reads byte-by-byte until it sees the ELM327 prompt ('>').
     */
    @Throws(IOException::class)
    fun readByte(): Int

    /** Close the link and release all resources. Safe to call multiple times. */
    fun close()
}
