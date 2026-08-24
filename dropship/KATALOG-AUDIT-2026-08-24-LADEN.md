# Zweites Audit — Laden, Recht, Preise (Stand 23.08.2026)

## 1. Vorbemerkung

Der Shop hat rund 15 Bestellungen insgesamt. **Kein einziger Befund unten hat einen belegten Verlust verursacht.** Was hier steht, sind Zusagen, die der Shop nicht einhalten kann, und Texte, die sich gegenseitig widersprechen — plausible Kaufabbruch-Ursachen, aber keine gemessenen. Wo ich eine Schwere angebe, ist sie eine Einschätzung, keine Messung.

Alle Befunde wurden zweimal live geprüft: Finder 20:22–20:40 UTC, Skeptiker 22:29–23:12 UTC (Admin-API am Ursprung **und** WebFetch von aussen). Zwei Befunde sind dabei gefallen, sechs Zahlen mussten korrigiert werden.

---

## 2. Gehaltene Befunde

### 🔴 BUNDLE20: drei veröffentlichte Ratgeber rechnen Körbe vor, die den Code nicht einlösen können

**Beleg (23:01–23:12 UTC):** `DiscountCodeNode/2338583183745`, ACTIVE, `DiscountMinimumSubtotal 80.0 CHF`. Dagegen live per WebFetch:
- `/blogs/magazin/9-geschenkideen-fur-frauen-unter-chf-60-…`: «LED Halsband (19.90) + Slow Feeder (24.90) = CHF 44.80. Mit Code BUNDLE20 nur CHF 35.84.» — nennt gar keine Schwelle
- `/blogs/magazin/10-wellness-geschenke-unter-chf-50-2026`: «Wellness-Box (CHF 79.80, mit BUNDLE20 = CHF 63.84)» — verfehlt die Schwelle um 20 Rappen; zwei Absätze darüber steht auf derselben Seite korrekt «(ab CHF 80)»
- `/blogs/magazin/welcher-aroma-diffuser-passt-zu-dir-guide-2026`: «Code BUNDLE20: -20% ab CHF 60 Bestellwert» — falsche Schwelle

**Zahl: 3 Artikel** (Finder sagte 4, nannte aber nur 3 URLs). Zwei weitere Artikel nennen BUNDLE20 korrekt.

**Vorschlag:** Zwei verschiedene Reparaturen, nicht eine — bei (1) und (2) die vorgerechneten Rabattpreise streichen oder die Körbe über CHF 80 heben; bei (3) nur die Zahl 60 → 80.

**Wer schreibt das Feld beim nächsten Mal:** Niemand — und das ist das Problem. `automation/tote_rabattcodes.py` prüft laut eigenem Kopfkommentar **nur EXPIRED-Codes**. Ein aktiver Code mit falsch beworbener Schwelle fällt durch jedes Raster. Quellenfix: den Wächter um eine Regel erweitern, die jede «mit CODE X: CHF Y»-Aussage gegen `minimumRequirement` rechnet.

---

### 🔴 `/pages/faq-luxestyle` und `/pages/faq-en`: CHF 4.90 Versandkosten — live sind es CHF 7.00

**Beleg (23:03–23:08 UTC):** Page/698006405505, `isPublished: true`, wörtlich «CHF 4.90 für CH · 9.90 EUR für DE/AT. Gratis ab CHF 50 / 99 EUR mit Code SHIP50.» und «Launch-Woche: 30% mit LAUNCH30». `/pages/faq-en` (ebenfalls veröffentlicht): «Flat CHF 4.90 within Switzerland.»
Gegenprobe: **alle 10 Versandprofile** durchgezählt — es existiert kein 4.90-Tarif für die Schweiz. LAUNCH30 ist EXPIRED seit 2026-05-28. Gratis-Versand greift ohnehin automatisch ab CHF 49, ganz ohne Code.

**Zahl: 4** (3 Fehler auf `faq-luxestyle`, 1 auf `faq-en`; Finder sagte 3, `faq-en` fehlte).

