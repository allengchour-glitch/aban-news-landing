package ch.luxestyle.app.ui

import androidx.annotation.DrawableRes
import coil3.compose.AsyncImage
import ch.luxestyle.app.data.priceEntries
import ch.luxestyle.app.data.pickCategories
import ch.luxestyle.app.data.onSale
import ch.luxestyle.app.data.Image
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.runtime.produceState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.pulltorefresh.PullToRefreshBox
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.withStyle
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.HomeData
import ch.luxestyle.app.data.MenuItem
import ch.luxestyle.app.data.ProductCard
import ch.luxestyle.app.data.RailSpec
import androidx.compose.foundation.Image
import androidx.compose.ui.BiasAlignment
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.text.AnnotatedString
import java.util.Calendar

/** Saison-Kollektion fürs Titelbild – wechselt von selbst mit dem Kalender. */
fun seasonFor(month: Int): Pair<String, String> = when (month) {
    3, 4, 5 -> "neu-eingetroffen" to "Frühling"
    6, 7, 8 -> "sommer" to "Sommer"
    9, 10 -> "jacken-outdoor" to "Herbst"
    11, 12 -> "premium-geschenke" to "Geschenkzeit"
    else -> "jacken-outdoor" to "Winter"
}

const val WELCOME_CODE = "WELCOME10"

/** Halloween-Reihe weit oben ab Mitte September bis 31. Oktober. */
fun isHalloweenTime(month: Int, day: Int): Boolean = month == 10 || (month == 9 && day >= 15)

/** Glücksbringer-Schmuck (Kleeblatt, Hufeisen, „Fortune") – im Shop gibt es dafür keine eigene Kollektion. */
val LUCK_RAIL = RailSpec(
    handle = "gluecksbringer",
    title = "Glücksbringer",
    query = "(title:*Glück* OR title:*Fortun* OR title:*Kleeblatt* OR title:*Hufeisen*) AND tag:schmuck",
    searchTerm = "Glück",
)

/**
 * Reihen der Startseite, Mode zuerst (Neuheiten und Bestbewertet des ganzen Shops sind oft Technik
 * und Haustier – die kommen weiter unten). Technik/Kinder/Sport bleiben über die Bereiche oben erreichbar.
 */
fun homeRails(seasonHandle: String, halloween: Boolean = false): List<RailSpec> = listOfNotNull(
    RailSpec("damen-mode", newest = true, title = "Neu bei Damen"),
    RailSpec("halloween").takeIf { halloween },
    RailSpec(seasonHandle),
    RailSpec("schmuck-uhren"),
    LUCK_RAIL,
    RailSpec("damen-mode", title = "Beliebt bei Damen"),
    RailSpec("schuhe"),
    RailSpec("fur-ihn"),
    RailSpec("bestseller"),
    RailSpec("neu-eingetroffen", newest = true),
    RailSpec("beauty-pflege"),
    RailSpec("wohnen-dekoration"),
    RailSpec("premium-geschenke"),
).distinctBy { it.handle to it.newest }

