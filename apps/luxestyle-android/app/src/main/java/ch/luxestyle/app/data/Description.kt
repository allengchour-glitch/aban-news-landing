package ch.luxestyle.app.data

import java.util.Calendar

/**
 * Lieferzeit aus dem Vertrauens-Kasten der Beschreibung („Lieferung 10–20 Werktage").
 * Der Kasten selbst wird entfernt, die Angabe zeigt die App dann sichtbar oben an.
 */
fun deliveryNote(html: String): String? {
    val d = deliveryDays(html) ?: return null
    return "Lieferung ca. ${d.days.first}–${d.days.last} ${if (d.workdays) "Werktage" else "Tage"}"
}

data class DeliveryDays(val days: IntRange, val workdays: Boolean)

fun deliveryDays(html: String): DeliveryDays? {
    val text = html.replace(Regex("<[^>]+>"), "")
    val m = Regex("Liefer(?:ung|zeit)\\s+(?:Schweiz\\s*:?\\s*)?(?:ca\\.\\s*)?(\\d+)\\s*[–-]\\s*(\\d+)\\s*(Werktage|Tage)")
        .find(text) ?: return null
    val from = m.groupValues[1].toInt()
    val to = m.groupValues[2].toInt()
    if (from > to || to > 90) return null
    return DeliveryDays(from..to, m.groupValues[3] == "Werktage")
}

/** „Lieferung ca. 13.–27. Okt." – gerechnet ab heute, Werktage ohne Samstag und Sonntag. */
fun deliveryWindow(html: String, today: Calendar = Calendar.getInstance()): String? =
    deliveryDays(html)?.let { deliveryWindow(it, today) }

/**
 * Lieferzeit für mehrere Stücke: das langsamste bestimmt, wann alles da ist.
 * Mischt sich „Tage" mit „Werktagen", wird vorsichtig in Werktagen gerechnet (dauert länger).
 */
fun slowest(all: List<DeliveryDays>): DeliveryDays? {
    if (all.isEmpty()) return null
    return DeliveryDays(all.maxOf { it.days.first }..all.maxOf { it.days.last }, all.any { it.workdays })
}

fun deliveryWindow(d: DeliveryDays, today: Calendar = Calendar.getInstance()): String {
    val from = addDays(today, d.days.first, d.workdays)
    val to = addDays(today, d.days.last, d.workdays)
    val sameMonth = from.get(Calendar.MONTH) == to.get(Calendar.MONTH)
    val start = if (sameMonth) "${from.get(Calendar.DAY_OF_MONTH)}." else dayMonth(from)
    val unit = if (d.workdays) "Werktage" else "Tage"
    return "Lieferung ca. $start–${dayMonth(to)} (${d.days.first}–${d.days.last} $unit)"
}

private val MONTHS = listOf("Jan.", "Feb.", "März", "Apr.", "Mai", "Juni", "Juli", "Aug.", "Sept.", "Okt.", "Nov.", "Dez.")

private fun dayMonth(c: Calendar) = "${c.get(Calendar.DAY_OF_MONTH)}. ${MONTHS[c.get(Calendar.MONTH)]}"

fun addDays(start: Calendar, days: Int, workdays: Boolean): Calendar {
    val c = start.clone() as Calendar
    var left = days
    while (left > 0) {
        c.add(Calendar.DAY_OF_MONTH, 1)
        val dow = c.get(Calendar.DAY_OF_WEEK)
        if (!workdays || (dow != Calendar.SATURDAY && dow != Calendar.SUNDAY)) left--
    }
    return c
}

/**
 * Macht Shopify-Beschreibungen app-tauglich: Vertrauens-Kästen mit Inline-Style (die App zeigt ihre eigenen),
 * Skripte, Bilder und Tabellen-Layouts raus; Listen als „•"-Zeilen, Zwischentitel fett.
 */
