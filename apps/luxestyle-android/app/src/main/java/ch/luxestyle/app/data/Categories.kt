package ch.luxestyle.app.data

/** Menüpunkt samt Weg dorthin (Hauptkategorie → Unterkategorie → …). */
fun menuPath(menu: List<MenuItem>, handle: String): List<MenuItem>? {
    for (top in menu) {
        if (top.collectionHandle == handle) return listOf(top)
        menuPath(top.children, handle)?.let { return listOf(top) + it }
    }
    return null
}

/**
 * Kategorie-Pfad für ein Produkt, wie ihn die Webseite zeigt („Damen › Strick & Pullover").
 * 1. Unterkategorie, deren Hauptbereich das Produkt auch enthält (Reihenfolge des Produkts zählt)
 * 2. sonst der Hauptbereich – ergänzt um die Unterkategorie, die im Produkttitel vorkommt
 *    („Sommerkleid" → Damen › Kleider)
 * 3. erst dann Werbe-Kollektionen wie „Geschenke unter CHF 100"
 */
fun breadcrumb(menu: List<MenuItem>, productCollections: List<String>, productTitle: String = ""): List<MenuItem> {
    val set = productCollections.toSet()
    val paths = allPaths(menu).filter { it.size >= 2 }
    for (h in productCollections) {
        paths.filter { it.last().collectionHandle == h && it.first().collectionHandle in set }
            .maxByOrNull { it.size }?.let { return it }
    }
    for (h in productCollections) {
        val top = menu.firstOrNull { it.collectionHandle == h } ?: continue
        val child = top.children.firstOrNull { titleMentions(productTitle, it.title) }
        return listOfNotNull(top, child)
    }
    for (h in productCollections) {
        paths.filter { it.last().collectionHandle == h }.maxByOrNull { it.size }?.let { return it }
    }
    return emptyList()
}

/**
 * Shopifys automatische Vorschläge mischen alles („Boxhandschuhe" zum Damen-Pullover).
 * Behalten wird nur, was in derselben Hauptkategorie liegt.
 */
fun sameDepartment(cards: List<ProductCard>, department: String?): List<ProductCard> =
    if (department == null) cards else cards.filter { department in it.collections }

/** „Kleider" steckt in „Sommerkleid": erstes Wort der Kategorie, Endung gekürzt, mindestens 5 Buchstaben. */
internal fun titleMentions(productTitle: String, category: String): Boolean {
    val word = category.lowercase().split(Regex("[^\\p{L}]+")).firstOrNull { it.isNotEmpty() } ?: return false
    val title = productTitle.lowercase()
    return (0..2).map { word.dropLast(it) }.filter { it.length >= 5 }.any { title.contains(it) }
}

private fun allPaths(items: List<MenuItem>, prefix: List<MenuItem> = emptyList()): List<List<MenuItem>> =
    items.flatMap { m -> listOf(prefix + m) + allPaths(m.children, prefix + m) }

/** Preis-Einstiege aus dem Menü („Geschenke unter CHF 20" → „unter CHF 20"), günstigste zuerst, je Betrag einmal. */
fun priceEntries(menu: List<MenuItem>): List<Pair<String, MenuItem>> = priceItems(menu.flatMap { it.children })

/** Wie [priceEntries], aber für eine Liste von Unterkategorien (z. B. die eines Bereichs). */
fun priceItems(items: List<MenuItem>): List<Pair<String, MenuItem>> {
    val re = Regex("(unter|bis)\\s+CHF\\s+(\\d+)", RegexOption.IGNORE_CASE)
    return items
        .filter { it.collectionHandle != null }
        .mapNotNull { m -> re.find(m.title)?.let { Triple(it.groupValues[2].toInt(), "${it.groupValues[1].lowercase()} CHF ${it.groupValues[2]}", m) } }
        .sortedBy { it.first }
        .distinctBy { it.first }
        .map { it.second to it.third }
}

/** Unterkategorien für die Startseite, in der gewünschten Reihenfolge – was im Menü fehlt, fällt weg. */
fun pickCategories(menu: List<MenuItem>, titles: List<String>): List<MenuItem> {
    val all = menu.flatMap { it.children }.filter { it.collectionHandle != null }
    return titles.mapNotNull { t -> all.firstOrNull { it.title.equals(t, ignoreCase = true) } }.distinctBy { it.collectionHandle }
}

/** Reduzierte Stücke aus allen geladenen Reihen: grösster Rabatt zuerst. */
fun onSale(cards: List<ProductCard>, max: Int = 12): List<ProductCard> =
    cards.filter { it.available && it.discountPercent != null }
        .distinctBy { it.handle }
        .sortedByDescending { it.discountPercent }
        .take(max)