**Vorschlag:** 4.90 → 7.00; «mit Code SHIP50» streichen; LAUNCH30 → WELCOME10.

**Wer schreibt das Feld beim nächsten Mal — zwei nachweisbare Quellenlücken:**
1. `automation/seiten_versandtext.py` Z. 47–49 verankert `^(…|faq|…)$` — `'faq'` trifft, `'faq-luxestyle'` und `'faq-en'` **nicht**. Der Lauf vom 12.08. reparierte drei Seiten, die heute alle unveröffentlicht sind, und liess die beiden veröffentlichten stehen. Der Kopfkommentar dieser Datei nennt CHF 4.90 sogar ausdrücklich als falsch.
2. `automation/tote_rabattcodes.py` Z. 58 liest `pages(first:100)` **ohne Paginierung**. Der Shop hat 221 Seiten; `faq-luxestyle` steht an Position 105. **121 von 221 Seiten sieht dieser Wächter nie.**

---

### 🔴 Vier gleichzeitig veröffentlichte AGB-Fassungen mit gegensätzlicher Haftungsregel

**Beleg (22:29–22:36 UTC):**
- `/pages/agb` (Footer-Link): «Die Haftung ist – soweit gesetzlich zulässig – auf den Bestellwert begrenzt.»
- `/policies/terms-of-service` (Checkout): «Wir haften **unbeschränkt** für Vorsatz und grobe Fahrlässigkeit sowie für Schäden aus der Verletzung von Leben, Körper oder Gesundheit.»
- `/pages/agb-luxestyle` (veröffentlicht, in keinem Menü): dritte Haftungsregel, TWINT «sobald aktiviert» — läuft seit 10.07.
- `/pages/terms-en` (veröffentlicht): «Delivery time: 7-14 business days» — eine weitere Lieferzeit neben der am 14.08. vereinheitlichten Staffel

**Zahl: 4** (Finder: 2).

**Vorschlag:** Eine Fassung führen. Die Klausel «Haftung auf den Bestellwert begrenzt» dürfte für grobe Fahrlässigkeit nach OR 100 I ohnehin nicht durchsetzbar sein.

**Wer schreibt das Feld beim nächsten Mal:** `dropship/RECHTSTEXTE-STATUS.md` dokumentiert genau die Ursache — die Seite pflegt eine `pageUpdate`-Automatik, die Checkout-Policy hat der Betreiber am 14.06. **von Hand** eingefügt, weil der Scope `write_legal_policies` fehlt. Zwei Pflegewege = garantierte Divergenz. Quellenfix: Scope beschaffen (dann schreibt ein Lauf beide) **oder** den Footer-Link auf `/policies/terms-of-service` umhängen und `/pages/agb` löschen.

---

### 🔴 Die Datenschutzerklärung nennt den Staat nicht, in den jede Lieferadresse geht

**Beleg (22:32–22:41 UTC):** PRIVACY_POLICY, 20'253 Zeichen Klartext. Treffer: China 0 · Ausland 0 · Drittland 0 · Drittstaat 0 · Lieferant 0 · Versanddienst 0 · Logistik 0. Shopify/USA ist sauber aufgeführt («Dabei können Daten in die USA übermittelt werden … Standardvertragsklauseln»). Alle 221 Seiten geprüft: keine nennt China.
Dass Daten fliessen, ist belegt: `automation/cj_order_engine.py` übergibt `shippingCustomerName`, `shippingAddress`, `shippingZip`, `shippingPhone` mit `fromCountryCode: "CN"` — und es läuft: `dropship/_cj_orders_done.txt` trägt «#1015 SD2608221012120648400 LX1015 $22.16» vom 22.08.

**Zahl: 1 Dokument.** Art. 19 Abs. 4 DSG verlangt bei Bekanntgabe ins Ausland die Nennung des **Staates**; China steht nicht in Anhang 1 VDSG.

**Präzisierung:** Der Empfänger *name* fehlt nicht rechtswidrig — eine Kategorie («Fulfillment und Versand») steht drin, und Art. 19 II c lässt Kategorien genügen. Der Mangel ist allein der fehlende Staat.

