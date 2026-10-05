# Vertrauen & Recht: Zusagen an die Richtlinien angeglichen (04./05.10.2026, 01:20–01:55 UTC)

Betreiber 04.10. 22:17: «fix 12 h lang alles» · Bereich **vertrauen-recht**. Werkzeug: `automation/zusagen_abgleich.py`
(Modi `messen` · `seiten` · `policies` · `produkte`; DRY ohne `SCHARF=1`). Ledger der Altwerte:
`dropship/_zusagen_abgleich_seiten.tsv` (52), `_policies.tsv` (2), `_produkte.tsv` (125). Voll-Backups der
geänderten Seiten/AGB im Scratchpad (`zusagen_backup/`, nicht im Repo — Lehre 04.10., Token-Platzhalter).

## Wahrheit = shopPolicies (gemessen 05.10. 01:25 UTC, `{shop{shopPolicies{type body}}}`)
| Thema | Richtlinie |
|---|---|
| Rückgabe | 30 Tage **freiwillig**, unbenutzt/originalverpackt; Rücksendung zahlt die Kundin, bei Mangel wir; Erstattung innert 14 T nach Eingang; Ausnahmen Hygiene/personalisiert; Mangel innert 7 T melden |
| Versand | nur Schweiz; gratis ab CHF 50 (sonst 7.00); CH-Lager 1–2 WT · EU 2–7 · Druck 7–14 · Direkt 10–20 WT; **Richtwerte**, keine garantierten Termine |
| Zahlung | Visa, Mastercard, TWINT, PayPal, Klarna, Apple Pay, Google Pay (gemessen 60 Bestellungen: nur shopify_payments, Karten Visa 7 / Mastercard 7; Wallets SHOPIFY_PAY/APPLE_PAY/GOOGLE_PAY) |
| Garantie | gesetzliche Gewährleistung OR 197 ff.; **keine** Geld-zurück-Garantie, kein «Keine Fragen» |
| Service | Antwort in der Regel innert 24 h an Werktagen; `kontakt-support`: bewusst keine Telefon-Hotline |
| Zoll | FAQ: Direktversand ab ~CHF 60 Warenwert Einfuhrsteuer + Verzollungsgebühr des Zustellers möglich |

## Vorher → Nachher

