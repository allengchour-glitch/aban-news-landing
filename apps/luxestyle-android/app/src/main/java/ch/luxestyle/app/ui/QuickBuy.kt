package ch.luxestyle.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.Image
import ch.luxestyle.app.data.Product
import ch.luxestyle.app.data.SizeGuide
import ch.luxestyle.app.data.deliveryWindow
import ch.luxestyle.app.data.sizeGuide
import coil3.compose.AsyncImage
import kotlinx.coroutines.launch

const val SIZE_OPTION = "Grösse"

/** Grössentabelle, nur mit den Grössen, die das Produkt wirklich hat. */
fun Product.guide(): SizeGuide? =
    sizeGuide(descriptionHtml)?.only(options.firstOrNull { it.name == SIZE_OPTION }?.values.orEmpty())

/** Noch offene Wahl (Grösse wird bewusst nicht vorausgewählt). */
fun Product.missingOption(selection: Map<String, String>) =
    options.firstOrNull { it.values.size > 1 && selection[it.name] == null }

/** Alle Optionen eines Produkts: Farben als Bild, sonst Text-Chips. Genutzt auf der Produktseite und im Kauf-Blatt. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun OptionPickers(
    p: Product,
    selection: Map<String, String>,
    onSelect: (Map<String, String>) -> Unit,
    onGuide: (() -> Unit)?,
    highlight: String? = null,
) {
    p.options.forEach { opt ->
        Column(Modifier.padding(bottom = 18.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(opt.name, style = MaterialTheme.typography.titleSmall)
                val chosen = selection[opt.name]
                if (chosen != null) Text(": $chosen", style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted)
                else if (opt.name == highlight) Text("  bitte wählen", style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.sale)
                Spacer(Modifier.weight(1f))
                if (onGuide != null && opt.name == SIZE_OPTION) {
                    Row(
                        Modifier.clip(Radius.Small).clickable(onClickLabel = "Grössentabelle öffnen", onClick = onGuide)
                            .padding(horizontal = 4.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(painterResource(R.drawable.ic_ruler), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(6.dp))
                        Text("Grössentabelle", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary)
                    }
                }
            }
            Gap(10)
            val swatches = remember(p.handle, opt.name) { if (opt.name == SIZE_OPTION) null else p.swatches(opt.name) }
            if (swatches != null) FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                opt.values.forEach { value ->
                    Swatch(
                        swatches.getValue(value), value,
                        selected = selection[opt.name] == value,
                        enabled = p.isValueAvailable(opt.name, value, selection),
                    ) { onSelect(selection + (opt.name to value)) }
                }
            } else FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                opt.values.forEach { value ->
                    ChoiceChip(
                        value,
                        selected = selection[opt.name] == value,
                        enabled = p.isValueAvailable(opt.name, value, selection),
                    ) { onSelect(selection + (opt.name to value)) }
                }
            }
        }
    }
}

/** Ausführung als Bild statt als Text – man sieht sofort, welche gemeint ist. Gewählt: Rahmen + Häkchen. */
@Composable
private fun Swatch(image: Image, label: String, selected: Boolean, enabled: Boolean, onClick: () -> Unit) {
    val c = MaterialTheme.colorScheme
    Box(
        Modifier.size(62.dp, 78.dp).clip(Radius.Small)
            .border(if (selected) 2.dp else 1.dp, if (selected) c.primary else LocalLuxe.current.line, Radius.Small)
            .padding(if (selected) 3.dp else 0.dp).clip(Radius.Small)
            .background(LocalLuxe.current.card)
            .semantics { contentDescription = label + if (enabled) "" else ", ausverkauft" }
            .clickable(role = Role.RadioButton, onClick = onClick),
    ) {
        AsyncImage(
            image.sized(200), null, contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxSize().alpha(if (enabled) 1f else 0.35f),
        )
        if (!enabled) Box(Modifier.align(Alignment.Center).width(44.dp).height(1.5.dp).rotate(-35f).background(c.onSurface.copy(alpha = 0.55f)))
        if (selected) Box(
            Modifier.align(Alignment.TopEnd).padding(3.dp).size(18.dp).clip(CircleShape).background(c.primary),
            contentAlignment = Alignment.Center,
        ) { Icon(painterResource(R.drawable.ic_check), null, Modifier.size(12.dp), tint = c.onPrimary) }
    }
}