/** Beliebte Unterkategorien als Bildkacheln (Titel wie im Shop-Menü). */
private val FEATURED = listOf("Kleider", "Halsketten", "Taschen & Rucksäcke", "Damenschuhe", "Uhren", "Hautpflege & Skincare")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen() {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val (seasonHandle, seasonLabel) = androidx.compose.runtime.remember { seasonFor(Calendar.getInstance().get(Calendar.MONTH) + 1) }
    val halloween = androidx.compose.runtime.remember {
        Calendar.getInstance().let { isHalloweenTime(it.get(Calendar.MONTH) + 1, it.get(Calendar.DAY_OF_MONTH)) }
    }
    val home = rememberLoad("home") { shop.api.home(seasonHandle, homeRails(seasonHandle, halloween)) }
    val menu = rememberLoad("menu") { shop.menu() }
    val liked by shop.wishlist.items.collectAsState()
    val recent by shop.recent.items.collectAsState()

    // Nach unten ziehen: Reihen neu laden, die sichtbaren bleiben so lange stehen
    PullToRefreshBox(isRefreshing = home.refreshing, onRefresh = home.retry, modifier = Modifier.fillMaxSize()) {
    LazyColumn(Modifier.fillMaxSize().testTag("home"), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { TopBar() }
        item { SearchPill { nav.search() } }
        // Titelbild ist fest in der App: erscheint sofort, auch bei langsamem Netz
        item {
            val season = (home.state as? Load.Ok)?.value?.season
            Hero(seasonLabel) { nav.collection(seasonHandle, season?.title) }
        }
        val menuItems = (menu.state as? Load.Ok)?.value.orEmpty()
        if (menuItems.isNotEmpty()) item(key = "bereiche") { Departments(menuItems) }
        item { WelcomeBand() }
        when (val s = home.state) {
            Load.Loading -> item { RailSkeleton() }
            is Load.Err -> item { Box(Modifier.height(320.dp)) { ErrorState(s.message, home.retry) } }
            is Load.Ok -> {
                item { Promises() }
                if (recent.size >= 2) {
                    item(key = "recent") {
                        SectionHeader("Zuletzt angesehen")
                        Rail(recent, liked.map { it.handle }.toSet())
                    }
                }
                val likedHandles = liked.map { it.handle }.toSet()
                val sale = onSale(s.value.rails.flatMap { it.second })
                val specs = homeRails(seasonHandle, halloween).associateBy { it.handle to it.title }
                val seasonAt = s.value.rails.indexOfFirst { it.first.handle == seasonHandle }
                val tilesAt = s.value.rails.indexOfFirst { it.first.title == "Beliebt bei Damen" }
                s.value.rails.forEachIndexed { i, (info, cards) ->
                    item(key = "rail-$i") {
                        val term = specs[info.handle to info.title]?.searchTerm
                        SectionHeader(info.title, "Alle") {
                            if (term != null) nav.search(term) else nav.collection(info.handle, info.title)
                        }
                        Rail(cards, likedHandles)
                    }
                    // Zwischen die Reihen: Preis-Einstiege und Bildkacheln, damit die Seite nicht nur aus Reihen besteht
                    if (i == seasonAt && sale.size >= 4) item(key = "reduziert") {
                        SectionHeader("Reduziert")
                        Rail(sale, likedHandles)
                    }
                    if (i == seasonAt) priceEntries(menuItems).takeIf { it.size >= 2 }?.let { entries ->
                        item(key = "preise") { PriceEntries(entries) }
                    }
                    if (i == tilesAt) pickCategories(menuItems, FEATURED).takeIf { it.size >= 3 }?.let { cats ->
                        item(key = "kacheln") { FeaturedCategories(cats) }
                    }
                }
                item { Footer() }
            }
        }
    }
    }
}

@Composable
private fun TopBar() {
    val nav = LocalNav.current
    Row(
        Modifier.fillMaxWidth().statusBarsPadding().padding(start = 20.dp, end = 8.dp, top = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            buildAnnotatedString {
                append("LuxeStyle")
                withStyle(SpanStyle(color = MaterialTheme.colorScheme.secondary)) { append(".ch") }
            },
            style = MaterialTheme.typography.headlineMedium,
            modifier = Modifier.weight(1f),
        )
        Box(
            Modifier.size(44.dp).clip(Radius.Pill).clickable(role = Role.Button) { nav.account() },
            contentAlignment = Alignment.Center,
        ) { Icon(painterResource(R.drawable.ic_person), "Mein Konto", Modifier.size(24.dp)) }
    }
}

@Composable
private fun SearchPill(onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp).height(48.dp)
            .clip(Radius.Pill).background(LocalLuxe.current.card)
            .border(1.dp, LocalLuxe.current.line, Radius.Pill)
            .clickable(role = Role.Button, onClick = onClick).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(R.drawable.ic_search), null, tint = LocalLuxe.current.muted, modifier = Modifier.size(20.dp))
        Spacer(Modifier.width(10.dp))
        Text("Kleider, Schmuck, Taschen …", color = LocalLuxe.current.muted, style = MaterialTheme.typography.bodyMedium)
    }
}

