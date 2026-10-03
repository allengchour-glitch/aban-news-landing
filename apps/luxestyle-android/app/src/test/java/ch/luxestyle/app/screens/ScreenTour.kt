package ch.luxestyle.app.screens

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.SemanticsProperties
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.hasTestTag
import androidx.compose.ui.test.hasAnyAncestor
import androidx.compose.ui.test.hasSetTextAction
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.performImeAction
import androidx.compose.ui.test.performTextInput
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.hasClickAction
import androidx.compose.ui.test.isEnabled
import androidx.compose.ui.test.performScrollToNode
import androidx.compose.ui.test.performScrollToIndex
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import ch.luxestyle.app.LuxeApplication
import coil3.ImageLoader
import coil3.SingletonImageLoader
import coil3.imageDecoderEnabled
import coil3.network.okhttp.OkHttpNetworkFetcherFactory
import ch.luxestyle.app.ui.LuxeApp
import ch.luxestyle.app.ui.LuxeTheme
import com.github.takahirom.roborazzi.captureRoboImage
import kotlinx.coroutines.flow.MutableSharedFlow
import org.junit.Assume.assumeTrue
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import org.robolectric.annotation.GraphicsMode

/**
 * Rundgang durch die echte App mit echten Shopdaten → Bilder in `screens/`.
 * Läuft nur mit `LUXE_SCREENSHOTS=1` (braucht Netz), damit normale Testläufe offline bleiben.
 */
@GraphicsMode(GraphicsMode.Mode.NATIVE)
abstract class TourBase {
    @get:Rule val rule = createComposeRule()
    private val links = MutableSharedFlow<String>(extraBufferCapacity = 8)
    protected val out = System.getProperty("roborazzi.output.dir") ?: "screens"

    @Before fun onlyOnRequest() = assumeTrue(System.getenv("LUXE_SCREENSHOTS") == "1")

    protected fun waitFor(text: String, timeout: Long = 40_000) =
        rule.waitUntil(timeout) { rule.onAllNodesWithText(text, substring = true).fetchSemanticsNodes().isNotEmpty() }

    /** Bilder laden asynchron über das Netz – kurz Zeit geben. */
    protected fun settle(ms: Long = 4_000) {
        val end = System.currentTimeMillis() + ms
        while (System.currentTimeMillis() < end) { rule.mainClock.advanceTimeBy(250); Thread.sleep(250) }
        rule.waitForIdle()
    }

    protected fun shot(name: String) = rule.onRoot().captureRoboImage("$out/$name.png")

    /** Wartet, bis Produktpreise („CHF 17.90") sichtbar sind – nicht nur die Filter-Chips. */
    protected fun waitForPrices(min: Int = 2, timeout: Long = 40_000) {
        val price = SemanticsMatcher("preis") { n ->
            n.config.getOrNull(SemanticsProperties.Text).orEmpty().any { Regex("^CHF \\d+\\.\\d\\d$").matches(it.text) }
        }
        rule.waitUntil(timeout) {
            rule.mainClock.advanceTimeBy(250)
            rule.onAllNodes(price).fetchSemanticsNodes().size >= min
        }
    }

    /** Scrollt, sobald der Eintrag existiert (Daten laden asynchron). */
    protected fun scrollTo(tag: String, text: String, timeout: Long = 40_000) {
        val end = System.currentTimeMillis() + timeout
        while (true) {
            try {
                rule.onNodeWithTag(tag).performScrollToNode(hasText(text, substring = true)); return
            } catch (e: AssertionError) {
                if (System.currentTimeMillis() > end) throw e
                settle(500)
            }
        }
    }

    protected fun go(url: String) { links.tryEmit(url); rule.waitForIdle() }

    /** Produktseite steht: Kaufknopf zeigt „In den Warenkorb" oder „Grösse wählen". */
    protected fun waitForBuy(timeout: Long = 40_000) = rule.waitUntil(timeout) {
        listOf("In den Warenkorb", "wählen").any { rule.onAllNodesWithText(it, substring = true).fetchSemanticsNodes().isNotEmpty() }
    }

    /** Grösse wählen (wird nicht vorausgewählt) – im Kauf-Blatt –, dann in den Warenkorb. */
    protected fun addToCart(sheetShot: String? = null) {
        if (rule.onAllNodesWithText("Grösse wählen").fetchSemanticsNodes().isNotEmpty()) {
            rule.onAllNodesWithText("Grösse wählen").onFirst().performClick()
            completeSheet(sheetShot)
            return
        }
        rule.onAllNodesWithText("In den Warenkorb", substring = true).onFirst().performClick()
    }