**Wer schreibt das Feld beim nächsten Mal:** Der revDSG-Block ist **handgeschrieben** (Telefon +41 79 538 28 14 steht nur dort). Kein Automat berührt ihn — die Ergänzung hält also, muss aber bei jedem neuen Lieferanten (Printful, Gelato, Fortura) nachgezogen werden.

---

### 🔴 Der Footer verlinkt die Datenschutz-Fassung **ohne** Schweizer Teil

**Beleg (22:36–22:47 UTC):** Footer-Menü (`menus`, handle `footer`) → «Datenschutz → /pages/datenschutz». Diese Seite (Page/697899385217, veröffentlicht): revDSG 0 · EDÖB 0 · «Eidgenöss» 0 · «Schweizer Recht» 0 · «Schweiz» 0. Per WebFetch bestätigt. Der komplette revDSG-Block («Verantwortliche Stelle ist ausschliesslich LuxeStyle CH – nicht Shopify», EDÖB-Beschwerderecht) existiert **nur** in `/policies/privacy-policy`.

Widerlegt wurde dabei die Repo-Notiz `dropship/FEHLERSUCHE-14-08.json` («die verwaisten /pages/-Fassungen haben 0 eingehende Links») — `sections/footer-group.json` enthält den Block `menu_service_recht` mit `"menu":"footer"`, das Menü **wird** gerendert.

**Zahl: 2 Fassungen.**

**Vorschlag:** Footer-Link auf `/policies/privacy-policy` umhängen — eine Änderung an einer Stelle, statt zwei Texte synchron zu halten.

**Wer schreibt das Feld beim nächsten Mal:** Dieselbe doppelte Pflege wie bei den AGB. Ein Umhängen des Links beseitigt die Klasse, ein Nachschreiben des Textes nicht.

---

### 🔴 Bearbeitungszeit: 24 Stunden gegen 1–3 Tage — und die Versandseite widerlegt sich selbst

**Beleg (22:55–23:05 UTC):**
- Theme, `templates/product.json`, Block `text_mGpGAj` (auf **jeder** Produktseite, es gibt nur ein Produkt-Template): «Wir bearbeiten deine Bestellung innerhalb von 24 Stunden.»
- `/pages/versand-lieferung`: «Bestellungen 1-3 Tage Bearbeitungszeit beim Fulfillment-Partner» — und zwei Zeilen unter «🇨🇭 Blitzversand-Artikel ab CH-Lager: 1–2 Werktage» steht «Maximum-Zeiten inkl. 1-3 Tage Bearbeitung + Transit». Die Bearbeitung allein ist grösser als das genannte Maximum.
- `/pages/tracking` (veröffentlicht) wiederholt «1-3 Tage» zweimal.
- Folge: der Datumsbalken für CH-Lager-Ware (`lux_delivery`, `now_s | plus: 86400`) verspricht **immer «morgen»** — bei einer Freitagsbestellung also Samstag.

**Zahl: 2'411 CH-Lager-Produkte** (`status:active AND tag:ch-lager`, precision EXACT; die Vereinigung ch-lager/fortura/blitzversand ergibt dieselbe Zahl). Die 24-Stunden-Zusage steht auf allen ~46'900.

**Vorschlag:** Erst entscheiden, welche Zahl gilt (Fortura fragen), dann **alle vier** Fundstellen nachziehen. Der Datumsbalken rechnet in Kalendertagen und muss unabhängig davon auf Werktage.

**Wer schreibt das Feld beim nächsten Mal:** `automation/versandaussagen_wahrheit.py` Z. 526 erklärt «Bearbeitungszeit: 1-3 Tage» ausdrücklich zu den «völlig richtigen Zeitangaben», die **nicht** angefasst werden dürfen — der Theme-Text widerspricht also der Zahl, die das Projekt selbst für wahr hält. CLAUDE.md dokumentiert die Neufassung von `text_mGpGAj` am 20.08., erwähnt die Bearbeitungszeit mit keinem Wort. Quellenfix: der Versandaussagen-Lauf muss `templates/*.json` mitprüfen, nicht nur Produkttexte.

