package ch.luxestyle.app.ui

import android.app.Activity
import android.content.Intent
import android.speech.RecognizerIntent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.CollectionHit
import ch.luxestyle.app.data.Filters
import ch.luxestyle.app.data.Storefront.Sort
import ch.luxestyle.app.data.Suggestions
import coil3.compose.AsyncImage
import kotlinx.coroutines.delay

private val POPULAR = listOf("Kleid", "Sonnenbrille", "Halskette", "Uhr", "Tasche", "Jacke", "Ohrringe", "Pullover")

@Composable
fun SearchScreen(initial: String) {
    val shop = LocalShop.current
    val focus = LocalFocusManager.current
    var text by rememberSaveable(initial) { mutableStateOf(initial) }
    var submitted by rememberSaveable(initial) { mutableStateOf(initial) }
    var sort by rememberSaveable { mutableStateOf(Sort.FEATURED) }
    var filters by rememberSaveable(stateSaver = FiltersSaver) { mutableStateOf(Filters()) }
    var total by rememberSaveable { mutableStateOf<Int?>(null) }
    var suggestions by remember { mutableStateOf<Suggestions?>(null) }
    // Zum abgeschickten Begriff: passende Kategorien und „Meintest du …"
    var related by remember { mutableStateOf<Suggestions?>(null) }
    val requester = remember { FocusRequester() }

    fun submit(q: String) {
        if (q.isBlank()) return
        text = q
        submitted = q.trim()
        total = null
        suggestions = null // sonst bleiben die Vorschläge über den Treffern stehen
        shop.searches.add(q)
        focus.clearFocus()
    }

    LaunchedEffect(Unit) { if (initial.isEmpty()) runCatching { requester.requestFocus() } }
    LaunchedEffect(text) {
        suggestions = null
        if (text.trim().length < 2 || text == submitted) return@LaunchedEffect
        delay(220) // tippen lassen, nicht jede Taste abfragen
        val found = runCatching { shop.api.suggest(text.trim()) }.getOrNull()
        if (text != submitted) suggestions = found // inzwischen abgeschickt → keine Vorschläge mehr
    }
    LaunchedEffect(submitted) {
        related = null
        if (submitted.isNotBlank()) related = runCatching { shop.api.suggest(submitted) }.getOrNull()
    }

    Column(Modifier.fillMaxSize()) {
        SearchBar(
            text = text, requester = requester,
            onText = { text = it }, onSubmit = { submit(text) },
            onClear = { text = ""; submitted = ""; total = null; runCatching { requester.requestFocus() } },
            onVoice = { submit(it) },
        )
        val s = suggestions
        when {
            s != null && (s.queries.isNotEmpty() || s.products.isNotEmpty() || s.collections.isNotEmpty()) ->
                SuggestionList(s, text.trim(), onQuery = ::submit)
            submitted.isNotBlank() -> Results(
                query = submitted, sort = sort, filters = filters, total = total, related = related,
                onSort = { sort = it }, onFilters = { filters = it }, onTotal = { total = it }, onQuery = ::submit,
            )
            else -> Idle(onQuery = ::submit)
        }
    }
}

@Composable
private fun SearchBar(
    text: String, requester: FocusRequester,
    onText: (String) -> Unit, onSubmit: () -> Unit, onClear: () -> Unit, onVoice: (String) -> Unit,
) {
    val context = LocalContext.current
    // Sprachsuche nur zeigen, wenn das Handy eine Spracherkennung hat
    val speech = remember {
        Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "de-CH")
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Wonach suchst du?")
    }
    val canSpeak = remember { context.packageManager.queryIntentActivities(speech, 0).isNotEmpty() }
    val voice = rememberLauncherForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
        if (r.resultCode == Activity.RESULT_OK) {
            r.data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull()?.let(onVoice)
        }
    }
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
                onValueChange = onText,
                singleLine = true,
                textStyle = MaterialTheme.typography.bodyLarge.copy(color = MaterialTheme.colorScheme.onSurface),
                cursorBrush = SolidColor(MaterialTheme.colorScheme.secondary),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { onSubmit() }),
                modifier = Modifier.fillMaxWidth().focusRequester(requester),
            )
        }
        when {
            text.isNotEmpty() -> BarButton(R.drawable.ic_close, "Leeren", onClear)
            canSpeak -> BarButton(R.drawable.ic_mic, "Sprachsuche") { runCatching { voice.launch(speech) } }
        }
    }
}

