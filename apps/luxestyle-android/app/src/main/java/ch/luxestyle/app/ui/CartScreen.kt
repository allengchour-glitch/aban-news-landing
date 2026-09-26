package ch.luxestyle.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.Cart
import ch.luxestyle.app.data.CartLine
import ch.luxestyle.app.data.CartRepository
import ch.luxestyle.app.data.Money
import coil3.compose.AsyncImage
import kotlinx.coroutines.launch

/** Wie viel fehlt noch bis zum Gratis-Versand? null = geschafft. */
fun missingForFreeShipping(subtotal: Money): Money? {
    val rest = CartRepository.FREE_SHIPPING_CHF - subtotal.amount
    return if (rest > 0.004) Money(rest, subtotal.currency) else null
}

@Composable
fun CartScreen() {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val cart by shop.cart.cart.collectAsState()
    LaunchedEffect(Unit) { shop.cart.refresh() }

    Column(Modifier.fillMaxSize()) {
        ScreenTitle("Warenkorb")
        val c = cart
        if (c == null || c.lines.isEmpty()) {
            EmptyState(R.drawable.ic_bag, "Dein Warenkorb ist leer", "Schöne Stücke warten schon auf dich.", "Weiter einkaufen", nav::home)
            return
        }
        CartContent(c)
    }
}

@Composable
private fun CartContent(c: Cart) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    var busy by remember { mutableStateOf<String?>(null) }

    fun change(line: CartLine, qty: Int) {
        busy = line.id
        scope.launch {
            runCatching { shop.cart.setQuantity(line.id, qty) }
                .onSuccess {
                    if (qty <= 0) nav.toast("Aus dem Warenkorb entfernt", "Rückgängig") {
                        scope.launch { runCatching { shop.cart.add(line.variantId, line.quantity) }.onFailure { nav.toast(friendly(it)) } }
                    }
                }
                .onFailure { nav.toast(friendly(it)) }
            busy = null
        }
    }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 120.dp)) {
            item { ShippingProgress(c.subtotal) }
            items(c.lines, key = { it.id }) { line ->
                LineRow(line, busy == line.id, onQty = { change(line, it) }, onOpen = { nav.product(line.productHandle) })
                HorizontalDivider(color = LocalLuxe.current.line)
            }
            item { DiscountBox(c) }
            item {
                Column(Modifier.padding(top = 20.dp)) {
                    SummaryRow("Zwischensumme", c.subtotal.format())
                    if (c.total.amount < c.subtotal.amount - 0.004) {
                        SummaryRow("Rabatt", "−" + Money(c.subtotal.amount - c.total.amount, c.total.currency).format(), accent = true)
                    }
                    SummaryRow("Versand", "an der Kasse")
                    Gap(8)
                    HorizontalDivider(color = LocalLuxe.current.line)
                    Gap(8)
                    Row(Modifier.fillMaxWidth()) {
                        Text("Total", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                        Text(c.total.format(), style = MaterialTheme.typography.titleLarge)
                    }
                }
            }
        }
        Column(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(MaterialTheme.colorScheme.surface),
        ) {
            HorizontalDivider(color = LocalLuxe.current.line)
            PillButton(
                "Zur Kasse · ${c.total.format()}",
                modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
            ) { nav.web(c.checkoutUrl, "Kasse") }
        }
    }
}

