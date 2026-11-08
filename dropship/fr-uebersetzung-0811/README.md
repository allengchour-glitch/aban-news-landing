# Französisch (Sprache `fr`) – Stufe 1: Servicepages (08.11.2026)

**Auftrag:** Besitzer 08.11.2026 «übersetzten» (Antwort auf die Frage, ob die Sprache `fr` abgeschaltet oder übersetzt wird). Vorher: `/fr/` zeigte fast überall deutschen Text; `/fr/`-Produkt-, -Sammlungs- und -Blogseiten tragen seit PR #2912 `noindex`.

## Stand vor der Arbeit (GEMESSEN 08.11.2026, Stichprobe: je Typ die ersten 40 Ressourcen)
| Typ | übersetzt (fr) |
|---|---|
| Theme-Texte (`ONLINE_STORE_THEME_LOCALE_CONTENT`) | 4 888 von 5 186 Feldern (94 %) |
| Shop-Richtlinien | 6 von 6 |
| Sammlungen | 95 von 200 Feldern (Stichprobe) |
| Menüs | 17 von 40 (Stichprobe) |
| Seiten | 0 (223 Ressourcen, 49 veröffentlicht, davon 12 Servicepages und 37 Ratgeber, rund 125 000 Zeichen) |
| Artikel / Blogs | 0 |
| Produkte | 0 von 50 (Stichprobe; 56 492 aktive Produkte) |

Sprachen im Shop: `de` (primär), `fr` (veröffentlicht), `en` und `it` (nicht veröffentlicht).

## Was jetzt LIVE ist (08.11.2026 ca. 20:42 UTC)
Acht Servicepages, je vier Felder (`title`, `body_html`, `meta_title`, `meta_description`) auf Französisch: `impressum`, `rabatt-newsletter`, `tracking`, `versand-lieferung`, `kontakt-support`, `ueber-uns`, `cookie-richtlinie`, `pflegehinweise`.
* Anrede «vous» (Schweizer Webshop-Standard), Schweizer Schreibweise (CHF, «Suisse»).
* Methode: Textstück-Paare (`seiten_fr.mjs`) ersetzen nur Text im Original-HTML; Tags, Stile und Gestaltung bleiben (Test: gleiche Tag-Folge). Interne Links zeigen auf `/fr/pages/…` und `/fr/policies/…` (beide HTTP 200 gemessen).
* Schreiben nur über `translationsRegister` mit dem frisch gelesenen Digest des deutschen Originals (weicht der Digest ab, wird übersprungen). Rücklesen 32 von 32 Feldern gleich, Livepages mit Browser-Kennung gelesen: französischer Titel, 0 deutsche Wörter im Body, deutsche Seiten unverändert, kein `noindex` auf den Seiten (die Weiche gilt nur für Produkt/Sammlung/Artikel/Blog).
* Test `seiten_test.mjs` (62 Prüfungen, im Job `selbst-gestalten`), Mutationsprobe 9 von 9 anwendbaren Mutanten erkannt (ein Mutationsmuster traf die Regex nicht, kein Beleg).

## Rücknahme
`ZURUECK=1 LIVE=1 node dropship/fr-uebersetzung-0811/apply_seiten.mjs` (entfernt genau die im Ledger `lauf/seiten_ledger.json` stehenden fr-Felder; ohne `LIVE=1` Trockenlauf). Wiederholung der Übersetzung: `LIVE=1 node dropship/fr-uebersetzung-0811/apply_seiten.mjs` (idempotent, `NUR=handle,handle` begrenzt).

## Bewusst NICHT übersetzt (Grund)
* `rueckgabe`, `garantie`, `faq`, `groessentabelle`: Der deutsche Text soll mit der Rückgabe-Welle 2 (`dropship/rueckgabe-0611/`, wartet auf das Ja des Besitzers) geändert werden; zuerst der deutsche Text, dann die Übersetzung.
* `versand-lieferung` und `tracking` tragen die Aussage «meist 2–3 Werktage ab Schweizer Lager» (offene Besitzerfrage, ob sie stimmt): ändert sich die deutsche Seite, die Paare in `seiten_fr.mjs` nachziehen und neu schreiben.
* 37 Ratgeberseiten (rund 75 000 Zeichen): nach Nutzen gestaffelt, noch nicht begonnen.
* Produkte, Sammlungen, Artikel: `/fr/`-Produkt-/-Sammlungs-/-Blogseiten bleiben `noindex`, bis ein belegter Anteil übersetzt ist (Entscheid dazu: Codex' `luxe.fr_index_ready`-Weiche prüfen, PR #2916).

## Grenzen
* Maschinell-redaktionell von Claude übersetzt, nicht von einer Muttersprachlerin geprüft. Rechtsnahe Seiten (Impressum, Cookie-Richtlinie) bitte vor dem Bewerben von jemandem mit Französisch gegenlesen lassen (Hypothese: sprachlich in Ordnung, juristisch ungeprüft).
* Wirkung auf Verkäufe und Index ungemessen (in 3 Monaten 1 Klick auf `/fr/`-Seiten laut Audit 07.11.).

## Vorschlag für die nächsten Stufen (Reihenfolge nach Nutzen, je ein kleiner Lauf)
1. Menüs und Sammlungen vollständig (Stichprobe 47 % bzw. 43 %): Titel und Beschreibung der Menü-Sammlungen.
2. Nach Rückgabe-Welle 2: `rueckgabe`, `garantie`, `faq`, `groessentabelle`.
3. Produkte: nur die meistbesuchten (Titel, Beschreibung, Optionen) mit der bestehenden Pipeline (`automation/translate_content.mjs`, braucht Gemini-Guthaben, oder Groq-Schlüssel über `automation/lib/uebersetzen.mjs`), dann erst `noindex` für diese aufheben.
