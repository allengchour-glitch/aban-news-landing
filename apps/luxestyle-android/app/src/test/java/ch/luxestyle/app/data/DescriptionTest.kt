package ch.luxestyle.app.data

import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Assume.assumeTrue
import org.junit.Test
import java.io.File

class DescriptionTest {
    // Ausschnitt einer echten Kleid-Beschreibung aus dem Shop
    private val dress = """<ul><li>🎨 3 Farben – Dunkelblau, Hellblau, Schwarz</li></ul><h4>📏 Grössentabelle (Damen, cm)</h4><table>
        <thead><tr><th>Grösse</th><th>EU</th><th>Büste</th></tr></thead>
        <tbody><tr><td>S</td><td>34–36</td><td>84–88</td></tr><tr><td>XXL</td><td>42–44</td><td>101–106</td></tr></tbody>
        </table><p><em>Asiatische Konfektion – im Zweifel eine Nummer grösser.</em></p>
        <p>👉 <strong><a href="https://luxestyle.ch/collections/kleider">Mehr Kleider entdecken →</a></strong></p>
        <table style="width:100%"><tr><td><strong>Versand &amp; Lieferung</strong><br><small>Gratis-Versand ab CHF 50</small></td></tr></table>
        <p><em> 🇨🇭 Gratis-Versand ab CHF 50 · WELCOME10 –10%.</em></p><!--xsell--><p>👉 Passt dazu: <a href="/collections/kleider">Kleider</a></p>"""

    @Test
    fun grössentabelleWirdErkannt() {
        val g = sizeGuide(dress)!!
        val c = g.charts.single()
        assertEquals(listOf("Grösse", "EU", "Büste"), c.header)
        assertEquals(listOf("S", "34–36", "84–88"), c.rows[0])
        assertEquals(1, c.rowFor("2XL")) // Shop-Variante „2XL" = Tabellenzeile „XXL"
        assertEquals(0, c.rowFor("s"))
        assertEquals(-1, c.rowFor("M"))
        assertEquals(listOf("Asiatische Konfektion – im Zweifel eine Nummer grösser."), g.notes)
    }

    @Test
    fun layoutTabelleIstKeineGrössentabelle() {
        assertNull(sizeGuide("""<table><tr><td>Versand</td></tr></table>"""))
    }

    @Test
    fun beschreibungOhneTabellenWerbungUndEmoji() {
        val out = cleanDescription(dress)
        assertTrue(out, out.startsWith("• 3 Farben"))
        listOf("<table", "Grössentabelle", "CHF 50", "Passt dazu", "Mehr Kleider", "Konfektion", "🎨", "🇨🇭", "<!--")
            .forEach { assertFalse("$it in $out", out.contains(it)) }
    }

    /** Gegen den echten Katalog: `LUXE_DESCS=<datei>` (je Zeile eine Storefront-Antwort mit products.nodes). */
    @Test
    fun ganzerKatalog() {
        val path = System.getenv("LUXE_DESCS")
        assumeTrue(path != null)
        val nodes = File(path!!).readLines().filter { it.isNotBlank() }.flatMap {
            Json.parseToJsonElement(it).jsonObject["data"]!!.jsonObject["products"]!!.jsonObject["nodes"]!!.jsonArray
        }.map { it.jsonObject }.distinctBy { it.s("handle") }
        var charts = 0
        var delivery = 0
        nodes.forEach { n ->
            val html = n.s("descriptionHtml")
            val out = cleanDescription(html)
            listOf("<table", "CHF 50", "CHF 65", "Grössentabelle", "Lieferzeit", "Warum bei LuxeStyle").forEach { bad ->
                assertFalse("${n.s("handle")}: $bad\n$out", out.contains(bad))
            }
            val guide = sizeGuide(html)
            if (html.contains("Grössentabelle")) assertNotNull(n.s("handle"), guide)
            if (guide != null) charts++
            if (deliveryNote(html) != null) delivery++
            if (System.getenv("LUXE_DESCS_PRINT") == "1") println("=== ${n.s("handle")} | ${guide?.charts?.map { it.title to it.header }}\n$out\n")
        }
        println("Produkte ${nodes.size}, mit Grössentabelle $charts, mit Lieferzeit $delivery")
    }

    private fun JsonObject.s(k: String) = this[k]!!.jsonPrimitive.content
}