@Composable
private fun ShippingProgress(subtotal: Money) {
    val missing = missingForFreeShipping(subtotal)
    val progress = (subtotal.amount / CartRepository.FREE_SHIPPING_CHF).toFloat().coerceIn(0f, 1f)
    Column(
        Modifier.fillMaxWidth().padding(vertical = 12.dp).clip(Radius.Card)
            .background(MaterialTheme.colorScheme.surfaceVariant).padding(16.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(painterResource(R.drawable.ic_truck), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Text(
                if (missing == null) "Du hast Gratis-Versand." else "Noch ${missing.format()} bis zum Gratis-Versand",
                style = MaterialTheme.typography.titleSmall,
            )
        }
        Gap(10)
        LinearProgressIndicator(
            progress = { progress },
            modifier = Modifier.fillMaxWidth().height(6.dp).clip(Radius.Pill),
            color = MaterialTheme.colorScheme.secondary,
            trackColor = LocalLuxe.current.line,
            strokeCap = StrokeCap.Round,
            drawStopIndicator = {},
        )
    }
}

@Composable
private fun LineRow(line: CartLine, busy: Boolean, onQty: (Int) -> Unit, onOpen: () -> Unit) {
    Row(Modifier.fillMaxWidth().padding(vertical = 16.dp)) {
        Box(
            Modifier.size(84.dp, 105.dp).clip(Radius.Small).background(LocalLuxe.current.card).clickable(onClick = onOpen),
        ) {
            line.image?.let { AsyncImage(it.sized(240), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
        }
        Spacer(Modifier.width(14.dp))
        Column(Modifier.weight(1f)) {
            Text(line.productTitle, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
            line.variantTitle?.let {
                Gap(2)
                Text(it, style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted)
            }
            Gap(6)
            Text(line.lineTotal.format(), style = MaterialTheme.typography.titleSmall)
            Gap(10)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Row(
                    Modifier.clip(Radius.Pill).border(1.dp, LocalLuxe.current.line, Radius.Pill),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    StepButton(R.drawable.ic_minus, "Weniger", enabled = !busy && line.quantity > 1) { onQty(line.quantity - 1) }
                    Box(Modifier.width(28.dp), contentAlignment = Alignment.Center) {
                        if (busy) CenterSpinner(Modifier.size(14.dp)) else Text("${line.quantity}", style = MaterialTheme.typography.titleSmall)
                    }
                    StepButton(R.drawable.ic_plus, "Mehr", enabled = !busy) { onQty(line.quantity + 1) }
                }
                Spacer(Modifier.weight(1f))
                StepButton(R.drawable.ic_trash, "Entfernen", enabled = !busy) { onQty(0) }
            }
        }
    }
}

@Composable
private fun StepButton(icon: Int, description: String, enabled: Boolean, onClick: () -> Unit) {
    Box(
        Modifier.size(38.dp).clip(Radius.Pill).clickable(enabled = enabled, role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painterResource(icon), description, modifier = Modifier.size(18.dp),
            tint = if (enabled) MaterialTheme.colorScheme.onSurface else LocalLuxe.current.muted.copy(alpha = 0.5f),
        )
    }
}

@Composable
private fun DiscountBox(c: Cart) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val focus = LocalFocusManager.current
    var code by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    fun apply() {
        if (code.isBlank() || busy) return
        busy = true
        focus.clearFocus()
        scope.launch {
            runCatching { shop.cart.applyCode(code) }
                .onSuccess { cart ->
                    val applied = cart?.discountCodes?.firstOrNull { it.first.equals(code.trim(), ignoreCase = true) }
                    nav.toast(if (applied?.second == true) "Code ${applied.first} eingelöst" else "Dieser Code gilt hier nicht")
                    if (applied?.second == true) code = ""
                }
                .onFailure { nav.toast(friendly(it)) }
            busy = false
        }
    }

    Column(Modifier.padding(top = 20.dp)) {
        Row(
            Modifier.fillMaxWidth().height(50.dp).clip(Radius.Pill).background(LocalLuxe.current.card)
                .border(1.dp, LocalLuxe.current.line, Radius.Pill).padding(start = 16.dp, end = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(painterResource(R.drawable.ic_tag), null, tint = LocalLuxe.current.muted, modifier = Modifier.size(18.dp))
            Spacer(Modifier.width(10.dp))
            Box(Modifier.weight(1f)) {
                if (code.isEmpty()) Text("Rabattcode", color = LocalLuxe.current.muted, style = MaterialTheme.typography.bodyMedium)
                BasicTextField(
                    code, { code = it }, singleLine = true,
                    textStyle = MaterialTheme.typography.bodyMedium.copy(color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.secondary),
                    keyboardOptions = KeyboardOptions(capitalization = KeyboardCapitalization.Characters, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { apply() }),
                    modifier = Modifier.fillMaxWidth(),
                )
            }
            Box(
                Modifier.clip(Radius.Pill).background(MaterialTheme.colorScheme.primary)
                    .clickable(enabled = code.isNotBlank() && !busy, onClick = ::apply)
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            ) { Text("Einlösen", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimary) }
        }
        if (c.discountCodes.none { it.second }) {
            Gap(10)
            Row(
                Modifier.clip(Radius.Pill).border(1.dp, MaterialTheme.colorScheme.secondary, Radius.Pill)
                    .clickable(enabled = !busy) { code = WELCOME_CODE; apply() }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Erste Bestellung? ", style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted)
                Text("$WELCOME_CODE einlösen (−10 %)", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
            }
        }
        c.discountCodes.filter { it.second }.forEach { (codeName, _) ->
            Gap(8)
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Code $codeName aktiv", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                Spacer(Modifier.width(8.dp))
                Text(
                    "entfernen", style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted,
                    modifier = Modifier.clickable { scope.launch { runCatching { shop.cart.applyCode("") } } },
                )
            }
        }
    }
}

@Composable
private fun SummaryRow(label: String, value: String, accent: Boolean = false) {
    Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted)
        Text(value, style = MaterialTheme.typography.bodyMedium, color = if (accent) LocalLuxe.current.sale else MaterialTheme.colorScheme.onSurface)
    }
}
