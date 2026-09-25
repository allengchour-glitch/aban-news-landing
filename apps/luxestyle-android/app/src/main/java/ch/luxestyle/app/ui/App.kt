package ch.luxestyle.app.ui

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.annotation.DrawableRes
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Snackbar
import androidx.compose.material3.SnackbarDuration
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.SnackbarResult
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.unit.dp
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import ch.luxestyle.app.Destination
import ch.luxestyle.app.Links
import ch.luxestyle.app.R
import ch.luxestyle.app.WebActivity
import ch.luxestyle.app.data.Shop
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.launch

val LocalShop = staticCompositionLocalOf<Shop> { error("Shop fehlt") }
val LocalNav = staticCompositionLocalOf<Nav> { error("Nav fehlt") }

/** Alle Wege durch die App an einem Ort. */
class Nav(
    private val controller: NavHostController,
    private val context: Context,
    val snackbar: SnackbarHostState,
    private val launch: (suspend () -> Unit) -> Unit,
) {
    fun product(handle: String) = controller.navigate("product/${Uri.encode(handle)}")
    fun collection(handle: String, title: String? = null) =
        controller.navigate("collection/${Uri.encode(handle)}?title=${Uri.encode(title.orEmpty())}")
    fun search(query: String? = null) = tab("search?q=${Uri.encode(query.orEmpty())}")
    fun cart() = tab(Tab.CART.route)
    fun home() = tab(Tab.HOME.route)
    fun back() { if (!controller.popBackStack()) home() }
    fun web(url: String, title: String? = null) = context.startActivity(WebActivity.intent(context, url, title))
    fun account() = web("https://luxestyle.ch/account", "Mein Konto")

    fun share(title: String, url: String) {
        val send = Intent(Intent.ACTION_SEND).setType("text/plain")
            .putExtra(Intent.EXTRA_SUBJECT, title)
            .putExtra(Intent.EXTRA_TEXT, "$title\n${Links.shareUrl(url)}")
        context.startActivity(Intent.createChooser(send, "Teilen über"))
    }

    fun toast(message: String, action: String? = null, onAction: () -> Unit = {}) = launch {
        val r = snackbar.showSnackbar(message, actionLabel = action, withDismissAction = action == null, duration = SnackbarDuration.Short)
        if (r == SnackbarResult.ActionPerformed) onAction()
    }

    fun open(d: Destination) = when (d) {
        is Destination.Product -> product(d.handle)
        is Destination.Collection -> collection(d.handle)
        is Destination.Search -> search(d.query)
        Destination.Cart -> cart()
        Destination.Wishlist -> tab(Tab.WISH.route)
        Destination.Home -> home()
        is Destination.Web -> web(d.url)
    }

    private fun tab(route: String) = controller.navigate(route) {
        popUpTo(controller.graph.findStartDestination().id) { saveState = true }
        launchSingleTop = true
        restoreState = !route.startsWith("search?q=") || route == "search?q="
    }
}

enum class Tab(val route: String, val label: String, @DrawableRes val icon: Int) {
    HOME("home", "Start", R.drawable.ic_home),
    SHOP("categories", "Kategorien", R.drawable.ic_grid),
    SEARCH("search?q=", "Suche", R.drawable.ic_search),
    WISH("wishlist", "Merkliste", R.drawable.ic_heart),
    CART("cart", "Warenkorb", R.drawable.ic_bag),
}

@Composable
fun LuxeApp(shop: Shop, links: Flow<String>) {
    val controller = rememberNavController()
    val context = LocalContext.current
    val snackbar = remember { SnackbarHostState() }
    val scope = rememberCoroutineScope()
    val nav = remember(controller) { Nav(controller, context, snackbar) { block -> scope.launch { block() } } }

    // Shop-Links von aussen (Newsletter, Social, geteilte Produkte)
    LaunchedEffect(links) { links.collect { nav.open(Links.destination(it)) } }

    CompositionLocalProvider(LocalShop provides shop, LocalNav provides nav) {
        val entry by controller.currentBackStackEntryAsState()
        val route = entry?.destination?.route.orEmpty()
        val showBar = !route.startsWith("product/")
        Scaffold(
            contentWindowInsets = WindowInsets(0),
            snackbarHost = {
                SnackbarHost(snackbar, Modifier.padding(bottom = if (showBar) 0.dp else 84.dp)) { data ->
                    Snackbar(
                        data,
                        shape = Radius.Card,
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                        actionColor = MaterialTheme.colorScheme.secondary,
                        dismissActionContentColor = MaterialTheme.colorScheme.onPrimary,
                    )
                }
            },
            bottomBar = { if (showBar) BottomBar(controller, route) },
        ) { pad ->
            Box(Modifier.fillMaxSize().padding(pad)) {
                NavHost(
                    controller, startDestination = Tab.HOME.route,
                    enterTransition = { fadeIn() }, exitTransition = { fadeOut() },
                ) {
                    composable(Tab.HOME.route) { HomeScreen() }
                    composable(Tab.SHOP.route) { CategoriesScreen() }
                    composable(
                        "search?q={q}",
                        arguments = listOf(navArgument("q") { type = NavType.StringType; defaultValue = "" }),
                    ) { SearchScreen(it.arguments?.getString("q").orEmpty()) }
                    composable(Tab.WISH.route) { WishlistScreen() }
                    composable(Tab.CART.route) { CartScreen() }
                    composable(
                        "collection/{handle}?title={title}",
                        arguments = listOf(
                            navArgument("handle") { type = NavType.StringType },
                            navArgument("title") { type = NavType.StringType; defaultValue = "" },
                        ),
                    ) { CollectionScreen(it.arguments?.getString("handle").orEmpty(), it.arguments?.getString("title").orEmpty()) }
                    composable(
                        "product/{handle}",
                        arguments = listOf(navArgument("handle") { type = NavType.StringType }),
                    ) { ProductScreen(it.arguments?.getString("handle").orEmpty()) }
                }
            }
        }
    }
}

@Composable
private fun BottomBar(controller: NavHostController, route: String) {
    val cart by LocalShop.current.cart.cart.collectAsState()
    val count = cart?.totalQuantity ?: 0
    val c = MaterialTheme.colorScheme
    androidx.compose.foundation.layout.Column {
        HorizontalDivider(color = LocalLuxe.current.line)
        NavigationBar(containerColor = c.surface, tonalElevation = 0.dp) {
            Tab.entries.forEach { tab ->
                val selected = route.substringBefore('?') == tab.route.substringBefore('?')
                NavigationBarItem(
                    selected = selected,
                    onClick = {
                        controller.navigate(tab.route) {
                            popUpTo(controller.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    },
                    icon = {
                        if (tab == Tab.CART && count > 0) {
                            BadgedBox(badge = { Badge(containerColor = c.secondary) { Text("$count") } }) {
                                Icon(painterResource(tab.icon), tab.label, Modifier.size(24.dp))
                            }
                        } else {
                            Icon(painterResource(tab.icon), tab.label, Modifier.size(24.dp))
                        }
                    },
                    label = { Text(tab.label, style = MaterialTheme.typography.labelSmall) },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = c.secondary, selectedTextColor = c.secondary,
                        unselectedIconColor = LocalLuxe.current.muted, unselectedTextColor = LocalLuxe.current.muted,
                        indicatorColor = c.surface,
                    ),
                )
            }
        }
    }
}
