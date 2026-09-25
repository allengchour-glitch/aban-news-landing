package ch.luxestyle.app.screens

import androidx.compose.ui.semantics.SemanticsActions
import androidx.compose.ui.semantics.getOrNull
import androidx.compose.ui.test.SemanticsMatcher
import androidx.compose.ui.test.hasText
import androidx.compose.ui.test.isDialog
import androidx.compose.ui.test.onAllNodesWithContentDescription
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onAllNodesWithText
import androidx.compose.ui.test.onFirst
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onRoot
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performScrollToNode
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

    protected fun go(url: String) { links.tryEmit(url); rule.waitForIdle() }

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
        waitFor("Jetzt entdecken")
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
        rule.onNodeWithTag("home").performScrollToNode(hasText("Halsketten", substring = true))
        settle()
        shot("02-start-reihen")

        go("https://luxestyle.ch/collections/sub-kleider")
        waitFor("Empfohlen"); settle()
        shot("03-kollektion")

        go("https://luxestyle.ch/products/damen-polka-dot-sommerkleid-mit-spaghettitrage-636400")
        waitFor("In den Warenkorb"); settle()
        shot("04-produkt")
        rule.onAllNodes(SemanticsMatcher("vergrössern") { it.config.getOrNull(SemanticsActions.OnClick)?.label == "Vergrössern" }).onFirst().performClick()
        settle(2500)
        rule.onAllNodes(isDialog()).onFirst().captureRoboImage("$out/04b-vollbild.png")
        rule.onAllNodesWithContentDescription("Schliessen").onFirst().performClick()
        rule.waitForIdle()
        rule.onNodeWithTag("product").performScrollToNode(hasText("Beschreibung"))
        settle(1500)
        shot("05-produkt-details")

        rule.onAllNodesWithText("In den Warenkorb", substring = true).onFirst().performClick()
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
        waitFor("Damen"); settle(1000)
        rule.onAllNodesWithText("Damen").onFirst().performClick()
        settle(1500)
        shot("09-kategorien")
        rule.onAllNodesWithText("Merkliste").onFirst().performClick()
        settle(800)
        shot("10-merkliste-leer")
    }

    @Test
    @Config(qualifiers = "w412dp-h892dp-night-xxhdpi")
    fun dunkel() {
        start()
        shot("11-start-dunkel")
        go("https://luxestyle.ch/products/damen-polka-dot-sommerkleid-mit-spaghettitrage-636400")
        waitFor("In den Warenkorb"); settle()
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
        shot("store-1-start")
        go("https://luxestyle.ch/collections/sub-kleider")
        waitFor("Empfohlen"); settle()
        shot("store-2-kleider")
        go("https://luxestyle.ch/products/gestreiftes-armelloses-mini-kleid-mit-v-aussch-612500")
        waitFor("In den Warenkorb"); settle()
        shot("store-3-produkt")
        rule.onAllNodesWithText("In den Warenkorb", substring = true).onFirst().performClick()
        waitFor("Im Warenkorb"); settle(4500)
        go("https://luxestyle.ch/cart")
        waitFor("Zur Kasse"); settle()
        shot("store-4-warenkorb")
        go("https://luxestyle.ch/search?q=halskette")
        waitFor("Treffer"); settle()
        shot("store-5-suche")
    }
}
