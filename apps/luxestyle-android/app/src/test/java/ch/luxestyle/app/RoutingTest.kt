package ch.luxestyle.app

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RoutingTest {
    @Test
    fun shopUndCheckoutBleibenInDerApp() {
        listOf(
            "luxestyle.ch", "www.luxestyle.ch", "LuxeStyle.CH",
            "au3j0y-hq.myshopify.com", "checkout.shopify.com", "shop.app",
            "account.luxestyle.com.co", "cdn.shopify.com",
        ).forEach { assertTrue(it, Links.isInAppHost(it)) }
    }

    @Test
    fun fremdeSeitenGehenNachAussen() {
        listOf(
            "instagram.com", "www.tiktok.com", "twint.ch", "paypal.com",
            "evil-luxestyle.ch", "luxestyle.ch.example.com", "notshopify.com", "",
        ).forEach { assertFalse(it, Links.isInAppHost(it)) }
        assertFalse(Links.isInAppHost(null))
    }

    @Test
    fun linksLandenAufDemRichtigenScreen() {
        assertEquals(Destination.Product("kleid-1"), Links.destination("https://luxestyle.ch/products/kleid-1?variant=5"))
        assertEquals(Destination.Product("kleid-1"), Links.destination("https://luxestyle.ch/collections/sommer/products/kleid-1"))
        assertEquals(Destination.Collection("sommer"), Links.destination("https://www.luxestyle.ch/collections/sommer"))
        assertEquals(Destination.Search("rotes kleid"), Links.destination("https://luxestyle.ch/search?q=rotes+kleid"))
        assertEquals(Destination.Cart, Links.destination("https://luxestyle.ch/cart"))
        assertEquals(Destination.Wishlist, Links.destination("luxestyle://merkliste"))
        assertEquals(Destination.Search(""), Links.destination("luxestyle://suche"))
        assertEquals(Destination.Home, Links.destination("https://luxestyle.ch/"))
        assertEquals(Destination.Home, Links.destination("https://luxestyle.ch"))
        // Kasse, Rechtstexte, fremde Seiten → Web
        listOf(
            "https://luxestyle.ch/checkouts/cn/abc",
            "https://luxestyle.ch/policies/privacy-policy",
            "https://luxestyle.ch/collections/all",
            "https://evil.example/luxestyle.ch/products/x",
            "https://au3j0y-hq.myshopify.com/products/kleid-1",
        ).forEach { assertTrue(it, Links.destination(it) is Destination.Web) }
    }

    @Test
    fun teilenKnopfNurAufProduktseiten() {
        assertTrue(Links.isProductPage("https://luxestyle.ch/products/kleid-1"))
        assertFalse(Links.isProductPage("https://luxestyle.ch/collections/sommer"))
        assertFalse(Links.isProductPage("https://au3j0y-hq.myshopify.com/products/kleid-1"))
    }

    @Test
    fun geteilterLinkOhneAppTracking() {
        assertEquals(
            "https://luxestyle.ch/products/kleid?variant=5&utm_source=app_share&utm_medium=social",
            Links.shareUrl("https://luxestyle.ch/products/kleid?utm_source=android_app&variant=5&utm_medium=app#top"),
        )
    }

    @Test
    fun webSeitenTragenAppKennungAberNurImShop() {
        assertEquals("https://luxestyle.ch/account?utm_source=android_app&utm_medium=app", Links.tagged("https://luxestyle.ch/account"))
        assertEquals("https://luxestyle.ch/cart/c/x?key=1&utm_source=android_app&utm_medium=app", Links.tagged("https://luxestyle.ch/cart/c/x?key=1"))
        assertEquals("https://paypal.com/x", Links.tagged("https://paypal.com/x"))
    }
}
