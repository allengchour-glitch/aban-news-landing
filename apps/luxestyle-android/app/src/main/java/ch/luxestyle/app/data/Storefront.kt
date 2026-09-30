package ch.luxestyle.app.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.put
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException

class ShopException(message: String) : IOException(message)

/**
 * Shopify Storefront API. Ohne Token gehen Katalog und Warenkorb; Metafelder (Judge.me-Bewertungen)
 * liefert Shopify nur mit öffentlichem Storefront-Token ([token]). Fehlt er, fragt die App sie nicht ab.
 * Preise immer im Schweizer Kontext (CHF, Deutsch).
 */
class Storefront(
    private val http: OkHttpClient,
    private val endpoint: String = "https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json",
    private val token: String = "",
) {
    val hasRatings: Boolean get() = token.isNotBlank()

    private val json = Json { ignoreUnknownKeys = true }

    suspend fun run(query: String, variables: JsonObject = JsonObject(emptyMap())): JsonObject =
        withContext(Dispatchers.IO) {
            val body = buildJsonObject {
                put("query", JsonPrimitive(withSwissContext(withRatings(query, hasRatings))))
                put("variables", variables)
            }.toString().toRequestBody("application/json".toMediaType())
            val req = Request.Builder().url(endpoint).post(body)
                .header("Accept-Language", "de-CH")
                .apply { if (hasRatings) header("X-Shopify-Storefront-Access-Token", token) }
                .build()
            http.newCall(req).execute().use { res ->
                if (!res.isSuccessful) throw ShopException("Shop antwortet nicht (${res.code})")
                val root = json.parseToJsonElement(res.body?.string().orEmpty()) as? JsonObject
                    ?: throw ShopException("Leere Antwort")
                val errors = root.a("errors")
                if (errors.isNotEmpty() && root.o("data") == null) {
                    throw ShopException(errors.first().obj().s("message") ?: "Unbekannter Fehler")
                }
                root.o("data") ?: throw ShopException("Keine Daten")
            }
        }

    suspend fun home(seasonHandle: String, specs: List<RailSpec>): HomeData {
        val rails = specs.mapIndexed { i, r ->
            val sort = if (r.newest) "sortKey: CREATED, reverse: true" else "sortKey: BEST_SELLING"
            if (r.query != null) """r$i: products(first: 12, $sort, query: ${JsonPrimitive(r.query)}) { nodes { ...Card } }"""
            else """r$i: collection(handle: ${JsonPrimitive(r.handle)}) { ...Coll products(first: 12, $sort) { nodes { ...Card } } }"""
        }.joinToString("\n")
        val d = run(
            """query Home { season: collection(handle: "$seasonHandle") { ...Coll } $rails } $COLL $CARD""",
        )
        return HomeData(
            season = Parse.collection(d.o("season")),
            rails = specs.indices.mapNotNull { i ->
                val spec = specs[i]
                val c = d.o("r$i") ?: return@mapNotNull null
                val info = if (spec.query != null) CollectionInfo(spec.handle, spec.title ?: spec.handle, "", null)
                    else Parse.collection(c)?.let { spec.title?.let { t -> it.copy(title = t) } ?: it } ?: return@mapNotNull null
                val cards = (if (spec.query != null) c.a("nodes").mapNotNull { it.obj() } else c.nodes("products")).mapNotNull(Parse::card)
                if (cards.isEmpty()) null else info to cards
            },
        )
    }

    suspend fun menu(): List<MenuItem> {
        val d = run("""query Menu { menu(handle: "main-menu") { items { title url items { title url items { title url } } } } }""")
        val items = Parse.menu(d.o("menu").a("items"))
        // Bilder der Hauptkategorien in einer zweiten, gebündelten Abfrage
        val handles = items.mapNotNull { it.collectionHandle }.distinct()
        if (handles.isEmpty()) return items
        val q = handles.mapIndexed { i, h -> "c$i: collection(handle: \"$h\") { image { url altText width height } }" }
        val img = runCatching { run("query Img { ${q.joinToString(" ")} }") }.getOrNull()
        return items.map { m ->
            val i = handles.indexOf(m.collectionHandle)
            m.copy(image = img?.o("c$i")?.o("image")?.let(Parse::image)?.takeUnless(::isWebBanner))
        }
    }

    suspend fun collection(handle: String, sort: Sort, after: String?, filters: Filters = Filters()): Pair<CollectionInfo?, ProductPage> {
        val d = run(
            """query C(${'$'}h: String!, ${'$'}after: String, ${'$'}f: [ProductFilter!]) { collection(handle: ${'$'}h) { ...Coll
              products(first: 24, after: ${'$'}after, sortKey: ${sort.key}, reverse: ${sort.reverse}, filters: ${'$'}f) {
                nodes { ...Card } pageInfo { hasNextPage endCursor } } } } $COLL $CARD""",
            withFilters(vars("h" to handle, "after" to after), filters),
        )
        val c = d.o("collection") ?: throw ShopException("Kategorie nicht gefunden")
        return Parse.collection(c) to Parse.page(c.o("products"))
    }

    suspend fun search(query: String, sort: Sort, after: String?, filters: Filters = Filters()): Pair<Int, ProductPage> {
        val key = if (sort == Sort.PRICE_ASC || sort == Sort.PRICE_DESC) "PRICE" else "RELEVANCE"
        val d = run(
            """query S(${'$'}q: String!, ${'$'}after: String, ${'$'}f: [ProductFilter!]) {
              search(query: ${'$'}q, first: 24, after: ${'$'}after, types: PRODUCT, sortKey: $key, reverse: ${sort == Sort.PRICE_DESC},
                productFilters: ${'$'}f, prefix: LAST, unavailableProducts: LAST) {
                totalCount nodes { ... on Product { ...Card } } pageInfo { hasNextPage endCursor } } } $CARD""",
            withFilters(vars("q" to query, "after" to after), filters),
        )
        val s = d.o("search")
        return s.i("totalCount") to Parse.page(s)
    }

    suspend fun suggest(query: String): Suggestions {
        val d = run(
            """query P(${'$'}q: String!) { predictiveSearch(query: ${'$'}q, limit: 8, types: [PRODUCT, QUERY, COLLECTION]) {
              queries { text } collections { handle title } products { ...Card } } } $CARD""",
            vars("q" to query),
        )
        return Parse.suggestions(d.o("predictiveSearch"), query)
    }

    suspend fun product(handle: String): Product {
        val d = run(
            """query P(${'$'}h: String!) { product(handle: ${'$'}h) { id handle title descriptionHtml
              $RATING_MARK
              options { name optionValues { name } }
              images(first: 12) { nodes { url altText width height } }
              collections(first: 40) { nodes { handle } }
              variants(first: 100) { nodes { id title availableForSale price { amount currencyCode }
                compareAtPrice { amount currencyCode } selectedOptions { name value } image { url altText width height } } } } }""",
            vars("h" to handle),
        )
        return Parse.product(d.o("product")) ?: throw ShopException("Produkt nicht gefunden")
    }

    /** Aktueller Stand gemerkter Produkte (Preis, Verfügbarkeit); gelöschte fehlen in der Antwort. */
    suspend fun cards(ids: List<String>): List<ProductCard> {
        if (ids.isEmpty()) return emptyList()
        val d = run(
            """query N(${'$'}ids: [ID!]!) { nodes(ids: ${'$'}ids) { ... on Product { ...Card } } } $CARD""",
            buildJsonObject { put("ids", buildJsonArray { ids.take(250).forEach { add(JsonPrimitive(it)) } }) },
        )
        return d.a("nodes").mapNotNull { it.obj()?.let(Parse::card) }
    }

    /** Bild je Kollektion; ohne eigenes Bild das des ersten Produkts. */
    suspend fun collectionImages(handles: List<String>): Map<String, Image?> {
        if (handles.isEmpty()) return emptyMap()
        val q = handles.mapIndexed { i, h ->
            "c$i: collection(handle: ${JsonPrimitive(h)}) { image { url altText width height } " +
                "products(first: 1) { nodes { featuredImage { url altText width height } } } }"
        }
        val d = run("query Img { ${q.joinToString(" ")} }")
        return handles.withIndex().associate { (i, h) ->
            val c = d.o("c$i")
            val own = Parse.image(c.o("image"))?.takeUnless(::isWebBanner)
            h to (own ?: c.nodes("products").firstOrNull()?.o("featuredImage")?.let(Parse::image))
        }
    }

    suspend fun recommendations(productId: String): List<ProductCard> {
        val d = run(
            """query R(${'$'}id: ID!) { productRecommendations(productId: ${'$'}id) { ...Card collections(first: 40) { nodes { handle } } } } $CARD""",
            vars("id" to productId),
        )
        return d.a("productRecommendations").mapNotNull { it.obj()?.let(Parse::card) }.take(10)
    }

    // ---- Warenkorb ----

    suspend fun cart(id: String): Cart? =
        Parse.cart(run("""query Q(${'$'}id: ID!) { cart(id: ${'$'}id) { ...CartF } } $CART""", vars("id" to id)).o("cart"))

    suspend fun cartCreate(variantId: String, quantity: Int): Cart {
        val input = buildJsonObject {
            put("lines", buildJsonArray { add(line(variantId, quantity)) })
            put("attributes", buildJsonArray {
                add(buildJsonObject { put("key", "_quelle"); put("value", "android_app") })
            })
            put("buyerIdentity", buildJsonObject { put("countryCode", "CH") })
        }
        return mutate("cartCreate", """mutation M(${'$'}input: CartInput!) { cartCreate(input: ${'$'}input) {""",
            buildJsonObject { put("input", input) })
    }

    suspend fun cartAdd(cartId: String, variantId: String, quantity: Int): Cart =
        mutate("cartLinesAdd", """mutation M(${'$'}id: ID!, ${'$'}lines: [CartLineInput!]!) { cartLinesAdd(cartId: ${'$'}id, lines: ${'$'}lines) {""",
            buildJsonObject { put("id", cartId); put("lines", buildJsonArray { add(line(variantId, quantity)) }) })

    suspend fun cartUpdate(cartId: String, lineId: String, quantity: Int): Cart =
        mutate("cartLinesUpdate", """mutation M(${'$'}id: ID!, ${'$'}lines: [CartLineUpdateInput!]!) { cartLinesUpdate(cartId: ${'$'}id, lines: ${'$'}lines) {""",
            buildJsonObject {
                put("id", cartId)
                put("lines", buildJsonArray { add(buildJsonObject { put("id", lineId); put("quantity", quantity) }) })
            })

    suspend fun cartRemove(cartId: String, lineId: String): Cart =
        mutate("cartLinesRemove", """mutation M(${'$'}id: ID!, ${'$'}ids: [ID!]!) { cartLinesRemove(cartId: ${'$'}id, lineIds: ${'$'}ids) {""",
            buildJsonObject { put("id", cartId); put("ids", buildJsonArray { add(JsonPrimitive(lineId)) }) })

    suspend fun cartDiscount(cartId: String, codes: List<String>): Cart =
        mutate("cartDiscountCodesUpdate", """mutation M(${'$'}id: ID!, ${'$'}codes: [String!]) { cartDiscountCodesUpdate(cartId: ${'$'}id, discountCodes: ${'$'}codes) {""",
            buildJsonObject { put("id", cartId); put("codes", buildJsonArray { codes.forEach { add(JsonPrimitive(it)) } }) })

    private suspend fun mutate(field: String, head: String, variables: JsonObject): Cart {
        val d = run("$head cart { ...CartF } userErrors { message } } } $CART", variables)
        val r = d.o(field)
        r.a("userErrors").firstOrNull()?.obj().s("message")?.let { throw ShopException(it) }
        return Parse.cart(r.o("cart")) ?: throw ShopException("Warenkorb nicht verfügbar")
    }

    private fun line(variantId: String, quantity: Int) =
        buildJsonObject { put("merchandiseId", variantId); put("quantity", quantity) }

    private fun withFilters(base: JsonObject, f: Filters): JsonObject =
        JsonObject(base + ("f" to filterInputs(f)))

    private fun vars(vararg pairs: Pair<String, String?>): JsonObject = buildJsonObject {
        pairs.forEach { (k, v) -> put(k, v?.let { JsonPrimitive(it) } ?: kotlinx.serialization.json.JsonNull) }
    }

    enum class Sort(val label: String, val key: String, val reverse: Boolean) {
        FEATURED("Empfohlen", "COLLECTION_DEFAULT", false),
        BEST("Beliebt", "BEST_SELLING", false),
        NEW("Neu", "CREATED", true),
        PRICE_ASC("Preis ↑", "PRICE", false),
        PRICE_DESC("Preis ↓", "PRICE", true),
    }

    companion object {
        /** Filter → Shopify `ProductFilter`-Liste (Preis in CHF, Lieferbarkeit). */
        fun filterInputs(f: Filters) = buildJsonArray {
            f.price?.let { band ->
                add(buildJsonObject {
                    put("price", buildJsonObject {
                        band.min?.let { put("min", it) }
                        band.max?.let { put("max", it) }
                    })
                })
            }
            if (f.onlyAvailable) add(buildJsonObject { put("available", true) })
        }

        /** Hängt `@inContext(country: CH, language: DE)` hinter den Operationsnamen (Preise in CHF, Texte DE). */
        fun withSwissContext(query: String): String {
            val m = Regex("""^\s*(query|mutation)\s+\w+(\([^)]*\))?""").find(query) ?: return query
            return query.substring(0, m.range.last + 1) + " @inContext(country: CH, language: DE)" +
                query.substring(m.range.last + 1)
        }

        /** Platzhalter für die Bewertungsfelder – ohne Token bleibt er als GraphQL-Kommentar stehen. */
        const val RATING_MARK = "#rating"
        private const val RATING_FIELDS = """rating: metafield(namespace: "reviews", key: "rating") { value }
            ratingCount: metafield(namespace: "reviews", key: "rating_count") { value }"""

        fun withRatings(query: String, enabled: Boolean): String =
            if (enabled) query.replace(RATING_MARK, RATING_FIELDS) else query

        private const val CARD = """fragment Card on Product { id handle title availableForSale
            $RATING_MARK
            featuredImage { url altText width height }
            priceRange { minVariantPrice { amount currencyCode } }
            compareAtPriceRange { maxVariantPrice { amount currencyCode } }
            variants(first: 2) { nodes { id availableForSale } } }"""
        private const val COLL = """fragment Coll on Collection { handle title description image { url altText width height } }"""
        private const val CART = """fragment CartF on Cart { id checkoutUrl totalQuantity
            cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
            discountCodes { code applicable }
            lines(first: 100) { nodes { id quantity cost { totalAmount { amount currencyCode } }
              merchandise { ... on ProductVariant { id title price { amount currencyCode } image { url altText }
                product { id handle title } } } } } }"""
    }
}

/**
 * Breite Web-Banner (1600×620) tragen Titel und Knopf ins Bild gebrannt („Frauen … Jetzt entdecken").
 * In der App werden sie abgeschnitten und doppeln den eigenen Text – dort lieber ein Produktbild.
 */
fun isWebBanner(image: Image): Boolean =
    image.height > 0 && image.width.toDouble() / image.height > 2.2
