# «weiter» 09.10.2026 04:50–05:10 UTC — drei Messungen, eine Klasse

## 1. Aktive Produkte ohne Verkaufskanal — keine Klasse

GEMESSEN (Bulk 51'805 aktive, `resourcePublicationsCount`): **1** Produkt mit 0 Kanälen, angelegt 04:41 — die Importer
publizieren kurz nach dem Anlegen; die 5 «0 Kanäle» der Runde um 04:25 waren Importe mitten im Lauf. Verteilung:
7 Kanäle 46'203 · 6 Kanäle 4'678 · 9 Kanäle 527 · 8 Kanäle 304 · 5 Kanäle 23.

## 2. Kanal «Luxe Style Headless» (Publication 391626359175) — Beobachtung, nichts geändert

Allen Produkten bis 27.09. beim Anlegen des Kanals mitgegeben; **alle ~3'000 Neuimporte seit 01.10. fehlen dort**
(`cj_publish.mjs` PUBS kennt ihn nicht). Kein Zweck im Repo oder Gedächtnis vermerkt, keine App dahinter (`catalog: null`,
`autoPublish: false`). Gegenprobe: die tokenlose Storefront-API (Kaufbar-Prüfung der Poster) zeigt Neuimporte ohne Headless
trotzdem (4/4 sichtbar, kaufbar) — für unsere Werkzeuge ohne Wirkung. Ohne bekannten Zweck nicht nachpubliziert; wer den
Kanal braucht, ergänzt `391626359175` in `PUBS` und publiziert nach.

## 3. «🇨🇭 Versand aus dem LuxeStyle-Netzwerk» — 22 Produkte, behoben

Gefunden auf der Seite mit dem meisten Kaufwillen ohne Kauf (Leinen-Set «Provence», 41 Sitzungen, 2 Warenkörbe): direkt
unter «Direktversand ab Lieferantenlager» stand «🇨🇭 Versand aus dem LuxeStyle-Netzwerk» — Flagge + Versand deutet einen
Schweizer Versand an. GEMESSEN 22 aktive, **0** davon mit Schweizer/EU-Lager. Regel in `data/versprechen_regel.json`
(`eigen_text` → «🇨🇭 Schweizer Shop», Kanarie 59/59 py=js) → `versprechen_wache.py` **22 + 1 geändert, 0 Fehler**
(das +1: Schlangenketten-Armband, gestern nur wegen «18-Karat-Vergoldung» ausgenommen). Live geprüft.

## Offen (nächste Klasse, kein Betreiber-Klick)

**Masse fehlen bei Mode:** Provence zeigt nur die allgemeine Theme-Tabelle (Richtwerte, ohne Länge) und «Asiatische
Konfektion fällt kleiner aus – bitte eine Grösse grösser wählen» (31 Produkte mit diesem Satz). Für Mode ohne Anprobe ist
die Masstabelle das Kaufhindernis Nr. 1 — nächster Schritt: messen, wie viele aktive Kleidungsstücke CJ-Masse (cm) liefern,
die wir nicht zeigen.
