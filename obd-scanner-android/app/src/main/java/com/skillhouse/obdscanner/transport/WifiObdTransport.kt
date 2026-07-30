package com.skillhouse.obdscanner.transport

import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.Socket

/**
 * Transport backed by a plain TCP socket. WiFi ELM327 adapters run a small TCP
 * server (the phone joins the dongle's WiFi AP). The near-universal default is
 * host 192.168.0.10 on port 35000, but both are configurable in the UI.
 */
class WifiObdTransport(
    private val host: String = DEFAULT_HOST,
    private val port: Int = DEFAULT_PORT,
    private val connectTimeoutMs: Int = 8_000,
) : ObdTransport {

    private var socket: Socket? = null
    private var input: InputStream? = null
    private var output: OutputStream? = null

    override val description: String
        get() = "$host:$port"

    override val isConnected: Boolean
        get() = socket?.isConnected == true && socket?.isClosed == false

    @Throws(IOException::class)
    override fun connect() {
        val sock = Socket()
        sock.keepAlive = true
        sock.tcpNoDelay = true // OBD commands are tiny; disable Nagle for latency.
        sock.connect(InetSocketAddress(host, port), connectTimeoutMs)
        // Per-read timeout so a stalled adapter surfaces as an IOException instead
        // of hanging the polling loop forever.
        sock.soTimeout = 10_000
        socket = sock
        input = sock.getInputStream()
        output = sock.getOutputStream()
    }

    @Throws(IOException::class)
    override fun write(bytes: ByteArray) {
        val out = output ?: throw IOException("Not connected")
        out.write(bytes)
        out.flush()
    }

    @Throws(IOException::class)
    override fun readByte(): Int {
        val inp = input ?: throw IOException("Not connected")
        return inp.read()
    }

    override fun close() {
        try {
            input?.close()
        } catch (_: IOException) {
        }
        try {
            output?.close()
        } catch (_: IOException) {
        }
        try {
            socket?.close()
        } catch (_: IOException) {
        }
        input = null
        output = null
        socket = null
    }

    companion object {
        const val DEFAULT_HOST = "192.168.0.10"
        const val DEFAULT_PORT = 35000
    }
}
