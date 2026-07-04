# 📧 Klaviyo — VERIFIZIERTER Stand (2026-07-04, via Klaviyo-API gelesen)

> Read-only per MCP gezogen (echte Daten, nicht aus dem Bauch). Flow-Änderungen gehen NICHT per API
> (kein update-flow-Tool) → alles unten sind **User-UI-Klicks**. Priorität nach Wirkung.

## 🚨 #0 KRITISCH (NEU, mit echten Zahlen belegt) — Klaviyo empfängt 0 Shop-Events
Metrik-Aggregate letzte 90 Tage (April–Juni 2026), alle exakt **0**:
- **„Checkout Started"** (Shopify, `XhnJPv`) = 0
- **„Placed Order"** (Shopify, `W7XTVD`) = 0
- **„Viewed Product"** (`W3kDAf`) = 0
- Flow-Report aller Flows (90 T) = leer (0 recipients, 0 conversions).

Bei tausenden Sessions und (laut Shopify-Analytics) abgebrochenen Checkouts ist das **kein Zufall**: die
**Klaviyo↔Shopify-Integration / das Onsite-Tracking sendet keine Events an Klaviyo**. Folge: **JEDER**
verhaltensbasierte Flow (Abandoned Cart, Abandoned Checkout, Browse-Abandonment, Post-Purchase) **feuert nie** —
egal wie gut er eingestellt ist. Die Fixes #1–#3 unten sind erst wirksam, wenn Events wieder fliessen.

**FIX (User, Klaviyo-UI):** Klaviyo → **Integrations → Shopify** öffnen: Status prüfen (verbunden? Fehler?),
ggf. **neu verbinden**, „Sync your Shopify data" / Onsite-Tracking (Web-Feed + Klaviyo-Snippet/Web-Pixel im
Theme) **aktivieren**, danach 24–48 h beobachten ob „Viewed Product"/„Checkout Started" hochzählen. Erst wenn
diese Metriken Events zeigen, lohnen sich die Flow-Detailfixes. (Hängt evtl. mit dem Pixel-Thema zusammen —
Web-Pixel/Consent im Theme.)
⚠️ Ehrlich einordnen: theoretisch könnten es echte 0 Checkouts sein — aber drei unabhängige Metriken über
90 Tage exakt bei 0 bei dem Traffic = sehr starkes Zeichen für einen Tracking-/Integrations-Bruch. Erst
verifizieren (Integrations-Seite), dann handeln.

## 🔴 #1 (NEU, bestätigt) — DOPPEL-VERSAND: CH-Kunden bekommen DE **und** EN E-Mails
- Zwei Flows laufen **live** und triggern auf **demselben Metric** `XhnJPv` mit **identischem** Profil-Filter
  (`W7XTVD count = 0`, d.h. „noch nicht gekauft") und **KEINEM Länder-/Sprach-Filter**:
  - **„Abandoned Checkout"** (`Vse76a`, Deutsch) — live
  - **„Abandoned Cart · EN/US"** (`UXEjv2`, Englisch) — live
- Folge: **Jeder** Warenkorb-Abbrecher (auch Schweizer) landet in BEIDEN → kriegt deutsche UND englische
  Abbruch-Mails. Für einen strikt-CH-Shop verwirrend/unprofessionell und verwässert genau die Conversion,
  die wir brauchen.
- **FIX (1 Klick):** EN/US-Flow `UXEjv2` **pausieren** (US-Markt ist eh noch deaktiviert). Klaviyo → Flows →
  „Abandoned Cart · EN/US" → Status auf **Draft/Manual** stellen. Erst reaktivieren, wenn US/UK live geht
  (dann mit Länder-Filter auf beiden Flows: CH-Flow nur CH, EN-Flow nur nicht-DACH).

## 🟡 #2 — CH-Flow „Abandoned Checkout" (`Vse76a`): 3 Absender-/Setting-Fehler
Alle 3 Mails geprüft. Klaviyo → Flows → „Abandoned Checkout":
1. **Absender-Name „Aban"** bei **E-Mail 1 + 2** (E3 ist schon „LuxeStyle CH"). Konto-Default ist zwar korrekt
   „LuxeStyle CH", aber diese zwei Mails überschreiben ihn hart. → in E1 + E2 Absender auf **LuxeStyle CH** ändern.
2. **Reply-To = allengchour@gmail.com** bei E1 + E2 (privat, unprofessionell). → auf **info@luxestyle.ch**
   setzen oder leeren (nutzt dann Default).
3. **Smart-Sending = AN** bei allen 3. Für zeitkritische Abbruch-Mails empfohlen **AUS** (sonst wird die Mail
   unterdrückt, falls der Kontakt im Fenster eine andere Mail bekam). → in jeder der 3 Mails abschalten.

## 🟡 #3 — E-Mail 3 ist unfertig (`WNFHjV`, Status DRAFT)
- Betreff = Platzhalter **„Email #3 Subject"**, Preview leer. → entweder echten Betreff/Text schreiben und
  **aktivieren** (mehr Touchpoints = mehr Recovery), ODER die Draft-Mail entfernen. Aktuell tut sie nichts.
- Timing ok: E1 sofort, E2 nach ~24 h. (Die 1-Tag-Verzögerung liegt hinter E3 → greift erst, wenn E3 live ist.)

## ℹ️ Kontext
- **Absender am Konto ist korrekt** „LuxeStyle CH" / info@luxestyle.ch (das alte „Aban"-Problem ist auf Konto-Ebene
  behoben — nur die zwei Flow-Mails oben hängen noch).
- **Konto-Währung = USD** (Klaviyo-Anzeige) — für CHF-Shop kosmetisch, bei Gelegenheit auf CHF (Settings → Account).
- Andere Flows live und sauber: Welcome-Serie, Win-Back, Post-Purchase-Review, VIP. Drafts (Birthday, Essential-Reco)
  sind bewusst inaktiv.

## Owner
Alles **NUR User** (Klaviyo-UI). Cloud/API kann Flows nur lesen, nicht ändern. Reihenfolge: #1 (1 Klick, sofort) → #2 → #3.