/**
 * Kauf-Blatt: Bild, Preis, Lieferzeit und alle Optionen auf einem Blick, darunter der Knopf.
 * Die Auswahl gehört dem Aufrufer – auf der Produktseite bleibt sie nach dem Schliessen erhalten.
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BuySheet(p: Product, selection: Map<String, String>, onSelect: (Map<String, String>) -> Unit, onClose: () -> Unit) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val haptic = LocalHapticFeedback.current
    val scope = rememberCoroutineScope()
    var adding by remember { mutableStateOf(false) }
    var showGuide by remember { mutableStateOf(false) }
    val guide = remember(p.handle) { p.guide() }
    val variant = p.variantFor(selection)
    val missing = p.missingOption(selection)
    val shown = variant?.image ?: p.images.firstOrNull()
    if (showGuide && guide != null) SizeGuideSheet(guide, selection[SIZE_OPTION]) { showGuide = false }

    ModalBottomSheet(
        onDismissRequest = onClose,
        sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true),
        containerColor = MaterialTheme.colorScheme.surface,
    ) {
        Column(Modifier.fillMaxWidth().testTag("kaufblatt").navigationBarsPadding().padding(horizontal = 20.dp).padding(bottom = 16.dp)) {
            Row {
                Box(Modifier.size(76.dp, 95.dp).clip(Radius.Small).background(LocalLuxe.current.card)) {
                    shown?.let { AsyncImage(it.sized(240), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
                }
                Spacer(Modifier.width(14.dp))
                Column(Modifier.weight(1f)) {
                    Text(p.title, style = MaterialTheme.typography.titleMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                    Gap(6)
                    val v = variant ?: p.variants.first()
                    Price(v.price, v.compareAt?.takeIf { it.amount > v.price.amount })
                    remember(p.handle) { deliveryWindow(p.descriptionHtml)?.substringBefore(" (") }?.let {
                        Gap(4)
                        Text(it, style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted)
                    }
                }
            }
            Gap(18)
            Column(Modifier.weight(1f, fill = false).verticalScroll(rememberScrollState())) {
                OptionPickers(p, selection, onSelect, guide?.let { { showGuide = true } }, highlight = missing?.name)
            }
            if (variant != null && !variant.available) {
                Text("Diese Ausführung ist ausverkauft.", style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.sale)
                Gap(8)
            }
            PillButton(
                text = when {
                    missing != null -> "Bitte ${missing.name} wählen"
                    variant == null -> "Ausführung wählen"
                    !variant.available -> "Ausverkauft"
                    else -> "In den Warenkorb · ${variant.price.format()}"
                },
                enabled = missing == null && variant?.available == true,
                loading = adding,
                modifier = Modifier.fillMaxWidth().testTag("kaufblatt-knopf"),
            ) {
                val v = variant ?: return@PillButton
                adding = true
                scope.launch {
                    runCatching { shop.cart.add(v.id) }
                        .onSuccess {
                            haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                            onClose()
                            nav.toast("Im Warenkorb", "Ansehen") { nav.cart() }
                        }
                        .onFailure { nav.toast(friendly(it)) }
                    adding = false
                }
            }
        }
    }
}

/** Kauf-Blatt ab einer Produktkarte: lädt das Produkt und merkt sich die Auswahl selbst. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickBuy(handle: String, onClose: () -> Unit) {
    val shop = LocalShop.current
    val loader = rememberLoad("quick", handle) { shop.api.product(handle) }
    when (val s = loader.state) {
        is Load.Ok -> {
            var selection by remember(handle) { mutableStateOf(s.value.defaultSelection(askFor = SIZE_OPTION)) }
            BuySheet(s.value, selection, { selection = it }, onClose)
        }
        is Load.Err -> {
            val nav = LocalNav.current
            LaunchedEffect(s) { nav.toast(s.message); onClose() }
        }
        Load.Loading -> ModalBottomSheet(onDismissRequest = onClose, containerColor = MaterialTheme.colorScheme.surface) {
            Box(Modifier.fillMaxWidth().height(220.dp), contentAlignment = Alignment.Center) { CenterSpinner() }
        }
    }
}
