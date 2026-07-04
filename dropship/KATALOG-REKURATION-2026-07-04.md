# 🛍️ Katalog-Rekuration — 10-Agenten-Live-Audit (2026-07-04)

> 10 Agenten haben die Frauen-/Topseller-/Geschenk-Collections live gefetcht (238 Produkt-Verdicts). Konsolidierter Plan unten.
> Ziel: kaltem, mobilem Frauen-Traffic (0 Reviews) den ERSTKAUF leicht machen = niedriges wahrgenommenes Risiko.

## 🚨 Kernbefund
Die **Topseller-„Frauen-Vitrine" ist mit Fremdkörpern geflutet.** Position 1 = **CHF-1042-Smart-TV (Xiaomi)**. Dazu Michael-Kors-Taschen CHF 598–675, Herren-Uhren (Guess/Casio/Tommy/Police) CHF 270–406, Herren-Parfum (Chanel Bleu), Herren-Boxershorts, Xiaomi-Hanteln, Nike-Laufschuhe. = schlimmstmögliche Erstimpression für die Zielgruppe.

## 4 Hebel (nach Erstkauf-Wirkung)
1. **REMOVE-FROM-WOMEN (86 Handles):** Herren-Artikel (Uhren/Parfum/Boxershorts/Anzug/Sneaker), Kinder-Ware (Disney/Schulrucksäcke), Non-Fashion-Gadgets (TV/Ladegeräte/Ventilator/Hanteln/Kopfhörer/Kotbeutelspender), Haushalt (Besteck/Gläser/Steppdecke), Skincare/Haarpflege, Bastelmaterial, CHF-4.90-Ramsch — raus aus Frauen-/Topseller-/Geschenk-Collections. **Grösster Trust-Hebel.**
2. **DEMOTE_EXPENSIVE (48 Handles):** On-Brand-Frauen-Artikel über ~CHF 100 (MK-Taschen 170–675, Designer-Uhren/Sonnenbrillen/Parfums, Moissanite-Feinschmuck) — behalten, aber nie Cold-Hero/Kampagnenziel/Position-1.
3. **FEATURE_WINNERS (20 Handles, CHF 15–70):** wasserfester Edelstahl-/925-Silber-Schmuck, personalisierte Geschenke (Geburtsstein/Initialen), Mini-Taschen, Sonnenbrillen — nach vorne. Hero = wasserfestes 18K-Set (CHF 24.90) + Geschenk mit Box.
4. **NEED_MORE_IMAGES (12 Handles):** Hero-Winner brauchen 3–4+ Bilder für mobile PDP-Conversion.

Daten (alle echten Handles): `automation/katalog_rekuration.json`.

## ✅ Autonom umgesetzt (CizQ6 / API, sicher + reversibel)
- **Neue kuratierte Collection `frauen-favoriten`** (`curate_winner_collection.mjs`, cmd `curate-winners`): die 20 Winner in EINER sauberen manuellen CHF-15-70-Vitrine. Erstellt nur + fügt hinzu, löscht nie. → sauberes Cold-Traffic-Ziel.

## 🎨 An THEME-SESSION (SHARED-MEMORY)
- **Home-Hero-CTA + „Topseller"-Nav auf `/collections/frauen-favoriten` zeigen** (statt der breiten Topseller-Vitrine mit dem TV).
- Die breite `topseller`-Collection (1987 Artikel, Smart-Collection) NICHT als Cold-Hero verwenden.

## ⏭️ Nächste Charge (vorsichtig, braucht Collection-Typ-Prüfung)
- REMOVE-FROM-WOMEN + DEMOTE: erst prüfen ob die Frauen-Collections manuell oder Smart (rule-based) sind, dann gezielt Mitgliedschaft/Tags/Rules anpassen. Nicht blind mutieren.
- Dedup: Cristian-Lay-Ringe (~11 Grössen-Listings) → 1 Produkt mit Grössen-Variante; MK-Taschen-/Parfum-Flut ausdünnen; 5 Kotbeutel-Farbvarianten (Tag-Bug „leggings" im Handle) raus; Handles mit Sonderzeichen bereinigen.