class PriceDropTest {
    @Test
    fun nurEchteSenkungen() {
        assertEquals(10.0, priceDrop(49.9, 39.9)!!, 0.001)
        assertNull(priceDrop(39.9, 39.9))
        assertNull(priceDrop(39.9, 44.9)) // teurer geworden
        assertNull(priceDrop(39.9, 39.88)) // Rundung
        assertNull(priceDrop(null, 10.0))
    }
}

class QuickAddTest {
    private fun card(variants: String) = Parse.card(
        Json.parseToJsonElement(
            """{"id":"p","handle":"h","title":"t","availableForSale":true,
               "priceRange":{"minVariantPrice":{"amount":"30.9","currencyCode":"CHF"}},
               "variants":{"nodes":$variants}}""",
        ).jsonObject,
    )!!

    @Test
    fun nurBeiGenauEinerLieferbarenAusfuehrung() {
        assertEquals("v1", card("""[{"id":"v1","availableForSale":true}]""").quickVariant)
        assertNull(card("""[{"id":"v1","availableForSale":false}]""").quickVariant) // ausverkauft
        assertNull(card("""[{"id":"v1","availableForSale":true},{"id":"v2","availableForSale":true}]""").quickVariant) // Grösse wählen
        assertNull(card("[]").quickVariant)
    }
}

class BreadcrumbTest {
    private fun m(h: String, vararg kids: MenuItem) = MenuItem(h, "https://luxestyle.ch/collections/${h.lowercase().replace(" ", "-")}", kids.toList())
    private val menu = listOf(
        m("damen-mode", m("t-shirts-tops"), m("damen-strick-pullover")),
        m("sub-baby-kids", m("sub-haustier", m("hundebetten"))),
        m("premium-geschenke", m("unter-chf-25")),
    )

    @Test
    fun wieDieWebseite() {
        // echte Kollektionsreihenfolge des Damen-Hoodies aus dem Shop
        val c = listOf("damen-mode", "unter-chf-25", "damen-strick-pullover", "t-shirts-tops")
        assertEquals(listOf("damen-mode", "damen-strick-pullover"), breadcrumb(menu, c).map { it.title })
    }

    @Test
    fun dritteEbeneUndRueckfall() {
        assertEquals(listOf("sub-baby-kids", "sub-haustier", "hundebetten"), breadcrumb(menu, listOf("hundebetten")).map { it.title })
        assertEquals(listOf("premium-geschenke", "unter-chf-25"), breadcrumb(menu, listOf("unter-chf-25")).map { it.title })
        assertEquals(emptyList<String>(), breadcrumb(menu, listOf("gibts-nicht")).map { it.title })
        // echtes Sommerkleid: nur in damen-mode + Werbe-Kollektionen → Damen › Kleider statt „Geschenke unter 100"
        val kleidMenu = listOf(
            MenuItem("Damen", "https://luxestyle.ch/collections/damen-mode", listOf(m("Taschen & Rucksäcke"), m("Kleider"), m("Midikleider"))),
            MenuItem("Geschenke", "https://luxestyle.ch/collections/premium-geschenke", listOf(m("geschenke-unter-100-franken"))),
        )
        assertEquals(
            listOf("Damen", "Kleider"),
            breadcrumb(kleidMenu, listOf("neu", "damen-mode", "geschenke-unter-100-franken"), "Elegantes Sommerkleid A-Linie").map { it.title },
        )
        assertEquals(listOf("Damen"), breadcrumb(kleidMenu, listOf("damen-mode"), "Seidenschal").map { it.title })
        assertEquals(listOf("damen-mode", "damen-strick-pullover"), menuPath(menu, "damen-strick-pullover")!!.map { it.title })
    }
}

class SearchSuggestTest {
    @Test
    fun nurKategorienMitDemSuchwort() {
        // echte Shopify-Antwort auf „kleid"
        val hits = listOf(
            CollectionHit("sub-kleider", "Kleider"),
            CollectionHit("elektronik-kleinteile", "Elektronik-Zubehör & Kleinteile"),
            CollectionHit("baby-kleinkind", "Baby & Kleinkind"),
        )
        assertEquals(listOf("sub-kleider"), relevantCollections("kleid", hits).map { it.handle })
        assertEquals(listOf("sub-kleider"), relevantCollections("Kleider ", hits).map { it.handle })
        assertEquals(emptyList<String>(), relevantCollections("kl", hits).map { it.handle }) // zu kurz
    }
}

