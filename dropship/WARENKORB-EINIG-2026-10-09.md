# Der Warenkorb widersprach sich selbst (09.10.2026, Betreiber «verbessere mehr»)

## Gemessen

**Einstiegsseiten, 14 Tage** (ShopifyQL, `GROUP BY landing_page_path`, 09.10. 11:25 UTC):

| Seite | Sitzungen | Warenkorb | Kasse | Kauf |
|---|---|---|---|---|
| Abendkleid «Sirène» | 227 (208 TikTok mobil CH) | 4 | 2 | 0 |
| Leinen-Set «Provence» | 178 (151 TikTok mobil CH) | 4 | 4 | 0 |
| Abendkleid «Aurora» | 158 (139 TikTok) | 0 | 0 | 0 |
| Startseite | 129 | 7 | 6 | 1 |

Gesamt 827 Sitzungen, davon 563 auf den drei TikTok-Seiten (68 %), dort 0 Käufe.

**Abgebrochene Kassen** (`abandonedCheckouts`): seit 03.10. dreimal das Leinen-Set (39.90, in der Kasse 46.90 mit
CHF 7 Versand), einmal Sirène (49.90) und je einmal Kuchenform, Aufbewahrungsbox, Strickdecke und Steakplatte.

**Eigener Testkorb im Handy-Browser** (390 px, 1× Leinen-Set, ohne Bestellung, ohne E-Mail). Derselbe Korb sagte drei
verschiedene Dinge:

| Stelle | Text | Stimmt das? |
|---|---|---|
| Versandbalken oben (`layout/theme.liquid`, 09.09.) | «🚚 Noch **CHF 5.10** bis zum Gratis-Versand» | **Nein** |
| Hinweis unten (`snippets/cart-summary.liquid`, 06.10.) | «Versand CHF 7 · noch **CHF 10.10** bis zum Gratisversand (ab CHF 50)» | Ja |
| Liste (`templates/cart.json`, `lux_cart_trust`) | «Lieferzeit steht auf jeder Produktseite (**CH-Lager 1–2 Werktage**)» | **Nein**: Das Set kommt aus Asien |

Die Produktseite des Sets sagt richtig «Lieferung voraussichtlich 23. Okt. – 6. Nov.».

**Warum 5.10 falsch ist** (`/cart.js`, live gemessen):
- 1× Leinen: `items_subtotal_price` 3990, `total_price` 3990.
- 2× Leinen: 7980 → 7182 (Automatik-Rabatt «Bundle: 2+ Artikel -10%», auf den ganzen Korb).
- Gratis wird es, wenn der Betrag **nach** Rabatt mindestens CHF 45 ist. Das ist die aktive Nullrate im General profile.
- Jeder zweite Artikel löst den 10-%-Rabatt aus. Wer laut Balken für 5.90 dazulegt, hat 45.80 Ware, nach Rabatt 41.22. Die
  Kasse verlangt dann weiter CHF 7.
- Richtig ist **10.10**. Der untere Hinweis rechnete «50 − Betrag nach Rabatt». Im Einzelkorb stimmte das, im 2er-Korb
  verlangte er zu viel (39.90 + 5.90: 8.78 statt 4.20).

## Getan

**Regel (eine, in `automation/warenkorb_einig.py`):**
- **Gratis**, sobald `total_price` (nach Rabatt) mindestens 45 ist.
- **noch X** = max(50 − Warenwert vor Rabatt, ⌈(45 − Betrag nach Rabatt) · 10/9⌉). Der zweite Teil gilt, wenn zusätzlich
  ein Code abgezogen wird.
- **Lieferdatum im Warenkorb** = die **langsamste** Ware im Korb. Tags und Tage sind dieselben wie im Produktseiten-Block
  `lux_delivery`:

| Tags | Lieferung |
|---|---|
| fortura / ch-lager / blitzversand | +1 bis +3 Tage |
| eu-lager | +3 bis +10 Tage |
| Druck auf Bestellung | +9 bis +19 Tage |
| alles andere (Direktversand aus Asien) | +14 bis +28 Tage |

Fällt ein Datum auf Samstag oder Sonntag, gilt der Montag.

**Kanarien 7/7**, jeweils mit Gegenprobe «wer genau X dazulegt, hat danach Gratisversand»:

| Korb | noch |
|---|---|
| 1× 39.90 | 10.10 |
| 2× 24.90 | 0.20 |
| 39.90 + 5.90 | 4.20 |
| 1× 49.90 | gratis |
| 2× 39.90 | gratis |
| Korb mit Code | 3.20 |

