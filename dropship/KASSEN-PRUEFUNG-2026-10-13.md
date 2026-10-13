# Kassen-Prüfung 13.10.2026 — warum kaufen Leute an der Kasse nicht?

Workflow `wf_2a13fa79` (30 Agenten, nur lesend): 5 Prüfer (Kasse am Handy, Abbruch-Daten, Gratisversand-Angaben, Angebot Leinen-Set/Sirène, Vergleich Schweiz), je Vorschlag ein Gegenprüfer, dazu ein Richter. Anlass war meine Lesart «mehr als die Hälfte bricht IN der Kasse ab» (30 T: 15 Kassen-Sitzungen, 7 Käufe) und eine Liste von 15 abgebrochenen Kassen.

## Kernbefund (GEMESSEN)

- **Die Kasse ist kein messbarer Engpass.**
  - In 30 Tagen gab es 14 Abbrüche: 2 echt, 7 Test (`kaufweg-test@example.com`, eigene Kaufweg-Läufe), 1 Betreiber, 4 Wegwerf oder Bot.
  - Quelle: `TAGE=30 DETAIL=1 python3 automation/checkout_abbruch_messen.py`.
  - Seit 05.10. haben alle 4 Menschen gekauft, die die Kasse erreichten.
  - Meine Ausgangsliste stammte aus den rohen `abandonedCheckouts`. Darin waren 12 von 14 Zeilen Prüf- oder Fremdkörbe.
- **Versand CHF 7 als Abbruchgrund ist nicht belegt.** 9 von 12 fremden Käufen (90 T) zahlten die CHF 7.
- **Der Verkehr auf den Top-Landeseiten war bezahlt.**
  - Sirène: 58 von 59 Sitzungen kamen aus dem TikTok-Test `lernen-okt26` (01.–04.10.).
  - Leinen-Set: 39 von 42 aus demselben Test.
  - Seit 05.10. hatten beide Seiten 0 oder 1 Sitzung.
- Der Engpass bleibt der Verkehr: 14 T, 615 Sitzungen, 15 Warenkörbe, 6 Käufe.

## Umgesetzt (autonom)

| Punkt | Messung vorher | Getan | Nachher |
|---|---|---|---|
| **Falsche Gratis-Schwelle in Texten** (Richter Platz 3) | 11 Stellen sagten 45 oder 65 statt 50. 7 davon im Ratgeber «Adventskalender zum Befüllen», der zu Körben aus Stickern und Magneten rät. Dort greift −10 % ab 2 Artikeln, und der Rabatt lässt sich nicht mit Versandrabatten kombinieren: 47.00 → 42.30 → die Kasse verlangt CHF 7 trotz «gratis ab 45» | `automation/versand_band_wache.py` **Regel 2**: Finder über Produkte (Text, seo.title/description), Blog-Artikel (body, summary, SEO) und Seiten. Geschrieben wird nur mit festen Satzmustern (Zahl → 50, «in der Schweiz» ergänzt, weil LI keinen Gratisversand hat). Kanarien 12/12. Täglich im Aufseher mit `SCHARF=1` | 5 Träger + 1 Nachtrag («unter CHF 45, kommen CHF 7 Versand dazu»), alle zurückgelesen. Ratgeber per WebFetch live geprüft: 7× «ab CHF 50» |
| **Abbruchzahlen bereinigt** (Platz 6) | `art()` existierte seit 10.10., hatte aber keinen Selbsttest | `checkout_abbruch_messen.py --selbsttest` mit 8 Kanarien; der Lauf bricht mit «unklar» ab, wenn er rot ist. `tools/kaufweg_handy.mjs` schreibt jeden Prüflauf nach `dropship/_kaufweg_tests.txt` | 8/8. Ampel-Zeile unverändert: «14 Abbrüche (echt 2 · Test 7 · eigen 1 · Wegwerf 4)» |
| **Provence-SEO «für den Sommer»** (Platz 12) | Seitentext auf Herbst umgestellt, SEO-Text nicht | seo.description → «milde Herbsttage, Reisen und Brunch», Titel unverändert mitgeschickt | zurückgelesen |
| **CH-Lager-Ware zeigt das Asien-Lieferfenster** (Platz 1, autonomer Teil) | Kostüm ab Schweizer Lager: Seite «14.–16. Okt», Kasse «28. Okt–11. Nov». Alle 2'375 Fortura-Produkte liegen im selben Versandprofil wie 51'168 CJ-Produkte | `kassen_lieferdatum_wache.py` misst die Profile, die Ampel meldet «KASSEN-DATUM CH-LAGER …» (Quittung «bleibt» in `dropship/_entscheid_ch_lager_profil.txt` stellt die Zeile ab) | Ampel-Zeile aktiv |

