# Google-Gratis-Einträge: «Restricted adult content» / «Sexual interests» / «Inappropriate image» (04.10.2026, «fix 12 h lang alles»)

Bereich google-blocker. Stand vor dem Lauf: `dropship/_google_feedback_stand.json` 04.10. 22:02 UTC, 1'219 Free-Listings-Blocker
bei 50'759 aktiven Produkten.

## GEMESSEN (vorher)

| Messung | Befehl | Zahl |
|---|---|---|
| «Personalized advertising: Sexual interests» | Stand-JSON `handles` | 299 |
| «Restricted adult content» | Stand-JSON `handles` | 299 — **dieselben 299 Handles** (`set(sx)==set(ad)` → True). Google schreibt beide Meldungen immer zusammen; es sind 299 Produkte, nicht 598 Blocker |
| «Inappropriate image» | Stand-JSON | 218 (14 davon auch in Adult) |
| davon frisch noch gemeldet (`product.feedback` live 22:25) | GraphQL `products(query:"handle:… OR …")`, 503 Handles in 13 Seiten | 263 von 299 noch gemeldet, 36 schon wieder frei — Google prüft laufend neu |
| im Google-Kanal publiziert | `publishedOnPublication(302872297857)` | 299/299, alle ACTIVE |
| Warenart der 299 | `productType` | Damenmode 165, Damenschuhe 18, Hautpflege 15, Beauty-Tools 14, Herrenmode 12, Haustier 10, Sport 10, Gadget 8, Uhren 6, Elektronik 5, … |
| Bildtausch-Ledger für die 299 | `_google_bild_tausch.tsv` | 254 nie angefasst, 20 motiv, 19 getauscht, 3 behalten, 3 uneinig |
| Bildtausch-Aufseher | `/tmp/google_bild_tausch.log` 22:1x | **tot**: «Gemini ohne Antwort — HTTP 402 Payment Required», 6 Fehler / 0 Tausch je Lauf |
| Reizwörter im Titel, aktiv + Google-Kanal | `productsCount(title:Sexy / "Spicy Girl" / verführerisch*)` | 44 + 6 + 1 = 51 (7 davon in der Adult-Klasse) |
| Dessous-Titel im Google-Kanal (Dessous/Babydoll/Bodystocking/Straps/Ouvert/Negligé) | `productsCount` | 0 (frühere Säuberungen haben die betitelten erwischt) |

**Stichprobe GELESEN:** alle 299 Hauptbilder als 10 Kontaktbögen (`bogen_00..09.jpg`, 30 je Bogen) plus ein Bogen mit ALLEN
Bildern von 12 Grenzfällen. Befund je Unterklasse:

| Unterklasse | Anzahl | Was Google sieht | Entscheid |
|---|---:|---|---|
| **Echte Dessous/Fetisch** | 6 | Spitzen-Bodys mit Strapsen/Thong (4), Latex-Gesichtsmaske, «Enger Lederhandschuh» = Bondage-Armhandschuh (Lieferantenbild: «straight-tube glove without opening … can be worn by yourself with a rope») | Tag `adult-nicht-bewerben` → aus Google + TikTok + FB/IG + Pinterest (Hausregel 29.08.), Onlineshop bleibt |
| **Mode/Schuhe mit Modelfoto** | ~198 | Strumpfhosen, Shapewear, Korsett-Tops, Bikinis, Kleider, Sandalen am Fuss — harmlos, Hauptbild ist eine Pose | Bildtausch (bestehendes Werkzeug), neutrales vorhandenes Bild nach vorne |
| **Fehlalarm, keine Mode** | 95 → **94** (Korrektur 05.10.: `fitness-leggings-mit-po-push-up-effekt-609216` ist Mode mit Modelfoto → in die Mode-Messung umgebucht; dazu war 1 Produkt der Klasse verboten — Stachelhalsband, 05.10. DRAFT nach TSchV 76) | Herrenuhren, Katzenangel-Federn, Hundehalsband, Gesichtsmassager, Drohnen, Nackenkissen, Kuchenteiler, Hantel aus Silikon … | Anstupsen (Tag-Update → App reicht neu ein; 29.09. gemessen 27 % frei vs. 1,6 % Kontrolle) |
| Motiv selbst (nicht Dessous, aber jedes Bild knapp) | Rest | Kettentop, rückenfreier Mesh-Hoodie, Sport-Rad-Einteiler, Muskel-Print-Shirt | bewusst NICHTS: bleiben bei Google blockiert, kosten nichts; aus den Werbekanälen nehmen hiesse ein verkäufliches Produkt ohne Not sperren |

## GETAN

