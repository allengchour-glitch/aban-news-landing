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
        ).forEach { assertTrue(it, MainActivity.isInAppHost(it)) }
    }

    @Test
    fun fremdeSeitenGehenNachAussen() {
        listOf(
            "instagram.com", "www.tiktok.com", "twint.ch", "paypal.com",
            "evil-luxestyle.ch", "luxestyle.ch.example.com", "notshopify.com", "",
        ).forEach { assertFalse(it, MainActivity.isInAppHost(it)) }
        assertFalse(MainActivity.isInAppHost(null))
    }

    @Test
    fun einstiegsLinksNurVomShop() {
        assertTrue(MainActivity.isShopHost("luxestyle.ch"))
        assertFalse(MainActivity.isShopHost("au3j0y-hq.myshopify.com"))
    }

    @Test
    fun teilenKnopfNurAufProduktseiten() {
        assertTrue(MainActivity.isProductPage("https://luxestyle.ch/products/kleid-1"))
        assertTrue(MainActivity.isProductPage("https://luxestyle.ch/collections/sommer/products/kleid-1?variant=5"))
        assertFalse(MainActivity.isProductPage("https://luxestyle.ch/collections/sommer"))
        assertFalse(MainActivity.isProductPage("https://au3j0y-hq.myshopify.com/products/kleid-1"))
        assertFalse(MainActivity.isProductPage("https://evil.example/luxestyle.ch/products/x"))
    }

    @Test
    fun geteilterLinkOhneAppTracking() {
        assertEquals(
            "https://luxestyle.ch/products/kleid?variant=5&utm_source=app_share&utm_medium=social",
            MainActivity.shareUrl("https://luxestyle.ch/products/kleid?utm_source=android_app&variant=5&utm_medium=app#top"),
        )
        assertEquals(
            "https://luxestyle.ch/products/kleid?utm_source=app_share&utm_medium=social",
            MainActivity.shareUrl("https://luxestyle.ch/products/kleid"),
        )
    }
}
