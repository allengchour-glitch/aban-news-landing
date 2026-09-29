package ch.luxestyle.app.ui

import androidx.annotation.DrawableRes
import androidx.compose.animation.animateContentSize
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.fromHtml
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.Product
import ch.luxestyle.app.data.cleanDescription
import ch.luxestyle.app.data.breadcrumb
import ch.luxestyle.app.data.deliveryWindow
import ch.luxestyle.app.data.sameDepartment
import ch.luxestyle.app.data.Storefront.Sort
import coil3.compose.AsyncImage
import kotlinx.coroutines.launch

@Composable
fun ProductScreen(handle: String) {
    val shop = LocalShop.current
    val loader = rememberLoad(handle) { shop.api.product(handle) }
    when (val s = loader.state) {
        Load.Loading -> Column(Modifier.fillMaxSize()) {
            Shimmer(Modifier.fillMaxWidth().aspectRatio(0.8f))
            Column(Modifier.padding(20.dp)) {
                Shimmer(Modifier.fillMaxWidth(0.8f).height(24.dp).clip(Radius.Small))
                Gap(12)
                Shimmer(Modifier.fillMaxWidth(0.3f).height(20.dp).clip(Radius.Small))
            }
        }
        is Load.Err -> Column(Modifier.fillMaxSize()) {
            ScreenTitle("", back = true)
            ErrorState(s.message, loader.retry)
        }
        is Load.Ok -> ProductDetail(s.value)
    }
}

