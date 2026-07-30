package com.skillhouse.obdscanner

import android.app.Application
import com.skillhouse.obdscanner.data.ObdRepository
import com.skillhouse.obdscanner.data.SettingsStore

/**
 * Process-wide singletons. Kept deliberately simple (manual DI) — the app has a
 * single repository that must outlive any one screen so the connection survives
 * navigation.
 */
class ObdApp : Application() {
    val repository: ObdRepository by lazy { ObdRepository() }
    val settings: SettingsStore by lazy { SettingsStore(this) }
}
