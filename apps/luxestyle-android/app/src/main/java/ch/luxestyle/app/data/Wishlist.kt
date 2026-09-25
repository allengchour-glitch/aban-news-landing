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

/** Merkliste nur auf dem Gerät – kein Konto nötig. */
class Wishlist(prefs: SharedPreferences) : CardList(prefs, "wishlist_v1", max = 200)

/** Zuletzt angesehene Produkte (neueste zuerst, höchstens 12). */
class RecentlyViewed(prefs: SharedPreferences) : CardList(prefs, "recent_v1", max = 12) {
    fun seen(card: ProductCard) = put(card)
}

/** Geordnete Produktliste in den SharedPreferences. */
open class CardList(private val prefs: SharedPreferences, private val key: String, private val max: Int) {
    private val _items = MutableStateFlow(load())
    val items: StateFlow<List<ProductCard>> = _items.asStateFlow()

    fun contains(handle: String) = _items.value.any { it.handle == handle }

    fun toggle(card: ProductCard) {
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