@Composable
private fun BarButton(icon: Int, label: String, onClick: () -> Unit) {
    Box(
        Modifier.size(38.dp).clip(Radius.Pill).clickable(role = Role.Button, onClickLabel = label, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Icon(painterResource(icon), label, Modifier.size(18.dp)) }
}

@Composable
private fun SuggestionList(s: Suggestions, typed: String, onQuery: (String) -> Unit) {
    val nav = LocalNav.current
    LazyColumn(Modifier.testTag("vorschlaege"), contentPadding = PaddingValues(bottom = 24.dp)) {
        items(s.collections, key = { "c" + it.handle }) { c ->
            SuggestionRow(R.drawable.ic_grid, c.title, "Kategorie") { nav.collection(c.handle, c.title) }
        }
        items(s.queries, key = { "q$it" }) { q -> SuggestionRow(R.drawable.ic_search, q, null) { onQuery(q) } }
        items(s.products, key = { it.id }) { p ->
            Row(
                Modifier.fillMaxWidth().clickable { nav.product(p.handle) }.padding(horizontal = 20.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                // feine Kontur: weisse Stücke auf weissem Grund verschwinden sonst
                Box(Modifier.size(52.dp, 64.dp).clip(Radius.Small).background(LocalLuxe.current.card).border(1.dp, LocalLuxe.current.line, Radius.Small)) {
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
        // Vorschläge zeigen nur wenige Stücke – der Weg zu allen Treffern soll nicht über die Tastatur gehen
        if (typed.isNotEmpty()) item(key = "alle") {
            Row(
                Modifier.fillMaxWidth().clickable { onQuery(typed) }.padding(horizontal = 20.dp, vertical = 16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "Alle Treffer für «$typed» anzeigen", style = MaterialTheme.typography.labelLarge,
                    color = MaterialTheme.colorScheme.secondary, modifier = Modifier.weight(1f),
                )
                Icon(painterResource(R.drawable.ic_search), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
private fun SuggestionRow(icon: Int, text: String, tag: String?, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().clickable(onClick = onClick).padding(horizontal = 20.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(painterResource(icon), null, tint = LocalLuxe.current.muted, modifier = Modifier.size(16.dp))
        Spacer(Modifier.width(14.dp))
        Text(text, style = MaterialTheme.typography.bodyLarge, modifier = Modifier.weight(1f), maxLines = 1, overflow = TextOverflow.Ellipsis)
        tag?.let { Text(it, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary) }
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Results(
    query: String, sort: Sort, filters: Filters, total: Int?, related: Suggestions?,
    onSort: (Sort) -> Unit, onFilters: (Filters) -> Unit, onTotal: (Int) -> Unit, onQuery: (String) -> Unit,
) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val categories = related?.collections.orEmpty()
    ProductGrid(
        key = listOf("suche", query, sort, filters),
        load = { cursor -> shop.api.search(query, sort, cursor, filters).also { onTotal(it.first) }.second },
        onOpen = { nav.product(it.handle) },
        header = {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Column {
                    total?.let {
                        Text(
                            when { it >= 1000 -> "Über 1000 Treffer"; it == 1 -> "1 Treffer"; else -> "$it Treffer" } + " für «$query»",
                            style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted,
                        )
                    }
                    if (categories.isNotEmpty()) {
                        Spacer(Modifier.height(10.dp))
                        CategoryChips(categories)
                    }
                    SortRow(sort, listOf(Sort.FEATURED, Sort.PRICE_ASC, Sort.PRICE_DESC), edge = 0.dp, onSort = onSort)
                    FilterRow(filters, edge = 0.dp, onChange = onFilters)
                }
            }
        },
        empty = {
            Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 24.dp)) {
                Text(
                    if (filters.isEmpty) "Nichts gefunden für «$query»" else "Nichts mit diesen Filtern",
                    style = MaterialTheme.typography.titleLarge,
                )
                Spacer(Modifier.height(6.dp))
                Text(
                    if (filters.isEmpty) "Versuch ein anderes Wort – oder eine dieser Möglichkeiten." else "Lockere die Filter etwas.",
                    style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted,
                )
                if (!filters.isEmpty) {
                    Spacer(Modifier.height(14.dp))
                    ChoiceChip("Filter entfernen", selected = false) { onFilters(Filters()) }
                }
                val alternatives = related?.queries.orEmpty().filter { !it.equals(query, ignoreCase = true) }
                if (alternatives.isNotEmpty()) {
                    Spacer(Modifier.height(22.dp))
                    Text("Meintest du", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        alternatives.forEach { q -> ChoiceChip(q, selected = false) { onQuery(q) } }
                    }
                }
                if (categories.isNotEmpty()) {
                    Spacer(Modifier.height(22.dp))
                    Text("Passende Kategorien", style = MaterialTheme.typography.titleSmall)
                    Spacer(Modifier.height(8.dp))
                    CategoryChips(categories)
                }
                Spacer(Modifier.height(22.dp))
                Text("Beliebt", style = MaterialTheme.typography.titleSmall)
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    POPULAR.forEach { q -> ChoiceChip(q, selected = false) { onQuery(q) } }
                }
            }
        },
    )
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun CategoryChips(categories: List<CollectionHit>) {
    val nav = LocalNav.current
    FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        categories.forEach { c ->
            Row(
                Modifier.clip(Radius.Pill).background(MaterialTheme.colorScheme.surfaceVariant)
                    .clickable(role = Role.Button) { nav.collection(c.handle, c.title) }
                    .padding(horizontal = 14.dp, vertical = 9.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Icon(painterResource(R.drawable.ic_grid), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(14.dp))
                Spacer(Modifier.width(6.dp))
                Text(c.title, style = MaterialTheme.typography.labelLarge)
            }
        }
    }
}

/** Leere Suche: letzte Suchen, Beliebtes, alle Bereiche und zuletzt Angesehenes. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Idle(onQuery: (String) -> Unit) {
    val shop = LocalShop.current
    val nav = LocalNav.current
    val recent by shop.searches.items.collectAsState()
    val seen by shop.recent.items.collectAsState()
    val liked by shop.wishlist.items.collectAsState()
    val menu = (rememberLoad("menu") { shop.menu() }.state as? Load.Ok)?.value.orEmpty()
    Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(vertical = 8.dp)) {
        Column(Modifier.padding(horizontal = 20.dp)) {
            if (recent.isNotEmpty()) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Zuletzt gesucht", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                    Text(
                        "Löschen", style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.secondary,
                        modifier = Modifier.clip(Radius.Small).clickable(onClickLabel = "Suchverlauf löschen") { shop.searches.clear() }.padding(6.dp),
                    )
                }
                Spacer(Modifier.height(8.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    recent.forEach { q -> ChoiceChip(q, selected = false) { onQuery(q) } }
                }
                Spacer(Modifier.height(28.dp))
            }
            Text("Beliebt", style = MaterialTheme.typography.titleLarge)
            Spacer(Modifier.height(12.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                POPULAR.forEach { q -> ChoiceChip(q, selected = false) { onQuery(q) } }
            }
            if (menu.isNotEmpty()) {
                Spacer(Modifier.height(28.dp))
                Text("Bereiche", style = MaterialTheme.typography.titleLarge)
                Spacer(Modifier.height(12.dp))
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    menu.forEach { m -> ChoiceChip(m.title, selected = false) { m.collectionHandle?.let { nav.collection(it, m.title) } } }
                }
            }
        }
        if (seen.size >= 2) {
            Spacer(Modifier.height(12.dp))
            SectionHeader("Zuletzt angesehen")
            Rail(seen, liked.map { it.handle }.toSet())
            Spacer(Modifier.height(24.dp))
        }
    }
}