    /**
     * Offenes Kauf-Blatt fertig ausfüllen: so lange Optionen im Blatt antippen, bis der Knopf
     * „In den Warenkorb · CHF …" zeigt, dann tippen. Ohne Blatt (nur eine Ausführung) nichts tun.
     */
    protected fun completeSheet(sheetShot: String? = null) {
        settle(2500)
        val inSheet = hasAnyAncestor(hasTestTag("kaufblatt"))
        if (rule.onAllNodes(hasTestTag("kaufblatt")).fetchSemanticsNodes().isEmpty()) return
        sheetShot?.let { rule.onAllNodes(isDialog()).onFirst().captureRoboImage("$out/$it.png") }
        val ready = hasTestTag("kaufblatt-knopf") and hasText("In den Warenkorb", substring = true)
        val choices = listOf("M", "S", "L", "XL", "2XL", "XXL", "XS")
        var i = 0
        while (rule.onAllNodes(ready).fetchSemanticsNodes().isEmpty() && i < 12) {
            val size = choices.firstOrNull { rule.onAllNodes(hasText(it) and inSheet).fetchSemanticsNodes().isNotEmpty() && i < choices.size }
            val nodes = rule.onAllNodes(inSheet and hasClickAction() and SemanticsMatcher("wahl") {
                it.config.getOrNull(SemanticsProperties.Role) == androidx.compose.ui.semantics.Role.RadioButton
            })
            val n = nodes.fetchSemanticsNodes().size
            if (n == 0) break
            if (size != null && i == 0) rule.onAllNodes(hasText(size) and inSheet).onFirst().performClick()
            else nodes[i % n].performClick()
            settle(600)
            i++
        }
        rule.onNodeWithTag("kaufblatt-knopf").performClick()
    }

    protected fun start() {
        val app = ApplicationProvider.getApplicationContext<LuxeApplication>()
        // Robolectric kennt Androids ImageDecoder nicht → im Test den klassischen BitmapFactory-Weg nehmen
        SingletonImageLoader.setUnsafe { ctx ->
            ImageLoader.Builder(ctx)
                .components { add(OkHttpNetworkFetcherFactory(callFactory = { app.shop.http })) }
                .imageDecoderEnabled(false)
                .build()
        }
        rule.setContent { LuxeTheme { LuxeApp(app.shop, links) } }
        waitFor("entdecken"); waitFor("WELCOME10")
        settle()
    }

}

@RunWith(AndroidJUnit4::class)
@Config(sdk = [35], qualifiers = "w412dp-h892dp-xxhdpi")
class ScreenTour : TourBase() {
    @Test
    fun rundgang() {
        start()
        shot("01-start")
        scrollTo("home", "Halsketten")
        settle()
        shot("02-start-reihen")

        go("https://luxestyle.ch/collections/sub-kleider")
        waitFor("Sortieren"); settle()
        shot("03-kollektion")

        go("https://luxestyle.ch/products/damen-polka-dot-sommerkleid-mit-spaghettitrage-636400")
        waitForBuy(); settle()
        shot("04-produkt")
        rule.onAllNodes(SemanticsMatcher("vergrössern") { it.config.getOrNull(SemanticsActions.OnClick)?.label == "Vergrössern" }).onFirst().performClick()
        settle(2500)
        rule.onAllNodes(isDialog()).onFirst().captureRoboImage("$out/04b-vollbild.png")
        rule.onAllNodesWithContentDescription("Schliessen").onFirst().performClick()
        rule.waitForIdle()
        rule.onNodeWithTag("product").performScrollToNode(hasText("Beschreibung"))
        settle(1500)
        shot("05-produkt-details")

        addToCart(sheetShot = "05b-kaufblatt")
        waitFor("Im Warenkorb"); settle(1500)
        shot("06-hinzugefuegt")

        go("https://luxestyle.ch/cart")
        waitFor("Zur Kasse"); settle()
        shot("07-warenkorb")

        go("https://luxestyle.ch/search?q=sonnenbrille")
        waitFor("Treffer"); settle()
        shot("08-suche")
    }

