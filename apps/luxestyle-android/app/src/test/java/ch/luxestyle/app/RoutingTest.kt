package ch.luxestyle.app

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
}
