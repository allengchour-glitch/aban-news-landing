package ch.luxestyle.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import kotlinx.coroutines.delay
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.Hyphens
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.Image
import ch.luxestyle.app.data.MenuItem
import ch.luxestyle.app.data.priceItems
import coil3.compose.AsyncImage

/**
 * Alle Bereiche des Shops auf einen Blick: links die Hauptkategorien, rechts deren
 * Unterkategorien mit Bild – so findet man jede Kollektion mit zwei Tipps.
 */
@Composable
fun CategoriesScreen() {
    val shop = LocalShop.current
    val menu = rememberLoad("menu") { shop.menu() }
    Column(Modifier.fillMaxSize()) {
        ScreenTitle("Kategorien")
        LoadContent(menu) { items ->
            var selected by rememberSaveable { mutableIntStateOf(0) }
            // Bilder der übrigen Bereiche im Hintergrund vorladen – der Wechsel ist dann sofort da
            LaunchedEffect(items) {
                delay(1500)
                items.forEach { top ->
                    runCatching { shop.collectionImages(listOfNotNull(top.collectionHandle) + top.children.mapNotNull { it.collectionHandle }) }
                }
            }
            val sel = selected.coerceIn(0, (items.size - 1).coerceAtLeast(0))
            Row(Modifier.fillMaxSize()) {
                LazyColumn(
                    Modifier.width(120.dp).fillMaxHeight().background(MaterialTheme.colorScheme.surfaceVariant).testTag("bereiche"),
                ) {
                    itemsIndexed(items, key = { _, m -> m.url }) { i, m ->
                        RailItem(m.title, i == sel) { selected = i }
                    }
                }
                items.getOrNull(sel)?.let { top -> key(top.url) { Department(top) } }
            }
        }
    }
}

@Composable
private fun RailItem(title: String, selected: Boolean, onClick: () -> Unit) {
    val c = MaterialTheme.colorScheme
    Row(
        Modifier.fillMaxWidth().background(if (selected) c.surface else Color.Transparent)
            .clickable(role = Role.Tab, onClick = onClick),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(3.dp).height(44.dp).background(if (selected) c.secondary else Color.Transparent))
        Text(
            title, Modifier.padding(start = 10.dp, end = 6.dp, top = 14.dp, bottom = 14.dp),
            // Silbentrennung: „Geschenke & Weihnachten" passt sonst nicht in die schmale Spalte
            style = MaterialTheme.typography.labelLarge.copy(hyphens = Hyphens.Auto),
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            color = if (selected) c.onSurface else LocalLuxe.current.muted,
            maxLines = 3, overflow = TextOverflow.Ellipsis,
        )
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Department(top: MenuItem) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    // „unter CHF 20", „bis CHF 30" … als eine Budget-Zeile statt sechs Kacheln mit demselben Foto
    val prices = remember(top) { priceItems(top.children).takeIf { it.size >= 2 }.orEmpty() }
    val tiles = remember(top) { top.children.filter { c -> prices.none { it.second == c } } }
    val handles = remember(top) { tiles.mapNotNull { it.collectionHandle } }
    val images by produceState<Map<String, Image?>>(emptyMap(), top.url) {
        value = runCatching { shop.collectionImages(handles) }.getOrDefault(emptyMap())
    }
    LazyVerticalGrid(
        columns = GridCells.Adaptive(92.dp),
        modifier = Modifier.fillMaxSize().testTag("unterkategorien"),
        contentPadding = PaddingValues(start = 14.dp, end = 14.dp, top = 4.dp, bottom = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        item(span = { GridItemSpan(maxLineSpan) }) {
            // Drei Unterkategorien nebeneinander statt des Web-Banners mit eingebrannter Schrift.
            // Die Bilder sind schon untereinander verschieden (pickDistinct).
            val collage = tiles.mapNotNull { c -> c.collectionHandle?.let { images[it] } }.take(3)
            DepartmentBanner(top, if (collage.size >= 2) collage else listOfNotNull(top.image)) {
                top.collectionHandle?.let { nav.collection(it, top.title) }
            }
        }
        if (prices.isNotEmpty()) item(span = { GridItemSpan(maxLineSpan) }) {
            Column(Modifier.testTag("budget")) {
                Text("Nach Budget", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    prices.forEach { (label, m) ->
                        ChoiceChip(label, selected = false) { m.collectionHandle?.let { nav.collection(it, m.title) } }
                    }
                }
            }
        }
        tiles.forEach { child ->
            item(key = child.url) {
                SubTile(child, images[child.collectionHandle]) { child.collectionHandle?.let { nav.collection(it, child.title) } }
            }
        }
    }
}

@Composable
private fun DepartmentBanner(top: MenuItem, pictures: List<Image>, onClick: () -> Unit) {
    Box(
        Modifier.fillMaxWidth().aspectRatio(2.1f).clip(Radius.Card).background(LocalLuxe.current.card)
            .clickable(role = Role.Button, onClickLabel = "Alles aus ${top.title}", onClick = onClick),
    ) {
        Row(Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(2.dp)) {
            pictures.forEach {
                AsyncImage(it.sized(if (pictures.size == 1) 720 else 300), null, contentScale = ContentScale.Crop, modifier = Modifier.weight(1f).fillMaxHeight())
            }
        }
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0.3f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.6f))))
        Row(
            Modifier.align(Alignment.BottomStart).fillMaxWidth().padding(14.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(Modifier.weight(1f)) {
                Text(top.title, style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis)
                Text("Alles ansehen", style = MaterialTheme.typography.labelMedium, color = Color.White.copy(alpha = 0.85f))
            }
            Icon(painterResource(R.drawable.ic_chevron), null, tint = Color.White, modifier = Modifier.size(18.dp))
        }
    }
}

