<!-- Vertiefung zu dropship/VIDEO-ADS-PAID-READINESS.md — NICHT duplizieren, sondern operativ machen. -->

# Video-Ads Paid VERTIEFT — operative Schritt-für-Schritt-Mappe

> **Zweck:** Ergänzt `VIDEO-ADS-PAID-READINESS.md` (Creative-Anatomie, grobes Setup, Benchmarks)
> um die **Klick-für-Klick-Ebene**: exakte UI-Reihenfolge, Pixel/CAPI-Gates, Entscheidungsbäume,
> UTM-Strings, Routinen. Readiness = *was & warum*, dieses Doc = *wie genau, in welcher Reihenfolge*.
>
> **Marken-Regeln (gelten überall, nicht wiederholt):** Produkt echt (KI nur Bewegung/Mood), kein
> Voiceover, Musik `automation/music/luxe-premium.wav`; nur ≥4★-Produkte; **nie** das 3,54★-Sommerkleid;
> TikTok-Pixel `D8EKVR3C77U6KT5BTBD0`; Auto-Smart/GMV-Max-Kampagnen AUS; **20 CHF/Tag = Lerngeld**, kein
> Skalierbudget.
>
> **Die eine Wahrheit, die alles darunter bestimmt:** 20 CHF/Tag (~600 CHF/Monat, ~22 $/Tag) liegt
> **unter der Lernphasen-Schwelle beider Plattformen** (≈50 Optimierungs-Events / 7 Tage pro Ad-Group/
> Ad-Set). Auf **Kauf** zu optimieren ist bei diesem Budget mathematisch unmöglich → wir optimieren auf
> ein **Mid-Funnel-Event (Add to Cart)** und entscheiden über **Creative-Signale (Hook/Hold/CTR)** plus
> **Shopify-Bestellungen**, nicht über Plattform-ROAS.

---

## 1. TikTok-Setup — Schritt für Schritt (operativ)

### 1.0 Reihenfolge zwingend: Business Center ZUERST, dann Ad-Account darin
`business.tiktok.com` → Business Center anlegen → **darin** Ad-Account (nicht umgekehrt).
BC → **Assets → Advertiser Accounts → Add → Create New**.

**Bei Erstellung fix & danach UNVERÄNDERLICH** (falsch = kompletter Neu-Account nötig):

| Feld | Wert LuxeStyle |
|---|---|
| Region | **Switzerland** |
| Currency | **CHF** |
| Timezone | **(UTC+01:00) Europe/Zurich** |

Vor „Create" **dreimal** prüfen: CHF + Europe/Zurich.

### 1.1 GATE (kein Schritt 6): Pixel + Events API VOR dem ersten Franken
Ohne funktionierenden Pixel optimiert TikTok das Conversion-Ziel nicht sauber. LuxeStyle hat Pixel
`D8EKVR3C77U6KT5BTBD0` (Shopify-verbunden). **Events API nicht manuell coden** — sie kommt über Shopify:

1. Shopify → TikTok-Sales-Channel-App → **Settings → Data Sharing → „Advanced" (Maximum)**.
   Das schaltet die **server-seitige Events API** automatisch scharf + **Advanced Matching** (gehashte
   E-Mail/Telefon → +15–25 % Match-Quality/EMQ).
2. Verifizieren im **Events Manager**: Assets → Events → Web Events → Pixel `D8EKVR…` → Overview.
   **Spalte „Event Source" muss neben `Browser` auch `Events API`** zeigen — für **ViewContent +
   AddToCart + Purchase**. Nur `Browser` = Server-Tracking fehlt → Attribution bricht bei iOS/AdBlock weg.
3. **Test Events**-Tab: Test-Event-Code kopieren → auf luxestyle.ch echten Add-to-Cart + Test-Checkout
   auslösen → Events müssen **live** im Panel erscheinen.
4. **Diagnostics-Tab** grün: keine fehlenden Parameter, Dedup Browser↔API über `event_id` sauber.
5. Chrome **TikTok Pixel Helper** als Gegencheck.

**Checkliste vor Spend:** [ ] Advanced Data Sharing AN · [ ] 3 Events kommen doppelt (Browser+API) ·
[ ] Test-Event live gesehen · [ ] Diagnostics ohne Warnung.