    @Test
    fun kategorienUndLeereZustaende() {
        start()
        rule.onAllNodesWithText("Kategorien").onFirst().performClick()
        waitFor("Alles ansehen"); settle(6000)
        shot("09-kategorien")
        rule.onAllNodesWithText("Schmuck & Uhren").onFirst().performClick()
        settle(20000)
        shot("09a-kategorien-schmuck")
        rule.onAllNodesWithText("Geschenke & Mehr").onFirst().performClick()
        settle(20000)
        shot("09a2-kategorien-geschenke")
        rule.onAllNodesWithText("Damen").onFirst().performClick()
        settle(1500)
        rule.onAllNodesWithText("Alles ansehen").onFirst().performClick()
        waitFor("Sortieren"); settle()
        shot("09b-damen-unterkategorien")
        rule.onAllNodesWithText("Preis").onFirst().performClick()
        settle(1200)
        shot("09c0-preis-menue")
        rule.onAllNodesWithText("Bis CHF 25").onFirst().performClick()
        waitForPrices(); settle()
        shot("09c-filter-bis-25")
        rule.onAllNodesWithText("Merkliste").onFirst().performClick()
        settle(800)
        shot("10-merkliste-leer")
    }

    @Test
    fun groessenUndSuche() {
        start()
        go("https://luxestyle.ch/products/elegantes-sommerkleid-a-linie-hemdkragen-fliessend-damen-3-farben")
        waitForBuy(); settle()
        waitFor("Kleider"); settle(1500) // Kategorie-Pfad ist geladen, das Layout steht
        // Grössen-Zeile liegt sonst unter der Kaufleiste → bis zum Liefer-Kasten scrollen
        scrollTo("product", "Gratis-Versand in der Schweiz"); settle(800)
        scrollTo("product", "Grössentabelle"); settle(1500)
        shot("13-produkt-groesse")
        rule.onAllNodesWithText("Grössentabelle").onFirst().performClick()
        settle(2000)
        rule.onAllNodes(isDialog()).onFirst().captureRoboImage("$out/13b-groessentabelle.png")

        go("luxestyle://suche") // wie der App-Shortcut
        settle(1500)
        rule.onNode(hasSetTextAction()).performTextInput("leinen")
        rule.onNode(hasSetTextAction()).performImeAction()
        waitFor("Treffer"); settle()
        rule.onAllNodesWithContentDescription("Leeren").onFirst().performClick()
        settle(800)
        shot("14-suche-verlauf")
    }

    @Test
    fun schnellkaufUndRueckgaengig() {
        start()
        go("https://luxestyle.ch/collections/sub-halsketten")
        waitForPrices(); settle()
        shot("15-halsketten-schnellkauf")
        rule.onAllNodesWithContentDescription("In den Warenkorb").onFirst().performClick()
        completeSheet("15a-schnellkauf-blatt")
        waitFor("Im Warenkorb"); settle(1500)
        shot("15b-schnellkauf-hinzugefuegt")
        go("https://luxestyle.ch/cart")
        waitFor("Zur Kasse"); settle()
        rule.onAllNodesWithContentDescription("Entfernen").onFirst().performClick()
        waitFor("Rückgängig"); settle(800)
        shot("16-entfernt-rueckgaengig")
    }

    @Test
    fun startseiteVonAllem() {
        start()
        settle(5000)
        shot("22-start-bereiche")
        scrollTo("home", "Neu bei Damen"); settle(3000)
        shot("22a-start-neu")
        scrollTo("home", "Halloween"); settle(3000)
        shot("22e-start-halloween")
        scrollTo("home", "Beliebt bei Damen"); settle(3000)
        shot("22f-start-gluecksbringer")
        scrollTo("home", "Nach Budget"); settle(3000)
        shot("22b-start-budget")
        scrollTo("home", "Beliebte Kategorien"); settle(5000)
        shot("22c-start-kacheln")
        scrollTo("home", "Make-up"); settle(3000)
        shot("22d-start-unten")
    }

    /** Aus den Suchtreffern ins Produkt und zurück: Liste und Stelle bleiben, nichts lädt von vorne. */
    @Test
    fun zurueckAusProduktBleibtInDerSuche() {
        start()
        go("luxestyle://suche")
        rule.onNode(hasSetTextAction()).performTextInput("kleid")
        rule.onNode(hasSetTextAction()).performImeAction()
        waitFor("Treffer"); waitForPrices(); settle()
        rule.onNodeWithTag("grid").performScrollToIndex(16); settle(3000)
        shot("21-suche-weit-unten")
        rule.onAllNodesWithText("CHF", substring = true).onFirst().performClick()
        waitForBuy(); settle(1500)
        rule.onAllNodesWithContentDescription("Zurück").onFirst().performClick()
        settle(2500)
        shot("21b-zurueck-gleiche-stelle")
        // Oben stünde „… Treffer für «kleid»" – ist die Liste noch unten, gibt es diesen Knoten gar nicht
        check(rule.onAllNodesWithText("Treffer für", substring = true).fetchSemanticsNodes().isEmpty()) {
            "Nach dem Zurückgehen steht die Suche wieder oben"
        }
        check(rule.onAllNodesWithText("kleid", substring = true).fetchSemanticsNodes().isNotEmpty()) { "Suchbegriff fehlt" }
    }

