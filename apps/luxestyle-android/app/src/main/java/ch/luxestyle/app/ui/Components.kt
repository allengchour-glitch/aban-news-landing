package ch.luxestyle.app.ui

import androidx.annotation.DrawableRes
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyGridScope
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.itemsIndexed
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.produceState
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextDecoration
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import ch.luxestyle.app.R
import ch.luxestyle.app.data.Money
import ch.luxestyle.app.data.ProductCard
import ch.luxestyle.app.data.ProductPage
import coil3.compose.AsyncImage
import androidx.compose.runtime.withFrameNanos
import kotlin.coroutines.cancellation.CancellationException

/** Ladezustand für einmalige Abfragen. */
sealed interface Load<out T> {
    data object Loading : Load<Nothing>
    data class Ok<T>(val value: T) : Load<T>
    data class Err(val message: String) : Load<Nothing>
}

class Loader<T>(val state: Load<T>, val retry: () -> Unit)

@Composable
fun <T> rememberLoad(vararg keys: Any?, block: suspend () -> T): Loader<T> {
    var attempt by remember(*keys) { mutableIntStateOf(0) }
    val state by produceState<Load<T>>(Load.Loading, *keys, attempt) {
        value = Load.Loading
        value = try {
            Load.Ok(block())
        } catch (e: CancellationException) {
            throw e
        } catch (e: Exception) {
            Load.Err(friendly(e))
        }
    }
    return Loader(state) { attempt++ }
}

fun friendly(t: Throwable): String = when (t) {
    is java.net.UnknownHostException, is java.net.ConnectException, is java.net.SocketTimeoutException ->
        "Keine Verbindung. Prüfe dein WLAN oder die mobilen Daten."
    else -> t.message ?: "Etwas ist schiefgelaufen."
}

@Composable
fun <T> LoadContent(loader: Loader<T>, loading: @Composable () -> Unit = { CenterSpinner() }, content: @Composable (T) -> Unit) {
    when (val s = loader.state) {
        Load.Loading -> loading()
        is Load.Err -> ErrorState(s.message, loader.retry)
        is Load.Ok -> content(s.value)
    }
}

@Composable
fun CenterSpinner(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = MaterialTheme.colorScheme.secondary, strokeWidth = 2.dp, modifier = Modifier.size(28.dp))
    }
}

@Composable
fun ErrorState(message: String, retry: () -> Unit) {
    EmptyState(R.drawable.ic_offline, "Das hat nicht geklappt", message, "Nochmals versuchen", retry)
}

