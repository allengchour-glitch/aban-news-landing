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
 * Shopify Storefront API (ohne Token – Shopify erlaubt öffentliche Lesezugriffe und den Warenkorb).
 * Preise immer im Schweizer Kontext (CHF, Deutsch).
 */
class Storefront(
    private val http: OkHttpClient,
    private val endpoint: String = "https://au3j0y-hq.myshopify.com/api/2025-07/graphql.json",
) {
    private val json = Json { ignoreUnknownKeys = true }

    suspend fun run(query: String, variables: JsonObject = JsonObject(emptyMap())): JsonObject =
        withContext(Dispatchers.IO) {
            val body = buildJsonObject {
                put("query", JsonPrimitive(withSwissContext(query)))
                put("variables", variables)
            }.toString().toRequestBody("application/json".toMediaType())
            val req = Request.Builder().url(endpoint).post(body)
                .header("Accept-Language", "de-CH")
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

    suspend fun home(seasonHandle: String, railHandles: List<String>): HomeData {
        val rails = railHandles.mapIndexed { i, h ->
            """r$i: collection(handle: "$h") { ...Coll products(first: 12, sortKey: BEST_SELLING) { nodes { ...Card } } }"""
        }.joinToString("\n")
        val d = run(
            """query Home { season: collection(handle: "$seasonHandle") { ...Coll } $rails } $COLL $CARD""",
        )
        return HomeData(
            season = Parse.collection(d.o("season")),
            rails = railHandles.indices.mapNotNull { i ->
                val c = d.o("r$i") ?: return@mapNotNull null
                val info = Parse.collection(c) ?: return@mapNotNull null
                val cards = c.nodes("products").mapNotNull(Parse::card)
                if (cards.isEmpty()) null else info to cards
            },
        )
    }

    suspend fun menu(): List<MenuItem> {
        val d = run("""query Menu { menu(handle: "main-menu") { items { title url items { title url } } } }""")
        val items = Parse.menu(d.o("menu").a("items"))
        // Bilder der Hauptkategorien in einer zweiten, gebündelten Abfrage
        val handles = items.mapNotNull { it.collectionHandle }.distinct()
        if (handles.isEmpty()) return items
        val q = handles.mapIndexed { i, h -> "c$i: collection(handle: \"$h\") { image { url altText width height } }" }
        val img = runCatching { run("query Img { ${q.joinToString(" ")} }") }.getOrNull()
        return items.map { m ->
            val i = handles.indexOf(m.collectionHandle)
            m.copy(image = img?.o("c$i")?.o("image")?.let(Parse::image))
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
              search(query: ${'$'}q, first: 24, after: ${'$'}after, types: PRODUCT, sortKey: $key, reverse: ${sort == Sort.PRICE_DESC}, productFilters: ${'$'}f) {
                totalCount nodes { ... on Product { ...Card } } pageInfo { hasNextPage endCursor } } } $CARD""",
            withFilters(vars("q" to query, "after" to after), filters),
        )
        val s = d.o("search")
        return s.i("totalCount") to Parse.page(s)
    }

    suspend fun suggest(query: String): Suggestions {
        val d = run(
            """query P(${'$'}q: String!) { predictiveSearch(query: ${'$'}q, limit: 6, types: [PRODUCT, QUERY]) {
              queries { text } products { ...Card } } } $CARD""",
            vars("q" to query),
        )
        return Parse.suggestions(d.o("predictiveSearch"))
    }

    suspend fun product(handle: String): Product {
        val d = run(
            """query P(${'$'}h: String!) { product(handle: ${'$'}h) { id handle title descriptionHtml
              options { name optionValues { name } }
              images(first: 12) { nodes { url altText width height } }
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

    suspend fun recommendations(productId: String): List<ProductCard> {
        val d = run(
            """query R(${'$'}id: ID!) { productRecommendations(productId: ${'$'}id) { ...Card } } $CARD""",
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

        private const val CARD = """fragment Card on Product { id handle title availableForSale
            featuredImage { url altText width height }
            priceRange { minVariantPrice { amount currencyCode } }
            compareAtPriceRange { maxVariantPrice { amount currencyCode } } }"""
        private const val COLL = """fragment Coll on Collection { handle title description image { url altText width height } }"""
        private const val CART = """fragment CartF on Cart { id checkoutUrl totalQuantity
            cost { subtotalAmount { amount currencyCode } totalAmount { amount currencyCode } }
            discountCodes { code applicable }
            lines(first: 100) { nodes { id quantity cost { totalAmount { amount currencyCode } }
              merchandise { ... on ProductVariant { id title price { amount currencyCode } image { url altText }
                product { handle title } } } } } }"""
    }
}
