package ch.luxestyle.app.data

import android.content.Context
import kotlinx.coroutines.sync.withLock
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/** Eine Instanz pro App: gemeinsamer HTTP-Client, Warenkorb und Merkliste. */
class Shop(context: Context) {
    val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()
    val api = Storefront(http)
    private val prefs = context.getSharedPreferences("luxestyle", Context.MODE_PRIVATE)
    val cart = CartRepository(api, prefs)
    val wishlist = Wishlist(prefs)

    // Menü ändert sich selten → einmal pro App-Start laden
    private val menuLock = kotlinx.coroutines.sync.Mutex()
    private var menuCache: List<MenuItem>? = null
    suspend fun menu(): List<MenuItem> = menuLock.withLock {
        menuCache ?: api.menu().also { menuCache = it }
    }
    val recent = RecentlyViewed(prefs)
}