@Composable
private fun ProductDetail(p: Product) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val scope = rememberCoroutineScope()
    val haptic = LocalHapticFeedback.current
    val wish by shop.wishlist.items.collectAsState()
    var selection by rememberSaveable(p.handle) { mutableStateOf(p.defaultSelection(askFor = SIZE_OPTION)) }
    val variant = p.variantFor(selection)
    val images = p.images.ifEmpty { listOfNotNull(variant?.image) }
    val pager = rememberPagerState { images.size.coerceAtLeast(1) }
    var adding by remember { mutableStateOf(false) }
    val recs = rememberLoad(p.id) { shop.api.recommendations(p.id) }
    val menu = (rememberLoad("menu") { shop.menu() }.state as? Load.Ok)?.value
    val path = remember(menu, p.handle) { menu?.let { breadcrumb(it, p.collections, p.title) }.orEmpty() }
    val category = path.lastOrNull()
    // „Mehr aus …": Bestseller derselben Unterkategorie, ohne das offene Produkt
    val more = rememberLoad(p.id, category?.collectionHandle) {
        val h = category?.collectionHandle ?: return@rememberLoad emptyList()
        shop.api.collection(h, Sort.BEST, null).second.products.filter { it.id != p.id }.take(12)
    }
    var viewer by remember { mutableStateOf<Int?>(null) }
    val guide = remember(p.handle) { p.guide() }
    // Noch nicht gewählt (Grösse wird bewusst nicht vorausgewählt)
    val missingOption = p.missingOption(selection)
    var showGuide by rememberSaveable(p.handle) { mutableStateOf(false) }
    var showBuy by rememberSaveable(p.handle) { mutableStateOf(false) }
    if (showBuy) BuySheet(p, selection, { selection = it }) { showBuy = false }
    LaunchedEffect(p.handle) { shop.recent.seen(p.toCard()) }
    viewer?.let { start -> ImageViewer(images, start) { viewer = null } }
    if (showGuide && guide != null) SizeGuideSheet(guide, selection[SIZE_OPTION]) { showGuide = false }

    // Erst wenn man selbst eine Variante wählt, springt die Galerie zum passenden Bild –
    // beim Öffnen bleibt das Titelbild vorne.
    val initialVariant = remember(p.handle) { variant?.id }
    LaunchedEffect(variant?.id) {
        if (variant?.id == initialVariant) return@LaunchedEffect
        val url = variant?.image?.url ?: return@LaunchedEffect
        val idx = images.indexOfFirst { it.url.substringBefore('?') == url.substringBefore('?') }
        if (idx >= 0 && idx != pager.currentPage) pager.animateScrollToPage(idx)
    }

    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.fillMaxSize().testTag("product"), contentPadding = PaddingValues(bottom = 110.dp)) {
            item {
                Box(Modifier.fillMaxWidth().aspectRatio(0.8f).background(LocalLuxe.current.card)) {
                    HorizontalPager(pager, Modifier.fillMaxSize()) { i ->
                        images.getOrNull(i)?.let {
                            AsyncImage(
                                it.sized(1080), it.alt ?: p.title, contentScale = ContentScale.Crop,
                                modifier = Modifier.fillMaxSize().clickable(onClickLabel = "Vergrössern") { viewer = i },
                            )
                        }
                    }
                    if (images.size > 1) {
                        Row(
                            Modifier.align(Alignment.BottomCenter).padding(bottom = 14.dp)
                                .clip(Radius.Pill).background(MaterialTheme.colorScheme.surface.copy(alpha = 0.85f))
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(5.dp),
                        ) {
                            images.indices.take(12).forEach { i ->
                                Box(
                                    Modifier.size(if (i == pager.currentPage) 16.dp else 6.dp, 6.dp).clip(Radius.Pill)
                                        .background(if (i == pager.currentPage) MaterialTheme.colorScheme.primary else LocalLuxe.current.muted.copy(alpha = 0.5f)),
                                )
                            }
                        }
                    }
                    Row(
                        Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 12.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        IconCircle(R.drawable.ic_back, "Zurück") { nav.back() }
                        Spacer(Modifier.weight(1f))
                        IconCircle(R.drawable.ic_share, "Teilen") { nav.share(p.title, p.url) }
                        Spacer(Modifier.width(8.dp))
                        HeartButton(wish.any { it.handle == p.handle }, { shop.wishlist.toggle(p.toCard()) }, Modifier.size(40.dp))
                    }
                }
            }
            item {
                Column(Modifier.padding(horizontal = 20.dp, vertical = 20.dp)) {
                    if (path.isNotEmpty()) {
                        Breadcrumb(path, lastIsCurrent = false)
                        Gap(6)
                    }
                    Text(p.title, style = MaterialTheme.typography.headlineMedium)
                    Gap(12)
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        val v = variant ?: p.variants.first()
                        Price(v.price, v.compareAt?.takeIf { it.amount > v.price.amount }, big = true)
                        val pct = p.toCard().copy(price = v.price, compareAt = v.compareAt).discountPercent
                        if (pct != null) { Spacer(Modifier.width(10.dp)); Badge("−$pct %", LocalLuxe.current.sale) }
                    }
                    Gap(4)
                    val window = remember(p.handle) { deliveryWindow(p.descriptionHtml)?.substringBefore(" (") }
                    Text(
                        listOfNotNull("Gratis-Versand ab CHF 50", window).joinToString(" · "),
                        style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted,
                    )
                    if (variant != null && !variant.available) {
                        Gap(8)
                        Text("Diese Ausführung ist ausverkauft.", style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.sale)
                    }
                }
            }
            if (p.options.isNotEmpty()) item(key = "optionen") {
                Box(Modifier.padding(horizontal = 20.dp)) {
                    OptionPickers(p, selection, { selection = it }, guide?.let { { showGuide = true } })
                }
            }
            item {
                Column(Modifier.padding(horizontal = 20.dp).fillMaxWidth().clip(Radius.Card).background(MaterialTheme.colorScheme.surfaceVariant).padding(16.dp)) {
                    remember(p.handle) { deliveryWindow(p.descriptionHtml) }?.let { Assurance(R.drawable.ic_truck, it) }
                    Assurance(R.drawable.ic_bag, "Gratis-Versand in der Schweiz ab CHF 50")
                    Assurance(R.drawable.ic_return, "30 Tage Rückgabe")
                    Assurance(R.drawable.ic_shield, "Sicher bezahlen mit TWINT, Karte oder Klarna")
                }
            }
            val html = cleanDescription(p.descriptionHtml)
            if (html.isNotBlank()) item { Description(html) }
            (recs.state as? Load.Ok)?.value?.let { sameDepartment(it, path.firstOrNull()?.collectionHandle) }?.takeIf { it.isNotEmpty() }?.let { cards ->
                item {
                    SectionHeader("Passt dazu")
                    Rail(cards, wish.map { it.handle }.toSet())
                }
            }
            if (category != null) (more.state as? Load.Ok)?.value?.takeIf { it.isNotEmpty() }?.let { cards ->
                item {
                    SectionHeader("Mehr aus ${category.title}", "Alle") { category.collectionHandle?.let { nav.collection(it, category.title) } }
                    Rail(cards, wish.map { it.handle }.toSet())
                }
            }
        }

        // Kaufleiste
        Surface(
            Modifier.align(Alignment.BottomCenter).fillMaxWidth(),
            color = MaterialTheme.colorScheme.surface,
            shadowElevation = 12.dp,
        ) {
            Column(Modifier.navigationBarsPadding()) {
                HorizontalDivider(color = LocalLuxe.current.line)
                Row(Modifier.padding(horizontal = 16.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    val ok = variant?.available == true
                    PillButton(
                        text = when {
                            missingOption != null -> "${missingOption.name} wählen"
                            variant == null -> "Ausführung wählen"
                            !ok -> "Ausverkauft"
                            else -> "In den Warenkorb · ${variant.price.format()}"
                        },
                        enabled = ok || missingOption != null,
                        loading = adding,
                        modifier = Modifier.fillMaxWidth(),
                    ) {
                        if (missingOption != null) {
                            // Grösse und Farbe im Blatt direkt über dem Knopf – kein Suchen auf der Seite
                            showBuy = true
                            return@PillButton
                        }
                        val v = variant ?: return@PillButton
                        adding = true
                        scope.launch {
                            runCatching { shop.cart.add(v.id) }
                                .onSuccess {
                                    haptic.performHapticFeedback(HapticFeedbackType.Confirm)
                                    nav.toast("Im Warenkorb", "Ansehen") { nav.cart() }
                                }
                                .onFailure { nav.toast(friendly(it)) }
                            adding = false
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Assurance(@DrawableRes icon: Int, text: String) {
    Row(Modifier.padding(vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
        Icon(painterResource(icon), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(12.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun Description(html: String) {
    var open by rememberSaveable { mutableStateOf(false) }
    val text = remember(html) { AnnotatedString.fromHtml(html) }
    Column(Modifier.padding(horizontal = 20.dp, vertical = 24.dp).animateContentSize()) {
        Text("Beschreibung", style = MaterialTheme.typography.titleLarge)
        Gap(10)
        Text(
            text, style = MaterialTheme.typography.bodyLarge,
            maxLines = if (open) Int.MAX_VALUE else 7, overflow = TextOverflow.Ellipsis,
        )
        Gap(6)
        Text(
            if (open) "Weniger anzeigen" else "Mehr lesen",
            style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary,
            modifier = Modifier.clip(Radius.Small).clickable { open = !open }.padding(vertical = 6.dp),
        )
    }
}