Der neue Balken-Code lief offline in Node an denselben 7 Fällen und zeigte dieselben Zahlen.

**Live geschrieben und zurückgelesen** (12:00 UTC). Die drei Dateien wurden vorher nach `/tmp/*.vor-einig.1791545591`
gesichert:

| Datei | Änderung |
|---|---|
| `layout/theme.liquid` | Balken rechnet nach der Regel. Text: «Noch CHF 10.10 bis zum Gratis-Versand (ab CHF 50 Warenwert)», darunter «Aktuell CHF 39.90 + CHF 7.00 Versand = CHF 46.90» |
| `snippets/cart-summary.liquid` | dieselbe Formel. Auch `warenkorb_gratisversand.py` trägt sie jetzt in seinem Wiedereinfüge-Block, damit er sie nicht zurückdreht |
| `templates/cart.json` | «📦 Lieferung voraussichtlich 23. Okt. – 6. Nov. (Direktversand aus Asien)». Bei mehreren Artikeln steht «langsamster Artikel» dabei |

**Wächter** (`fixer_keepalive.sh`, täglich):
- `warenkorb_einig.py --pruefen --live` prüft, ob die Marken in allen drei Live-Dateien stehen, ob der Tarif unverändert ist
  (7.00 / gratis ab 45) und ob die Kanarien grün sind.
- Dazu kommt ein **echter Testkorb im Handy-Browser** (1× und 2× Leinen-Set, danach geleert). Alle «noch»-Zahlen auf der
  Seite müssen der Regel entsprechen, «CH-Lager 1–2 Werktage» darf bei Asien-Ware nicht auftauchen, und das Lieferdatum muss
  dastehen.
- Fehlt eine Marke (Theme-Update), schreibt der Wächter einmal neu. Ändert sich der Tarif, meldet er nur. Ein 429 vom Shop
  zählt nicht als Befund.

## Live-Nachweis

Nach den Testkörben antwortete der Shop unserer IP mit **HTTP 429 «Verifying your connection»**. Den Testkorb habe ich
nachgeholt, sobald der Shop wieder antwortete.

**✅ 09.10. 11:53 UTC, `warenkorb_einig.py --pruefen --live`, Handy-Browser:**

| Korb | Warenwert → nach Rabatt | «noch»-Zahlen auf der Seite | Regel |
|---|---|---|---|
| 1× Leinen | 39.90 → 39.90 | nur **10.10** (Balken und Hinweis gleich) | 10.10 |
| 2× Leinen | 79.80 → 71.82 | keine, Gratisversand | gratis |

In beiden Körben steht das Lieferdatum, und «CH-Lager 1–2 Werktage» kommt nicht mehr vor. Die leere Warenkorb-Seite, per
WebFetch über einen anderen Ausgang geprüft, zeigt die Ersatzzeile «📦 Lieferdatum steht auf jeder Produktseite».

Den ersten Versuch hatte der Wächter als «live ok» gemeldet, obwohl der Test wegen 429 gar nicht gelaufen war. Das ist
behoben. Ohne Messung meldet er jetzt «Testkorb NICHT gelaufen», und der Testkorb wartet zwischen den Abrufen je 2,5 s.

## Offen

- **Wirkung messen** am 12.10. (Tag-12-Bilanz) und 16.10.: Kasse → Kauf auf den drei TikTok-Seiten und die Abbrüche unter
  CHF 45.
- **Testsitzungen in der Statistik:** Meine Testkörbe vom 09.10. 11:30–12:00 UTC zählen in ShopifyQL mit. Eine davon
  erreichte die Kasse: Leinen-Set, direkt, mobil CH. Für die Bilanz bitte abziehen.
- Das Leinen-Set selbst bleibt ein Grenzfall. Mit Versand kostet es 46.90, gratis wäre es erst ab einem zweiten Artikel. Ein
  Preis- oder Bündel-Entscheid gehört dem Betreiber und ist hier nicht angefasst.

## Lehre

**Zwei Wächter für dieselbe Zahl sind kein doppelter Schutz, sondern ein Widerspruch mit Zeitverzug.**
- Der Balken (09.09.) und der Hinweis (06.10.) wurden je für sich richtig gemessen und je für sich geprüft.
- Keiner sah den anderen. Erst der Blick auf den ganzen Warenkorb, so wie ihn eine Kundin sieht, zeigte «5.10» und
  «10.10» untereinander.
- Eine Zahl, die an mehreren Stellen steht, braucht EINE Formel an EINEM Ort und einen Test, der die fertige Seite liest.
