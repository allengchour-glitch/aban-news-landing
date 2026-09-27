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
 * Reihenfolge der Kollektionen des Produkts entscheidet; bevorzugt werden Unterkategorien,
 * deren Hauptkategorie das Produkt ebenfalls enthält (nicht „Geschenke unter CHF 25").
 */
fun breadcrumb(menu: List<MenuItem>, productCollections: List<String>): List<MenuItem> {
    val set = productCollections.toSet()
    val paths = allPaths(menu).filter { it.size >= 2 }
    for (h in productCollections) {
        paths.filter { it.last().collectionHandle == h && it.first().collectionHandle in set }
            .maxByOrNull { it.size }?.let { return it }
    }
    for (h in productCollections) {
        paths.filter { it.last().collectionHandle == h }.maxByOrNull { it.size }?.let { return it }
    }
    return menu.firstOrNull { it.collectionHandle in set }?.let { listOf(it) } ?: emptyList()
}

private fun allPaths(items: List<MenuItem>, prefix: List<MenuItem> = emptyList()): List<List<MenuItem>> =
    items.flatMap { m -> listOf(prefix + m) + allPaths(m.children, prefix + m) }
