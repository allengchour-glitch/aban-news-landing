package ch.luxestyle.app.data

import android.content.SharedPreferences
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock

/** Hält den Shopify-Warenkorb; die Cart-ID überlebt App-Neustarts. */
class CartRepository(private val api: Storefront, private val prefs: SharedPreferences) {
    private val _cart = MutableStateFlow<Cart?>(null)
    val cart: StateFlow<Cart?> = _cart.asStateFlow()
    private val lock = Mutex()

    /** Nach der Kasse liefert Shopify für die alte ID `null` → Warenkorb gilt als geleert. */
    suspend fun refresh() = lock.withLock {
        val id = prefs.getString(KEY, null) ?: return@withLock
        val fresh = runCatching { api.cart(id) }.getOrElse { return@withLock }
        if (fresh == null) forget() else _cart.value = fresh
    }

    suspend fun add(variantId: String, quantity: Int = 1): Cart = lock.withLock {
        val id = prefs.getString(KEY, null)
        val updated = if (id == null) {
            api.cartCreate(variantId, quantity)
        } else {
            runCatching { api.cartAdd(id, variantId, quantity) }
                .getOrElse { api.cartCreate(variantId, quantity) } // alte ID abgelaufen
        }
        store(updated)
    }

    suspend fun setQuantity(lineId: String, quantity: Int): Cart? = lock.withLock {
        val id = prefs.getString(KEY, null) ?: return@withLock null
        store(if (quantity <= 0) api.cartRemove(id, lineId) else api.cartUpdate(id, lineId, quantity))
    }

    suspend fun applyCode(code: String): Cart? = lock.withLock {
        val id = prefs.getString(KEY, null) ?: return@withLock null
        val codes = listOf(code.trim().uppercase()).filter { it.isNotEmpty() }
        store(api.cartDiscount(id, codes))
    }

    private fun store(cart: Cart): Cart {
        prefs.edit { putString(KEY, cart.id) }
        _cart.value = cart
        return cart
    }

    private fun forget() {
        prefs.edit { remove(KEY) }
        _cart.value = null
    }

    companion object {
        private const val KEY = "cart_id"
        /** Wie die Versandregel im Shopify-Admin (Schweiz: „Kostenloser Versand" ab CHF 45, sonst CHF 7). */
        const val FREE_SHIPPING_CHF = 45.0
    }
}
