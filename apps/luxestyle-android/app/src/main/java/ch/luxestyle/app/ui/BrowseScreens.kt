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
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.MenuItem
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
    val menu = rememberLoad("menu") { shop.api.menu() }
    Column(Modifier.fillMaxSize()) {
        ScreenTitle("Kategorien")
        LoadContent(menu) { items ->
            var open by rememberSaveable { mutableStateOf<String?>(null) }
            LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                items(items, key = { it.url }) { item ->
                    CategoryRow(item, expanded = open == item.url) { open = if (open == item.url) null else item.url }
                    HorizontalDivider(Modifier.padding(horizontal = 20.dp), color = LocalLuxe.current.line)
                }
            }
        }
    }
}

@Composable
private fun CategoryRow(item: MenuItem, expanded: Boolean, toggle: () -> Unit) {
    val nav = LocalNav.current
    val turn by animateFloatAsState(if (expanded) 90f else 0f, label = "turn")
    Column {
        Row(
            Modifier.fillMaxWidth().clickable(role = Role.Button) {
                if (item.children.isEmpty()) item.collectionHandle?.let { nav.collection(it, item.title) } else toggle()
            }.padding(horizontal = 20.dp, vertical = 18.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(item.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
            Icon(
                painterResource(R.drawable.ic_chevron), null, tint = LocalLuxe.current.muted,
                modifier = Modifier.size(20.dp).rotate(turn),
            )
        }
        AnimatedVisibility(expanded) {
            Column(Modifier.padding(start = 20.dp, end = 20.dp, bottom = 12.dp)) {
                SubRow("Alles aus ${item.title}", strong = true) { item.collectionHandle?.let { nav.collection(it, item.title) } }
                item.children.forEach { child ->
                    SubRow(child.title) { child.collectionHandle?.let { nav.collection(it, child.title) } }
                }
            }
        }
    }
}

@Composable
private fun SubRow(text: String, strong: Boolean = false, onClick: () -> Unit) {
    Text(
        text,
        style = if (strong) MaterialTheme.typography.titleSmall else MaterialTheme.typography.bodyLarge,
        color = if (strong) MaterialTheme.colorScheme.secondary else MaterialTheme.colorScheme.onSurface,
        modifier = Modifier.fillMaxWidth().clip(Radius.Small).clickable(onClick = onClick).padding(vertical = 10.dp, horizontal = 4.dp),
    )
}

@Composable
fun SortRow(sort: Sort, options: List<Sort> = Sort.entries, onSort: (Sort) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(options) { s -> ChoiceChip(s.label, selected = s == sort) { onSort(s) } }
    }
}

@Composable
fun CollectionScreen(handle: String, initialTitle: String) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    var sort by rememberSaveable { mutableStateOf(Sort.FEATURED) }
    var title by rememberSaveable { mutableStateOf(initialTitle) }
    var description by rememberSaveable { mutableStateOf("") }
    Column(Modifier.fillMaxSize()) {
        ScreenTitle(title.ifEmpty { " " }, back = true)
        ProductGrid(
            key = handle to sort,
            load = { cursor ->
                val (info, page) = shop.api.collection(handle, sort, cursor)
                info?.let { if (title.isEmpty()) title = it.title; description = it.description }
                page
            },
            onOpen = { nav.product(it.handle) },
            header = {
                if (description.isNotBlank()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Text(
                            description, style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted,
                            maxLines = 3, overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                item(span = { GridItemSpan(maxLineSpan) }) {
                    SortRow(sort, listOf(Sort.FEATURED, Sort.BEST, Sort.NEW, Sort.PRICE_ASC, Sort.PRICE_DESC)) { sort = it }
                }
            },
            empty = { EmptyState(R.drawable.ic_grid, "Gerade leer", "In dieser Kategorie ist im Moment nichts.") },
        )
    }
}

@Composable
fun WishlistScreen() {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val items by shop.wishlist.items.collectAsState()
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
                ProductTile(card, liked = true, onLike = { shop.wishlist.toggle(card) }, onClick = { nav.product(card.handle) })
            }
        }
    }
}

@Composable
fun Gap(h: Int) = Spacer(Modifier.height(h.dp))
