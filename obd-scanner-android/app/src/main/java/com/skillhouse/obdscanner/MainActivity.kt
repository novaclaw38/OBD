package com.skillhouse.obdscanner

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.List
import androidx.compose.material.icons.filled.LinkOff
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.DirectionsCar
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import com.skillhouse.obdscanner.data.ConnectionState
import com.skillhouse.obdscanner.ui.ObdViewModel
import com.skillhouse.obdscanner.ui.screens.ConnectScreen
import com.skillhouse.obdscanner.ui.screens.DashboardScreen
import com.skillhouse.obdscanner.ui.screens.DtcScreen
import com.skillhouse.obdscanner.ui.screens.VehicleInfoScreen
import com.skillhouse.obdscanner.ui.theme.ObdScannerTheme
import kotlinx.coroutines.launch

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            ObdScannerTheme {
                val vm: ObdViewModel = viewModel()
                ObdAppRoot(vm)
            }
        }
    }
}

private enum class Tab(val label: String) { DASHBOARD("Live"), CODES("Codes"), VEHICLE("Vehicle") }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun ObdAppRoot(vm: ObdViewModel) {
    val state by vm.connectionState.collectAsStateWithLifecycle()
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    var tab by remember { mutableStateOf(Tab.DASHBOARD) }

    // Surface one-shot repository events (code read/cleared, VIN, errors) as snackbars.
    androidx.compose.runtime.LaunchedEffect(Unit) {
        vm.events.collect { message -> snackbar.showSnackbar(message) }
    }

    val connected = state is ConnectionState.Connected

    Scaffold(
        snackbarHost = { SnackbarHost(snackbar) },
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("OBD Scanner", style = MaterialTheme.typography.titleLarge)
                        if (connected) {
                            Text(
                                (state as ConnectionState.Connected).target,
                                style = MaterialTheme.typography.labelMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                },
                actions = {
                    if (connected) {
                        IconButton(onClick = {
                            vm.disconnect()
                            scope.launch { snackbar.showSnackbar("Disconnected") }
                        }) {
                            Icon(Icons.Filled.LinkOff, contentDescription = "Disconnect")
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.background,
                    titleContentColor = MaterialTheme.colorScheme.onBackground,
                ),
            )
        },
        bottomBar = {
            if (connected) {
                NavigationBar(containerColor = MaterialTheme.colorScheme.surface) {
                    NavigationBarItem(
                        selected = tab == Tab.DASHBOARD,
                        onClick = { tab = Tab.DASHBOARD },
                        icon = { Icon(Icons.Filled.Speed, contentDescription = null) },
                        label = { Text(Tab.DASHBOARD.label) },
                    )
                    NavigationBarItem(
                        selected = tab == Tab.CODES,
                        onClick = { tab = Tab.CODES },
                        icon = { Icon(Icons.AutoMirrored.Filled.List, contentDescription = null) },
                        label = { Text(Tab.CODES.label) },
                    )
                    NavigationBarItem(
                        selected = tab == Tab.VEHICLE,
                        onClick = { tab = Tab.VEHICLE },
                        icon = { Icon(Icons.Filled.DirectionsCar, contentDescription = null) },
                        label = { Text(Tab.VEHICLE.label) },
                    )
                }
            }
        },
    ) { padding ->
        val contentModifier = Modifier.fillMaxSize().padding(padding)
        if (connected) {
            when (tab) {
                Tab.DASHBOARD -> DashboardScreen(vm, contentModifier)
                Tab.CODES -> DtcScreen(vm, contentModifier)
                Tab.VEHICLE -> VehicleInfoScreen(vm, contentModifier)
            }
        } else {
            ConnectScreen(vm, contentModifier)
        }
    }
}