---

### 🟡 Das Lieferdatum nennt immer den Wochentag des Bestelltags

**Beleg (22:52–22:57 UTC):** `templates/product.json`, Block `lux_delivery`, else-Zweig: `d_from = now_s | plus: 1209600` (14 Tage), `d_to = now_s | plus: 2419200` (28 Tage) — beides Vielfache von 7. Der Block steht aktiv im `block_order` von `_product-details`, Position 9 direkt nach den Kaufbuttons.
**An zwei Wochentagen gemessen:** dieselbe Seite zeigte um 20:23 UTC (So lokal) «6. Sept. – 20. Sept.» (zwei Sonntage) und um 22:55 UTC (Mo lokal, Europe/Zurich) «7. Sept. – 21. Sept.» (zwei Montage). Dritter Beleg aus CLAUDE.md: am Do 20.08. stand dort «3.–17. Sept.» — zwei Donnerstage.
An 2 von 7 Tagen ist die gesamte Spanne ein Wochenendtermin.

**Zahl: 43'733 Produkte** (46'894 aktive per Bänder-Zählung, minus 3'161 Ausnahme-Zweige als Obergrenze) = 93,3 %. Finder sagte 44'100 / 94 %.

**Schwere von «hoch» auf mittel gesenkt:** Es ist eine Spanne mit dem Wort «voraussichtlich», und die **Dauer** ist ehrlich (14/28 Kalendertage ≈ 10/20 Werktage = die dokumentierte Zusage). Ein Glaubwürdigkeitsmangel, kein Rechtsrisiko.

**Vorschlag:** Nach der Addition prüfen, ob `d_from`/`d_to` auf `%w` = 0 oder 6 fallen, und auf Montag schieben. **Wichtig:** dabei die 7er-Vielfachen auflösen (z. B. 16/30 Tage), sonst bleibt der Termin an denselben Wochentag gekoppelt.

**Wer schreibt das Feld beim nächsten Mal:** Das Theme selbst, bei jedem Seitenaufruf. Der Fix im Liquid **ist** der Quellenfix — es gibt kein nachfüllendes Skript, das ihn rückgängig machen könnte.

---

### 🟡 Impressum verweist auf die abgeschaltete EU-ODR-Plattform

**Beleg (22:46–22:55 UTC):** `/pages/impressum` (Page/697899417985, veröffentlicht, seit 14.08. unverändert): «Die EU-Kommission stellt eine Plattform zur Online-Streitbeilegung bereit: https://ec.europa.eu/consumers/odr». WebFetch auf die URL → 301 → «The European Online Dispute Resolution (ODR) Platform is discontinued as of 20 July 2025». Die Policy-Fassung `/policies/legal-notice` nennt sie korrekt nicht mehr.

**Zahl: 3 veröffentlichte Seiten** (Finder: 1) — zusätzlich `/pages/agb-luxestyle` §11 und `/pages/terms-en` §11. Artikel: 0. Theme: 0. Policies: 0.

**Vorschlag:** Absatz ersatzlos streichen, Satz aus `/policies/legal-notice` übernehmen. Der Verweis passt ohnehin nicht: ein CH-Händler mit genau einem Markt war der EU-ODR nie unterworfen.

**Wer schreibt das Feld beim nächsten Mal:** Niemand — es existiert **kein Rechtstext-Wächter**. `tote_links.py` prüft nur `/products/`-Links, `tote_rabattcodes.py` nur Codes. Quellenfix: eine Liste veralteter Verweise (ODR, alte Domains, tote Behördenlinks) in den täglichen Lauf aufnehmen.

---

### 🟢 Liechtenstein wird beworben, kann aber nicht auschecken

