package ch.luxestyle.app.data

import ch.luxestyle.app.ui.missingForFreeShipping
import ch.luxestyle.app.ui.seasonFor
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ShopLogicTest {
    private fun v(id: String, color: String, size: String, available: Boolean) = Variant(
        id, "$color / $size", available, Money(34.9), null, mapOf("Farbe" to color, "Grösse" to size), null,
    )

    private val dress = Product(
        "p1", "kleid", "Kleid", "", emptyList(),
        listOf(ProductOption("Farbe", listOf("Weiss", "Rot")), ProductOption("Grösse", listOf("S", "M"))),
        listOf(v("1", "Weiss", "S", false), v("2", "Weiss", "M", true), v("3", "Rot", "S", true), v("4", "Rot", "M", false)),
    )

    @Test
    fun startetMitDerErstenLieferbarenVariante() {
        assertEquals(mapOf("Farbe" to "Weiss", "Grösse" to "M"), dress.defaultSelection())
        assertEquals("2", dress.variantFor(dress.defaultSelection())?.id)
    }

    @Test
    fun grautNurWirklichUnkaufbareWerteAus() {
        val sel = mapOf("Farbe" to "Weiss", "Grösse" to "M")
        assertFalse(dress.isValueAvailable("Grösse", "S", sel)) // Weiss/S ausverkauft
        assertTrue(dress.isValueAvailable("Farbe", "Rot", mapOf("Farbe" to "Weiss", "Grösse" to "S"))) // Rot/S gibt's
        assertFalse(dress.isValueAvailable("Farbe", "Rot", sel)) // Rot/M ausverkauft
    }

    @Test
    fun rabattErstAbFuenfProzent() {
        val base = ProductCard("1", "h", "t", null, Money(80.0), Money(100.0), true)
        assertEquals(20, base.discountPercent)
        assertNull(base.copy(compareAt = Money(82.0)).discountPercent)
        assertNull(base.copy(compareAt = null).discountPercent)
    }

    @Test
    fun geldInSchweizerSchreibweise() {
        assertEquals("CHF 34.90", Money(34.9).format())
        assertEquals("CHF 1200.00", Money(1200.0).format())
    }

    @Test
    fun gratisVersandRechnung() {
        assertEquals("CHF 10.10", missingForFreeShipping(Money(34.9))?.format())
        assertNull(missingForFreeShipping(Money(45.0)))
        assertNull(missingForFreeShipping(Money(79.0)))
    }

    @Test
    fun saisonWechseltMitDemKalender() {
        assertEquals("jacken-outdoor", seasonFor(9).first)
        assertEquals("sommer", seasonFor(7).first)
        assertEquals("premium-geschenke", seasonFor(12).first)
    }

    @Test
    fun menueTitelOhneEmoji() {
        assertEquals("Geschenke & Mehr", cleanTitle("🎁 Geschenke & Mehr"))
        assertEquals("Merkliste", cleanTitle("♥ Merkliste"))
        assertEquals("Damen", cleanTitle("Damen"))
    }

    @Test
    fun beschreibungOhneEmojiKastenMitListen() {
        val html = "<p>Leicht und luftig.</p><h3>Das zeichnet es aus</h3><ul>\n<li>Baumwolle</li>\n<li>A-Linie</li>\n</ul>\n" +
            "<div style=\"background:#f7faf7\"><strong>🛡️ Sorglos shoppen:</strong> ✅ Geprüft</div>"
        val out = cleanDescription(html)
        assertFalse(out, out.contains("Sorglos"))
        assertFalse(out, out.contains("<div"))
        assertTrue(out, out.contains("• Baumwolle"))
        assertTrue(out, out.contains("<b>Das zeichnet es aus</b>"))
    }

    @Test
    fun graphqlKontextSchweiz() {
        assertEquals(
            "query C(\$h: String!) @inContext(country: CH, language: DE) { x }",
            Storefront.withSwissContext("query C(\$h: String!) { x }"),
        )
        assertEquals("query Menu @inContext(country: CH, language: DE) { x }", Storefront.withSwissContext("query Menu { x }"))
        assertEquals(
            "mutation M(\$l: [CartLineInput!]!) @inContext(country: CH, language: DE) { y }",
            Storefront.withSwissContext("mutation M(\$l: [CartLineInput!]!) { y }"),
        )
    }

    @Test
    fun parstEchteShopifyAntworten() {
        val card = Json.parseToJsonElement(
            """{"id":"gid://shopify/Product/1","handle":"kleid","title":"Kleid","availableForSale":true,
               "featuredImage":{"url":"https://cdn.shopify.com/a.jpg","altText":null,"width":800,"height":1000},
               "priceRange":{"minVariantPrice":{"amount":"34.9","currencyCode":"CHF"}},
               "compareAtPriceRange":{"maxVariantPrice":{"amount":"0.0","currencyCode":"CHF"}}}""",
        ) as JsonObject
        val c = Parse.card(card)!!
        assertEquals("kleid", c.handle)
        assertEquals(34.9, c.price.amount, 0.001)
        assertNull(c.compareAt) // 0.0 ist kein Streichpreis
        assertEquals("https://cdn.shopify.com/a.jpg?width=480", c.image!!.sized(480))

        val cart = Json.parseToJsonElement(
            """{"id":"gid://shopify/Cart/x","checkoutUrl":"https://luxestyle.ch/cart/c/x","totalQuantity":2,
               "cost":{"subtotalAmount":{"amount":"69.8","currencyCode":"CHF"},"totalAmount":{"amount":"62.82","currencyCode":"CHF"}},
               "discountCodes":[{"code":"WELCOME10","applicable":true}],
               "lines":{"nodes":[{"id":"l1","quantity":2,"cost":{"totalAmount":{"amount":"69.8","currencyCode":"CHF"}},
                 "merchandise":{"id":"v1","title":"Weiss / M","price":{"amount":"34.9","currencyCode":"CHF"},"image":null,
                   "product":{"handle":"kleid","title":"Kleid"}}}]}}""",
        ) as JsonObject
        val k = Parse.cart(cart)!!
        assertEquals(2, k.totalQuantity)
        assertEquals("Weiss / M", k.lines.single().variantTitle)
        assertEquals(listOf("WELCOME10" to true), k.discountCodes)
        assertEquals(62.82, k.total.amount, 0.001)
    }

    @Test
    fun menueNurMitKategorieLinks() {
        val items = Json.parseToJsonElement(
            """[{"title":"🎁 Geschenke","url":"https://luxestyle.ch/collections/premium-geschenke","items":[
                  {"title":"Für sie","url":"https://luxestyle.ch/collections/fuer-sie","items":[]}]},
                {"title":"♥ Merkliste","url":"https://luxestyle.ch/pages/merkliste","items":[]}]""",
        ) as kotlinx.serialization.json.JsonArray
        val m = Parse.menu(items)
        assertEquals(1, m.size)
        assertEquals("Geschenke", m[0].title)
        assertEquals("premium-geschenke", m[0].collectionHandle)
        assertEquals("fuer-sie", m[0].children.single().collectionHandle)
    }

    @Test
    fun merklisteUeberlebtNeustart() {
        val c = ProductCard("1", "kleid", "Kleid", Image("https://cdn.shopify.com/a.jpg"), Money(34.9), Money(49.9), true)
        assertEquals(c, CardList.decode(CardList.encode(c)))
    }
}
