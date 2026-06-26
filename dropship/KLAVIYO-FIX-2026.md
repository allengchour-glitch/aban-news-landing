# 📧 Klaviyo Fix-Liste (LIVE per API verifiziert 2026-06-26) — Conversion-kritisch

> Engpass = verlorene Checkouts kommen nicht zurück. Account-ID `XWqMAD`. Flows kann die API nur LESEN →
> diese Fixes macht der User (oder ChatGPT/Theme-Session) **1× in der Klaviyo-UI**. Alles unten ist verifizierte Realität.

## 🔴 A) Account-Einstellungen falsch (Settings → Account)
- **Website-URL = `https://luxestyle.com.co`** ❌ → muss **`https://luxestyle.ch`** (kolumbianische Domain drin = Links/Branding/Deliverability falsch).
- **Währung = USD** ❌ → **CHF** (Umsatz-Reporting + Preis-Anzeigen falsch).
- **Industry = leer** ❌ → setzen (z. B. „Apparel & Accessories" / „Jewelry") — hilft Zustellbarkeit/Benchmarks.
- ✅ Absender „LuxeStyle CH" + `info@luxestyle.ch` = korrekt (der alte „Aban"-Fehler ist weg).

## 🔴 B) Abandoned-Checkout-Flow `Vse76a` (live) — die wichtigste Sache
- E1 nach **1 h** = live ✅ · E2 nach **24 h** = live ✅ · **E3 nach 48 h = DRAFT** ❌
  → **E3 auf „Live" setzen** (öffnen → Status Live). Das ist der fehlende 3. Recovery-Touch (oft 10–20 % der Recovery-Umsätze).
- **Smart Sending AUS** für alle 3 Mails (sonst wird die Mail unterdrückt, wenn der Kontakt kürzlich was anderes bekam → Recovery verpufft).
- Timing 1 h / 24 h / 48 h ist gut — so lassen.

## 🔴 C) Doppelte + EN/US-Flows aufräumen (für STRIKT-CH-Hochdeutsch-Shop)
Mehrere konkurrierende Flows laufen parallel → Kunde kriegt evtl. mehrere/englische Mails:
- **3× Welcome live:** „Welcome Series" · „Welcome Series · EN/US" · „E-Mail Welcome-Serie" → **EINE deutsche behalten** (E-Mail Welcome-Serie), Rest **archivieren**.
- **2× Abandoned live:** „Abandoned Checkout" (behalten) + „Abandoned Cart · EN/US" → **EN/US archivieren** (Doppel-Versand-Risiko).
- **2× Win-Back live:** „Win-Back · EN/US" + „At-Risk Win-Back · 15% Off" → eine deutsche behalten, EN/US archivieren.
- **2× Post-Purchase live:** „Post-Purchase Review · EN/US" + „Post-Purchase · Order + Review" → eine deutsche behalten, EN/US archivieren.
- **Junk-Drafts archivieren:** 2× „Essential Flow Recommendation_" (unconfigured), „Birthday · CHF 15 Gift" (unconfigured) — entweder konfigurieren oder archivieren.

> ⚠️ Wir verkaufen STRIKT CH (kein US, kein DE) → **alle „· EN/US"-Flows gehören weg.** Ein deutschsprachiger
> CH-Kunde, der englische Mails kriegt, konvertiert nicht + wirkt unseriös.

## ✅ Reihenfolge (grösster Effekt zuerst)
1. **E3 live + Smart Sending aus** (Abandoned Checkout) — direkter Recovery-Umsatz.
2. **Account: URL→luxestyle.ch, Währung→CHF, Industry setzen.**
3. **EN/US-Doppel-Flows archivieren** (eine deutsche je Typ).
4. (Später) Double-Opt-In prüfen + Browse-Abandonment-Flow ergänzen.

*(Best-Practice-Copy/Timing-Details folgen aus dem laufenden Recherche-Agenten.)*

---

## 📚 Best-Practice (Recherche-Schwarm 2026-06-26, 3 Agenten, quellenbelegt)

### Höchster fehlender Hebel: Review-Request (gegen 0 Reviews!)
- **Post-Purchase Review-Mail 7 Tage NACH LIEFERUNG** (nicht nach Bestellung) = die wichtigste Mail für einen 0-Reviews-Shop. Existiert (Post-Purchase · Order + Review), aber EN/US-Duplikat aufräumen + auf Deutsch + Trigger prüfen.
- **Legal in CH:** Mails an echte Käufer sind durch die **Soft-Opt-in-Ausnahme** (UWG Art. 3(1)(o)) gedeckt — kein separater Marketing-Consent nötig. Foto-Review = kleiner Anreiz ok (kein Fake).

### Abandoned-Recovery-Copy (für NEUE Marke ohne Reviews)
- **Betreff (direkt schlägt clever):** „Dini LuxeStyle-Tasche" / „Hesch öppis vergässe?" (branded/Frage konvertiert am besten; 30–50 Zeichen, Wichtiges zuerst).
- **Trust STATT Rabatt zuerst** (92% misstrauen unbekannten Shops): Geld-zurück/„Gratis zurück innert 30 Täg", Sicher-Checkout-Badge beim Button, **„Versand us de Schwiz"**, Gründer-Story. Rabatt erst in Mail 2/3.
- **Body:** 1 Spalte, dynamischer Warenkorb-Block (Bild/Name/Preis), EINE CTA oben, echter HTML-Text (kein Text-im-Bild), mobil min. 16px.
- **Risk-Reversal:** „Liebe es oder gib's gratis zurück" schlägt „Rückgabe innert 30 Tagen".

### ⚖️ Urgency NUR echt (SECO/Temu-Urteil + EU-DSA = Fake ist ILLEGAL in CH)
- ERLAUBT: echtes Rabattcode-Ablaufdatum, echter Lagerbestand, echtes Sale-Ende.
- VERBOTEN: Fake-Countdown (der resettet), „nur noch wenige!" wenn nicht wahr, „Sie müssen JETZT handeln!" / „Wir bedauern…"-Druck.

### CH-Pflichten (Email + Shop)
- **Email-Text = Hochdeutsch mit „ss" (kein ß, kein Mundart)** — Mundart bleibt im Social-Video.
- **Absender klar nennen + Gratis-Abmeldung** (Pflicht, UWG/BAKOM).
- **Preise CHF inkl. MwSt schon beim Angebot** zeigen (Preisbekanntgabe-Verordnung PBV).
- **TWINT + Kauf-auf-Rechnung** = grösste CH-Trust/Conversion-Hebel (8,5% brechen ab, wenn Zahlart fehlt).

### Smart-Sending (warum E-Mails still verschwinden)
- Default-Fenster **16 h** (Email): wer in 16 h was anderes kriegt, wird **still übersprungen** → bei zeit-kritischen Flows (Abandoned/Welcome) **AUS**. Klaviyos eigene Vorlagen haben es aus, Custom-Flows meist AN.

### Build-Reihenfolge (neue Marke)
1 Welcome · 2 Abandoned Cart · 3 Abandoned Checkout + Browse-Abandonment · 4 Post-Purchase inkl. Review · dann Win-Back/Back-in-Stock.