**Beleg (22:41–22:52 UTC):** `markets(first:20)` → genau ein Knoten, «Switzerland», regions `[CH]`. `deliveryProfiles` → Zone «Domestic» `['CH']`; LI nur in acht unerreichbaren Gelato-EFTA-Zonen. `dropship/FEHLERSUCHE-14-08.json` hält einen echten Checkout-Test fest: «Lieferland Liechtenstein → `{"shipping_rates":[]}`».
Beworben in **10 veröffentlichten Seiten + 3 Policies**, u. a. `/pages/versand-deutschland` mit eigener Zeile «🇱🇮 Liechtenstein: 2-7 Werktage» und die SHIPPING_POLICY mit der unbefolgbaren Anweisung «Bitte gib bei der Bestellung eine gültige Lieferadresse in der Schweiz oder in Liechtenstein an».

**Zahl: 13** (Finder: 3 — ausgerechnet die Versandrichtlinie mit 4 Treffern fehlte).

**Schwere auf niedrig-mittel gesenkt:** LI hat ~40'000 Einwohner, der Shop 15 Bestellungen. Und LI liegt im schweizerischen Zoll- und Postgebiet — physisch **kann** geliefert werden, nur das Land ist im Checkout nicht wählbar. **Die naheliegende Reparatur ist deshalb womöglich die falsche:** LI mit einer Einstellung dem Markt «Switzerland» hinzufügen macht alle 13 Texte auf einmal wahr, statt ein Liefergebiet zu streichen. Betreiber-Entscheidung — vorher prüfen, ob CJ nach LI liefert.

**Wer schreibt das Feld beim nächsten Mal — hier liegt die eigentliche Gefahr:** `automation/versandaussagen_wahrheit.py` hat die LI-Formel unbesehen aus der alten Versandrichtlinie als «DIE WAHRHEIT» übernommen (die Funktion `kopfblock()` enthält sie). Sie ist bisher nie ausgerollt worden — 100 zuletzt aktualisierte Produkte: 0 Treffer. **Ein Lauf dieser Datei würde die falsche Zusage in Produkttexte schreiben.** Wer LI streicht, muss zuerst diese Funktion korrigieren.

---

## 3. Widerlegt — bitte nicht nochmals aufwerfen

