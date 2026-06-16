# 🌐 Domain & `.com.co` — kompletter Klär- & Fix-Plan (2026-06-16)

> **Befund (live via Shopify-MCP geprüft):** Shopify-**Primärdomain = `https://luxestyle.ch`** (SSL aktiv) ✅.
> Die Produkt-/Feed-URLs sind also korrekt `.ch` → **kein Google-Merchant-Blocker** (Entwarnung).
> `luxestyle.com.co` ist ein **Alt-Domain-Rest**, der nur noch in Klaviyo + Kundenkonto-Subdomain auftaucht.
> Diese Settings sind **nur in der UI** änderbar (nicht per API) — darum diese Anleitung.

## 🥇 PRIO 1 — Klaviyo (echter Conversion-Leak, ~2 Min)
Alle E-Mail-Links (Warenkorb-Abbruch, Welcome …) zeigen sonst auf die falsche Domain → 0 Conversion aus E-Mail.
1. **klaviyo.com/settings/account** → **Kontaktinformationen / Contact information**
2. **Website-URL:** `https://luxestyle.com.co` → **`https://luxestyle.ch`**
3. **Währung / Preferred currency:** `USD` → **`CHF`**
4. Speichern.

## 🥈 PRIO 2 — Shopify Kundenkonto-Domain (Trust, ~3 Min)
Die Kundenkonto-Links zeigen auf `account.luxestyle.com.co`.
1. Shopify-Admin → **Einstellungen → Domains**.
2. Prüfen, welche Domains verbunden sind. **`luxestyle.ch` = Primär** (ist korrekt).
3. Falls **`luxestyle.com.co`** noch verbunden ist und du sie NICHT brauchst:
   - Entweder **als Weiterleitung auf `luxestyle.ch`** setzen (Redirect), oder **entfernen**.
   - ⚠️ Vorher sicher sein, dass keine aktive Werbung/Links auf `.com.co` laufen (sonst erst Redirect, nicht löschen).
4. Einstellungen → **Kundenkonten**: falls dort eine `.com.co`-Subdomain hinterlegt ist → auf `.ch` umstellen/entfernen.
   (Nach Entfernen der `.com.co`-Domain fallen die Konto-Links automatisch auf die Primärdomain zurück.)

## 🥉 PRIO 3 — Shop-Kontakt-E-Mail (Konsistenz, ~1 Min)
Aktuell `allengchour@gmail.com`.
1. Shopify-Admin → **Einstellungen → Allgemein → Shop-Kontakt-E-Mail** (Store contact email)
   → auf **`info@luxestyle.ch`** ändern (Absender-Mail kann separat bleiben; wichtig ist die kundenseitige Konsistenz).
   *(Account-/Login-E-Mail darf privat bleiben — nur die Kontakt-/Absender-Adresse soll `info@luxestyle.ch` sein.)*

## ✅ Was schon stimmt (nichts zu tun)
- Storefront-Primärdomain `luxestyle.ch` + SSL ✅
- Google-Feed-Produkt-URLs = `.ch` ✅ (Merchant-Genehmigung nicht durch `.com.co` gefährdet)
- Alle 7 Shop-Policies konsistent `info@luxestyle.ch` ✅ (gestern gefixt)

## 🔭 Warum `.com.co` überhaupt da war (Vermutung)
Wahrscheinlich war `luxestyle.com.co` mal die erste/Test-Domain, bevor auf `luxestyle.ch` migriert wurde. Storefront wurde umgestellt, aber Klaviyo (synct die alte URL einmalig) + die Kundenkonto-Subdomain blieben auf dem Alt-Wert hängen. Reine UI-Bereinigung, kein Code-Problem.
