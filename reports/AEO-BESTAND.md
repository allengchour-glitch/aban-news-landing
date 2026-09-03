# KI-Sichtbarkeit des eigenen Bestands (Stand 2026-09-03)

Gemessen mit der eigenen Engine (`functions/_aeo-engine.mjs`) über
`node tools/aeo_bestand.mjs`. Diese Datei ist eine Momentaufnahme — das Werkzeug
liefert den aktuellen Stand jederzeit neu.

## Warum das zuerst gemacht wurde

abannews verkauft KI-Sichtbarkeit (Audit ab CHF 290, Monitor, Beratung). Die Engine
prüfte bis heute nur **fremde** Seiten. Der erste Lauf über den **eigenen** Bestand
deckte einen Fehler in der verkauften Engine auf:

> Gemessen wurde der **Seitenrahmen** statt des Inhalts. `<title>`, Menü und Brotkrume
> enden ohne Punkt und klebten deshalb am ersten Inhaltssatz. Der „erste Satz" von
> `dreirad-kaufen-schweiz.html` war für die Engine 43 Wörter lang und lautete
> „Dreirad kaufen Schweiz 2026 — … | aban aban Marktplatz Jobs Angebote Start ›
> Kaufberater › …". Der echte erste Satz hat 10 Wörter.

Folge: **234 von 270** Kaufberatern bekamen beim wichtigsten AEO-Signal zu Unrecht
„Erster Satz ist sehr lang" — und derselbe falsche Rat ging in **jeden bezahlten
Kunden-Report**, denn fast jede Website der Welt hat Titel und Menüpunkte ohne
Satzzeichen. Ein Audit, der das Falsche empfiehlt, ist schlimmer als keiner.

## Was korrigiert wurde

| Fehler | Korrektur |
|---|---|
| Titel/Menü/Brotkrume zählten als Inhalt | Gemessen wird `<main>`, ersatzweise `<article>`, sonst das Dokument ohne `nav`/`footer`/`aside`; `<head>` fällt immer raus |
| Block-Elemente ohne Satzzeichen klebten aneinander | `</p>`, `</h2>`, `</li>`, `</td>` … setzen eine Satzgrenze |
| Zeilenumbrüche im Quelltext galten als Satzende | Erst Blockmarken setzen, dann Leerraum zusammenfassen |
| Menü-`<ul>` zählte als Inhaltsliste | Listen/Tabellen werden nur im Inhaltsbereich gezählt |
| Tabellenzellen verfälschten die Lesbarkeit | Lesbarkeit misst nur Fliesstext (Einheiten mit Satzzeichen) |

Abgesichert mit 12 zusätzlichen Prüfungen in `functions/_aeo-engine.test.mjs`
(52 grün) und drei Sabotagen: jede einzelne Korrektur rückgängig gemacht → Prüfungen
werden rot (1–3 Stück je Sabotage).

## Wirkung auf die eigenen Seiten

Dieselben Seiten, unverändert — nur richtig gemessen:

| Gruppe | Ø vorher (fehlerhaft) | Ø nachher | „hoch"-Empfehlungen zu „Antwort zuerst" |
|---|---|---|---|
| Kaufberater (270) | 78,6 | **88,1** | 234 → **36** |
| Vergleiche (6) | 66,8 | **74,8** | — |
| Rechner & Werkzeuge (103) | 61,4 | **58,6** | — |
| Geld- & Service-Seiten (10) | 70,1 | **69,1** | — |

Die beiden gefallenen Gruppen sind **kein Rückschritt, sondern die Wahrheit**: der alte
Messfehler hatte sie geschmeichelt, weil Menü- und Fusszeilen-Text als Inhalt zählte.
Rechner-Seiten haben real wenig Fliesstext, kaum Listen und selten ein FAQ.

## Wo Arbeit jetzt am meisten bringt (nach Geldnähe)

1. **Geld- & Service-Seiten, Ø 69,1** — `angebote.html` (40) ist die Seite, die verkauft,
   und die schwächste im Bestand. Schwächen: FAQ 37 %, Antwort-zuerst 52 %, Listen 52 %.
2. **Rechner & Werkzeuge, Ø 58,6** (103 Seiten) — Listen 3 %, Antwort-zuerst 16 %,
   14× dringendes FAQ. Genau die Seiten, die Leute über konkrete Fragen finden.
3. **Kaufberater, Ø 88,1** — bereits gut; die verbleibenden 36 „Antwort zuerst" sind
   echte Befunde, keine Messfehler mehr.
