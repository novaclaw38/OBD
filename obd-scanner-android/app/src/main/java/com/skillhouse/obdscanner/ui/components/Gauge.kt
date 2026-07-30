package com.skillhouse.obdscanner.ui.components

import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import com.skillhouse.obdscanner.ui.theme.ObdAccent
import com.skillhouse.obdscanner.ui.theme.ObdDanger
import com.skillhouse.obdscanner.ui.theme.ObdSurfaceVariant
import com.skillhouse.obdscanner.ui.theme.ObdWarning
import kotlin.math.cos
import kotlin.math.sin

/**
 * A 270° arc gauge. The sweep colour shifts amber then red as the value nears the
 * top of its range so a driver reads "getting hot / high" without parsing digits.
 */
@Composable
fun ArcGauge(
    label: String,
    value: Double?,
    unit: String,
    min: Double,
    max: Double,
    modifier: Modifier = Modifier,
) {
    val fraction = when {
        value == null -> 0f
        max <= min -> 0f
        else -> ((value - min) / (max - min)).toFloat().coerceIn(0f, 1f)
    }
    val animated by animateFloatAsState(targetValue = fraction, label = "gauge")

    val sweepColor = when {
        fraction >= 0.9f -> ObdDanger
        fraction >= 0.75f -> ObdWarning
        else -> ObdAccent
    }

    val startAngle = 135f
    val totalSweep = 270f

    Column(
        modifier = modifier.padding(8.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(contentAlignment = Alignment.Center) {
            Canvas(
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(1f),
            ) {
                val stroke = size.minDimension * 0.09f
                val arcSize = Size(size.minDimension - stroke, size.minDimension - stroke)
                val topLeft = Offset(
                    (size.width - arcSize.width) / 2f,
                    (size.height - arcSize.height) / 2f,
                )

                // Track
                drawArc(
                    color = ObdSurfaceVariant,
                    startAngle = startAngle,
                    sweepAngle = totalSweep,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )
                // Value fill
                drawArc(
                    color = sweepColor,
                    startAngle = startAngle,
                    sweepAngle = totalSweep * animated,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = Stroke(width = stroke, cap = StrokeCap.Round),
                )

                // Needle
                val needleAngle = Math.toRadians((startAngle + totalSweep * animated).toDouble())
                val radius = arcSize.width / 2f
                val cx = size.width / 2f
                val cy = size.height / 2f
                drawLine(
                    color = Color.White,
                    start = Offset(cx, cy),
                    end = Offset(
                        cx + (radius * 0.72f) * cos(needleAngle).toFloat(),
                        cy + (radius * 0.72f) * sin(needleAngle).toFloat(),
                    ),
                    strokeWidth = stroke * 0.35f,
                    cap = StrokeCap.Round,
                )
            }

            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text(
                    text = value?.let { formatValue(it) } ?: "—",
                    style = MaterialTheme.typography.displaySmall,
                    color = MaterialTheme.colorScheme.onSurface,
                )
                Text(
                    text = unit,
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
        }
        Text(
            text = label.uppercase(),
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            textAlign = TextAlign.Center,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

/** Show whole numbers without a decimal, fractional values to one decimal. */
fun formatValue(v: Double): String {
    return if (v == v.toLong().toDouble()) {
        v.toLong().toString()
    } else {
        String.format("%.1f", v)
    }
}
