package com.skillhouse.obdscanner.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.skillhouse.obdscanner.protocol.Pid
import com.skillhouse.obdscanner.ui.ObdViewModel
import com.skillhouse.obdscanner.ui.components.ArcGauge
import com.skillhouse.obdscanner.ui.components.MetricCard
import com.skillhouse.obdscanner.ui.components.formatValue

// Sensors that deserve a large dial; everything else renders as a compact tile.
private val GAUGE_KEYS = listOf("rpm", "speed", "coolant", "load")

@Composable
fun DashboardScreen(vm: ObdViewModel, modifier: Modifier = Modifier) {
    val readings by vm.readings.collectAsStateWithLifecycle()
    val supported by vm.supportedPids.collectAsStateWithLifecycle()
    val vehicle by vm.vehicleInfo.collectAsStateWithLifecycle()

    val gaugePids = supported.filter { it.key in GAUGE_KEYS }
        .sortedBy { GAUGE_KEYS.indexOf(it.key) }
    val tilePids = supported.filter { it.key !in GAUGE_KEYS }

    if (supported.isEmpty()) {
        Text(
            "Reading available sensors…",
            modifier = modifier.padding(24.dp),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        return
    }

    LazyVerticalGrid(
        columns = GridCells.Fixed(2),
        modifier = modifier.fillMaxSize(),
        contentPadding = PaddingValues(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(gaugePids, key = { it.key }, span = { GridItemSpan(1) }) { pid ->
            ArcGauge(
                label = pid.label,
                value = readings[pid.key]?.value,
                unit = pid.unit,
                min = pid.min,
                max = pid.max,
                modifier = Modifier.fillMaxWidth(),
            )
        }

        // Battery voltage always spans as a highlighted tile when known.
        vehicle.batteryVoltage?.let { v ->
            item(key = "battery", span = { GridItemSpan(2) }) {
                MetricCard(
                    label = "Battery / Module Voltage",
                    value = formatValue(v),
                    unit = "V",
                    modifier = Modifier.fillMaxWidth(),
                )
            }
        }

        items(tilePids, key = { it.key }) { pid ->
            MetricCard(
                label = pid.label,
                value = readings[pid.key]?.value?.let { formatValue(it) } ?: "—",
                unit = pid.unit,
                modifier = Modifier.fillMaxWidth(),
            )
        }
    }
}
