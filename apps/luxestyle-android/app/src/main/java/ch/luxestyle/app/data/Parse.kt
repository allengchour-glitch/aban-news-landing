package ch.luxestyle.app.data

import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonNull
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull

/** Kleine, fehlertolerante Leser für die GraphQL-Antworten (fehlende Felder = null statt Absturz). */
internal fun JsonElement?.obj(): JsonObject? = this as? JsonObject
internal fun JsonElement?.arr(): List<JsonElement> = (this as? JsonArray).orEmpty()
internal fun JsonObject?.o(key: String): JsonObject? = this?.get(key).obj()
internal fun JsonObject?.a(key: String): List<JsonElement> = this?.get(key).arr()
internal fun JsonObject?.s(key: String): String? =
    (this?.get(key) as? JsonPrimitive)?.takeIf { it !is JsonNull }?.contentOrNull
internal fun JsonObject?.b(key: String): Boolean = (this?.get(key) as? JsonPrimitive)?.booleanOrNull ?: false
internal fun JsonObject?.i(key: String): Int = (this?.get(key) as? JsonPrimitive)?.intOrNull ?: 0
internal fun JsonObject?.nodes(key: String): List<JsonObject> = this.o(key).a("nodes").mapNotNull { it.obj() }

object Parse {
    fun money(o: JsonObject?): Money? {
        val amount = o.s("amount")?.toDoubleOrNull() ?: return null
        return Money(amount, o.s("currencyCode") ?: "CHF")
    }

    fun image(o: JsonObject?): Image? {
        val url = o.s("url") ?: return null
        return Image(url, o.s("altText"), o.i("width"), o.i("height"))
    }

    fun card(o: JsonObject): ProductCard? {
        val price = money(o.o("priceRange").o("minVariantPrice")) ?: return null
        return ProductCard(
            id = o.s("id") ?: return null,
            handle = o.s("handle") ?: return null,
            title = o.s("title").orEmpty(),
            image = image(o.o("featuredImage")),
            price = price,
            compareAt = money(o.o("compareAtPriceRange").o("maxVariantPrice"))?.takeIf { it.amount > price.amount },
            available = o.b("availableForSale"),
        )
    }

    fun page(conn: JsonObject?): ProductPage {
        val info = conn.o("pageInfo")
        return ProductPage(
            products = conn.a("nodes").mapNotNull { it.obj()?.let(::card) },
            cursor = info.s("endCursor"),
            hasNext = info.b("hasNextPage"),
        )
    }

    fun collection(o: JsonObject?): CollectionInfo? {
        o ?: return null
        return CollectionInfo(
            handle = o.s("handle") ?: return null,
            title = cleanTitle(o.s("title").orEmpty()),
            description = o.s("description").orEmpty(),
            image = image(o.o("image")),
        )
    }

    fun product(o: JsonObject?): Product? {
        o ?: return null
        val variants = o.nodes("variants").mapNotNull { v ->
            Variant(
                id = v.s("id") ?: return@mapNotNull null,
                title = v.s("title").orEmpty(),
                available = v.b("availableForSale"),
                price = money(v.o("price")) ?: return@mapNotNull null,
                compareAt = money(v.o("compareAtPrice")),
                options = v.a("selectedOptions").mapNotNull { it.obj() }
                    .associate { it.s("name").orEmpty() to it.s("value").orEmpty() },
                image = image(v.o("image")),
            )
        }
        if (variants.isEmpty()) return null
        val options = o.a("options").mapNotNull { it.obj() }.map { opt ->
            ProductOption(opt.s("name").orEmpty(), opt.a("optionValues").mapNotNull { it.obj().s("name") })
        }.filterNot { it.values.size <= 1 && it.values.firstOrNull() == "Default Title" }
        return Product(
            id = o.s("id") ?: return null,
            handle = o.s("handle") ?: return null,
            title = o.s("title").orEmpty(),
            descriptionHtml = o.s("descriptionHtml").orEmpty(),
            images = o.nodes("images").mapNotNull { image(it) },
            options = options,
            variants = variants,
        )
    }

    fun menu(items: List<JsonElement>): List<MenuItem> = items.mapNotNull { it.obj() }.map {
        MenuItem(cleanTitle(it.s("title").orEmpty()), it.s("url").orEmpty(), menu(it.a("items")))
    }.filter { it.title.isNotEmpty() && it.collectionHandle != null }

    fun cart(o: JsonObject?): Cart? {
        o ?: return null
        val cost = o.o("cost")
        return Cart(
            id = o.s("id") ?: return null,
            checkoutUrl = o.s("checkoutUrl").orEmpty(),
            totalQuantity = o.i("totalQuantity"),
            subtotal = money(cost.o("subtotalAmount")) ?: Money(0.0),
            total = money(cost.o("totalAmount")) ?: Money(0.0),
            lines = o.nodes("lines").mapNotNull { l ->
                val m = l.o("merchandise")
                val qty = l.i("quantity")
                val lineTotal = money(l.o("cost").o("totalAmount")) ?: return@mapNotNull null
                val unit = money(m.o("price")) ?: Money(lineTotal.amount / qty.coerceAtLeast(1), lineTotal.currency)
                CartLine(
                    id = l.s("id") ?: return@mapNotNull null,
                    quantity = qty,
                    variantId = m.s("id").orEmpty(),
                    productHandle = m.o("product").s("handle").orEmpty(),
                    productTitle = m.o("product").s("title").orEmpty(),
                    variantTitle = m.s("title")?.takeIf { it != "Default Title" },
                    image = image(m.o("image")),
                    unitPrice = unit,
                    lineTotal = lineTotal,
                )
            },
            discountCodes = o.a("discountCodes").mapNotNull { it.obj() }
                .map { (it.s("code").orEmpty()) to it.b("applicable") },
        )
    }

    fun suggestions(o: JsonObject?): Suggestions = Suggestions(
        queries = o.a("queries").mapNotNull { it.obj().s("text") },
        products = o.a("products").mapNotNull { it.obj()?.let(::card) },
    )
}