### 1. Produkttexte — Block «Schweizer Versprechen» (Alt-Importe Mai/Juni)
Befehl: `productsCount(query:'"Keine Fragen"')` + lokaler Vollexport `/tmp/desc_export.jsonl` (49'925).
| Phrase (alle Status / aktiv) | vorher | nachher |
|---|---:|---:|
| «Keine Fragen · volle Rückerstattung» | 106 / 14 | **0 / 0** |
| «30 Tage Geld-zurück(-Garantie)» | 109 / 15 | **0 / 0** |
| «Versand aus Belp · 7–12 Werktage» (Belp = Impressum, kein Lager; 0 davon `ch-lager`) | 85 / 0 | **0** |
| «7 Tage die Woche» (Support) | 106 / 14 | **0** |
| «ohne Zoll-Überraschungen» / «Endpreis ist Endpreis» | 7+12 / 0 | **0** |
| «Anlauf-Garantie – läuft nicht an oder Geld zurück» (Schmuck) | 9 / 7 | **0** |
Neu im Block: «30 Tage Rückgaberecht · Unbenutzt & originalverpackt zurück · Erstattung innert 14 Tagen · Rücksendung
zahlst du, bei Mangel wir» · «Direktversand ab Lieferantenlager · 10–20 Werktage» · «Schweizer Shop · Support auf Deutsch &
Englisch · Antwort innert 24 h an Werktagen». 125 Produkte geschrieben (116 eindeutig), 0 Rücklese-Fehler. Kanarienvögel
gelesen: 8 Produkte vor dem Schreiben (Palo-Santo-Set, French Press, Wellness-Queen-Box, Krawattenklammer …).
**Nicht angefasst:** 39'369 Importer-Bausteine «🛡️ Sorglos shoppen: ✅ Geprüfte Angaben · 🚚 Lieferung 10–20 Werktage ·
🔄 30 Tage Rückgabe …» — stimmen mit der Richtlinie überein; `ls-liefer`-Stufe vs. Sorglos-Lieferzeit: **0 Widersprüche**
(gemessen über alle Produkte). 2'389× «Versand aus der Schweiz … 1–2 Werktagen (DPD)» tragen **alle** `ch-lager` → wahr.
1'193× «Zoll» im Katalog = Zoll als Mass (Bildschirm), keine Zusage.

### 2. Veröffentlichte Seiten (108 gescannt, 22 korrigiert, 52 Ersetzungen — jede exakt 1×, sonst nichts)
| Seite | Widerspruch → Richtlinie |
|---|---|
| `garantie` | «in den meisten Fällen musst du nicht zurückschicken» → «ob der Artikel zurück muss, sagen wir dir in unserer Antwort» |
| `warum-luxestyle` | 2× «30 Tage Geld-zurück» → Rückgaberecht; «Email, WhatsApp, Telefon … Innerhalb 24h» → E-Mail, 24 h an Werktagen; «11 PREMIUM Produkte sorgfältig getestet» → laufend geprüfte Angaben |
| `schweizer-vs-deutsche-marken` | «30 Tage Garantie (gesetzlich 14)» (CH kennt kein gesetzliches Widerrufsrecht) → freiwillig; «Premium-Geschenkbox bei JEDER Bestellung» + «Kürzere Lieferketten» gestrichen; ß → ss |
| `schmuck-pflege-edelstahl` | «Reaktion: zurückschicken, 30 Tage Garantie» (getragener Schmuck ist von der Rückgabe ausgeschlossen) → Einzelfall-Prüfung |
| `zahlungsmethoden` | AMEX, «Vorkasse / Banküberweisung» (nicht in AGB, nicht messbar) raus; Klarna «14 Tage Zahlungsziel» → zeigt Klarna im Checkout |
| `versand-lieferung` | POD «10-20» → 7–14 + Direkt 10–20; «Maximum-Zeiten» → Richtwerte, kann länger dauern |
| `tracking` | «einzelne Artikel aus Übersee 20–30 Werktage — steht am Produkt» — **kein** Produkt trägt diese Stufe (`ls-liefer`-Tiers: eu-druck 484, china 474, standard 41, direkt 41, pod 4) → gestrichen |
| `designs-galerie` | «In der Schweiz gedruckt» — gedruckt wird in Europa (`selbst-gestalten`, `firmen-vereine`, Startseite) → korrigiert |
| `ueber-uns` | «Länder-spezifisch» (ein Land) → «je Artikel» |
| `refund-policy-en` | Abschnitt «EU Right of Withdrawal» (Link auf unveröffentlichte Seite) raus; «Money-Back Guarantee — No Questions Asked» → 30-Day Return Policy |
| `about-us-en`, `why-luxestyle-en`, `a-propos-fr`, `chi-siamo-it` | «7-14 business days/jours/giorni» → 10–20 (1–2 ab CH-Lager); «money-back / Unconditional / Sans discussion / Rimborso totale» → Rückgaberecht mit Ausnahmen; WhatsApp/Telefon → E-Mail an Werktagen |
| `personalisierte-geschenke-fuer-sie`, `herren-mode-fuer-ihn`, `geburtsstein-schmuck-bedeutung` | Sie-Form / Tippfehler |
| `schmuck-personalisiert-schweiz`, `wasserfeste-goldkette-damen`, `geschenke` | H1/Titel «… aus der Schweiz» bei Ware, die laut eigener Seite nicht in der Schweiz gefertigt wird → «für die Schweiz» |
| `weihnachtsgeschenke-last-minute` | «SHIP50 — Gratis Versand ab CHF 50» (Gratisversand ist automatisch) → ohne Code |
Nachmessung `NUR=messen`: **Seiten 0/108** mit verbotener Phrase (vorher 10). WebFetch (fremder Ausgang) 01:52 UTC:
`zahlungsmethoden` zeigt «(Visa, Mastercard)», Klarna-Satz neu, keine Vorkasse; `about-us-en` «10–20 business days».

### 3. Policies
AGB §7 «Für EU-Kund:innen gilt zusätzlich das gesetzliche 14-tägige Widerrufsrecht» — der Shop hat EINEN Markt (CH),
die Versandrichtlinie schliesst EU aus → Satz gestrichen, «Stand: 18. Mai 2026» → «5. Oktober 2026» (`shopPolicyUpdate`,
rückgelesen; WebFetch `/policies/terms-of-service` 01:52 UTC bestätigt). Rückgabe-, Versand-, Datenschutz-Richtlinie:
keine Liechtenstein-/EU-Zusage mehr (0 Treffer).

## Bewusst NICHT geändert
- Theme (51 Treffer gelesen, alle konsistent: Lieferbalken, Warenkorb, Startseite «in Europa gedruckt»).
- `warum-luxestyle` «Premium-Preise … 30-50% günstiger» und `hyaluron-vitamin-c-skincare` («Glow in 14 Tagen», Link auf
  DRAFT-Serum) — Werbe-/Heilversprechen-Klasse, nicht Richtlinien-Widerspruch → offen.
- `weihnachtsgeschenke-last-minute` «XMAS25 — 25% im Dezember»: Code existiert (SCHEDULED bis 31.12.), widerspricht aber der
  15-%-Reserve vom 02.10. → Betreiber-Entscheid.
- 39'369 Sorglos-Bausteine, 2'389 CH-Lager-Zeilen (wahr).

## Lehren
- **Die grosszügigere Fassung stand auf der früher geschriebenen Seite** (Mai-Importe, EN/FR/IT-Übersetzungen der
  About-Seite): «Keine Fragen», «7-14 Tage», «WhatsApp», «Belp» — die Richtlinien wurden später ehrlich, die Nebenseiten nie.
  Jede Sprache einer Seite ist eine eigene Fundstelle (DE/EN/FR/IT).
- Shopify-Inhaltssuche fand 106 «Keine Fragen», der Vollexport 15 (aktiv) — für Zählungen beide Linsen; für Schreiben die
  Suche (live) + Rücklesen.
- Eine Ersetzung muss exakt 1× treffen; neue Regeln an einer schon korrigierten Seite dürfen die alten nicht «scheitern»
  lassen → «schon erledigt» = Alt fehlt UND Neu steht.
