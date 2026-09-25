package ch.luxestyle.app.data

import java.util.Locale

data class Money(val amount: Double, val currency: String = "CHF") {
    /** Schweizer Schreibweise: „CHF 34.90". */
    fun format(): String = "$currency ${String.format(Locale.ROOT, "%.2f", amount)}"
}

data class Image(val url: String, val alt: String? = null, val width: Int = 0, val height: Int = 0) {
    /** Shopify-CDN liefert passend skaliert – spart Datenvolumen auf dem Handy. */
    fun sized(width: Int): String = shopifySized(url, width)
}

fun shopifySized(url: String, width: Int): String {
    if (!url.contains("cdn.shopify.com")) return url
    val sep = if (url.contains('?')) '&' else '?'
    return "$url${sep}width=$width"
}

data class ProductCard(
    val id: String,
    val handle: String,
    val title: String,
    val image: Image?,
    val price: Money,
    val compareAt: Money?,
    val available: Boolean,
) {
    val discountPercent: Int?
        get() = compareAt?.takeIf { it.amount > price.amount }
            ?.let { (((it.amount - price.amount) / it.amount) * 100).toInt() }
            ?.takeIf { it >= 5 }
}

data class ProductOption(val name: String, val values: List<String>)

data class Variant(
    val id: String,
    val title: String,
    val available: Boolean,
    val price: Money,
    val compareAt: Money?,
    val options: Map<String, String>,
    val image: Image?,
)

data class Product(
    val id: String,
    val handle: String,
    val title: String,
    val descriptionHtml: String,
    val images: List<Image>,
    val options: List<ProductOption>,
    val variants: List<Variant>,
) {
    val url: String get() = "https://luxestyle.ch/products/$handle"

    /** Standard-Auswahl: erste lieferbare Variante, sonst die erste. */
    fun defaultSelection(): Map<String, String> =
        (variants.firstOrNull { it.available } ?: variants.firstOrNull())?.options.orEmpty()

    fun variantFor(selection: Map<String, String>): Variant? =
        variants.firstOrNull { v -> v.options.all { (k, value) -> selection[k] == value } }

    /** Ist dieser Wert mit der übrigen Auswahl kaufbar? (Für ausgegraute Chips.) */
    fun isValueAvailable(option: String, value: String, selection: Map<String, String>): Boolean {
        val wanted = selection + (option to value)
        return variants.any { v -> v.available && v.options.all { (k, x) -> wanted[k] == null || wanted[k] == x } }
    }

    fun toCard(): ProductCard {
        val v = variants.firstOrNull { it.available } ?: variants.first()
        return ProductCard(id, handle, title, images.firstOrNull(), v.price, v.compareAt, variants.any { it.available })
    }
}

data class ProductPage(val products: List<ProductCard>, val cursor: String?, val hasNext: Boolean)

data class CollectionInfo(val handle: String, val title: String, val description: String, val image: Image?)

data class MenuItem(val title: String, val url: String, val children: List<MenuItem>, val image: Image? = null) {
    /** Handle der Kollektion, falls der Menüpunkt auf eine zeigt. */
    val collectionHandle: String? get() = Regex("/collections/([^/?#]+)").find(url)?.groupValues?.get(1)
}

data class HomeData(
    val season: CollectionInfo?,
    val rails: List<Pair<CollectionInfo, List<ProductCard>>>,
)

data class CartLine(
    val id: String,
    val quantity: Int,
    val variantId: String,
    val productHandle: String,
    val productTitle: String,
    val variantTitle: String?,
    val image: Image?,
    val unitPrice: Money,
    val lineTotal: Money,
)

data class Cart(
    val id: String,
    val checkoutUrl: String,
    val totalQuantity: Int,
    val subtotal: Money,
    val total: Money,
    val lines: List<CartLine>,
    val discountCodes: List<Pair<String, Boolean>>,
)

/** Preis-Stufen für den Filter (CHF). */
enum class PriceBand(val label: String, val min: Double?, val max: Double?) {
    UNDER_25("Bis CHF 25", null, 25.0),
    FROM_25("CHF 25–50", 25.0, 50.0),
    FROM_50("CHF 50–100", 50.0, 100.0),
    OVER_100("Ab CHF 100", 100.0, null),
}

/** Aktive Filter einer Liste; wird zu Shopify-`ProductFilter`-Eingaben. */
data class Filters(val price: PriceBand? = null, val onlyAvailable: Boolean = false) {
    val isEmpty get() = price == null && !onlyAvailable
}

data class Suggestions(val queries: List<String>, val products: List<ProductCard>)

/** Emoji und Zierzeichen am Anfang von Menü-Titeln weg („🎁 Geschenke" → „Geschenke"). */
fun cleanTitle(title: String): String =
    title.trimStart { !it.isLetterOrDigit() }.trim()
