package ch.luxestyle.app.data

import android.content.SharedPreferences
import androidx.core.content.edit
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put

/** Wie viel günstiger als beim Merken (null = nicht günstiger; Rappen-Rundungen zählen nicht). */
fun priceDrop(likedAt: Double?, now: Double): Double? = likedAt?.let { it - now }?.takeIf { it >= 0.05 }

/**
 * Merkliste nur auf dem Gerät – kein Konto nötig.
 * Merkt sich den Preis beim Speichern, damit die App zeigen kann, wenn ein Stück günstiger wurde.
 */
class Wishlist(private val prefs: SharedPreferences) : CardList(prefs, "wishlist_v1", max = 200) {
    private val _likedAt = MutableStateFlow(loadPrices())
    /** Handle → Preis zum Zeitpunkt des Merkens. */
    val likedAt: StateFlow<Map<String, Double>> = _likedAt.asStateFlow()

    override fun toggle(card: ProductCard) {
        val adding = !contains(card.handle)
        super.toggle(card)
        _likedAt.value = if (adding) _likedAt.value + (card.handle to card.price.amount) else _likedAt.value - card.handle
        savePrices()
    }

    /** Frische Shopdaten übernehmen; nicht mehr gefundene Produkte gelten als ausverkauft. */
    fun update(fresh: List<ProductCard>) {
        val byId = fresh.associateBy { it.id }
        replaceAll(items.value.map { old -> byId[old.id] ?: old.copy(available = false) })
    }

    private fun savePrices() = prefs.edit {
        putString(PRICES, JsonObject(_likedAt.value.mapValues { JsonPrimitive(it.value) }).toString())
    }

    private fun loadPrices(): Map<String, Double> = runCatching {
        (Json.parseToJsonElement(prefs.getString(PRICES, null) ?: return@runCatching null) as JsonObject)
            .mapValues { (it.value as JsonPrimitive).content.toDouble() }
    }.getOrNull() ?: items.value.associate { it.handle to it.price.amount } // Merkliste von vor dieser Version

    private companion object { const val PRICES = "wishlist_prices_v1" }
}

/** Zuletzt angesehene Produkte (neueste zuerst, höchstens 12). */
class RecentlyViewed(prefs: SharedPreferences) : CardList(prefs, "recent_v1", max = 12) {
    fun seen(card: ProductCard) = put(card)
}

/** Geordnete Produktliste in den SharedPreferences. */
open class CardList(private val prefs: SharedPreferences, private val key: String, private val max: Int) {
    private val _items = MutableStateFlow(load())
    val items: StateFlow<List<ProductCard>> = _items.asStateFlow()

    fun contains(handle: String) = _items.value.any { it.handle == handle }

    open fun toggle(card: ProductCard) {
        if (contains(card.handle)) {
            _items.value = _items.value.filterNot { it.handle == card.handle }
            save()
        } else {
            put(card)
        }
    }

    protected fun put(card: ProductCard) {
        _items.value = (listOf(card) + _items.value.filterNot { it.handle == card.handle }).take(max)
        save()
    }

    protected fun replaceAll(list: List<ProductCard>) {
        _items.value = list
        save()
    }

    private fun save() {
        val arr = buildJsonArray { _items.value.forEach { add(encode(it)) } }
        prefs.edit { putString(key, arr.toString()) }
    }

    private fun load(): List<ProductCard> = runCatching {
        (Json.parseToJsonElement(prefs.getString(key, "[]")!!) as JsonArray).mapNotNull { decode(it as JsonObject) }
    }.getOrDefault(emptyList())

    companion object {

        fun encode(c: ProductCard): JsonObject = buildJsonObject {
            put("id", c.id); put("handle", c.handle); put("title", c.title)
            c.image?.let { put("image", it.url) }
            put("price", c.price.amount); put("currency", c.price.currency)
            c.compareAt?.let { put("compareAt", it.amount) }
            put("available", c.available)
        }

        fun decode(o: JsonObject): ProductCard? {
            val price = (o["price"] as? JsonPrimitive)?.content?.toDoubleOrNull() ?: return null
            val cur = o.s("currency") ?: "CHF"
            return ProductCard(
                id = o.s("id") ?: return null,
                handle = o.s("handle") ?: return null,
                title = o.s("title").orEmpty(),
                image = o.s("image")?.let { Image(it) },
                price = Money(price, cur),
                compareAt = (o["compareAt"] as? JsonPrimitive)?.content?.toDoubleOrNull()?.let { Money(it, cur) },
                available = o.b("available"),
            )
        }
    }
}

/** Letzte Suchbegriffe (neueste zuerst, höchstens 8) – nur auf dem Gerät. */
class RecentSearches(private val prefs: SharedPreferences) {
    private val _items = MutableStateFlow(load())
    val items: StateFlow<List<String>> = _items.asStateFlow()

    fun add(query: String) {
        val q = query.trim().takeIf { it.length >= 2 } ?: return
        _items.value = (listOf(q) + _items.value.filterNot { it.equals(q, ignoreCase = true) }).take(8)
        save()
    }

    fun clear() { _items.value = emptyList(); save() }

    private fun save() = prefs.edit { putString(KEY, buildJsonArray { _items.value.forEach { add(JsonPrimitive(it)) } }.toString()) }

    private fun load(): List<String> = runCatching {
        (Json.parseToJsonElement(prefs.getString(KEY, "[]")!!) as JsonArray).map { (it as JsonPrimitive).content }
    }.getOrDefault(emptyList())

    private companion object { const val KEY = "searches_v1" }
}