### ❌ «WELCOME10 ist neben dem automatischen −10 % wirkungslos»
Drei Gründe:
1. **Der Bundle-Rabatt hat Mindestmenge 2.** Bei einem Ein-Artikel-Korb greift er nicht, WELCOME10 gibt volle 10 %. Live nachgezählt (23:03 UTC): von **7 bezahlten Bestellungen hatten 6 genau einen Artikel** (#1015, #1014, #1012, #1011, #1005, #1004 — alle ohne jede `discountApplication`). Nur #1013 hatte zwei.
2. **Der Ort stimmt nicht.** Die drei Sätze stehen nicht im `/cart`, sondern als Blöcke `ls_announce_1…5` einer rotierenden Ankündigungsleiste (`sections/header-group.json`, `"speed": 6`) auf **jeder** Seite. Zwischen WELCOME10 (Block 2) und Mengenrabatt (Block 5) liegen zwei fremde Slides. Cart-Dateien: 0 Treffer. Die «Adjazenz» war ein Artefakt der Markdown-Extraktion.
3. **Die Herleitung stimmt nicht.** WELCOME10 hat live selbst `productDiscounts: true`; die Nicht-Kombination folgt allein aus den drei `false`-Flags des Bundle-Rabatts, nicht aus einer Discount-Klasse (die in API 2024-10 über diese Felder gar nicht bestimmbar ist).

*Restkern, damit er nicht verlorengeht:* Ein Erstbesteller mit ≥2 Artikeln bekommt tatsächlich CHF 0.00 zusätzlich. Belegt durch 1 von 7 Bestellungen — echt, aber eng, und in der Ankündigungsleiste, nicht im Kaufweg.

### ❌ «Black-Friday-Bundle kann den eigenen Code nicht einlösen»
Das Vorzeige-Bundle (15404297060737, CHF 79.90) ist live **`status: DRAFT`, `publishedAt: null`**, die öffentliche URL liefert **HTTP 404**. Ein Produkt, das niemand kaufen kann, scheitert an keiner Schwelle. Der Finder hatte per `productByHandle` nur den Preis gelesen, nicht den Status — exakt die in CLAUDE.md dokumentierte Entwurfs-Falle. Ausserdem: der Code ist `SCHEDULED` ab 27.11.2026, heute scheitert er bei jedem Warenkorbwert.

*Was an dieser Seite wirklich kaputt ist* (andere Klasse, `tote_links.py`): **alle vier Deal-Links sind tot** — zwei DRAFT, einer aus dem Katalog verschwunden, das Bundle 404.

---

## 4. Geprüft und sauber

| Geprüft | Ergebnis |
|---|---|
| Produkttexte auf «Liechtenstein» | 100 zuletzt aktualisierte + 3 Kopfblock-Produkte → **0** |
| Theme (425 Dateien) auf «Liechtenstein» | nur 2 Treffer, beide in `{% comment %}`-Blöcken |
| Theme + 316 Artikel auf ODR-Verweise | **0** |
| Alle 6 Policies auf ODR | **0** |
| Produkt-Templates | genau **eines** — keine ausgenommenen Produktseiten |
| `SHIP50` | **ACTIVE** (Free shipping, min CHF 50) — kein toter Code |
| WELCOME10 im Ein-Artikel-Korb | wirkt, 6 von 7 realen Bestellungen |
| `/pages/faq` (das im Menü verlinkte) | inhaltlich korrekt und aktuell |
| Zwei weitere BUNDLE20-Ratgeber | Bedingung korrekt genannt bzw. Korb ≥ 80 |
| BUNDLE20 auf 221 Seiten | 5 Treffer, alle **unveröffentlichte** interne Baudokumente |

**Eigener Fehlgriff, der beinahe zum Befund wurde:** Das Muster `4[.,]90` lieferte über alle Seiten und Artikel ~90 Treffer — fast alle sind Produktpreise (14.90 / 24.90 / 44.90 / 94.90). Dieselbe Teilstring-Falle wie «IPL» in «L-IPL-iner». Echte Versandpreis-Aussagen: genau 2. Ebenso: «EDOEB» ohne Umlaut liefert auch in der korrekten Fassung 0 Treffer — der Abwesenheitsbeweis musste mit «EDÖB», «revDSG» und «Eidgenöss» neu geführt werden.

---

## 5. Wo Finder und Skeptiker sich widersprachen

| Befund | Finder | Skeptiker | Gültig | Grund |
|---|---:|---:|---:|---|
| Lieferdatum Wochentag | 44'100 (hoch) | 43'733 (mittel) | **43'733** | Bänder-Zählung: 46'894 aktiv − 3'161 Ausnahme-Zweige |
| Liechtenstein | 3 | 13 | **13** | SHIPPING_POLICY (4 Treffer) + REFUND_POLICY + 7 Seiten fehlten |
| Zwei AGB | 2 | 4 | **4** | `/pages/agb-luxestyle` + `/pages/terms-en`, beide veröffentlicht |
| ODR-Plattform | 1 | 3 | **3** | dieselben zwei verwaisten Seiten |
| FAQ CHF 4.90 | 3 | 4 | **4** | `/pages/faq-en` mit identischer Falschaussage |
| BUNDLE20 | 4 Ratgeber | 3 | **3** | Finder nannte selbst nur 3 URLs; 2 weitere Artikel sind korrekt |
| Bearbeitungszeit | «zweimal im Shop» | 5 Aussagen / 3 Orte | **3 Orte** | `/pages/tracking` nennt 1-3 Tage zweimal |
| WELCOME10 im Korb | 1 (hoch) | 0 | **0** | Mindestmenge 2; 6/7 Bestellungen hatten 1 Artikel |
| Black Friday Bundle | 1 (hoch) | 0 | **0** | Bundle ist DRAFT → 404 |

Sechs von neun Zahlen des Finders waren **zu niedrig**, zwei Befunde ganz falsch. Die Untertreibungen entstanden durchweg dadurch, dass nur die verlinkten Seiten geprüft wurden — die verwaisten, aber veröffentlichten Altseiten aus der Mai-Aufbauphase (`agb-luxestyle`, `terms-en`, `faq-luxestyle`, `faq-en`, `versand-deutschland`) sind ein eigener Fundort, der in keinem Menü steht und trotzdem indexierbar ist.

---

## 6. Was dieser Lauf NICHT geprüft hat

- **Der letzte Befund kam ohne Skeptiker-Urteil an.** «Vier Gratis-Versand-Schwellen gleichzeitig aktiv» (Zone Domestic: 7.00 / ≥65 / ≥50 inaktiv / ≥45 aktiv; dazu Automatikrabatt ab 49 und `SCHWELLE=5000` in `layout/theme.liquid`) ist **ungeprüft**. Die Finder-Belege sehen belastbar aus, aber CLAUDE.md warnt ausdrücklich, dass 45 = 50 × 0,9 **Absicht** ist. Nicht anfassen, bevor jemand das gegengeprüft hat.
- **Die Dimension «eigene Motoren»** (Wächter-Code, Startlisten, Ledger, Sicherheit) lieferte keine eigenständigen Befunde. Die drei Motoren-Funde oben (`seiten_versandtext.py`-Anker, `pages(first:100)`, fehlender Rechtstext-Wächter) fielen nebenbei an. Eine systematische Durchsicht der Startlisten und Ledger steht aus.
- **Der Checkout selbst** wurde nie betreten — ohne Bestellvorgang. Dass Shopify dort `/policies/terms-of-service` verlinkt, ist die kanonische Adresse, aber **nicht gemessen**.
- **Externe Absender** (Klaviyo, Social-Bios, Rechnungen) — dort lebt laut CLAUDE.md die tote Domain `luxestyle.com.co` weiter. Nicht Teil dieses Laufs.
- **Ob `/pages/terms-en` und `/pages/agb-luxestyle` irgendwo verlinkt sind**, wurde nicht geklärt — beide sind veröffentlicht und damit erreichbar, das genügte für die Befunde.
- **Das Theme wurde nicht einzeln nach Datenschutzaussagen durchsucht** (nur die gerenderte Seite per WebFetch).
- **Keine Mutation, kein Commit** — alles ausschliesslich lesend.

---

## Abarbeitungsstand (24.08.2026)

| Befund | Stand |
|---|---|
| BUNDLE20-Ratgeber | ✅ 2 Reststellen korrigiert (2 waren live schon sauber) |
| FAQ CHF 4.90 / LAUNCH30 / DE-AT-Zusagen | ✅ beide Seiten auf die kanonischen Aussagen |
| Wächter-Lücken (faq-Anker, Paginierung) | ✅ beide Quellen repariert |
| Datenschutz ohne Staat (China) | ✅ Abschnitt in /policies/privacy-policy, WebFetch-verifiziert |
| Footer-Links auf Policy-Fassungen | ✅ (war beim Schreiben schon umgehängt — anderer Lauf) |
| EU-ODR-Verweise | ✅ agb-luxestyle + terms-en; Impressum war schon sauber; Wächter `veraltete_verweise.py` neu |
| «24 Stunden»-Zusage Produktseite | ✅ auf «1–3 Werktage, in den Lieferzeiten enthalten» |
| Versandseiten-Fussnote (1-3 Tage vs. 1–2 Gesamtzeit) | ⛔ Änderung vom Betreiber abgelehnt — nicht angefasst |
| Wochentag im Lieferdatum | ✅ bereits im Theme gefixt (parallele Session, Sa+2/So+1) |
| 4 AGB-Fassungen | ⏸️ Betreiber: konsolidieren oder Scope write_legal_policies |
| Liechtenstein (13 Texte vs. Checkout) | ⏸️ Betreiber: LI dem Markt hinzufügen ist die bessere Reparatur |
