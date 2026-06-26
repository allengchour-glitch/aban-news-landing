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