1. **Bildtausch repariert** (`automation/google_bild_tausch.py`): Gemini-402 ist jetzt eine eigene Klasse `GeminiLeer` (Marke
   `/tmp/gemini_leer` wird gesetzt und 6 h beachtet); mit `EIN_MODELL=1` urteilt der Zweitprüfer (`zweitmodell.chat_json`:
   ChatGPT, sonst Groq-Vision qwen) **allein**, Ledger-Art **`tausch-q`** (getrennt nachmessbar wie `tausch-g`). Trockenprobe
   3 Produkte: 1 tausch-q (Seidenmaske → Bild 5 ohne Gesicht), 2 behalten.
2. **Groq-Schlüsselrotation** (`automation/zweitmodell.py`): gemessen — `GROQ_API_KEY` und `GROQ_API_KEY2` hängen an
   DERSELBEN Organisation (TPD 197'755/200'000 verbraucht, qwen), `GROQ_API_KEY3` antwortete. `groq_json()` wechselt beim
   Tageslimit auf den nächsten Schlüssel; `--probe` 2/2 ok.
3. **6 Dessous/Fetisch-Artikel** getaggt (`adult-nicht-bewerben`, Ledger `dropship/_google_adult_entscheid_2026-10-04.tsv`
   mit Grund und alten Tags) und mit dem bestehenden `google_sperrtags_durchsetzen.py` (DRY → scharf) aus den 4 Werbekanälen
   genommen; Rücklesen: `publishedOnPublication` = false, Onlineshop-URL vorhanden, Status ACTIVE. Ledger
   `_google_sperrtags_durchgesetzt.txt` 6 Zeilen 22:31 UTC. ⚠️ Shopify-Suchindex hinkt Tag-Updates ~1 Min nach (erster DRY fand 2/6).
4. **51 Reizwort-Titel** sachlich (`automation/google_reiztitel.py`, neu; Kanarienvögel 10/10 — «Hot Wheels» bleibt, «Sexysmart»
   bleibt, «Sexy & Cool» fällt ganz): 44 «Sexy», 6 «Spicy Girl», 1 «verführerisch» → Titel + SEO-Titel (wo betroffen 19),
   Ledger `dropship/_google_reiztitel.tsv` (alt → neu). Rücklesen: 0 Reizwort-Titel im Google-Kanal.
5. **95 Fehlalarme angestupst** (`gfeed_anstupsen.py` jetzt mit `KLASSE` + `HANDLES_FILE`): nur die Nicht-Mode-Teilmenge, damit
   die Bildtausch-Messung an der Mode unberührt bleibt; Ledger `_gfeed_anstupsen.tsv`.
6. **Bildtausch Adult-Klasse scharf** (N=80, `NOCHMAL_UNEINIG=1`, unter dem Aufseher-Lock `/tmp/lock_google_bild_tausch.lock`):
   Ergebnis siehe Endstand unten.

## NACHGEMESSEN (04.10. ~22:45 UTC — Google selbst misst erst der nächste Vollscan)

| Messung | Zahl |
|---|---:|
| Reizwort-Titel im Google-Kanal | **0** (vorher 51) |
| `adult-nicht-bewerben` im Google-Kanal | 0 (6 raus; 15 aktive tragen den Tag insgesamt) |
| Angestupst 22:3x | 95/95 |
| Bildtausch Adult (Ledger `tausch-q`) | siehe «Endstand» |

Erwartung für den nächsten `google_feedback_wache`-Vollscan: Adult/Sexual 299 → deutlich unter 200 (6 raus, ~25 % der 95 Fehlalarme
frei, Bildtausch-Quote bei Gemini-allein war 76–83 %; `tausch-q` erstmals messbar).

## BEWUSST NICHT
- Kein `adult`-Attribut gesetzt (die App «Google & YouTube» kennt kein mm-google-shopping-Feld dafür, und Strumpfhosen als
  Erwachsenenware zu melden wäre eine Falschangabe).
- Keine Mode aus dem Google-Kanal genommen: 36 der 299 waren 20 Min nach dem Scan schon wieder frei — Google prüft neu, ein
  Unpublish wäre endgültig.
- «Transparent»/«durchsichtig» im Titel bleibt (Materialangabe, kein Reizwort).
- Kettentop, Mesh-Hoodie, Spitzenkleid durchsichtig: Motiv auf jedem Bild — weder Tausch noch Sperre.

## OFFEN
- Nächster Vollscan: `tausch-q` getrennt auswerten (Groq-Vision allein ist neu, Quote unbekannt).
- Gemini-Guthaben (402) = Betreiber-Klick; bis dahin Groq-Rotation (Key 3) — qwen hat auch dort 200k Tokens/Tag (~80 Produkte).
- Aufseher-Block: N=8 je Klasse alle 2 h reicht für 250 offene nicht (~100/Tag) → Vorschlag N=25 (siehe waechter_block).
- Import-Regel an der Quelle (Wäsche/Bademode/Bodys: Hauptbild ohne Model zuerst) bleibt offen.

