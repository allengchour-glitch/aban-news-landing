# 🎯 PIXEL-MASTERY — alles für perfekte Pixel-Beherrschung (LuxeStyle CH)

> Master-Referenz für ALLE Tracking-Pixel. Ziel: jeder Kanal feuert sauber → Conversion-Daten → Ads optimierbar.
> Stand 2026-06-22. Bei jeder Pixel-Änderung HIER nachführen.

## 0. TL;DR — der EINE Hebel
**Alle 4 Pixel sind installiert, feuern aber NICHT — weil sie consent-gesperrt sind (Cookie-Banner).**
**EIN Fix entsperrt ALLE gleichzeitig:** Shopify Admin → **Einstellungen → Kundendatenschutz** → da Shop **CH-only (nicht EU/GDPR)** →
Tracking **ohne Opt-in-Pflicht** zulassen / Consent-Default = „akzeptiert". Danach feuern TikTok + Meta + Google + Pinterest auf einmal.
*(Consent-Mode liegt im Theme/Settings — NICHT per Shopify-Admin-API flippbar. → Theme-Session oder User, 1 Min.)*

## 1. Die 4 Pixel-Kanäle (alle als Shopify-Publication installiert)
| Kanal | Pixel/Tag | Status | Datenfreigabe |
|---|---|---|---|
| **TikTok** | Pixel **`D8EKVR3C77U6KT5BTBD0`** (Shopify-verbunden) | installiert, consent-gated | **MAX → CompletePayment** ✅ gesetzt |
| **Facebook & Instagram (Meta)** | Meta-Pixel (via Kanal-App) | installiert, consent-gated | prüfen (Login nötig) |
| **Google & YouTube** | Google-Tag / GA4 (via Kanal) | installiert, consent-gated | prüfen (Login nötig) |
| **Pinterest** | Pinterest-Tag (via Kanal) | installiert, consent-gated | prüfen (Login nötig) |

## 2. ⚠️ TikTok — Pixel-Hygiene (FEST, teuer gelernt)
- **NUR `D8EKVR3C77U6KT5BTBD0` verwenden** (der einzige Shopify-verbundene).
- **Ignorieren/löschen:** `D8EQE4…` („pix") + `D85BAG…` — Mehrfach-Pixel = verfälschte Daten. (User darf aufräumen: nur D8EKVR behalten.)
- Datenfreigabe in der TikTok-Shopify-App = **Maximum** (teilt bis `CompletePayment`).
- **Pixel ≠ Ads-Konto:** Der Pixel ist eine Sache; das **Werbekonto-Onboarding** (Business-Info CH/CHF/Retail + Zahlungskarte) ist eine ANDERE Baustelle (blockierte früher die Kampagne). Nicht verwechseln.

## 3. Events, die feuern (sollen)
`PageView` → `ViewContent` → `AddToCart` → `InitiateCheckout` → `CompletePayment`.
Sobald Consent gelöst: Kampagne **auf `AddToCart` optimieren** (genug Volumen), später auf `CompletePayment` (braucht ~50 Conversions/Woche).

## 4. Was geht von wo (ehrliche Grenzen)
| Aufgabe | Cloud-Session (ich) | PC-Claude (Brave 9222) | User |
|---|---|---|---|
| Pixel-Kanäle am Shop sehen (publications) | ✅ | ✅ | ✅ |
| Pixel-Details lesen (`webPixel`) | ❌ (kein `read_pixels`-Scope der MCP-App) | – | ✅ Admin |
| Consent-Default flippen | ❌ (nicht per Admin-API) | teils (Theme) | ✅ Settings, 1 Min |
| In Meta/Google/Pinterest Events-Manager **einloggen** | ❌ (kein Browser/Creds) | ✅ (Browser-Login) | ✅ |
| Datenfreigabe pro Kanal prüfen/setzen | ❌ | ✅ (eingeloggt) | ✅ |
| Test-Event/Pixel-Helper verifizieren | ❌ | ✅ | ✅ |

## 5. Verifikation (nach dem Consent-Fix)
1. **TikTok:** TikTok Pixel Helper (Browser-Extension) / Events Manager → feuert `PageView` + `AddToCart`?
2. **Meta:** Events Manager → Test-Events-Tool → Shop öffnen → Events erscheinen?
3. **Google:** Tag Assistant / GA4 Realtime → Sitzung sichtbar?
4. **Pinterest:** Pinterest Tag Helper.
→ Diese Checks brauchen **Browser/Login** = PC-Claude oder User. Aus der Cloud nicht machbar.

## 6. Lehren / Traps
- **Consent ist die Wurzel** von „daten-leer" — nicht ein kaputter Pixel. Erst Consent, dann alles andere.
- **Ein Fix, vier Kanäle:** nicht jeden Pixel einzeln jagen — Consent löst alle.
- **CH ≠ EU:** Schweiz braucht (anders als EU) keine harte Opt-in-Consent-Pflicht → Default „akzeptiert" ist hier vertretbar.
- **Mehrfach-Pixel = Datenmüll:** pro Plattform genau EINEN aktiven Pixel.
- **Cloud-Grenzen respektieren:** ich kann sehen + vorbereiten + routen, aber NICHT in Ad-Dashboards einloggen. Ehrlich benennen statt vortäuschen.

## 7. Offene Schritte (Reihenfolge)
1. 🔴 **Consent-Default** auf „akzeptiert"/CH-ohne-Opt-in (User/Theme, 1 Min) → entsperrt alle 4.
2. 🟡 Pro Kanal **Datenfreigabe = max/aktiv** prüfen (Meta/Google/Pinterest) — PC/User-Login.
3. 🟡 **Verifizieren** (Abschnitt 5) dass Events real feuern.
4. 🟢 TikTok-Doppelpixel `D8EQE4…`/`D85BAG…` löschen (Datenhygiene).
5. 🟢 Kampagne auf `AddToCart` optimieren, sobald Daten fliessen.
