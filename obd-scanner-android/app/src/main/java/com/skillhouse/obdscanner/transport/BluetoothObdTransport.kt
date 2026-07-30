package com.skillhouse.obdscanner.transport

import android.Manifest
import android.annotation.SuppressLint
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothDevice
import android.bluetooth.BluetoothSocket
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.content.ContextCompat
import java.io.IOException
import java.io.InputStream
import java.io.OutputStream
import java.util.UUID

/**
 * Transport backed by a Bluetooth Classic RFCOMM (SPP) socket. This is how the
 * vast majority of ELM327 clone dongles ("Vgate", "OBDLink", generic blue
 * dongles) expose themselves.
 *
 * The caller is responsible for having already paired the device and for holding
 * the runtime BLUETOOTH_CONNECT permission (API 31+).
 */
class BluetoothObdTransport(
    private val context: Context,
    private val device: BluetoothDevice,
) : ObdTransport {

    private var socket: BluetoothSocket? = null
    private var input: InputStream? = null
    private var output: OutputStream? = null

    @SuppressLint("MissingPermission") // permission is checked in connect()
    override val description: String
        get() = if (hasConnectPermission()) {
            (device.name ?: "Unknown") + " (" + device.address + ")"
        } else {
            device.address
        }

    override val isConnected: Boolean
        get() = socket?.isConnected == true

    @SuppressLint("MissingPermission")
    @Throws(IOException::class)
    override fun connect() {
        if (!hasConnectPermission()) {
            throw IOException("Missing BLUETOOTH_CONNECT permission")
        }

        // Cancelling discovery is required — an active discovery slows down and can
        // break an outgoing connection attempt.
        BluetoothAdapter.getDefaultAdapter()?.cancelDiscovery()

        val sock = try {
            device.createRfcommSocketToServiceRecord(SPP_UUID)
        } catch (e: IOException) {
            throw IOException("Could not create RFCOMM socket", e)
        }

        try {
            sock.connect()
        } catch (e: IOException) {
            // Fallback: some cheap adapters advertise no SDP record, so the
            // standard connect fails. The reflection-based fallback opens channel 1
            // directly and works with those units.
            try {
                sock.close()
            } catch (_: IOException) {
            }
            val fallback = createFallbackSocket()
            fallback.connect()
            socket = fallback
            input = fallback.inputStream
            output = fallback.outputStream
            return
        }

        socket = sock
        input = sock.inputStream
        output = sock.outputStream
    }

    @SuppressLint("MissingPermission")
    @Throws(IOException::class)
    private fun createFallbackSocket(): BluetoothSocket {
        val method = device.javaClass.getMethod("createRfcommSocket", Int::class.javaPrimitiveType)
        return method.invoke(device, 1) as BluetoothSocket
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

    private fun hasConnectPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.BLUETOOTH_CONNECT,
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    companion object {
        /** Standard Serial Port Profile UUID used by virtually all ELM327 adapters. */
        val SPP_UUID: UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB")
    }
}
