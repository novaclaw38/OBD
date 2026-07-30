package com.skillhouse.obdscanner.ui

import android.annotation.SuppressLint
import android.app.Application
import android.bluetooth.BluetoothAdapter
import android.bluetooth.BluetoothManager
import android.content.Context
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.skillhouse.obdscanner.ObdApp
import com.skillhouse.obdscanner.data.SettingsStore
import com.skillhouse.obdscanner.transport.BluetoothObdTransport
import com.skillhouse.obdscanner.transport.WifiObdTransport
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch

/** A paired Bluetooth adapter the user can pick from. */
data class BondedDevice(val name: String, val address: String)

class ObdViewModel(app: Application) : AndroidViewModel(app) {

    private val repository = getApplication<ObdApp>().repository
    private val settings: SettingsStore = getApplication<ObdApp>().settings

    // Repository state, surfaced directly to the UI.
    val connectionState = repository.connectionState
    val readings = repository.readings
    val supportedPids = repository.supportedPids
    val vehicleInfo = repository.vehicleInfo
    val dtcs = repository.dtcs
    val busy = repository.busy
    val events = repository.events

    private val _pairedDevices = MutableStateFlow<List<BondedDevice>>(emptyList())
    val pairedDevices: StateFlow<List<BondedDevice>> = _pairedDevices.asStateFlow()

    private val _wifiHost = MutableStateFlow(SettingsStore.DEFAULT_HOST)
    val wifiHost: StateFlow<String> = _wifiHost.asStateFlow()

    private val _wifiPort = MutableStateFlow(SettingsStore.DEFAULT_PORT.toString())
    val wifiPort: StateFlow<String> = _wifiPort.asStateFlow()

    private val _bluetoothEnabled = MutableStateFlow(isBluetoothOn())
    val bluetoothEnabled: StateFlow<Boolean> = _bluetoothEnabled.asStateFlow()

    init {
        viewModelScope.launch {
            _wifiHost.value = settings.wifiHost.first()
            _wifiPort.value = settings.wifiPort.first().toString()
        }
    }

    fun onWifiHostChange(value: String) { _wifiHost.value = value }
    fun onWifiPortChange(value: String) { _wifiPort.value = value.filter { it.isDigit() }.take(5) }

    private fun bluetoothAdapter(): BluetoothAdapter? {
        val manager = getApplication<Application>()
            .getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        return manager?.adapter
    }

    private fun isBluetoothOn(): Boolean = bluetoothAdapter()?.isEnabled == true

    fun refreshBluetoothState() {
        _bluetoothEnabled.value = isBluetoothOn()
    }

    /**
     * Load the list of already-paired devices. The caller must have obtained
     * BLUETOOTH_CONNECT (API 31+) first; we swallow SecurityException defensively.
     */
    @SuppressLint("MissingPermission")
    fun refreshPairedDevices() {
        refreshBluetoothState()
        val adapter = bluetoothAdapter() ?: return
        try {
            _pairedDevices.value = adapter.bondedDevices
                .map { BondedDevice(it.name ?: "Unknown device", it.address) }
                .sortedBy { it.name }
        } catch (_: SecurityException) {
            _pairedDevices.value = emptyList()
        }
    }

    @SuppressLint("MissingPermission")
    fun connectBluetooth(address: String) {
        val adapter = bluetoothAdapter() ?: return
        val device = try {
            adapter.getRemoteDevice(address)
        } catch (_: IllegalArgumentException) {
            return
        }
        viewModelScope.launch { settings.setLastDevice(address) }
        repository.connect(BluetoothObdTransport(getApplication(), device))
    }

    fun connectWifi() {
        val host = _wifiHost.value.trim().ifEmpty { SettingsStore.DEFAULT_HOST }
        val port = _wifiPort.value.toIntOrNull() ?: SettingsStore.DEFAULT_PORT
        viewModelScope.launch { settings.setWifi(host, port) }
        repository.connect(WifiObdTransport(host, port))
    }

    fun disconnect() = repository.disconnect()
    fun readDtcs() = repository.readDtcs()
    fun clearDtcs() = repository.clearDtcs()
    fun readVin() = repository.readVin()
}
