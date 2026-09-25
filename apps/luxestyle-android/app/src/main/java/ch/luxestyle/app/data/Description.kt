package ch.luxestyle.app.data

/**
 * Lieferzeit aus dem Vertrauens-Kasten der Beschreibung („Lieferung 10–20 Werktage").
 * Der Kasten selbst wird entfernt, die Angabe zeigt die App dann sichtbar oben an.
 */
fun deliveryNote(html: String): String? {
    val m = Regex("Lieferung\\s+(?:Schweiz\\s+)?(?:ca\\.\\s*)?(\\d+\\s*[–-]\\s*\\d+)\\s*(Werktage|Tage)")
        .find(html) ?: return null
    val range = m.groupValues[1].replace(Regex("\\s*[–-]\\s*"), "–")
    return "Lieferung ca. $range ${m.groupValues[2]}"
}

/**
 * Macht Shopify-Beschreibungen app-tauglich: Vertrauens-Kästen mit Inline-Style (die App zeigt ihre eigenen),
 * Skripte, Bilder und Tabellen-Layouts raus; Listen als „•"-Zeilen, Zwischentitel fett.
 */
fun cleanDescription(html: String): String {
    var s = html
    s = s.replace(Regex("(?is)<(script|style|iframe)[^>]*>.*?</\\1>"), "")
    s = s.replace(Regex("(?is)<div[^>]*style=[^>]*>.*?</div>"), "")
    s = s.replace(Regex("(?is)<img[^>]*>"), "")
    s = s.replace(Regex("(?is)<h[1-6][^>]*>(.*?)</h[1-6]>"), "<br><b>$1</b><br>")
    s = s.replace(Regex("(?is)<li[^>]*>\\s*"), "• ").replace(Regex("(?is)\\s*</li>"), "<br>")
    s = s.replace(Regex("(?is)</?(ul|ol)[^>]*>"), "")
    s = s.replace(Regex("(?is)<p[^>]*>"), "").replace(Regex("(?is)</p>"), "<br><br>")
    s = s.replace(Regex("(?is)(\\s*<br\\s*/?>\\s*){3,}"), "<br><br>")
    s = s.replace(Regex("(?is)^(\\s*<br\\s*/?>)+|(<br\\s*/?>\\s*)+$"), "")
    return s.trim()
}