@Composable
private fun Hero(season: String, onClick: () -> Unit) {
    Box(
        Modifier.padding(horizontal = 16.dp).fillMaxWidth().aspectRatio(0.82f).clip(Radius.Card)
            .clickable(role = Role.Button, onClickLabel = "$season entdecken", onClick = onClick),
    ) {
        Image(
            painterResource(R.drawable.hero_editorial), null,
            contentScale = ContentScale.Crop, alignment = BiasAlignment(-0.05f, -0.4f),
            modifier = Modifier.fillMaxSize(),
        )
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(0.5f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.55f)),
            ),
        )
        Column(Modifier.align(Alignment.BottomStart).padding(22.dp)) {
            Text("${season.uppercase()} · SCHWEIZER SHOP", style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.9f))
            Spacer(Modifier.height(8.dp))
            Text("Premium-Style.\nSchweizer Shop.", style = MaterialTheme.typography.displaySmall, color = Color.White)
            Spacer(Modifier.height(16.dp))
            Box(
                Modifier.clip(Radius.Pill).background(Color.White).padding(horizontal = 22.dp, vertical = 12.dp),
            ) { Text("$season entdecken", style = MaterialTheme.typography.labelLarge, color = Color(0xFF2B2B2B)) }
        }
    }
}

/** Neukunden-Rabatt sichtbar machen – der Code ist im Shop aktiv (10 %, einmal pro Kunde). */
@Composable
private fun WelcomeBand() {
    val nav = LocalNav.current
    val clipboard = LocalClipboardManager.current
    Row(
        Modifier.padding(horizontal = 16.dp).padding(bottom = 16.dp).fillMaxWidth().clip(Radius.Card)
            .background(MaterialTheme.colorScheme.primary)
            .clickable(role = Role.Button, onClickLabel = "Code kopieren") {
                clipboard.setText(AnnotatedString(WELCOME_CODE))
                nav.toast("Code kopiert – im Warenkorb mit einem Tipp einlösbar")
            }
            .padding(horizontal = 18.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(Modifier.weight(1f)) {
            Text("−10 % auf deine erste Bestellung", style = MaterialTheme.typography.titleSmall, color = MaterialTheme.colorScheme.onPrimary)
            Spacer(Modifier.height(2.dp))
            Text("Einfach an der Kasse einlösen", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onPrimary.copy(alpha = 0.75f))
        }
        Box(
            Modifier.clip(Radius.Small).border(1.dp, MaterialTheme.colorScheme.secondary, Radius.Small)
                .padding(horizontal = 10.dp, vertical = 6.dp),
        ) { Text(WELCOME_CODE, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.onPrimary) }
    }
}

@Composable
private fun RailSkeleton() {
    Column(Modifier.padding(horizontal = 16.dp, vertical = 24.dp)) {
        Shimmer(Modifier.fillMaxWidth(0.5f).height(22.dp).clip(Radius.Small))
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(2) { TileSkeleton(Modifier.weight(1f)) }
        }
    }
}