class DeliveryWindowTest {
    private fun day(y: Int, m: Int, d: Int) = java.util.Calendar.getInstance().apply { clear(); set(y, m - 1, d) }

    @Test
    fun werktageÜberspringenWochenende() {
        // Fr 2. Okt. 2026: +1 Werktag = Mo 5. Okt.
        assertEquals(5, addDays(day(2026, 10, 2), 1, workdays = true).get(java.util.Calendar.DAY_OF_MONTH))
        assertEquals(3, addDays(day(2026, 10, 2), 1, workdays = false).get(java.util.Calendar.DAY_OF_MONTH))
    }

    @Test
    fun fensterMitMonatswechsel() {
        val html = "<p>Lieferung Schweiz: 10–20 Werktage</p>"
        // Mo 28. Sept. 2026 + 10 Werktage = Mo 12. Okt., + 20 = Mo 26. Okt.
        assertEquals("Lieferung ca. 12.–26. Okt. (10–20 Werktage)", deliveryWindow(html, day(2026, 9, 28)))
        // Mi 16. Sept. + 10 Werktage = Mi 30. Sept., + 20 = Mi 14. Okt.
        assertEquals("Lieferung ca. 30. Sept.–14. Okt. (10–20 Werktage)", deliveryWindow(html, day(2026, 9, 16)))
        assertNull(deliveryWindow("<p>Kein Hinweis</p>", day(2026, 9, 16)))
    }
}

class CartSuggestionTest {
    private fun card(h: String, price: Double, ok: Boolean = true) = ProductCard("id-$h", h, h, null, Money(price), null, ok)

    @Test
    fun ohneDoppelteUndAusverkaufte() {
        val recs = listOf(card("a", 10.0), card("b", 20.0, ok = false), card("c", 30.0), card("a", 10.0))
        assertEquals(listOf("a", "c"), cartSuggestions(recs, emptySet(), null).map { it.handle })
        assertEquals(listOf("c"), cartSuggestions(recs, setOf("a"), null).map { it.handle })
    }

    @Test
    fun zuerstWasDieVersandlückeSchliesst() {
        val recs = listOf(card("klein", 5.0), card("teuer", 60.0), card("passt", 12.0), card("mittel", 8.0))
        val order = cartSuggestions(recs, emptySet(), Money(10.10)).map { it.handle }
        // „teuer" schliesst die Lücke auch, kostet aber CHF 50 mehr als nötig – kommt ans Ende
        assertEquals(listOf("passt", "mittel", "klein", "teuer"), order)
    }
}

class ReviewFixesTest {
    @Test
    fun webBannerMitTextWirdErkannt() {
        assertTrue(ch.luxestyle.app.data.isWebBanner(Image("b", width = 1600, height = 620)))
        assertTrue(!isWebBanner(Image("p", width = 800, height = 800)))
        assertTrue(!isWebBanner(Image("x")))
    }

    @Test
    fun chipsBleibenKurz() {
        assertEquals("Accessoires", ch.luxestyle.app.ui.shortLabel("Accessoires: Schals, Mützen & Gürtel"))
        assertEquals("Kleider", ch.luxestyle.app.ui.shortLabel("Kleider"))
    }

    @Test
    fun grössentabelleNurMitVorhandenenGrössen() {
        val g = SizeGuide(listOf(SizeChart(null, listOf("Grösse", "Brust"), listOf(
            listOf("XS", "80"), listOf("S", "84"), listOf("M", "88"), listOf("XXL", "100"), listOf("3XL", "106"),
        ))), emptyList())
        val rows = g.only(listOf("S", "M", "2XL")).charts.single().rows
        assertEquals(listOf("S", "M", "2XL"), rows.map { it.first() })
        assertEquals("100", rows.last()[1])
        // Passt nichts, bleibt alles stehen
        assertEquals(5, g.only(listOf("Einheitsgrösse")).charts.single().rows.size)
    }
}

class SwatchTest {
    private fun v(color: String, size: String, url: String?) = Variant(
        "$color-$size", "$color / $size", true, Money(10.0), null, mapOf("Farbe" to color, "Grösse" to size), url?.let { Image(it) },
    )