## Für den Betreiber (Entscheide)

1. ✅ **ERLEDIGT 13.10. (Betreiber «entscheide du»):** dritte Variante: Profil «CH-Lager» mit 0.00-Tarifen unter den Namen des General profile. Damit zahlt niemand mehr als heute. In der Kasse steht für die Maske jetzt «20.–21. Okt KOSTENLOS» statt «28. Okt–11. Nov». Stufe 1 umfasst 1'607 Produkte. Details: `dropship/CH-LAGER-PROFIL-2026-10-13.md`. Ursprüngliche Frage:
   **Lieferdatum CH-Lager in der Kasse** (wegen Halloween zuerst):
   - (a) Eigenes Versandprofil «CH-Lager» mit Transit 1–3 Tage. Dann zahlen gemischte Körbe (CH-Lager plus Asien) den Versand doppelt: CHF 14 statt 7, in LI CHF 29.80.
   - (b) Nichts ändern. Dann CH-Lager-Kostüme bis 31.10. nicht mit «vor Halloween da» bewerben. Für die Quittung «bleibt» in `dropship/_entscheid_ch_lager_profil.txt` schreiben.
2. **WELCOME10 bei Einzelartikeln zu 45–49.99:**
   - Problem: Mit Code kostet der Kauf CHF 2.01 mehr als ohne. Sirène: 51.91 statt 49.90, weil der Tarif nach Rabatt rechnet.
   - Option 1: Gratis-Tarif CH auf ≥ 40.50 senken.
   - Option 2: WELCOME10 erst ab CHF 50.
   - Option 3: Status quo.
3. **Band «gratis ab CHF 50» bleibt** (Entscheid §7 aus der 12-Tage-Bilanz): «Ab 50» stimmt für jeden Korb, «ab 45» für 2+ Artikel nicht (50 × 0,9 = 45). Empfehlung: so lassen.
4. Optional, ohne belegte Wirkung:
   - Zahlart «Crypto: USDC» abschalten.
   - Prüfen, ob in der Kasse das Newsletter-Häkchen vorab gesetzt ist (Einstellungen → Checkout → Marketing-Optionen).
   - Zoll-/MWST-Satz auf Direktversand-Seiten (Rechtsaussage).

## Widerlegt (nicht umsetzen)

- **«Standard CHF 7» ab 45 per API begrenzen:** Das ist keine eigene Rate, sondern ein Bereich der Grundrate. Eine Obergrenze kann Körbe von 45 bis 49.99 ohne jede Versandart lassen, dann ist die Kasse blockiert.
- **Hinweis «Leg etwas dazu … du zahlst dann CHF 45.00»:** Die Preisaussage stimmt fast nie.
- **Zusatzartikel in der Warenkorb-Schublade:** Die Schublade öffnet nicht von selbst, und für LI wäre der Hinweis falsch.
- **TWINT an Platz 1:** Ohne Eigenkäufe liegt Apple Pay vorn, und der Umbau bräuchte eine kostenpflichtige App.
- **Warenkorb-Seite:** Die feste Versandzeile unter «Gratis-Versand gesichert» ist echt, aber /cart sieht kaum jemand (Schublade). Erst bei der nächsten Arbeit an `templates/cart.json` streichen, ohne bedingte Fassung.

## Lehre

**Eine Rohliste ist kein Befund.** Bevor eine Abbruch- oder Trichterzahl einen Auftrag auslöst:
- die bereinigte Messung nehmen (Tests, Betreiber und Wegwerf heraus),
- Top-Landeseiten nach `utm_medium` aufschlüsseln.

Hier hätte die Rohliste 30 Agenten auf ein Scheinproblem gesetzt. Gefunden haben sie trotzdem echte Widersprüche: Schwellen-Texte und das CH-Lager-Datum.