/** Alle Bereiche des Shops als runde Bilder – ein Wisch, und man sieht, was es gibt. */
@Composable
private fun Departments(items: List<MenuItem>) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val tops = items.filter { it.collectionHandle != null }
    val images by produceState(emptyMap<String, Image?>(), tops) {
        val missing = tops.filter { it.image == null }.mapNotNull { it.collectionHandle }
        if (missing.isNotEmpty()) value = runCatching { shop.collectionImages(missing) }.getOrDefault(emptyMap())
    }
    LazyRow(
        Modifier.testTag("bereiche"),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items(tops, key = { it.url }) { m ->
            val image = m.image ?: images[m.collectionHandle]
            Column(
                Modifier.width(74.dp).clip(Radius.Small)
                    .clickable(role = Role.Button) { m.collectionHandle?.let { nav.collection(it, m.title) } },
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Box(
                    Modifier.size(68.dp).clip(CircleShape).background(LocalLuxe.current.card)
                        .border(1.dp, LocalLuxe.current.line, CircleShape),
                ) {
                    image?.let { AsyncImage(it.sized(200), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
                }
                Spacer(Modifier.height(6.dp))
                Text(
                    m.title, style = MaterialTheme.typography.labelSmall, textAlign = TextAlign.Center,
                    maxLines = 2, overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

/** „Unter CHF 20", „bis CHF 30" … – echte Kollektionen aus dem Menü. */
@Composable
private fun PriceEntries(entries: List<Pair<String, MenuItem>>) {
    val nav = LocalNav.current
    Column(Modifier.padding(top = 28.dp)) {
        Text("Nach Budget", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(horizontal = 16.dp))
        Spacer(Modifier.height(12.dp))
        LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            items(entries, key = { it.second.url }) { (label, m) ->
                Column(
                    Modifier.width(118.dp).clip(Radius.Card).background(MaterialTheme.colorScheme.surfaceVariant)
                        .clickable(role = Role.Button) { m.collectionHandle?.let { nav.collection(it, m.title) } }
                        .padding(horizontal = 14.dp, vertical = 16.dp),
                ) {
                    Text(label.substringBefore(" CHF").replaceFirstChar { it.uppercase() }, style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted)
                    Text("CHF " + label.substringAfter("CHF ").trim(), style = MaterialTheme.typography.titleLarge)
                }
            }
        }
    }
}

/** Beliebte Unterkategorien als Bildkacheln, drei pro Zeile. */
@Composable
private fun FeaturedCategories(cats: List<MenuItem>) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val handles = cats.mapNotNull { it.collectionHandle }
    val images by produceState(emptyMap<String, Image?>(), handles) {
        value = runCatching { shop.collectionImages(handles) }.getOrDefault(emptyMap())
    }
    Column(Modifier.padding(top = 28.dp).testTag("kacheln")) {
        Text("Beliebte Kategorien", style = MaterialTheme.typography.titleLarge, modifier = Modifier.padding(horizontal = 16.dp))
        Spacer(Modifier.height(12.dp))
        cats.chunked(3).forEach { row ->
            Row(Modifier.padding(horizontal = 16.dp).padding(bottom = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                row.forEach { m ->
                    Box(Modifier.weight(1f)) {
                        SubTile(m, images[m.collectionHandle]) { m.collectionHandle?.let { nav.collection(it, m.title) } }
                    }
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
private fun Promises() {
    Row(
        Modifier.padding(horizontal = 16.dp).fillMaxWidth().clip(Radius.Card)
            .background(MaterialTheme.colorScheme.surfaceVariant).padding(vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        Promise(R.drawable.ic_truck, "Gratis-Versand", "ab CHF 45")
        Promise(R.drawable.ic_return, "30 Tage", "Rückgabe")
        Promise(R.drawable.ic_shield, "TWINT & Karte", "sicher bezahlen")
    }
}

@Composable
private fun Promise(@DrawableRes icon: Int, title: String, sub: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(painterResource(icon), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(22.dp))
        Spacer(Modifier.height(6.dp))
        Text(title, style = MaterialTheme.typography.labelMedium)
        Text(sub, style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted)
    }
}

@Composable
fun Rail(cards: List<ProductCard>, liked: Set<String>, note: (ProductCard) -> String? = { null }) {
    val nav = LocalNav.current
    val wishlist = LocalShop.current.wishlist
    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        items(cards, key = { it.id }) { card ->
            ProductTile(
                card, liked = card.handle in liked, onLike = { wishlist.toggle(card) },
                onClick = { nav.product(card.handle) }, modifier = Modifier.width(158.dp), note = note(card),
            )
        }
    }
}

@Composable
private fun Footer() {
    val nav = LocalNav.current
    Column(Modifier.fillMaxWidth().padding(top = 36.dp, start = 20.dp, end = 20.dp), horizontalAlignment = Alignment.CenterHorizontally) {
        Text("Fragen zur Bestellung?", style = MaterialTheme.typography.titleMedium)
        Spacer(Modifier.height(4.dp))
        Text("info@luxestyle.ch", color = MaterialTheme.colorScheme.secondary, style = MaterialTheme.typography.bodyMedium)
        Spacer(Modifier.height(16.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
            FooterLink("Versand") { nav.web("https://luxestyle.ch/policies/shipping-policy", "Versand") }
            FooterLink("Rückgabe") { nav.web("https://luxestyle.ch/policies/refund-policy", "Rückgabe") }
            FooterLink("Datenschutz") { nav.web("https://luxestyle.ch/policies/privacy-policy", "Datenschutz") }
            FooterLink("AGB") { nav.web("https://luxestyle.ch/policies/terms-of-service", "AGB") }
        }
    }
}

@Composable
private fun FooterLink(text: String, onClick: () -> Unit) {
    Text(
        text, style = MaterialTheme.typography.bodySmall, color = LocalLuxe.current.muted,
        modifier = Modifier.clip(Radius.Small).clickable(onClick = onClick).padding(4.dp),
    )
}