## Endstand Bildtausch Adult (04.10. 22:44 UTC, Lauf läuft weiter bis N=80 oder Container-Neustart; Ledger macht ihn neustart-fest)
| heute beurteilt | tausch-q (Groq-Vision allein, Bild gewechselt) | behalten (kein besseres Bild) | motiv | fehler |
|---:|---:|---:|---:|---:|
| 24 in 10 Min (~2,4/Min) | **12** | 12 | 0 | 0 |
Beispiele tausch-q: Maulbeerseiden-Gesichtsmaske → Bild 5 (Maske ohne Gesicht), Taillengürtel → Bild 3 (reines Produktfoto).
Auffällig: Groq-qwen setzt nie `motiv_selbst_problem` — die Dessous-Entscheide bleiben deshalb Handarbeit am Kontaktbogen (oben).
Schlüsselrotation lief 22× auf Schlüssel 3 (Key 1+2 = dieselbe Organisation, Tageslimit).
Rückweg je Produkt: Spalte 4 des Ledgers (`_google_bild_tausch.tsv`) = alte erste Media-ID → `productReorderMedia` newPosition 0.

## Korrektur 05.10. (Prüfer, Plan Punkt 14)
- Die 95 «Fehlalarme» waren 94 Fehlalarme + 1 verboten (Stachelhalsband «Halsband mit Stimulationskette», DRAFT 05.10.) + 1 Mode (`fitness-leggings-mit-po-push-up-effekt-609216`, Leggings am Model = Klasse «Mode/Schuhe mit Modelfoto», Bildtausch statt Anstupsen). Die Leggings sind im Ledger `_gfeed_anstupsen.tsv` mit dem Vermerk `mode-messung` markiert und zählen in der Anstups-Quote NICHT mit (Mode-Messung bleibt dadurch unverfälscht).
- Figurkleid `traglose-rueckenfreie-sexy-figurkleid-in-gelb-607600`: Titel war nach der Reizwort-Reparatur kein Deutsch («Traglose, rueckenfreie Figurkleid») → 05.10. «Rückenfreies Figurkleid mit Taillenband in Gelb oder Weiss» (Bild: ärmellos mit Schulterpartie, nicht trägerlos), SEO beide Felder, Beschreibung «strapless/rueckenfrei» korrigiert (Ledger `_titel_kauderwelsch.tsv`).

## Korrektur 05.10. (Prüfer Index 1, Bereich google-adult) — siehe `dropship/GOOGLE-ADULT-RUECKLESE-2026-10-05.md`
- **Ledger ≠ Live war kein Einzelfall:** Rücklese 05.10. 04:10 UTC über alle 301 Tausche → **83 live zurückgedreht** (78 davon exakt
  auf die Reihenfolge vor dem Tausch). Verursacher `textbild_fix.py` (alle 83 alten Media-IDs als Quittung in `_textbild_geprueft.txt`),
  nicht der Bild-Nachfüller. Jetzt Sperre `bildtausch_sperre.py` in textbild_fix + hauptbild_ohne_text; 82 nachgesetzt, Rücklese 0 Abweichungen im Google-Kanal.
- **tausch-q am Bild geprüft (42/42, Kontaktbogen alt|neu|live):** 6 Tausche zeigten MEHR Haut/Schritt als vorher (5 Strumpfhosen-Packs,
  1 Netz-Strickkleid) → über Ledger-Art `rueckweg` zurück; 36 bleiben (davon 21 klar neutraler: Produkt statt Model).
- **Aufseher-Block:** der Reizwort-Lauf ist täglich eingebaut (lief 04.10. 23:12, 0 Treffer); ein Bildtausch-Tageslauf N=40 ist bewusst
  NICHT drin (Engpass Groq-Vision-Kontingent). Die Angabe «N=25» im Bericht vom 04.10. war ein Vorschlag, nicht der Stand.
- **Reizwörter auch in Texten:** 17 Meta-Beschreibungen, 175 Beschreibungen, 50 Alt-Texte im Google-Kanal → `google_reiztitel.py --texte`
  (jetzt Teil des Tageslaufs), 223 Produkte bereinigt, Rückweg `dropship/_google_reiztitel_texte.jsonl`.
- **95 Fehlalarme nachgeprüft (Sperrlisten + Kontaktbogen):** neben dem Stachelhalsband noch 4 Hausregel-Treffer — Fasnachts-Plüschhut
  (Tag `kostuem-hut` traf die Sperrliste nicht), «Date Night»-Spiel (Bilder: Couples Adult Board Game) und ein Metall-Zughalsband ohne Stopp
  (Kettenwürger, DRAFT); 3 Maskenball-Masken waren vom Kollegen schon aus Google genommen.