    @Test
    fun farbenLieferdatumWarenkorb() {
        start()
        go("https://luxestyle.ch/products/damen-flanell-kapuzenpullover-fur-herbst-und-w-611600")
        waitForBuy(); settle(5000)
        rule.onNodeWithTag("product").performScrollToIndex(1); settle(3000)
        shot("20-produkt-farbbilder")
        addToCart()
        waitFor("Im Warenkorb"); settle(1000)
        go("https://luxestyle.ch/cart")
        waitFor("Zur Kasse")
        scrollTo("cart", "Gratis-Versand ergänzen", 60_000); settle(5000)
        shot("20b-warenkorb-ergaenzen")
    }

    @Test
    fun kategoriePfad() {
        start()
        go("https://luxestyle.ch/products/hoodie-langarmshirt-fur-damen-614400")
        waitForBuy(); waitFor("Strick & Pullover"); settle()
        shot("18-produkt-kategoriepfad")
        scrollTo("product", "Mehr aus"); settle(3000)
        shot("18b-mehr-aus")
        go("https://luxestyle.ch/collections/damen-strick-pullover")
        waitForPrices(); settle()
        shot("18c-unterkategorie-nachbarn")
    }

    @Test
    fun sucheNeu() {
        start()
        go("luxestyle://suche")
        settle(1500)
        shot("19-suche-leer")
        rule.onNode(hasSetTextAction()).performTextInput("kleid")
        waitFor("Kategorie"); settle(3000)
        shot("19b-suche-vorschlaege")
        rule.onNode(hasSetTextAction()).performTextInput("er")
        rule.onNode(hasSetTextAction()).performImeAction()
        waitFor("Treffer"); waitForPrices(); settle()
        shot("19c-suche-treffer-kategorien")
        go("https://luxestyle.ch/search?q=sonnenbrile")
        waitForPrices(); settle()
        shot("19d-suche-tippfehler")
    }

    /** Systemschrift 130 % – bricht nichts um oder ab? */
    @Test
    @Config(fontScale = 1.3f)
    fun grosseSchrift() {
        start()
        shot("17-start-grosse-schrift")
        go("https://luxestyle.ch/products/elegantes-sommerkleid-a-linie-hemdkragen-fliessend-damen-3-farben")
        waitForBuy(); settle()
        scrollTo("product", "Grössentabelle"); settle(1500)
        shot("17b-produkt-grosse-schrift")
        go("https://luxestyle.ch/collections/sub-kleider")
        waitForPrices(); settle()
        shot("17c-kollektion-grosse-schrift")
    }

    @Test
    @Config(qualifiers = "w412dp-h892dp-night-xxhdpi")
    fun dunkel() {
        start()
        shot("11-start-dunkel")
        go("https://luxestyle.ch/products/damen-polka-dot-sommerkleid-mit-spaghettitrage-636400")
        waitForBuy(); settle()
        shot("12-produkt-dunkel")
    }
}

/** Bilder für Google Play: 9:16 (Play erlaubt höchstens 2:1). */
@RunWith(AndroidJUnit4::class)
@Config(sdk = [35], qualifiers = "w412dp-h732dp-xxhdpi")
class StoreShots : TourBase() {
    @Test
    fun playStore() {
        start()
        settle()
        shot("store-1-start")
        go("https://luxestyle.ch/collections/sub-kleider")
        waitFor("Sortieren"); settle()
        shot("store-2-kleider")
        go("https://luxestyle.ch/products/gestreiftes-armelloses-mini-kleid-mit-v-aussch-612500")
        waitForBuy(); settle()
        shot("store-3-produkt")
        addToCart()
        waitFor("Im Warenkorb"); settle(4500)
        go("https://luxestyle.ch/cart")
        waitFor("Zur Kasse"); settle()
        shot("store-4-warenkorb")
        go("https://luxestyle.ch/search?q=halskette")
        waitFor("Treffer"); settle()
        shot("store-5-suche")
        rule.onAllNodesWithText("Kategorien").onFirst().performClick()
        waitFor("Alles ansehen"); settle(6000)
        shot("store-6-kategorien")
    }
}
