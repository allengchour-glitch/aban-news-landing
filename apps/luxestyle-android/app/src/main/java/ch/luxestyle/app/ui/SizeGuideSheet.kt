package ch.luxestyle.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.data.SizeChart
import ch.luxestyle.app.data.SizeGuide

/** Grössentabelle als eigenes Blatt – gewählte Grösse hervorgehoben. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SizeGuideSheet(guide: SizeGuide, selected: String?, onClose: () -> Unit) {
    ModalBottomSheet(
        onDismissRequest = onClose,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        SizeGuideContent(guide, selected)
    }
}

@Composable
fun SizeGuideContent(guide: SizeGuide, selected: String?) {
    Column(
        Modifier.fillMaxWidth().verticalScroll(rememberScrollState()).testTag("groessen")
            .padding(horizontal = 20.dp).padding(bottom = 24.dp).navigationBarsPadding(),
    ) {
        Text("Grössentabelle", style = MaterialTheme.typography.headlineSmall)
        Gap(4)
        Text("Körpermasse in cm", style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted)
        guide.charts.forEach { chart ->
            Gap(18)
            chart.title?.let { Text(it, style = MaterialTheme.typography.titleMedium); Gap(8) }
            ChartTable(chart, chart.rowFor(selected))
        }
        guide.notes.forEach { note ->
            Gap(14)
            Text(note, style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted)
        }
    }
}

@Composable
private fun ChartTable(chart: SizeChart, highlight: Int) {
    val c = MaterialTheme.colorScheme
    Column(Modifier.fillMaxWidth().clip(Radius.Card).background(LocalLuxe.current.card)) {
        Row(Modifier.fillMaxWidth().padding(horizontal = 8.dp, vertical = 10.dp)) {
            chart.header.forEach { h ->
                Text(
                    h, Modifier.weight(1f), style = MaterialTheme.typography.labelMedium,
                    color = LocalLuxe.current.muted, textAlign = TextAlign.Center, maxLines = 2,
                )
            }
        }
        chart.rows.forEachIndexed { i, row ->
            HorizontalDivider(color = LocalLuxe.current.line)
            val on = i == highlight
            Row(
                Modifier.fillMaxWidth().background(if (on) c.primary else androidx.compose.ui.graphics.Color.Transparent)
                    .padding(horizontal = 8.dp, vertical = 11.dp),
            ) {
                row.forEachIndexed { j, cell ->
                    Text(
                        cell, Modifier.weight(1f), textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodyMedium,
                        fontWeight = if (j == 0) FontWeight.SemiBold else FontWeight.Normal,
                        color = if (on) c.onPrimary else c.onSurface,
                    )
                }
            }
        }
    }
}
