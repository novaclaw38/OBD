package com.skillhouse.obdscanner.ui.screens

import android.Manifest
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Bluetooth
import androidx.compose.material.icons.filled.Wifi
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.skillhouse.obdscanner.data.ConnectionState
import com.skillhouse.obdscanner.ui.ObdViewModel
import com.skillhouse.obdscanner.ui.theme.ObdDanger

private enum class Medium { BLUETOOTH, WIFI }

@Composable
fun ConnectScreen(vm: ObdViewModel, modifier: Modifier = Modifier) {
    val state by vm.connectionState.collectAsStateWithLifecycle()
    val paired by vm.pairedDevices.collectAsStateWithLifecycle()
    val wifiHost by vm.wifiHost.collectAsStateWithLifecycle()
    val wifiPort by vm.wifiPort.collectAsStateWithLifecycle()
    val bluetoothOn by vm.bluetoothEnabled.collectAsStateWithLifecycle()

    var medium by remember { mutableStateOf(Medium.BLUETOOTH) }

    val permissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestMultiplePermissions(),
    ) { result ->
        if (result.values.all { it }) {
            vm.refreshPairedDevices()
        }
    }

    fun ensureBluetoothPermissionsThenRefresh() {
        val perms = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            arrayOf(Manifest.permission.BLUETOOTH_CONNECT, Manifest.permission.BLUETOOTH_SCAN)
        } else {
            emptyArray()
        }
        if (perms.isEmpty()) {
            vm.refreshPairedDevices()
        } else {
            permissionLauncher.launch(perms)
        }
    }

    LaunchedEffect(medium) {
        if (medium == Medium.BLUETOOTH) ensureBluetoothPermissionsThenRefresh()
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
    ) {
        Text(
            text = "Connect to your car",
            style = MaterialTheme.typography.headlineMedium,
            color = MaterialTheme.colorScheme.onBackground,
        )
        Text(
            text = "Plug an ELM327 dongle into the OBD-II port, switch the ignition to ON, then choose how to connect.",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            modifier = Modifier.padding(top = 6.dp),
        )

        Spacer(Modifier.height(20.dp))

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            MediumToggle(
                label = "Bluetooth",
                icon = Icons.Filled.Bluetooth,
                selected = medium == Medium.BLUETOOTH,
                onClick = { medium = Medium.BLUETOOTH },
                modifier = Modifier.weight(1f),
            )
            MediumToggle(
                label = "Wi-Fi",
                icon = Icons.Filled.Wifi,
                selected = medium == Medium.WIFI,
                onClick = { medium = Medium.WIFI },
                modifier = Modifier.weight(1f),
            )
        }

        Spacer(Modifier.height(16.dp))

        when (medium) {
            Medium.BLUETOOTH -> BluetoothPane(
                bluetoothOn = bluetoothOn,
                paired = paired,
                onRefresh = { ensureBluetoothPermissionsThenRefresh() },
                onConnect = { vm.connectBluetooth(it) },
                connecting = state is ConnectionState.Connecting,
            )

            Medium.WIFI -> WifiPane(
                host = wifiHost,
                port = wifiPort,
                onHostChange = vm::onWifiHostChange,
                onPortChange = vm::onWifiPortChange,
                onConnect = { vm.connectWifi() },
                connecting = state is ConnectionState.Connecting,
            )
        }

        Spacer(Modifier.height(16.dp))
        ConnectionStatusBanner(state)
    }
}

@Composable
private fun MediumToggle(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    selected: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    if (selected) {
        Button(
            onClick = onClick,
            modifier = modifier.height(48.dp),
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.height(18.dp))
            Text("  $label")
        }
    } else {
        OutlinedButton(
            onClick = onClick,
            modifier = modifier.height(48.dp),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = MaterialTheme.colorScheme.onSurfaceVariant,
            ),
        ) {
            Icon(icon, contentDescription = null, modifier = Modifier.height(18.dp))
            Text("  $label")
        }
    }
}

@Composable
private fun BluetoothPane(
    bluetoothOn: Boolean,
    paired: List<com.skillhouse.obdscanner.ui.BondedDevice>,
    onRefresh: () -> Unit,
    onConnect: (String) -> Unit,
    connecting: Boolean,
) {
    Column(Modifier.fillMaxWidth()) {
        if (!bluetoothOn) {
            Text(
                "Bluetooth is off. Turn it on in system settings, then refresh.",
                color = ObdDanger,
                style = MaterialTheme.typography.bodyMedium,
            )
            Spacer(Modifier.height(8.dp))
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                "Paired adapters",
                style = MaterialTheme.typography.titleLarge,
                color = MaterialTheme.colorScheme.onBackground,
            )
            OutlinedButton(onClick = onRefresh) { Text("Refresh") }
        }
        Spacer(Modifier.height(8.dp))
        if (paired.isEmpty()) {
            Text(
                "No paired OBD adapters found. Pair the dongle in Android Bluetooth settings first (its name is usually OBDII, Vgate, or similar; PIN is often 1234 or 0000).",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            paired.forEach { device ->
                Card(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 4.dp)
                        .clickable(enabled = !connecting) { onConnect(device.address) },
                    shape = RoundedCornerShape(12.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
                ) {
                    Column(Modifier.padding(16.dp)) {
                        Text(device.name, style = MaterialTheme.typography.titleLarge, color = MaterialTheme.colorScheme.onSurface)
                        Text(
                            device.address,
                            style = MaterialTheme.typography.bodyMedium.copy(fontFamily = FontFamily.Monospace),
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun WifiPane(
    host: String,
    port: String,
    onHostChange: (String) -> Unit,
    onPortChange: (String) -> Unit,
    onConnect: () -> Unit,
    connecting: Boolean,
) {
    Column(Modifier.fillMaxWidth()) {
        Text(
            "Join the dongle's Wi-Fi network in Android settings first, then confirm its address below (defaults suit most adapters).",
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(Modifier.height(12.dp))
        OutlinedTextField(
            value = host,
            onValueChange = onHostChange,
            label = { Text("Host / IP address") },
            singleLine = true,
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(8.dp))
        OutlinedTextField(
            value = port,
            onValueChange = onPortChange,
            label = { Text("Port") },
            singleLine = true,
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number),
            modifier = Modifier.fillMaxWidth(),
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = onConnect,
            enabled = !connecting,
            modifier = Modifier.fillMaxWidth().height(52.dp),
        ) {
            Text("Connect over Wi-Fi")
        }
    }
}

@Composable
private fun ConnectionStatusBanner(state: ConnectionState) {
    when (state) {
        is ConnectionState.Connecting -> Row(verticalAlignment = Alignment.CenterVertically) {
            CircularProgressIndicator(modifier = Modifier.height(20.dp), strokeWidth = 2.dp)
            Spacer(Modifier.height(8.dp))
            Text(
                "  Connecting to ${state.target}…",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        is ConnectionState.Error -> Card(
            modifier = Modifier.fillMaxWidth(),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        ) {
            Text(
                state.message,
                color = ObdDanger,
                modifier = Modifier.padding(16.dp),
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        else -> {}
    }
}
