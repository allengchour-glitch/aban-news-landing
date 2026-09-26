package ch.luxestyle.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.Filters
import ch.luxestyle.app.data.Money
import ch.luxestyle.app.data.MenuItem
import ch.luxestyle.app.data.PriceBand
import ch.luxestyle.app.data.priceDrop
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.runtime.remember
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import coil3.compose.AsyncImage
import ch.luxestyle.app.data.Storefront.Sort

@Composable
fun ScreenTitle(title: String, back: Boolean = false, trailing: @Composable () -> Unit = {}) {
    val nav = LocalNav.current
    Row(
        Modifier.fillMaxWidth().statusBarsPadding().padding(start = if (back) 4.dp else 20.dp, end = 8.dp, top = 8.dp, bottom = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (back) {
            IconCircle(R.drawable.ic_back, "Zurück") { nav.back() }
            Spacer(Modifier.width(4.dp))
        }
        Text(
            title, style = MaterialTheme.typography.headlineSmall, maxLines = 1, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        trailing()
    }
}

@Composable
fun CategoriesScreen() {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val menu = rememberLoad("menu") { shop.menu() }
    Column(Modifier.fillMaxSize()) {
        ScreenTitle("Kategorien")
        LoadContent(menu) { items ->
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(items.size, key = { items[it].url }) { i ->
                    val m = items[i]
                    CategoryTile(m) { m.collectionHandle?.let { nav.collection(it, m.title) } }
                }
            }
        }
    }
}

@Composable
private fun CategoryTile(item: MenuItem, onClick: () -> Unit) {
    Box(
        Modifier.fillMaxWidth().aspectRatio(0.86f).clip(Radius.Card)
            .background(MaterialTheme.colorScheme.surfaceVariant)
            .clickable(role = Role.Button, onClick = onClick),
    ) {
        item.image?.let {
            AsyncImage(it.sized(540), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        }
        Box(
            Modifier.fillMaxSize().background(
                Brush.verticalGradient(0.45f to Color.Transparent, 1f to Color.Black.copy(alpha = 0.6f)),
            ),
        )
        Column(Modifier.align(Alignment.BottomStart).padding(14.dp)) {
            Text(item.title, style = MaterialTheme.typography.titleLarge, color = Color.White, maxLines = 2, overflow = TextOverflow.Ellipsis)
            if (item.children.isNotEmpty()) {
                Text(
                    "${item.children.size} Bereiche", style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.8f),
                )
            }
        }
    }
}

@Composable
fun SortRow(sort: Sort, options: List<Sort> = Sort.entries, edge: Dp = 16.dp, onSort: (Sort) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = edge, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(options) { s -> ChoiceChip(s.label, selected = s == sort) { onSort(s) } }
    }
}

/** Preis-Stufen und „nur lieferbar" als Chips – mehr Filter pflegt der Shop derzeit nicht sauber. */
@Composable
fun FilterRow(filters: Filters, edge: Dp = 16.dp, onChange: (Filters) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = edge, vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        item {
            ChoiceChip("Nur lieferbar", selected = filters.onlyAvailable) {
                onChange(filters.copy(onlyAvailable = !filters.onlyAvailable))
            }
        }
        items(PriceBand.entries) { band ->
            ChoiceChip(band.label, selected = filters.price == band) {
                onChange(filters.copy(price = if (filters.price == band) null else band))
            }
        }
    }
}

@Composable
fun CollectionScreen(handle: String, initialTitle: String) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    var sort by rememberSaveable { mutableStateOf(Sort.FEATURED) }
    var filters by remember { mutableStateOf(Filters()) }
    var title by rememberSaveable { mutableStateOf(initialTitle) }
    var description by rememberSaveable { mutableStateOf("") }
    val menu = (rememberLoad("menu") { shop.menu() }.state as? Load.Ok)?.value
    // Unterkategorien aus dem Shop-Menü, falls diese Kollektion dort Kinder hat
    val children = menu?.firstOrNull { it.collectionHandle == handle }?.children.orEmpty()
    Column(Modifier.fillMaxSize()) {
        ScreenTitle(title.ifEmpty { " " }, back = true)
        ProductGrid(
            key = Triple(handle, sort, filters),
            load = { cursor ->
                val (info, page) = shop.api.collection(handle, sort, cursor, filters)
                info?.let { if (title.isEmpty()) title = it.title; description = it.description }
                page
            },
            onOpen = { nav.product(it.handle) },
            header = {
                if (children.isNotEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        LazyRow(
                            contentPadding = PaddingValues(bottom = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(children, key = { it.url }) { c ->
                                ChoiceChip(c.title, selected = false) { c.collectionHandle?.let { nav.collection(it, c.title) } }
                            }
                        }
                    }
                } else if (description.isNotBlank()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Text(
                            description, style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted,
                            maxLines = 3, overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column {
                        SortRow(sort, listOf(Sort.FEATURED, Sort.BEST, Sort.NEW, Sort.PRICE_ASC, Sort.PRICE_DESC), edge = 0.dp) { sort = it }
                        FilterRow(filters, edge = 0.dp) { filters = it }
                    }
                }
            },
            empty = {
                if (filters.isEmpty) EmptyState(R.drawable.ic_grid, "Gerade leer", "In dieser Kategorie ist im Moment nichts.")
                else EmptyState(R.drawable.ic_grid, "Nichts mit diesen Filtern", "Lockere die Filter etwas.", "Filter entfernen") { filters = Filters() }
            },
        )
    }
}

@Composable
fun WishlistScreen() {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val items by shop.wishlist.items.collectAsState()
    val likedAt by shop.wishlist.likedAt.collectAsState()
    // Preise und Verfügbarkeit auffrischen – still, ohne Ladeanzeige
    LaunchedEffect(Unit) {
        runCatching { shop.api.cards(shop.wishlist.items.value.map { it.id }) }.onSuccess { shop.wishlist.update(it) }
    }
    Column(Modifier.fillMaxSize()) {
        ScreenTitle("Merkliste")
        if (items.isEmpty()) {
            EmptyState(
                R.drawable.ic_heart, "Noch nichts gemerkt",
                "Tippe auf das Herz bei einem Produkt – es bleibt hier, auch ohne Konto.",
                "Stöbern", nav::home,
            )
            return
        }
        androidx.compose.foundation.lazy.grid.LazyVerticalGrid(
            columns = androidx.compose.foundation.lazy.grid.GridCells.Adaptive(160.dp),
            contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(20.dp),
        ) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Text(
                    if (items.size == 1) "1 Lieblingsstück" else "${items.size} Lieblingsstücke",
                    style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted,
                )
            }
            items(items.size, key = { items[it].handle }) { i ->
                val card = items[i]
                val drop = priceDrop(likedAt[card.handle], card.price.amount)
                ProductTile(
                    card, liked = true, onLike = { shop.wishlist.toggle(card) }, onClick = { nav.product(card.handle) },
                    note = drop?.let { "Seit dem Merken ${Money(it, card.price.currency).format()} günstiger" },
                )
            }
        }
    }
}

@Composable
fun Gap(h: Int) = Spacer(Modifier.height(h.dp))
