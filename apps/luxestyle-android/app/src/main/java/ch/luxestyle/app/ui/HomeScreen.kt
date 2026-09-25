package ch.luxestyle.app.ui

import androidx.annotation.DrawableRes
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
import androidx.compose.material3.Icon
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
import ch.luxestyle.app.data.CollectionInfo
import ch.luxestyle.app.data.HomeData
import ch.luxestyle.app.data.MenuItem
import ch.luxestyle.app.data.ProductCard
import coil3.compose.AsyncImage
import java.util.Calendar

/** Saison-Kollektion fürs Titelbild – wechselt von selbst mit dem Kalender. */
fun seasonFor(month: Int): Pair<String, String> = when (month) {
    3, 4, 5 -> "neu-eingetroffen" to "Frühling"
    6, 7, 8 -> "sommer" to "Sommer"
    9, 10 -> "jacken-outdoor" to "Herbst"
    11, 12 -> "premium-geschenke" to "Geschenkzeit"
    else -> "jacken-outdoor" to "Winter"
}

/** Mode zuerst: Reihen, die zum Shop passen (Kollektionen mit Technik/Haustier bleiben in den Kategorien). */
private val RAILS = listOf("damen-mode", "sub-halsketten", "sub-taschen", "premium-geschenke")

@Composable
fun HomeScreen() {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val (seasonHandle, seasonLabel) = androidx.compose.runtime.remember { seasonFor(Calendar.getInstance().get(Calendar.MONTH) + 1) }
    val home = rememberLoad("home") { shop.api.home(seasonHandle, RAILS.filter { it != seasonHandle }) }
    val menu = rememberLoad("menu") { shop.api.menu() }
    val liked by shop.wishlist.items.collectAsState()
    val recent by shop.recent.items.collectAsState()

    LazyColumn(Modifier.fillMaxSize().testTag("home"), contentPadding = PaddingValues(bottom = 24.dp)) {
        item { TopBar() }
        item { SearchPill { nav.search() } }
        when (val s = home.state) {
            Load.Loading -> item { HeroSkeleton() }
            is Load.Err -> item { Box(Modifier.height(420.dp)) { ErrorState(s.message, home.retry) } }
            is Load.Ok -> {
                s.value.season?.let { season -> item { Hero(season, seasonLabel) { nav.collection(season.handle, season.title) } } }
                (menu.state as? Load.Ok)?.value?.let { items -> item { CategoryChips(items) } }
                item { Promises() }
                if (recent.size >= 2) {
                    item(key = "recent") {
                        SectionHeader("Zuletzt angesehen")
                        Rail(recent, liked.map { it.handle }.toSet())
                    }
                }
                s.value.rails.forEach { (info, cards) ->
                    item(key = info.handle) {
                        SectionHeader(info.title, "Alle") { nav.collection(info.handle, info.title) }
                        Rail(cards, liked.map { it.handle }.toSet())
                    }
                }
                item { Footer() }
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
private fun Hero(c: CollectionInfo, label: String, onClick: () -> Unit) {
    Box(
        Modifier.padding(horizontal = 16.dp).fillMaxWidth().aspectRatio(0.95f).clip(Radius.Card)
            .background(MaterialTheme.colorScheme.surfaceVariant).clickable(role = Role.Button, onClick = onClick),
    ) {
        c.image?.let {
            AsyncImage(it.sized(1080), c.title, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(0.45f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.62f)),
            ),
        )
        Column(Modifier.align(Alignment.BottomStart).padding(20.dp)) {
            Text(label.uppercase(), style = MaterialTheme.typography.labelSmall, color = Color.White.copy(alpha = 0.85f))
            Spacer(Modifier.height(6.dp))
            Text(c.title, style = MaterialTheme.typography.displaySmall, color = Color.White)
            Spacer(Modifier.height(14.dp))
            Box(
                Modifier.clip(Radius.Pill).background(Color.White).padding(horizontal = 20.dp, vertical = 11.dp),
            ) { Text("Jetzt entdecken", style = MaterialTheme.typography.labelLarge, color = Color(0xFF2B2B2B)) }
        }
    }
}

@Composable
private fun HeroSkeleton() {
    Column(Modifier.padding(horizontal = 16.dp)) {
        Shimmer(Modifier.fillMaxWidth().aspectRatio(0.95f).clip(Radius.Card))
        Spacer(Modifier.height(24.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            repeat(2) { TileSkeleton(Modifier.weight(1f)) }
        }
    }
}

@Composable
private fun CategoryChips(items: List<MenuItem>) {
    val nav = LocalNav.current
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(items, key = { it.url }) { m ->
            ChoiceChip(m.title, selected = false) { m.collectionHandle?.let { nav.collection(it, m.title) } }
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
fun Rail(cards: List<ProductCard>, liked: Set<String>) {
    val nav = LocalNav.current
    val wishlist = LocalShop.current.wishlist
    LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        items(cards, key = { it.id }) { card ->
            ProductTile(
                card, liked = card.handle in liked, onLike = { wishlist.toggle(card) },
                onClick = { nav.product(card.handle) }, modifier = Modifier.width(158.dp),
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
