package ch.luxestyle.app.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
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
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.Filters
import ch.luxestyle.app.data.Storefront.Sort
import ch.luxestyle.app.data.Suggestions
import coil3.compose.AsyncImage
import kotlinx.coroutines.delay

private val POPULAR = listOf("Kleid", "Sonnenbrille", "Halskette", "Uhr", "Tasche", "Jacke", "Ohrringe", "Diffuser")

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun SearchScreen(initial: String) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val focus = LocalFocusManager.current
    var text by rememberSaveable(initial) { mutableStateOf(initial) }
    var submitted by rememberSaveable(initial) { mutableStateOf(initial) }
    var sort by rememberSaveable { mutableStateOf(Sort.FEATURED) }
    var filters by remember { mutableStateOf(Filters()) }
    var total by remember { mutableStateOf<Int?>(null) }
    var suggestions by remember { mutableStateOf<Suggestions?>(null) }
    val requester = remember { FocusRequester() }

    fun submit(q: String) {
        if (q.isBlank()) return
        text = q
        submitted = q.trim()
        total = null
        focus.clearFocus()
    }

    LaunchedEffect(Unit) { if (initial.isEmpty()) runCatching { requester.requestFocus() } }
    LaunchedEffect(text) {
        suggestions = null
        if (text.trim().length < 2 || text == submitted) return@LaunchedEffect
        delay(220) // tippen lassen, nicht jede Taste abfragen
        suggestions = runCatching { shop.api.suggest(text.trim()) }.getOrNull()
    }

    Column(Modifier.fillMaxSize()) {
        Row(
            Modifier.fillMaxWidth().statusBarsPadding().padding(horizontal = 16.dp, vertical = 12.dp).height(50.dp)
                .clip(Radius.Pill).background(LocalLuxe.current.card).border(1.dp, LocalLuxe.current.line, Radius.Pill)
                .padding(start = 16.dp, end = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(painterResource(R.drawable.ic_search), null, tint = LocalLuxe.current.muted, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(10.dp))
            Box(Modifier.weight(1f)) {
                if (text.isEmpty()) Text("Wonach suchst du?", color = LocalLuxe.current.muted, style = MaterialTheme.typography.bodyLarge)
                BasicTextField(
                    value = text,
                    onValueChange = { text = it },
                    singleLine = true,
                    textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                    cursorBrush = SolidColor(MaterialTheme.colorScheme.secondary),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                    keyboardActions = KeyboardActions(onSearch = { submit(text) }),
                    modifier = Modifier.fillMaxWidth().focusRequester(requester),
                )
            }
            if (text.isNotEmpty()) {
                Box(
                    Modifier.size(38.dp).clip(Radius.Pill).clickable(role = Role.Button) {
                        text = ""; submitted = ""; total = null; runCatching { requester.requestFocus() }
                    },
                    contentAlignment = Alignment.Center,
                ) { Icon(painterResource(R.drawable.ic_close), "Leeren", Modifier.size(18.dp)) }
            }
        }

        val s = suggestions
        when {
            s != null && (s.queries.isNotEmpty() || s.products.isNotEmpty()) -> LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
                items(s.queries) { q ->
                    Row(
                        Modifier.fillMaxWidth().clickable { submit(q) }.padding(horizontal = 20.dp, vertical = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(painterResource(R.drawable.ic_search), null, tint = LocalLuxe.current.muted, modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(14.dp))
                        Text(q, style = MaterialTheme.typography.bodyLarge)
                    }
                }
                items(s.products, key = { it.id }) { p ->
                    Row(
                        Modifier.fillMaxWidth().clickable { nav.product(p.handle) }.padding(horizontal = 20.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(52.dp, 64.dp).clip(Radius.Small).background(LocalLuxe.current.card)) {
                            p.image?.let { AsyncImage(it.sized(160), null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize()) }
                        }
                        Spacer(Modifier.width(14.dp))
                        Column(Modifier.weight(1f)) {
                            Text(p.title, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis)
                            Spacer(Modifier.height(2.dp))
                            Price(p.price, p.compareAt)
                        }
                    }
                }
            }
            submitted.isNotBlank() -> ProductGrid(
                key = Triple(submitted, sort, filters),
                load = { cursor -> shop.api.search(submitted, sort, cursor, filters).also { total = it.first }.second },
                onOpen = { nav.product(it.handle) },
                header = {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Column {
                            total?.let {
                                Text(
                                    when { it >= 1000 -> "Über 1000 Treffer"; it == 1 -> "1 Treffer"; else -> "$it Treffer" } + " für «$submitted»",
                                    style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted,
                                )
                            }
                            SortRow(sort, listOf(Sort.FEATURED, Sort.PRICE_ASC, Sort.PRICE_DESC), edge = 0.dp) { sort = it }
                            FilterRow(filters, edge = 0.dp) { filters = it }
                        }
                    }
                },
            )
            else -> Column(Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) {
                Text("Beliebt", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    POPULAR.forEach { q -> ChoiceChip(q, selected = false) { submit(q) } }
                }
            }
        }
    }
}