@Composable
internal fun SubTile(item: MenuItem, image: Image?, onClick: () -> Unit) {
    Column(
        Modifier.clip(Radius.Small).clickable(role = Role.Button, onClick = onClick),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Box(Modifier.fillMaxWidth().aspectRatio(1f).clip(Radius.Card).background(LocalLuxe.current.card), contentAlignment = Alignment.Center) {
            if (image != null) AsyncImage(image.sized(300), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
            // Ohne Bild keine leere Fläche: Anfangsbuchstabe in Markenfarbe
            else Text(shortLabel(item.title).take(1), style = MaterialTheme.typography.headlineMedium, color = MaterialTheme.colorScheme.secondary)
        }
        Spacer(Modifier.height(6.dp))
        Text(
            shortLabel(item.title), style = MaterialTheme.typography.labelMedium, textAlign = TextAlign.Center,
            maxLines = 2, overflow = TextOverflow.Ellipsis,
        )
    }
}

/** Kategorie-Pfad wie auf der Webseite: „Damen › Strick & Pullover". */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun Breadcrumb(path: List<MenuItem>, lastIsCurrent: Boolean, modifier: Modifier = Modifier) {
    if (path.isEmpty()) return
    val nav = LocalNav.current
    FlowRow(modifier, verticalArrangement = Arrangement.Center) {
        path.forEachIndexed { i, m ->
            val current = lastIsCurrent && i == path.lastIndex
            Text(
                m.title,
                style = MaterialTheme.typography.labelLarge,
                color = if (current) LocalLuxe.current.muted else MaterialTheme.colorScheme.secondary,
                modifier = if (current) Modifier.padding(vertical = 6.dp)
                else Modifier.clip(Radius.Small).clickable(role = Role.Button) { m.collectionHandle?.let { nav.collection(it, m.title) } }
                    .padding(vertical = 6.dp),
            )
            if (i < path.lastIndex) Text("  ›  ", style = MaterialTheme.typography.labelLarge, color = LocalLuxe.current.muted, modifier = Modifier.padding(vertical = 6.dp))
        }
    }
}
