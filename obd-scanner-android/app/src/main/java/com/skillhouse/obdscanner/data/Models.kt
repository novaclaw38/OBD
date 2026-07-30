package com.skillhouse.obdscanner.data

/** High-level state of the link to the OBD adapter + vehicle. */
sealed interface ConnectionState {
    data object Disconnected : ConnectionState
    data class Connecting(val target: String) : ConnectionState
    data class Connected(val target: String, val protocol: String?) : ConnectionState
    data class Error(val message: String) : ConnectionState
}

/** One live sensor value with the moment it was captured. */
data class Reading(
    val value: Double,
    val timestampMs: Long = System.currentTimeMillis(),
)

/** Static facts about the connected vehicle/adapter. */
data class VehicleInfo(
    val vin: String? = null,
    val protocol: String? = null,
    val batteryVoltage: Double? = null,
)

/** Which medium the user chose to connect over. */
enum class ConnectionType { BLUETOOTH, WIFI }
