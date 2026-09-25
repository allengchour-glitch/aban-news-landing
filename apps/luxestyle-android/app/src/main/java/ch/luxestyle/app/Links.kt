package ch.luxestyle.app

/** Wohin ein Link führt: nativer Screen oder Web (Kasse, Konto, Rechtstexte …). */
sealed interface Destination {
    data class Product(val handle: String) : Destination
    data class Collection(val handle: String) : Destination
    data class Search(val query: String) : Destination
    data object Cart : Destination
    data object Home : Destination
    data class Web(val url: String) : Destination
}

object Links {
    const val HOME = "https://luxestyle.ch/"
    private val SHOP_HOSTS = setOf("luxestyle.ch", "www.luxestyle.ch")

    /** Shopify-Checkout, Kundenkonto-Portal und Shop Pay laufen auf eigenen Domains. */
    private val IN_APP_SUFFIXES = listOf(
        "luxestyle.ch", "luxestyle.com.co", "myshopify.com", "shopify.com", "shop.app", "shopifycdn.com",
    )

    fun isShopHost(host: String?) = host != null && host.lowercase() in SHOP_HOSTS

    fun isInAppHost(host: String?): Boolean {
        val h = host?.lowercase() ?: return false
        return IN_APP_SUFFIXES.any { h == it || h.endsWith(".$it") }
    }

    private fun split(url: String): Triple<String, String, String>? {
        val m = Regex("^https?://([^/?#]+)([^?#]*)(\\?[^#]*)?").find(url) ?: return null
        return Triple(m.groupValues[1], m.groupValues[2], m.groupValues[3].removePrefix("?"))
    }

    fun isProductPage(url: String): Boolean {
        val (host, path) = split(url) ?: return false
        return isShopHost(host) && path.contains("/products/")
    }

    fun destination(url: String): Destination {
        val (host, path, query) = split(url) ?: return Destination.Web(url)
        if (!isShopHost(host)) return Destination.Web(url)
        Regex("/products/([^/]+)").find(path)?.let { return Destination.Product(it.groupValues[1]) }
        Regex("^/collections/([^/]+)/?$").find(path)?.let {
            return if (it.groupValues[1] == "all") Destination.Web(url) else Destination.Collection(it.groupValues[1])
        }
        if (path == "/search") {
            val q = query.split('&').firstOrNull { it.startsWith("q=") }?.removePrefix("q=")
                ?.let { java.net.URLDecoder.decode(it, "UTF-8") }
            if (!q.isNullOrBlank()) return Destination.Search(q)
        }
        if (path == "/cart") return Destination.Cart
        if (path.isEmpty() || path == "/") return Destination.Home
        return Destination.Web(url)
    }

    /** Geteilter Link: ohne App-Tracking, dafür als App-Weiterempfehlung markiert. */
    fun shareUrl(url: String): String {
        val base = url.substringBefore('#').substringBefore('?')
        val keep = url.substringBefore('#').substringAfter('?', "").split('&')
            .filter { it.isNotEmpty() && !it.startsWith("utm_") }
        return base + "?" + (keep + listOf("utm_source=app_share", "utm_medium=social")).joinToString("&")
    }

    /** Web-Seiten, die die App öffnet, tragen die App-Kennung für die Shop-Statistik. */
    fun tagged(url: String): String {
        if (!isShopHost(split(url)?.first)) return url
        val sep = if (url.contains('?')) '&' else '?'
        return "$url${sep}utm_source=android_app&utm_medium=app"
    }
}
