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
