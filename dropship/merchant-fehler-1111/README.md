# Übrige Google-Probleme (Merchant Center), Stand 11.11.2026 21:54 UTC

Gemessen mit `automation/merchant_bildprobleme.py` (Workflow `merchant-bildprobleme.yml`, nur lesen, Dienstkonto `GCP_SA_KEY`).
Lauf 43105240668: 323 Seiten, 322 111 Artikelzeilen. Zählung nach verschiedenen Zeilen (Code, Attribut, Angebot), weil die
Reports ein Angebot teils doppelt liefern. Die zwei Massenprobleme (fehlender Versand für Liechtenstein, CSS-Grenze) stehen
im Gedächtnis und sind hier nicht gezählt.

## Bildprobleme

**313 → 198 Angebote** (Lauf 43082038253 von 18:53 UTC gegen Lauf 43105240668 von 21:41 UTC). Zwischen den zwei Läufen lag
die Bildrunde mit 93 Produkten (`dropship/bildfix-1111/README.md`). Dass Google die neuen Bilder schon gelesen hat, ist
naheliegend, aber nicht je Angebot belegt.

## Zweite Datenquelle: Googles «Autofeed» für luxestyle.ch

Modus `quellen` (Lauf 43107908509, Push auf `claude/merchant-fehler-1111`) listet die Datenquellen des Kontos:

| Quelle | Eingang | Art | Sprache / Länder |
|---|---|---|---|
| Shopify App API | API | primär | de, CH und LI |
| Shopify App API | API | primär | fr, CH |
| luxestyle.ch | AUTOFEED | primär | CH und LI |
| Third Party Promotions | (Aktionen) | andere | |

Alle zehn Proben (Angebots-IDs als reine Nummer oder als `<Produkt-ID>_<sku>`) stammen aus **luxestyle.ch (AUTOFEED)**:
Google liest die Shop-Seiten selbst und legt daraus eigene Einträge an, neben denen der Shopify-App. Aus dieser Quelle
kommen fast alle «Pflichtangabe fehlt»:

| Problem | Zeilen | davon Autofeed |
|---|---|---|
| Preis fehlt (`n:price`) | 1 141 | alle (1 004 mit `<Produkt-ID>_<sku>`, 137 mit Nummer) |
| Verfügbarkeit fehlt (`n:availability`) | 49 | alle |
| Werbetext im Titel (`non_product_data`, «Hot Sale») | 18 | alle |
| Verarbeitung abgebrochen | 3 | alle |
| Bildprobleme mit Nummer statt Shop-ID | 4 | alle |

**Die Seiten haben einen Preis:** die Probe «Outdoor-Wanderschuhe Low-Top, Rosarot, 40» (Autofeed-Preis 0) trägt in den
strukturierten Daten der Seite 30.90 CHF für genau diese SKU. Der Autofeed hält also einen alten oder unvollständigen
Abruf (Hypothese, Ursache nicht belegt). Die vier Bildangebote mit Nummer: Retro Punk Gothic Ring (zu klein),
Mandel-Kunstnägel, Magnetisches Induktions-Rücklicht (Einblendung) und SACE LADY (inzwischen Augenbrauen-Gel, Bild 1
schon bereinigt).

**Entscheid des Besitzers:** (A) lassen, Google liest die Seiten neu (Vorgabe); (B) den Autofeed im Merchant Center
ausschalten (Einstellungen, Datenquellen, «luxestyle.ch»). Bei B verschwinden die doppelten Einträge samt Fehlern; offen
ist, ob der Autofeed Produkte zeigt, die das Schaufenster (`gmc-schaufenster`) vom Google-Kanal genommen hat (dann fielen
sie aus den kostenlosen Einträgen). Nicht gemessen.

**«Hot Sale»:** bei `herren-fleece-sport-freizeitschuhe-483776` stehen in der Auswahl «Farbe» Stilnamen von CJ
(«Fashion», «Casual», «Hot Sale», «All-Match»). Nur der Autofeed meldet es; nicht geändert.

## Richtlinien (Einträge der Shopify-App)

| Fall | Zeilen | Produkte | Befund |
|---|---|---|---|
| Persönliche Notlagen | 163 | 86 | Schwangerschaft, Stillkissen; nur Remarketing betroffen, nichts zu tun |
| Sexuelle Interessen / eingeschränkte Ware | je 26 | 9 | durchsichtige Strumpfhosen, Shaper, Nachtrobe |
| Tabak | 18 | 8 | nur das Zigarren-Etui ist ein Tabakzubehör; Handyhalter, Lockenstäbe, Seifenspender, Tasse ohne Tabakwort im Text (Bild?) |
| Rechtliche Einschränkungen | 17 | 7 | u. a. Faltrucksack, Rührspaten für Maische |
| Waffenteile | 10 | 9 | «Taktische» Hundewesten und -leine (Wort «taktisch», «militärtauglich»), zwei Nachtsichtgeräte, Gunstock für Switch |
| Alkohol | 8 | 4 | Alkoholmeter, Hopfenfilter, Weinentkorker |
| Lebende Tiere | 8 | 8 | Schnüffelteppich, Hundeleine, Halskrause (Fehlurteil, vermutlich wegen der Tierbilder) |
| Weltanschauung | 5 | 4 | Buddha-Statue, Kreuzkette, Variante «Dunkle Haut» |
| Landeseite fehlerhaft | 2 | 2 | zwei Kinder-Smartwatches, beide Entwurf (404), fallen von selbst heraus |

Nichts davon geändert. Ein Umbenennen der «taktischen» Hundeartikel kostet das Suchwort «taktische Hundeweste»:
Entscheid des Besitzers.

## Werkzeug

- `MODUS=quellen` (Vorgabe bei Push) listet die Datenquellen und die Herkunft der Proben in `PROBEN`; `modus=bilder` (Handstart)
  liest alle Artikel (rund 15 Minuten). Konto-Nummern werden nie ausgegeben.
- Seit 21:41 UTC wiederholt der Leser Netz-Zeitüberschreitungen (vorher brach der Lauf 43104452470 an einer ab).
- Auswertung: `python3 -I fehler_auswerten.py <lauf.log> <aus.json>` (Scratch der Sitzung, gruppiert die FEHLER-Zeilen).
