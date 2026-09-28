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