fun cleanDescription(html: String): String {
    var s = html
    s = s.replace(Regex("(?s)<!--.*?-->"), "")
    s = s.replace(Regex("(?is)<(script|style|iframe)[^>]*>.*?</\\1>"), "")
    // Grössentabellen zeigt die App als eigene Tabelle, Layout-Tabellen sind Werbekästen
    s = s.replace(Regex("(?is)<p[^>]*>[^<]{1,40}</p>\\s*(?=<table)"), "")
    s = s.replace(Regex("(?is)<table[^>]*>.*?</table>"), "")
    s = s.replace(Regex("(?is)<h[1-6][^>]*>[^<]*Grössentabelle[^<]*</h[1-6]>"), "")
    // Versand/Rückgabe/Querverweise zeigt die App selbst – und im Text stehen teils veraltete Beträge
    s = s.replace(Regex("(?is)<p[^>]*>(?:(?!</p>).)*?(Gratis-Versand|Rückgabe|👉|Konfektion|So misst du|Grössen-Hinweis|Lieferzeit|Lieferung Schweiz)(?:(?!</p>).)*</p>"), "")
    s = s.replace(Regex("(?is)<h[1-6][^>]*>[^<]*(Warum bei LuxeStyle|Versprechen)[^<]*</h[1-6]>\\s*(<ul[^>]*>.*?</ul>)?"), "")
    s = s.replace(Regex("(?is)<div[^>]*style=[^>]*>.*?</div>"), "")
    s = s.replace(Regex("(?is)<img[^>]*>"), "")
    s = s.replace(Regex("(?is)<h[1-6][^>]*>(.*?)</h[1-6]>"), "<br><b>$1</b><br>")
    s = s.replace(Regex("(?is)<li[^>]*>\\s*"), "• ").replace(Regex("(?is)\\s*</li>"), "<br>")
    s = s.replace(Regex("(?is)</?(ul|ol)[^>]*>"), "")
    s = s.replace(Regex("(?is)<p[^>]*>\\s*(<em>\\s*</em>)?\\s*</p>"), "")
    s = s.replace(Regex("(?is)<p[^>]*>"), "").replace(Regex("(?is)</p>"), "<br><br>")
    s = stripEmoji(s).replace(Regex("(<b>|<strong>)\\s+"), "$1").replace(Regex("•\\s+"), "• ")
    s = s.replace(Regex("(?is)(\\s*<br\\s*/?>\\s*){3,}"), "<br><br>")
    s = s.replace(Regex("(?is)^(\\s*<br\\s*/?>)+|(<br\\s*/?>\\s*)+$"), "")
    return s.trim()
}

/** Grössentabelle aus der Beschreibung (Shopify-HTML mit `<th>Grösse</th>` in der ersten Spalte). */
data class SizeChart(val title: String?, val header: List<String>, val rows: List<List<String>>) {
    /** Zeile der gewählten Grösse – „2XL" und „XXL" gelten als gleich. */
    fun rowFor(size: String?): Int {
        val want = size?.let(::normalizeSize) ?: return -1
        return rows.indexOfFirst { it.firstOrNull()?.let(::normalizeSize) == want }
    }
}

data class SizeGuide(val charts: List<SizeChart>, val notes: List<String>) {
    /**
     * Nur die Grössen, die es beim Produkt gibt, beschriftet wie die Auswahl („2XL" statt „XXL").
     * Passt keine Zeile, bleibt die Tabelle unverändert.
     */
    fun only(sizes: List<String>): SizeGuide {
        if (sizes.isEmpty()) return this
        val byNorm = sizes.associateBy(::normalizeSize)
        return copy(charts = charts.map { chart ->
            val rows = chart.rows.mapNotNull { r -> byNorm[normalizeSize(r.first())]?.let { listOf(it) + r.drop(1) } }
            if (rows.isEmpty()) chart else chart.copy(rows = rows)
        })
    }
}

private fun normalizeSize(s: String): String {
    val t = s.trim().uppercase().replace(" ", "")
    Regex("^(\\d)XL$").find(t)?.let { return "X".repeat(it.groupValues[1].toInt()) + "L" }
    return t
}

private fun cellText(html: String): String =
    html.replace(Regex("(?is)<br\\s*/?>"), " ").replace(Regex("<[^>]+>"), "")
        .replace("&amp;", "&").replace("&nbsp;", " ").replace("&lt;", "<").replace("&gt;", ">")
        .let(::stripEmoji).replace(Regex("\\s+"), " ").trim()

fun sizeGuide(html: String): SizeGuide? {
    val charts = Regex("(?is)(?:<p[^>]*>([^<]{1,40})</p>\\s*)?<table[^>]*>(.*?)</table>").findAll(html).mapNotNull { m ->
        val body = m.groupValues[2]
        val header = Regex("(?is)<th[^>]*>(.*?)</th>").findAll(body).map { cellText(it.groupValues[1]) }.toList()
        if (header.firstOrNull()?.startsWith("Grösse") != true) return@mapNotNull null
        val rows = Regex("(?is)<tr[^>]*>(.*?)</tr>").findAll(body)
            .map { r -> Regex("(?is)<td[^>]*>(.*?)</td>").findAll(r.groupValues[1]).map { cellText(it.groupValues[1]) }.toList() }
            .filter { it.size == header.size }.toList()
        if (rows.isEmpty()) null else SizeChart(cellText(m.groupValues[1]).ifBlank { null }, header, rows)
    }.toList()
    if (charts.isEmpty()) return null
    val notes = Regex("(?is)<p[^>]*>(.*?)</p>").findAll(html).map { cellText(it.groupValues[1]) }
        .filter { SIZE_NOTE.containsMatchIn(it) && it.length < 260 }.distinct().toList()
    return SizeGuide(charts, notes)
}

private val SIZE_NOTE = Regex("(?i)konfektion|so misst du|grössen-hinweis|nummer grösser")

/** Farbige Bildzeichen raus – die App hat eigene Ikonen. */
fun stripEmoji(s: String): String =
    s.replace(Regex("[\\x{1F000}-\\x{1FAFF}\\x{2600}-\\x{27BF}\\x{2B00}-\\x{2BFF}\\x{FE0F}\\x{200D}\\x{20E3}]"), "")
