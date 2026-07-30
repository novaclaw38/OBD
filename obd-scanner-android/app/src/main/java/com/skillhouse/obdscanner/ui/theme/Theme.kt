package com.skillhouse.obdscanner.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

private val DarkColors = darkColorScheme(
    primary = ObdAccent,
    onPrimary = ObdBackground,
    primaryContainer = ObdAccentDim,
    onPrimaryContainer = ObdBackground,
    secondary = ObdInfo,
    background = ObdBackground,
    onBackground = ObdOnSurface,
    surface = ObdSurface,
    onSurface = ObdOnSurface,
    surfaceVariant = ObdSurfaceVariant,
    onSurfaceVariant = ObdOnSurfaceMuted,
    error = ObdDanger,
    onError = ObdOnSurface,
)

private val ObdTypography = Typography(
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 26.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.SemiBold,
        fontSize = 20.sp,
    ),
    // Monospace tabular figures keep numeric readouts from jittering as they update.
    displaySmall = TextStyle(
        fontFamily = FontFamily.Monospace,
        fontWeight = FontWeight.Bold,
        fontSize = 34.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.Default,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        letterSpacing = 0.5.sp,
    ),
)

/**
 * The app is intentionally dark-only — an instrument cluster read at a glance in
 * a moving vehicle should not flip to a bright white screen. We therefore ignore
 * the system light/dark setting by design.
 */
@Composable
fun ObdScannerTheme(
    @Suppress("UNUSED_PARAMETER") darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography = ObdTypography,
        content = content,
    )
}
