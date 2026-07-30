package com.skillhouse.obdscanner.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "obd_settings")

/** Persists the user's connection preferences so they don't re-enter them each run. */
class SettingsStore(private val context: Context) {

    val wifiHost: Flow<String> = context.dataStore.data.map { it[KEY_WIFI_HOST] ?: DEFAULT_HOST }
    val wifiPort: Flow<Int> = context.dataStore.data.map { it[KEY_WIFI_PORT] ?: DEFAULT_PORT }
    val lastDeviceAddress: Flow<String?> = context.dataStore.data.map { it[KEY_LAST_DEVICE] }

    suspend fun setWifi(host: String, port: Int) {
        context.dataStore.edit {
            it[KEY_WIFI_HOST] = host
            it[KEY_WIFI_PORT] = port
        }
    }

    suspend fun setLastDevice(address: String) {
        context.dataStore.edit { it[KEY_LAST_DEVICE] = address }
    }

    companion object {
        const val DEFAULT_HOST = "192.168.0.10"
        const val DEFAULT_PORT = 35000
        private val KEY_WIFI_HOST = stringPreferencesKey("wifi_host")
        private val KEY_WIFI_PORT = intPreferencesKey("wifi_port")
        private val KEY_LAST_DEVICE = stringPreferencesKey("last_device")
    }
}
