package com.skillhouse.obdscanner.ui.screens

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.skillhouse.obdscanner.data.ConnectionState
import com.skillhouse.obdscanner.ui.ObdViewModel
import com.skillhouse.obdscanner.ui.components.formatValue

@Composable
fun VehicleInfoScreen(vm: ObdViewModel, modifier: Modifier = Modifier) {
    val vehicle by vm.vehicleInfo.collectAsStateWithLifecycle()
    val state by vm.connectionState.collectAsStateWithLifecycle()
    val busy by vm.busy.collectAsStateWithLifecycle()

    val target = (state as? ConnectionState.Connected)?.target ?: "—"

    Column(modifier = modifier.fillMaxSize().padding(16.dp)) {
        InfoCard("Adapter", target)
        Spacer(Modifier.height(12.dp))
        InfoCard("OBD Protocol", vehicle.protocol?.ifBlank { "Auto-detected" } ?: "Auto-detected")
        Spacer(Modifier.height(12.dp))
        InfoCard(
            "Battery / Module Voltage",
            vehicle.batteryVoltage?.let { "${formatValue(it)} V" } ?: "Reading…",
        )
        Spacer(Modifier.height(12.dp))
        InfoCard("VIN", vehicle.vin ?: "Not read yet", mono = true)

        Spacer(Modifier.height(20.dp))
        Button(
            onClick = { vm.readVin() },
            enabled = !busy,
            modifier = Modifier.fillMaxWidth().height(50.dp),
        ) {
            Text("Read VIN")
        }
    }
}

@Composable
private fun InfoCard(label: String, value: String, mono: Boolean = false) {
    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
    ) {
        Column(Modifier.padding(16.dp)) {
            Text(
                label.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Text(
                value,
                style = if (mono) {
                    MaterialTheme.typography.titleLarge.copy(fontFamily = FontFamily.Monospace)
                } else {
                    MaterialTheme.typography.titleLarge
                },
                color = MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.padding(top = 4.dp),
            )
        }
    }
}