@Composable
fun EmptyState(@DrawableRes icon: Int, title: String, text: String, action: String? = null, onAction: () -> Unit = {}) {
    Column(
        Modifier.fillMaxSize().padding(32.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Box(
            Modifier.size(72.dp).clip(CircleShape).background(MaterialTheme.colorScheme.surfaceVariant),
            contentAlignment = Alignment.Center,
        ) { Icon(painterResource(icon), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(30.dp)) }
        Spacer(Modifier.height(20.dp))
        Text(title, style = MaterialTheme.typography.headlineSmall, textAlign = TextAlign.Center)
        Spacer(Modifier.height(8.dp))
        Text(text, style = MaterialTheme.typography.bodyMedium, color = LocalLuxe.current.muted, textAlign = TextAlign.Center)
        if (action != null) {
            Spacer(Modifier.height(24.dp))
            PillButton(action, onClick = onAction)
        }
    }
}

@Composable
fun PillButton(text: String, modifier: Modifier = Modifier, enabled: Boolean = true, loading: Boolean = false, onClick: () -> Unit) {
    val c = MaterialTheme.colorScheme
    Surface(
        onClick = onClick,
        enabled = enabled && !loading,
        shape = Radius.Pill,
        color = if (enabled) c.primary else c.surfaceVariant,
        contentColor = if (enabled) c.onPrimary else LocalLuxe.current.muted,
        modifier = modifier.height(52.dp),
    ) {
        Box(Modifier.padding(horizontal = 28.dp), contentAlignment = Alignment.Center) {
            if (loading) CircularProgressIndicator(Modifier.size(20.dp), color = c.onPrimary, strokeWidth = 2.dp)
            else Text(text, style = MaterialTheme.typography.labelLarge)
        }
    }
}

@Composable
fun GhostButton(text: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    OutlinedButton(onClick = onClick, shape = Radius.Pill, modifier = modifier.height(44.dp)) {
        Text(text, style = MaterialTheme.typography.labelLarge, color = MaterialTheme.colorScheme.onSurface)
    }
}

@Composable
fun Price(price: Money, compareAt: Money?, big: Boolean = false) {
    Row(verticalAlignment = Alignment.Bottom) {
        Text(
            price.format(),
            style = if (big) MaterialTheme.typography.headlineSmall.copy(fontFamily = null) else MaterialTheme.typography.titleSmall,
            color = if (compareAt != null) LocalLuxe.current.sale else MaterialTheme.colorScheme.onSurface,
        )
        if (compareAt != null) {
            Spacer(Modifier.width(8.dp))
            Text(
                compareAt.format(),
                style = if (big) MaterialTheme.typography.bodyLarge else MaterialTheme.typography.bodySmall,
                color = LocalLuxe.current.muted,
                textDecoration = TextDecoration.LineThrough,
                modifier = Modifier.padding(bottom = if (big) 2.dp else 1.dp),
            )
        }
    }
}

@Composable
fun Badge(text: String, color: Color, modifier: Modifier = Modifier) {
    Box(modifier.clip(Radius.Small).background(color).padding(horizontal = 7.dp, vertical = 3.dp)) {
        Text(text, style = MaterialTheme.typography.labelSmall, color = Color.White, fontWeight = FontWeight.Bold)
    }
}

@Composable
fun Shimmer(modifier: Modifier) {
    val t = rememberInfiniteTransition(label = "shimmer")
    val a by t.animateFloat(0.45f, 0.9f, infiniteRepeatable(tween(900), RepeatMode.Reverse), label = "a")
    Box(modifier.background(MaterialTheme.colorScheme.surfaceVariant.copy(alpha = a)))
}

@Composable
fun ProductTile(
    card: ProductCard,
    liked: Boolean,
    onLike: () -> Unit,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(modifier.clickable(role = Role.Button, onClick = onClick)) {
        Box(Modifier.fillMaxWidth().aspectRatio(0.8f).clip(Radius.Card).background(LocalLuxe.current.card)) {
            if (card.image != null) {
                AsyncImage(
                    model = card.image.sized(480),
                    contentDescription = card.image.alt ?: card.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
            }
            card.discountPercent?.let {
                Badge("−$it %", LocalLuxe.current.sale, Modifier.align(Alignment.TopStart).padding(8.dp))
            }
            HeartButton(liked, onLike, Modifier.align(Alignment.TopEnd).padding(6.dp))
            if (!card.available) {
                Box(
                    Modifier.align(Alignment.BottomStart).padding(8.dp).clip(Radius.Small)
                        .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.92f))
                        .padding(horizontal = 8.dp, vertical = 4.dp),
                ) { Text("Ausverkauft", style = MaterialTheme.typography.labelSmall) }
            }
        }
        Spacer(Modifier.height(8.dp))
        Text(
            card.title, style = MaterialTheme.typography.bodyMedium, maxLines = 2, overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 2.dp),
        )
        Spacer(Modifier.height(4.dp))
        Box(Modifier.padding(horizontal = 2.dp)) { Price(card.price, card.compareAt) }
    }
}

@Composable
fun HeartButton(liked: Boolean, onClick: () -> Unit, modifier: Modifier = Modifier) {
    Box(
        modifier.size(34.dp).clip(CircleShape)
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.9f))
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            painterResource(if (liked) R.drawable.ic_heart_filled else R.drawable.ic_heart),
            contentDescription = if (liked) "Von der Merkliste entfernen" else "Auf die Merkliste",
            tint = if (liked) LocalLuxe.current.sale else MaterialTheme.colorScheme.onSurface,
            modifier = Modifier.size(18.dp),
        )
    }
}

@Composable
fun TileSkeleton(modifier: Modifier = Modifier) {
    Column(modifier) {
        Shimmer(Modifier.fillMaxWidth().aspectRatio(0.8f).clip(Radius.Card))
        Spacer(Modifier.height(10.dp))
        Shimmer(Modifier.fillMaxWidth(0.9f).height(12.dp).clip(Radius.Small))
        Spacer(Modifier.height(6.dp))
        Shimmer(Modifier.fillMaxWidth(0.4f).height(12.dp).clip(Radius.Small))
    }
}

/**
 * Zweispaltiges Produktraster mit automatischem Nachladen. [key] setzt die Liste zurück (z. B. neue Sortierung).
 */