    private fun product(vararg variants: Variant) = Product(
        "p", "p", "P", "", emptyList(),
        listOf(ProductOption("Farbe", variants.map { it.options.getValue("Farbe") }.distinct()),
            ProductOption("Grösse", variants.map { it.options.getValue("Grösse") }.distinct())),
        variants.toList(),
    )

    @Test
    fun jedeFarbeMitEigenemBild() {
        val p = product(v("Rot", "S", "https://x/rot.jpg?v=1"), v("Rot", "M", "https://x/rot.jpg?v=2"), v("Blau", "S", "https://x/blau.jpg"))
        assertEquals(mapOf("Rot" to "https://x/rot.jpg?v=1", "Blau" to "https://x/blau.jpg"), p.swatches("Farbe")!!.mapValues { it.value.url })
    }

    @Test
    fun gleichesBildOderFehlendesBildGibtTextChips() {
        assertNull(product(v("Rot", "S", "https://x/a.jpg"), v("Blau", "S", "https://x/a.jpg")).swatches("Farbe"))
        assertNull(product(v("Rot", "S", "https://x/a.jpg"), v("Blau", "S", null)).swatches("Farbe"))
        assertNull(product(v("Rot", "S", "https://x/a.jpg")).swatches("Farbe"))
    }
}

class SameDepartmentTest {
    @Test
    fun nurAusDerselbenAbteilung() {
        fun c(h: String, vararg coll: String) = ProductCard(h, h, h, null, Money(1.0), null, true, collections = coll.toSet())
        val recs = listOf(c("pulli", "damen-mode", "neu"), c("boxhandschuh", "sport"), c("ohne"))
        assertEquals(listOf("pulli"), sameDepartment(recs, "damen-mode").map { it.handle })
        assertEquals(3, sameDepartment(recs, null).size)
    }
}

class HomeContentTest {
    private fun m(title: String, handle: String?, vararg kids: MenuItem) =
        MenuItem(title, handle?.let { "https://luxestyle.ch/collections/$it" } ?: "https://luxestyle.ch/pages/x", kids.toList())

    private val menu = listOf(
        m("Damen", "damen-mode", m("Kleider", "kleider"), m("Taschen & Rucksäcke", "taschen")),
        m("Geschenke", "premium-geschenke",
            m("Geschenke unter CHF 50", "u50"), m("Kleine Mitbringsel unter CHF 20", "u20"),
            m("Geschenke bis CHF 30", "b30"), m("Nochmals unter CHF 20", "u20b"), m("Für Kinder", "kinder")),
    )

    @Test
    fun budgetEinstiegeSortiertUndEinmalig() {
        assertEquals(listOf("unter CHF 20", "bis CHF 30", "unter CHF 50"), priceEntries(menu).map { it.first })
        assertEquals("u20", priceEntries(menu).first().second.collectionHandle)
    }

    @Test
    fun kachelnInGewünschterReihenfolge() {
        assertEquals(listOf("taschen", "kleider"), pickCategories(menu, listOf("Taschen & Rucksäcke", "Gibt es nicht", "kleider")).map { it.collectionHandle })
    }

    @Test
    fun startseiteModeZuerstOhneDoppelte() {
        val rails = ch.luxestyle.app.ui.homeRails("damen-mode")
        assertEquals(RailSpec("damen-mode", newest = true, title = "Neu bei Damen"), rails.first())
        assertEquals(rails.size, rails.distinctBy { it.handle to it.newest }.size)
        assertTrue(rails.indexOfFirst { it.handle == "bestseller" } > rails.indexOfFirst { it.handle == "schmuck-uhren" })
        assertTrue(rails.none { it.handle == "halloween" })
        assertTrue(ch.luxestyle.app.ui.LUCK_RAIL in rails)
    }

    @Test
    fun halloweenNurImHerbst() {
        assertEquals("halloween", ch.luxestyle.app.ui.homeRails("jacken-outdoor", halloween = true)[1].handle)
        assertTrue(ch.luxestyle.app.ui.isHalloweenTime(9, 15))
        assertTrue(ch.luxestyle.app.ui.isHalloweenTime(10, 31))
        assertTrue(!ch.luxestyle.app.ui.isHalloweenTime(9, 14))
        assertTrue(!ch.luxestyle.app.ui.isHalloweenTime(11, 1))
    }
}
