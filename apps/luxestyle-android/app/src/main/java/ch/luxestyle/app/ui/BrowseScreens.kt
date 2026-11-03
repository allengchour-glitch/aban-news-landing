package ch.luxestyle.app.ui

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.border
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
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
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
import androidx.compose.ui.platform.testTag
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
import ch.luxestyle.app.data.menuPath
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

/**
 * Sortieren, Preis und „Nur lieferbar" in EINER Zeile (vorher zwei Chip-Reihen, rund 40 % des
 * Bildschirms vor dem ersten Produkt). Sortierung und Preis öffnen ein kleines Menü.
 */
@Composable
fun ListControls(
    sort: Sort,
    options: List<Sort>,
    onSort: (Sort) -> Unit,
    filters: Filters,
    onFilters: (Filters) -> Unit,
) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp).testTag("listen-steuerung"),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MenuChip(
            if (sort == options.first()) "Sortieren" else sort.label, active = sort != options.first(),
            items = options.map { it.label to (it == sort) },
        ) { onSort(options[it]) }
        MenuChip(
            filters.price?.label ?: "Preis", active = filters.price != null,
            items = listOf("Alle Preise" to (filters.price == null)) + PriceBand.entries.map { it.label to (it == filters.price) },
        ) { i -> onFilters(filters.copy(price = if (i == 0) null else PriceBand.entries[i - 1])) }
        ChoiceChip("Nur lieferbar", selected = filters.onlyAvailable) {
            onFilters(filters.copy(onlyAvailable = !filters.onlyAvailable))
        }
    }
}

/** Chip mit Pfeil nach unten, öffnet eine Auswahl; der gewählte Eintrag trägt ein Häkchen. */
@Composable
private fun MenuChip(text: String, active: Boolean, items: List<Pair<String, Boolean>>, onPick: (Int) -> Unit) {
    var open by remember { mutableStateOf(false) }
    val c = MaterialTheme.colorScheme
    Box {
        Row(
            Modifier.clip(Radius.Pill)
                .background(if (active) c.primary else Color.Transparent)
                .border(1.dp, if (active) c.primary else LocalLuxe.current.line, Radius.Pill)
                .clickable(role = Role.DropdownList) { open = true }
                .padding(start = 14.dp, end = 10.dp, top = 9.dp, bottom = 9.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(text, style = MaterialTheme.typography.labelMedium, color = if (active) c.onPrimary else c.onSurface, maxLines = 1)
            Spacer(Modifier.width(4.dp))
            Icon(
                painterResource(R.drawable.ic_chevron), null, Modifier.size(14.dp).rotate(90f),
                tint = if (active) c.onPrimary else c.onSurface,
            )
        }
        DropdownMenu(open, { open = false }, containerColor = c.surface) {
            items.forEachIndexed { i, (label, chosen) ->
                DropdownMenuItem(
                    text = { Text(label, style = MaterialTheme.typography.bodyMedium) },
                    trailingIcon = if (chosen) { { Icon(painterResource(R.drawable.ic_check), null, Modifier.size(18.dp), tint = c.secondary) } } else null,
                    onClick = { open = false; onPick(i) },
                )
            }
        }
    }
}

@Composable
fun CollectionScreen(handle: String, initialTitle: String) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    var sort by rememberSaveable { mutableStateOf(Sort.FEATURED) }
    var filters by rememberSaveable(stateSaver = FiltersSaver) { mutableStateOf(Filters()) }
    var title by rememberSaveable { mutableStateOf(initialTitle) }
    var description by rememberSaveable { mutableStateOf("") }
    val menu = (rememberLoad("menu") { shop.menu() }.state as? Load.Ok)?.value
    // Weg im Shop-Menü: eigene Unterkategorien – oder, wenn es keine gibt, die Nachbarn zum Wechseln
    val path = menu?.let { menuPath(it, handle) }.orEmpty()
    val self = path.lastOrNull()
    val children = self?.children.orEmpty()
    val siblings = if (children.isEmpty() && path.size >= 2) path[path.size - 2].children else emptyList()
    Column(Modifier.fillMaxSize()) {
        ScreenTitle(title.ifEmpty { " " }, back = true)
        ProductGrid(
            key = listOf("kollektion", handle, sort, filters),
            load = { cursor ->
                val (info, page) = shop.api.collection(handle, sort, cursor, filters)
                info?.let { if (title.isEmpty()) title = it.title; description = it.description }
                page
            },
            onOpen = { nav.product(it.handle) },
            header = {
                if (path.size >= 2) {
                    item(span = { GridItemSpan(maxLineSpan) }) { Breadcrumb(path, lastIsCurrent = true) }
                }
                if (children.isNotEmpty() || siblings.isNotEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        val chips = children.ifEmpty { siblings }
                        val state = androidx.compose.foundation.lazy.rememberLazyListState(
                            (chips.indexOfFirst { it.collectionHandle == handle } - 1).coerceAtLeast(0),
                        )
                        LazyRow(
                            state = state,
                            contentPadding = PaddingValues(bottom = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            items(chips, key = { it.url }) { c ->
                                val here = c.collectionHandle == handle
                                ChoiceChip(shortLabel(c.title), selected = here) {
                                    // Nachbarn tauschen die Seite aus, statt den Zurück-Stapel zu füllen
                                    if (!here) c.collectionHandle?.let { nav.collection(it, c.title, replace = siblings.isNotEmpty()) }
                                }
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
                    ListControls(sort, listOf(Sort.FEATURED, Sort.BEST, Sort.NEW, Sort.PRICE_ASC, Sort.PRICE_DESC), { sort = it }, filters) { filters = it }
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

/** „Accessoires: Schals, Mützen & Gürtel" → „Accessoires" – Chips bleiben kurz. */
fun shortLabel(title: String): String = title.substringBefore(":").trim().ifEmpty { title }