@Composable
fun ProductGrid(
    key: Any,
    load: suspend (cursor: String?) -> ProductPage,
    onOpen: (ProductCard) -> Unit,
    header: LazyGridScope.() -> Unit = {},
    empty: @Composable () -> Unit = { EmptyState(R.drawable.ic_search, "Nichts gefunden", "Versuch es mit einem anderen Begriff.") },
) {
    val wishlist = LocalShop.current.wishlist
    val liked by wishlist.items.collectAsState()
    val items = remember(key) { mutableStateListOf<ProductCard>() }
    var cursor by remember(key) { mutableStateOf<String?>(null) }
    var hasNext by remember(key) { mutableStateOf(true) }
    var loading by remember(key) { mutableStateOf(false) }
    var error by remember(key) { mutableStateOf<String?>(null) }
    var retry by remember(key) { mutableIntStateOf(0) }
    val grid = rememberLazyGridState()

    val nearEnd by remember(key) {
        derivedStateOf {
            val last = grid.layoutInfo.visibleItemsInfo.lastOrNull()?.index ?: 0
            last >= grid.layoutInfo.totalItemsCount - 6
        }
    }

    // Eine Schleife pro Liste: lädt Seite um Seite, solange das Ende in Sicht ist.
    // Nie parallel, und ein Abbruch (Screen verlassen) ist kein Fehler.
    LaunchedEffect(key) {
        snapshotFlow { nearEnd to retry }.collect { (near, _) ->
            if (!near && items.isNotEmpty()) return@collect
            while (hasNext && error == null && (items.isEmpty() || nearEnd)) {
                loading = true
                try {
                    val page = load(cursor)
                    val known = items.mapTo(HashSet()) { it.id }
                    items.addAll(page.products.filter { it.id !in known })
                    cursor = page.cursor
                    hasNext = page.hasNext && page.products.isNotEmpty()
                } catch (e: CancellationException) {
                    throw e
                } catch (e: Exception) {
                    error = friendly(e)
                } finally {
                    loading = false
                }
                withFrameNanos { } // Layout nachziehen lassen, dann nearEnd neu prüfen
            }
        }
    }

    if (items.isEmpty() && !loading && error == null && !hasNext) { empty(); return }
    if (items.isEmpty() && error != null) { ErrorState(error!!) { error = null; retry++ }; return }

    LazyVerticalGrid(
        state = grid,
        columns = GridCells.Adaptive(160.dp),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, bottom = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
        modifier = Modifier.fillMaxSize(),
    ) {
        header()
        itemsIndexed(items, key = { _, c -> c.id }) { _, card ->
            ProductTile(
                card, liked = liked.any { it.handle == card.handle },
                onLike = { wishlist.toggle(card) }, onClick = { onOpen(card) },
            )
        }
        if (items.isEmpty() && loading) {
            items(6) { TileSkeleton() }
        } else if (loading) {
            item(span = { GridItemSpan(maxLineSpan) }) { CenterSpinner(Modifier.fillMaxWidth().height(64.dp)) }
        }
        if (error != null && items.isNotEmpty()) {
            item(span = { GridItemSpan(maxLineSpan) }) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    GhostButton("Weitere laden") { error = null; retry++ }
                }
            }
        }
    }
}

@Composable
fun SectionHeader(title: String, action: String? = null, onAction: () -> Unit = {}) {
    Row(
        Modifier.fillMaxWidth().padding(start = 16.dp, end = 8.dp, top = 28.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
        if (action != null) {
            Row(
                Modifier.clip(Radius.Pill).clickable(onClick = onAction).padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(action, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.secondary)
                Icon(painterResource(R.drawable.ic_chevron), null, tint = MaterialTheme.colorScheme.secondary, modifier = Modifier.size(16.dp))
            }
        }
    }
}

@Composable
fun ChoiceChip(text: String, selected: Boolean, enabled: Boolean = true, onClick: () -> Unit) {
    val c = MaterialTheme.colorScheme
    val line = LocalLuxe.current.line
    Box(
        Modifier.clip(Radius.Pill)
            .background(if (selected) c.primary else Color.Transparent)
            .border(1.dp, if (selected) c.primary else line, Radius.Pill)
            .clickable(role = Role.RadioButton, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 9.dp),
    ) {
        Text(
            text,
            style = MaterialTheme.typography.labelMedium,
            color = when {
                selected -> c.onPrimary
                enabled -> c.onSurface
                else -> LocalLuxe.current.muted
            },
            textDecoration = if (!enabled && !selected) TextDecoration.LineThrough else null,
        )
    }
}

@Composable
fun IconCircle(@DrawableRes icon: Int, description: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier.size(40.dp).clip(CircleShape)
            .background(MaterialTheme.colorScheme.surface.copy(alpha = 0.92f))
            .clickable(role = Role.Button, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { Icon(painterResource(icon), description, modifier = Modifier.size(20.dp)) }
}