### 1.2 Auto-Smart-Kampagnen AUS (Marken-Regel + Memory-Fall)
Die TikTok-Shopify-App erzeugt automatisch **weltweite „Smart"/GMV-Max-Kampagnen** (= das frühere
weltweite Ring-Budget-Leck). Im Ads Manager finden → **pausieren/löschen**. Beim Neuanlegen bewusst
**„Manual campaign"** wählen. Nur **EINE** saubere manuelle Kampagne aktiv halten.

### 1.3 Kampagne anlegen (Klickpfad)
Ads Manager → Campaign → **+ Create** →
- **Objective:** Kategorie **„Conversions" / „Website sales"** (früher „Website conversions").
- **Modus:** **Manual campaign** (NICHT Smart+ — das ist die Auto-Blackbox).
- **Campaign name:** `LS-CH-WebConv-Sommer-2026`.
- **Special ad category:** None (Mode ist keine Sonderkategorie).
- **CBO (Campaign budget optimization):** **AUS** (funktioniert nicht mit nur 1 Adgroup).
- **Split test:** AUS.

### 1.4 Adgroup anlegen (Felder in UI-Reihenfolge)
1. **Optimization Location = Website** → Pixel `D8EKVR3C77U6KT5BTBD0` wählen.
2. **Placement:** „Select placement" → **NUR TikTok** anhaken. **Pangle, Global App Bundle,
   News-Feed-Apps AUS** (sonst Junk-Impressions ausserhalb TikTok, verzerrt CPM/CTR).
   **Automatic Creative Optimization (ACO) = AUS** bei handverlesenen Reels/Spark.
3. **Targeting:**
   - Location = **Switzerland**
   - Language = **German + French** (CH-Realität; Ad-Sprache muss zur akzeptierten Zielsprache passen)
   - Gender = **Female**
   - Age = **18-24 + 25-34** (deckt den CH-Kern: ~2,78 Mio TikTok-User, 62 % weiblich, grösste
     Gruppe 25–34, dann 18–24)
   - Interests = **Fashion / Apparel & Accessories / Beauty**; Behaviors = Fashion-Video-Interaktionen
   - Audience-Size-Anzeige rechts im Blick behalten (nicht zu eng).
4. **Budget & Schedule:** Daily budget **20 CHF** (Adgroup-Minimum offiziell 20 $-Äquiv.). Run
   continuously. Dayparting erst später.
5. **Bidding & Optimization:** siehe 1.5.

### 1.5 Optimierungs-Event bei 0 Daten — der eigentliche Kern
Lernphase = ~50 optimierte Conversions / 7 Tage (endet früh ab ~25). Rechnung ehrlich:

- **Purchase** bei angenommenem CPA 15 CHF → 50/Woche = **~105 CHF/Tag nötig** → mit 20 CHF **unmöglich**,
  Delivery bleibt teuer/instabil, Lerngeld verbrannt ohne Signal.
- **Add to Cart** bei CPA ~1–3 CHF → 7–20 ATC/Tag mit 20 CHF **machbar** → Lernphase erreichbar.

**Leiter:** Kaltstart optional `Click`/`ViewContent` (viel Volumen, low-intent) → sobald ATC-Volumen da
ist **`Add to Cart`** (offizielle TikTok-Empfehlung als 1. E-Commerce-Event) → erst nach ~50 Käufen/Woche
auf **`Complete Payment`**. Event-Wechsel = **neue Adgroup** (sauber) oder akzeptierte Relearning-Phase.

- **Bid strategy = Lowest Cost** (KEIN Cost Cap bei 0 Historie; Cost Cap braucht CPA-Ziel + ~10× CPA
  Tagesbudget, stottert sonst — erst nach 50–100 Conversions).
- **Attribution window:** Standard 7-Tage-Klick / 1-Tag-View prüfen.

**Konkret Kaltstart-Adgroup:** Optimization location = Website · Pixel `D8EKVR…` · Placement = TikTok
only · ACO = OFF · CH · DE+FR · Female · 18-34 · Interests Fashion · **20 CHF/Tag** · **Lowest Cost** ·
**Optimization event = Add to Cart**.

### 1.6 Spark Ads (nativer Trust) vs. In-Feed-Upload
**Musik-Falle zuerst:** Bei **Spark Ads** gilt die Musik des **organischen** Posts → geschützte Musik =
Copyright-/Delivery-Warnung. Unsere Reels haben `luxe-premium.wav` eingebettet → **sicherer Weg =
In-Feed-Video-Upload** (`file_video_ad_upload`), dann ist die .wav Teil des Videos = unkritisch. Spark nur
für organische Posts, deren Sound clean/lizenzfrei ist.

**Spark-Auth-Flow (falls doch, z. B. eigener Business-Post):**
- Creator-Seite: Post → ⋯ → **Ad settings → Ad authorization = ON** → Duration (7/30/60/365 Tage) →
  **Generate code → Copy** (Voraussetzung: Account-Settings → Ad Settings → Ad authorization generell erlaubt).
- Advertiser-Seite: **Tools → Creative Assets → Spark Ads posts → Apply for Authorization** → Code →
  Search → **Link**. Ad-Ebene: **Identity ON + „Post authorized by account"** → Publish.
- Für den **eigenen** Shop-Account braucht man keinen Fremdcode — eigenen Business-Account direkt als
  Identity verlinken (behält organische Likes/Comments → besserer Trust).

### 1.7 Messfenster / nicht anfassen
Nicht täglich urteilen. Min. **3–7 Tage** bzw. bis **25–50 Events**, keine Edits — jede Budget-/Targeting-/
Event-Änderung triggert **Relearning** (50-Conversion-Uhr startet neu).

---

## 2. Meta-Setup — Schritt für Schritt

> **Kontext-Realität 2025/26:** Meta hat den nativen IG/FB-Checkout eingestellt → Meta ist wieder reine
> **Discovery-/Traffic-Maschine** zum Shop. Liefert intent-ärmeren Traffic als Suche/Pinterest → der Hebel
> ist **Pixel-Signal + Retargeting**, nicht Reichweite. Meta braucht seinen **eigenen** Pixel/Dataset
> (getrennt vom TikTok-Pixel).

### 2.1 Fundament (der 1 Klick, der 90 % erledigt)
Shopify → **Einstellungen → Apps und Vertriebskanäle → „Facebook & Instagram" (Meta)** installieren →
Business Manager + Ad-Account + Meta-Pixel verbinden → **„Datenfreigabe für Kundendaten" = „Maximum"**.

Effekt automatisch, **ohne eigenen Code**: Pixel (Browser) **+ Conversions API** (Shopify-Server →
Meta-Server, ad-blocker-/iOS-resistent) **+ Event-Deduplizierung** (gleiche `event_name` + `event_id`).
Kein eigener CAPI-Endpoint, kein GTM-Server, kein Access-Token-Basteln. Advanced Matching (E-Mail/
Telefon/Name/Ort gehasht) hebt EMQ.

⚠️ **Nicht** parallel manuell CAPI senden → Dedup bricht bei uneinheitlicher `event_id`/Casing.

### 2.2 Event-Qualität (EMQ) prüfen — Gate vor Spend
Events Manager → Datenquelle (Pixel) → Übersicht → **Event Match Quality (0–10)** pro Event.
Zielwerte 2026: **Purchase 8,8–9,3 · AddToCart ≥ 8,0 · Grund-Benchmark ~6**. Testkauf am Handy →
sehe ich Purchase/AddToCart/ViewContent mit EMQ > 7 in Echtzeit? „Maximum" hebt EMQ.

### 2.3 Domain-Verifizierung (nötig für Ownership/Custom-Conversions)
Business Settings → **Brand Safety & Suitability → Domains → luxestyle.ch** hinzufügen → Methode
**DNS-TXT** (bei Shopify-Custom-Domain sauberer als Meta-Tag/HTML-Upload). Meta liefert
`facebook-domain-verification=…` → beim **.ch-Provider** als TXT auf Host **`@`** → „Verify".
**luxestyle.ch verifizieren, NICHT die myshopify.com-Domain.**

### 2.4 AEM 2025 — veraltete Guides ignorieren
Seit **Juni 2025** hat Meta das **8-Event-Limit + manuelles Event-Ranking abgeschafft** → alle
berechtigten Web-Events werden **auto-aggregiert**. **Nichts manuell konfigurieren.** Nur Domain
verifizieren + Events feuern lassen. Alte „8 Events sortieren"-Anleitungen = Zeitverschwendung.

### 2.5 Kampagnen-Entscheidung: NICHT Advantage+ Sales (ASC) starten
Gründe bei 20 CHF/Tag: (a) ASC erwartet **~50× Ziel-CPA/Tag** (real 100–200 $) für die Lernphase;
(b) ASC erlaubt **kein** Alter/Geschlecht/Interessen-Targeting (nur Land), keinen Placement-Ausschluss,
keinen Bestandskunden-Ausschluss; (c) Signal reicht nicht.

→ **EINE manuelle Sales-Kampagne:**
- Ziel = **Umsatz/Sales**
- **Advantage Campaign Budget (CBO) = AN**, **20 CHF/Tag**
- **1 Ad-Set** (max. 2) — jeder weitere teilt die 140 CHF/Woche und killt die Lernphase
- **Conversion-Ereignis = „Add to Cart"** (NICHT Purchase — 50 Käufe/Woche = CPA 2,80 CHF = unmöglich;
  50 ATC ≈ Kosten/ATC 2,80 CHF = machbar; notfalls ViewContent, um aus „Learning Limited" zu kommen)
- Standort = **Schweiz** · Sprachen **DE + FR**
- **Advantage+ Audience** mit **Vorschlägen** (Frauen 18–34, Mode/Schmuck/Sonnenbrillen als *Hinweis*,
  Meta darf erweitern)
- **Advantage+ Placements = AN** (mehr Auslieferung fürs Geld)
- **3–5 Creatives** (KI-Bewegungs-Reels, kein Voiceover, `luxe-premium.wav`), nur ≥4★
  (Slim Wallet 5,0★, Herrenuhr 5,0★, Jade Roller 5,0★, Bali 4,93★, Ibiza 4,47★).

### 2.6 DPA / Advantage+ Catalog (Retargeting) — Phase 2, NICHT jetzt
Voraussetzung = Katalog (über Shopify-Meta-Kanal auto-synchronisiert, Bilder ≥ 1080×1080, saubere
Titel/Preise). **Erst einschalten, wenn warme Audience existiert** (ViewContent/AddToCart-Pixel-Pool).
Dann separate Sales-Kampagne → Katalog → Zielgruppe **Retargeting** (ViewContent/ATC letzte 14–30 Tage,
nicht gekauft). Günstigster, höchst-konvertierender Hebel. **Ehrlich: Bei aktuell 0 ATC/30 T sind die
RT-Pools LEER** → erst muss der Cold-Test Klicks + ATC erzeugen. Prospecting-DPA erst bei deutlich
höherem Budget.

### 2.7 Meta-Budget-Abfolge
- **Phase 1 (Woche 1–2, ~20 CHF/Tag):** manuelle Sales-Kampagne, Optimierung **AddToCart**, broad CH →
  Signal sammeln, EMQ + ATC-Rate beobachten.
- **Phase 2:** warme Audience > ~1000 → kleine **DPA-Retargeting-Kampagne** (5–8 CHF/Tag) = meist erster
  echter ROAS.
- **Phase 3:** erst wenn Käufe regelmässig → Optimierung auf **Purchase** + Budget **+10–20 % alle
  3–4 Tage** (nie verdoppeln — resettet Lernphase).

---

## 3. Test- & Scaling-Matrix (konkrete Zahlen + Entscheidungsbaum)

### 3.1 Prinzip bei Mini-Budget
Bei < ~150 CHF Gesamtspend erreichst du **nie** 50 Conversions → **CPA/ROAS = statistisches Rauschen →
NIE als Kill-Kriterium.** Entscheide auf **Creative-Signalen** (Hook/Hold ab ~1.000–2.000 Impr.,
CTR/CPC ab ~2.000–3.000), die schon in 1–2 Tagen aussagekräftig sind.

**Struktur:** 1 Kampagne (**ABO**, nicht CBO — CBO verteilt ohne Conversion-Volumen zufällig) → 1 Adgroup
(**broad**: CH, w, 18-45, DE+FR, keine Interest-Stacks — broad schlägt Interests bei Dropship) →
**3–4 Ads** gleichzeitig (bei 10 bekommt jedes nur ~2 CHF = keine Impressionen; bei 3–4 je ~5–7 CHF =
genug Views für ein Urteil).

### 3.2 Matrix-Achsen (eine Variable pro Runde)
- **Achse 1 HOOK** (erste 3 s, macht ~80 % der Performance): Preis-Anker · Problem/Lösung · Vorher-Nachher · Review-Zitat
- **Achse 2 BODY/ANGLE:** Produkt-Demo · Lifestyle-Mood · Trust/Gratis-Versand-CH
- **Achse 3 FORMAT:** Ken-Burns-Foto · KI-Bewegung (Kling/Veo) · echter Model-Clip

**Runde 1:** 1 Body + 3–4 **Hooks** (Hook zuerst). **Runde 2:** Gewinner-Hook fix, 3 neue Bodies.

### 3.3 Namenskonvention (mappt 1:1 auf `reels_seed.csv` / `render_premium_reel.sh` slug)
`[YYYYMMDD]_[produktslug]_[hook]_[format]_v[NN]`
Kürzel: `hookPreis` / `hookProblem` / `hookVorNach` / `hookReview` · `kiKling` / `kiVeo` / `kenburns` /
`modelclip`. **Identisch** als TikTok/Meta-Ad-Name UND Datei-Slug → `reel-analytics.mjs` kann
Hook-Performance aggregieren (`learned_pools.sh`-Prinzip).
Beispiel: `20260705_kleid-bali_hookPreis_kiKling_v01`.

### 3.4 Kill/Scale-Schwellen (TikTok 2026, ausdrucken)

| Metrik | KILL | OK / solide | SCALE |
|---|---|---|---|
| **Hook-Rate** (3-s-Views/Impr.) | < 25 % | 30–39 % | ≥ 40 % |
| **Hold-Rate** (bis Ende) | < 20 % | 40–55 % | > 60 % |
| **CTR** | < 0,5 % @ 3.000 Impr. | ~1 % | > 1 % |
| **CPC** | > ~1,50 CHF + schwache CTR | — | niedrig + gute CTR |
| **CPA/ROAS** | **IGNORIEREN** als Kill-Grund < ~150 CHF Spend | — | — |

Anker: TikTok-Hook-Rate-Schnitt 30,7 %, Top-Quartil 40–45 %. TikTok-CTR-Schnitt 1,77 %, **Apparel nur
0,69 %**. Meta-Äquivalent: Thumbstop-Rate > 30 %, Link-CTR > 1 %; Kill bei 1,5× Breakeven-CPA nach
100–150 $ (bei 20 CHF/Tag = 6–9 Tage → lieber ebenfalls auf Hook/CTR entscheiden).

### 3.5 Entscheidungsbaum (nach 3–5 Tagen, pro Creative)
1. **Hook-Rate < 25 %?** → **KILL** (Opener tot, Rest egal).
2. **Hook ≥ 30 % ABER Hold < 20 %?** → Body reparieren: gleicher Hook, neuer Body (Runde 2).
3. **Hook ≥ 30 % UND Hold ≥ 40 % UND CTR > 1 %?** → **WINNER:** Budget +20 %/48 h; parallel Hook fix +
   3 neue Bodies.
4. **Hook ok, CTR < 0,5 % @ 3.000 Impr.?** → CTA/Angebot/Endcard schwach → CTA-Iteration.
5. **Alle 4 unter Schwelle?** → Konzept verwerfen, neues Hook-Set — **NICHT** Budget erhöhen.

### 3.6 Scaling-Treppe (nur bei Winner + externem Kaufsignal in Shopify)
- **Vertikal:** +20 %/48 h solange Signal hält (aggressiv 20–30 %/Woche wenn ROAS 2 Wochen über Ziel;
  Stopp bei ROAS-Abfall > 15 %).
- **Horizontal (bevorzugt ab Winner):** Adgroup **duplizieren** statt Budget verdreifachen —
  „Verdoppeln auf 3×-ROAS hält selten 3×".
- **ABO → CBO** erst wenn (a) klarer Winner UND (b) Gesamtbudget realistisch **> ~80–100 CHF/Tag**.
  Hybrid: Test in ABO → Winner in neue CBO-Skalier-Kampagne duplizieren.

### 3.7 Fatigue & Kadenz (Foxwell: dein Spend-Level = 1 neu/Monat + Iterationen)
TikTok-Winner hält ~7–10 Tage. Frequenz-Signal: CPM steigt + Hook/CTR fällt > 15–20 % ggü. Peak → neue
Iteration. **Batch realistisch: 3–4 Videos/Runde, ~4–6/Monat, Qualität > Menge** (deckt Memory-Regel
„nicht mehr Masse"). Retargeting-Layer (Video-Viewers 25/50/75 %, ATC 7 T) **erst wenn Pixel-Events da
sind** — aktuell leer.

---

## 4. Messung & Optimierungs-Routine

### 4.1 Drei-Quellen-Rollenverteilung (fest verdrahten)
| Quelle | Rolle | NICHT dafür nutzen |
|---|---|---|
| **Shopify-Analytics** | **einzige Geld-Wahrheit** (Orders bei Payment-Capture) | — |
| **Plattform-Pixel** (TikTok/Meta) | **nur** Algorithmus-Fütterung + Creative-Diagnose | Geld-KPI (View-Through/iOS aufgebläht) |
| **GA4** | Traffic-**Qualität** + Bot-Diagnose | Umsatz-Wahrheit |

**Diskrepanz ist strukturell & permanent:** ~20 % der Shopify-Orders fehlen in GA4 (Shop Pay/Apple Pay/
PayPal überspringen die Thank-You-Seite). **10–30 % Gap normal, < 15 % = gut.** Nicht versuchen, die drei
zur Deckung zu bringen — Zeitverschwendung.

### 4.2 UTM-Struktur (die eigentliche Attribution-Rettung)
**Regeln:** alles **lowercase**, keine Leerzeichen, `-`/`_`; **`utm_medium=cpc`** (NICHT `paid`, NICHT
`social` — sonst verschmilzt bezahlt mit organisch social und ist nicht trennbar). Konsistente Schreibweise
(`tiktok`, nie `TikTok`/`Tiktok` → sonst 3 Daten-Silos).

**TikTok Tracking-URL** (Ads Manager → Ad → Tracking-URL; Macros vor Livegang in TikTok-Hilfe prüfen):
```
https://luxestyle.ch/products/DEIN-PRODUKT?utm_source=tiktok&utm_medium=cpc&utm_campaign=tt_sommer_conversion&utm_content=__CID_NAME__&utm_term=__AID_NAME__
```
`__CID_NAME__` = Ad-Name, `__AID_NAME__` = Adgroup-Name (TikTok-Macros) → jede Order erscheint in Shopify
mit exaktem Ad.

**Meta Tracking-URL:**
```
?utm_source={{site_source_name}}&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{ad.name}}
```

### 4.3 KPI je Funnelstufe + Diagnose-Kette
| Stufe | Metrik | Quelle |
|---|---|---|
| Impression→Hook | Hook-Rate | Pixel |
| Hook→Hold | Hold-Rate | Pixel |
| Klick | CTR / CPC | Pixel |
| Landing-Qualität | Engagement-Rate / Ø-Session-Dauer / Bounce | GA4 |
| ATC | Add-to-Cart-Rate | **Shopify** |
| Checkout→Kauf | CVR / Orders / CAC | **NUR Shopify** |

**Diagnose:** schlechte Hook/Hold = **Creative**-Problem · gute CTR aber miese Session-Dauer = **Junk/
Targeting** · guter Traffic aber 0 ATC = **Angebot/Preis/Trust im Shop** · ATC aber kein Kauf =
**Checkout/Versandkosten/Zahlungs-Reibung**.

### 4.4 Bot-/Junk-Traffic erkennen (LuxeStyle: ~60 % direct = mutmasslich Bot)
Warnsignale: Session-Dauer < 10 s, 0 Folge-Pageviews, Bounce ~100 %, direct-Spike ohne paid/organic-
Anstieg, Total Users >> Active Users, Nacht-Traffic aus unerwarteten Ländern.
Massnahmen: GA4 → Admin → Data Streams → Configure Tag Settings → **Define Internal Traffic** (verdächtige
IPs als „bot") → Data Filter aktivieren. Report „Traffic acquisition" → Direct → Ø Engagement Time prüfen.
Für Ads: **Placement nur TikTok-Feed** (Pangle/Audience-Network raus = Hauptquelle Junk-Klicks).

### 4.5 Tägliche Routine (max. 10 Min, in Lernphase KEINE Änderungen)
1. **Spend-Kontrolle:** hat gestern das Tagesbudget ausgeliefert? (sonst Bid/Targeting zu eng)
2. **Delivery-Status:** Active / in Review / limitiert?
3. **Shopify:** kamen Orders mit `utm_source=tiktok`/`meta`? (**einzige tägliche Geld-Frage**)
4. **GA4-Bot-Sichtung:** plötzlicher direct-Spike ohne paid-Anstieg?
**NICHT:** Creatives/Budget/Targeting täglich anfassen; an Tag-1–3-Daten entscheiden; auf Pixel-ROAS reagieren.

### 4.6 Wöchentliche Routine (30–45 Min, fixer Wochentag)
Fenster „Letzte 7 Tage" + „30 Tage" + Vergleich Vorwoche. Von oben nach unten durch den Funnel:
(a) Creative: Hook/Hold/CTR je Ad → Loser raus. (b) GA4: Session-Dauer/Engagement je `utm_content` →
Junk-Segmente. (c) Shopify: Orders, CAC, ATC-Rate. (d) **EINE Änderung pro Woche** ableiten (Creative
ODER Budget ODER Targeting — nie mehrere gleichzeitig, sonst kein Lernen).

**Log-Empfehlung** `dropship/ads/optim-log.csv`: `datum,ebene(creative|budget|targeting),was,hypothese,ergebnis_nach_7d`.

### 4.7 Attributions-Realität (keine Fehlschlüsse)
Klick-Attribution > View-Through (VTC auf iOS/ATT weitgehend unverifizierbar/aufgebläht → nur direktional).
Fenster driften: TikTok/Meta 7-Tage-Klick/1-Tag-View, GA4 last-click. Bei 20 CHF/Tag = Plattform-ROAS
Rauschen → **Attribution über saubere UTMs + Shopify-Orders + simple Vorher/Nachher-Umsatzbetrachtung**
(Holdout/Geo-Tests zu komplex für diese Grösse). Erst ab ~10 Klicks/Tag lohnt Auswertung; 2–4 Wochen
einplanen, bevor geurteilt wird.

---

## 5. Reihenfolge WENN die 3 User-Klicks gesetzt sind + Verbote

**Voraussetzung (nur der User kann):** (1) AGB/Domain sauber · (2) **TikTok-Pixel scharf** (Advanced Data
Sharing) · (3) Conversion-Kampagne + Budget freigeben. Ohne die bleibt Paid Lerngeld ohne Fundament.

### Reihenfolge (abhakbar)
1. [ ] **Pixel-Gate grün** (§1.1): 3 Events doppelt (Browser+API), Test-Event live, Diagnostics ok.
2. [ ] **Auto-Smart/GMV-Max-Kampagnen gelöscht** (§1.2).
3. [ ] **Ad-Account-Fixwerte** verifiziert: CHF + Europe/Zurich (§1.0).
4. [ ] **UTMs** an allen Ad-URLs (`utm_medium=cpc`, lowercase) (§4.2).
5. [ ] **TikTok: 1 manuelle Kampagne** (§1.3) → **1 Adgroup**, Placement TikTok-only, CH/DE+FR/Female/
   18-34, **Lowest Cost**, **Optimization = Add to Cart**, **20 CHF/Tag** (§1.4–1.5).
6. [ ] **3–4 In-Feed-Reels** (≥4★, `luxe-premium.wav`, Namenskonvention §3.3) hochladen; 1 Body + 3–4 Hooks.
7. [ ] **3–5 Tage laufen lassen, NICHTS anfassen** (§1.7).
8. [ ] **Wöchentlicher Termin** (§4.6) → Entscheidungsbaum (§3.5) → **eine** Änderung.
9. [ ] Sobald ATC-Volumen stabil: neue Adgroup mit **Complete Payment** (§1.5).
10. [ ] Sobald warme Pixel-Pools (> ~1000): **Retargeting/DPA** (Meta §2.6 / TikTok Warm-Layer §3.7).
11. [ ] (Optional parallel) **Meta** identisch aufbauen (§2), auch Optimierung AddToCart.

### VERBOTE (teuer gelernt)
- ❌ Auf **Complete Payment / Purchase** optimieren bei 0 Käufen + Kleinbudget → Dauer-Lernphase, Geld verbrannt.
- ❌ **Smart+/GMV-Max/ASC** oder Shopify-Auto-Smart laufen lassen → weltweite Junk-Impressions.
- ❌ **CPA/ROAS** als Kill-Kriterium bei < ~150 CHF Spend → Rauschen; auf Hook/Hold/CTR entscheiden.
- ❌ **Pangle / Global App Bundle / Audience-Network** Placement → Junk-Klicks.
- ❌ **Datenfreigabe „Standard"** (nur Browser-Pixel) → iOS/AdBlock fressen Events. Muss „Maximum"/„Advanced".
- ❌ **> 3–4 Creatives** oder **mehrere Adgroups/Ad-Sets** bei 20 CHF → Budget zersplittert, keine Lernschwelle.
- ❌ **CBO** im Test bei Mini-Budget → verteilt zufällig, verhungert Rest. **ABO** testen.
- ❌ Budget/Targeting/Event **während Lernphase** ändern oder Adgroup pausieren → Relearning-Reset.
- ❌ **Cost Cap** bei 0 Historie → Delivery stottert. Erst **Lowest Cost**.
- ❌ **Nach 1–3 Tagen** urteilen → Attributionsfenster + 25–50 Events abwarten.
- ❌ **Retargeting/DPA jetzt** → Pools leer (0 ATC/30 T). Erst Cold-Test muss Events erzeugen.
- ❌ **utm_medium=paid/social** statt `cpc`, Uppercase-UTMs → Attribution kaputt/Silos.
- ❌ **< 4★-Produkte / 3,54★-Sommerkleid** bewerben → verbranntes Budget + Trust-Schaden.
- ❌ Spark Ad mit **geschützter Musik** → Copyright-Warnung. Eigene Reels als **In-Feed-Upload**.
- ❌ Falsche **Domain** (myshopify.com) verifizieren → nutzlos; nur `luxestyle.ch`.
- ❌ **Eigenen CAPI** neben Shopify-Kanal bauen → Dedup bricht.

### Ehrliche Schlusswahrheit
20 CHF/Tag optimiert das **Creative** und sammelt **Mid-Funnel-Signal** — es kauft keine profitable
Skalierung. Der Kern-Engpass bleibt **Traffic-Qualität + Trust + Kaufabsicht**. Diese Mappe holt aus dem
Lerngeld das Maximum an Erkenntnis; echte Umsatz-Skalierung braucht danach entweder ein grösseres Budget
auf einem bewiesenen Winner **oder** intent-starke Gratis-Kanäle (Pinterest) parallel.

---

## 6. Quellen (Auswahl, 2025/2026)
- TikTok Ads Help — Best practices new E-comm Web Conversion (ATC als 1. Event; 30 $/20 $ Budget): `ads.tiktok.com/help/article/best-practices-for-new-e-commerce-web-conversion-advertisers`
- TikTok Ads Help — Learning Phase (~50/7 T, Edits vermeiden): `ads.tiktok.com/help/article/learning-phase`
- TikTok Ads Help — Bidding / Budgets / CBO / Spark Ads / Pixel-Setup: `ads.tiktok.com/help/article/{bidding-strategies, about-daily-budgets, campaign-budget-optimization, spark-ads-creation-guide, get-started-pixel}`
- TikTok Events API for Shopify 2026 (Advanced Data Sharing → Events API auto): trackbee.io, weltpixel.com
- TikTok Usage CH 2025 (~2,78 Mio, 62 % w, 25–34 grösste): onlinekarma.ch
- Meta: Advantage+ Sales/ASC-Budget ~50× CPA: bir.ch, marpipe.com; Learning Phase 50/Woche: usewonderful.com, facebook.com/business/help/112167992830700
- Meta AEM Juni 2025 (8-Event abgeschafft): conversios.io · Shopify Data Sharing Standard/Enhanced/Maximum + Dedup: help.shopify.com · EMQ-Zielwerte: dataally.ai
- Benchmarks/Testing: triplewhale.com (TikTok/Apparel), getkoro.app (Hook 30,7 %), heylect.com (Hold), motionapp.com, roaspig.com, foxwelldigital.com (Kadenz), stackmatix.com (Budget-Minima), emplicit.co/admanage.ai (Scaling)
- Messung/Attribution: nofluff.in, weltpixel.com (GA4↔Shopify-Gap), shopify.com/blog/utm-parameters, cometly.com, twominutereports.com (TikTok-Benchmarks), specificityinc.com/1solutions.biz (Bot-GA4), adlibrary.com (iOS-ATT/VTC)

---
**Querverweise:** `VIDEO-ADS-PAID-READINESS.md` (Creative-Anatomie, Test-Framework-Basis) ·
`VIDEO-KI-PIPELINE-VORBEREITUNG.md` (Reel-Produktion) · `VIDEO-PRAEFERENZEN.md` (kein Voiceover,
luxe-premium.wav) · `AUTONOMER-MODUS.md` §10 (3 User-Klicks) · CLAUDE.md-Stand (Engpass = Traffic-Qualität).
