# aban Pro / KI-Studio scharfschalten — Schritt für Schritt

Das **KI-Studio** (`/ki-studio.html`) ist gebaut und live, aber die Live-KI-Tools sind erst aktiv,
wenn **du** 2 Dinge einrichtest (Schritt 3 ist optional fürs Vorab-Testen). Bis dahin zeigt die Seite
ehrlich „Pro-KI noch nicht aktiv".

Reihenfolge: **1 → 2 → (3) → 4**. Dauer ~20–30 Min.

---

## 1) Cloudflare: KI-Schlüssel setzen (macht die Tools live)

Die KI läuft serverseitig in den Pages-Functions — der Schlüssel ist **nie** im Browser.

1. **API-Key holen:** console.anthropic.com → *API Keys* → *Create Key* → kopieren (`sk-ant-…`).
2. Cloudflare-Dashboard → **Workers & Pages** → dein Pages-Projekt (abannews.com).
3. **Settings → Variables and Secrets → Production** → *Add*:
   - Name: `ANTHROPIC_API_KEY`  ·  Type: **Secret**  ·  Wert: dein `sk-ant-…`
4. *(optional, gleiche Stelle, Type „Plaintext"):*
   - `GENERATE_MODEL` = `claude-sonnet-4-6` (Standard)
   - `HYPE_MODEL` = `claude-sonnet-4-6` · `CHAT_MODEL` = `claude-haiku-4-5-20251001`
5. **Deploy abwarten** (neuer Build) — danach antworten `/api/generate`, `/api/chat`,
   `/api/hype-check?action=rewrite` mit echter KI statt 503/Fallback.

> Kostenkontrolle: Es gibt serverseitige Rate-Limits (z. B. /api/generate: 12/Min/IP). Claude läuft nur,
> wenn ein **Pro-Kunde mit gültiger Lizenz** ein Tool nutzt — die Kosten sind durchs Abo gedeckt.

---

## 2) Lemon Squeezy: Pro-Abo mit Lizenzschlüsseln anlegen

Die Tools werden per **Lizenzschlüssel** freigeschaltet (kein Login nötig).

1. Lemon Squeezy → **Products → New Product** → „aban Pro".
2. **Subscription**, zwei Varianten:
   - **€19 / Monat**
   - **€190 / Jahr** (2 Monate gratis)
3. Im Produkt: **License keys → aktivieren** (Toggle „This product generates license keys").
   - Activation limit: z. B. **3** (Laptop/Handy/Büro). „License length" = an die Abolaufzeit koppeln.
4. **Checkout-Links kopieren** (Share/Buy-Link je Variante).
5. In **`js/pay-config.js`** eintragen (leer = Buttons zeigen „Start in Kürze"):
   ```js
   PRO_MONTHLY_URL: "https://abannews.lemonsqueezy.com/buy/…",  // €19/Monat
   PRO_YEARLY_URL:  "https://abannews.lemonsqueezy.com/buy/…",  // €190/Jahr
   ```
   committen → die „aban Pro holen"-Buttons im KI-Studio führen direkt zum Checkout.

> Die Validierung läuft über den öffentlichen LS-Endpoint `licenses/validate` — **kein Store-API-Key im Repo nötig.**

---

## 3) (Optional) Selbst testen, bevor das Produkt online ist

Damit du die Tools vorab ausprobieren kannst, ohne zu kaufen:

1. Cloudflare → Pages-Variables → **`PRO_TEST_KEY`** (Plaintext) = ein beliebiges Geheimwort, z. B. `aban-test-2026`.
2. Auf `/ki-studio.html` oben dieses Wort als „Pro-Schlüssel" einfügen → Tools schalten frei.
3. Vor dem echten Launch `PRO_TEST_KEY` wieder löschen.

---

## 4) Kunden-Ablauf (so funktioniert's dann)

1. Kunde kauft auf `/ki-studio.html` → Lemon-Squeezy-Checkout.
2. Erhält den **Lizenzschlüssel** per E-Mail (LS schickt ihn automatisch).
3. Fügt ihn im KI-Studio oben ein → **freigeschaltet** (Schlüssel bleibt nur in seinem Browser).
4. Nutzt die 4 Tools (Frag-aban Pro, KI-Texte & Fahrpläne, Hype-Umschreiber unbegrenzt, KI-Sichtbarkeits-Check)
   und das aktivierte `ki-werkzeug.html` (Texte mit echter KI).

---

## Was schon erledigt ist (Code, im Repo)

- Seiten `ki-studio.html` + `en/ki-studio.html`, Frontend `js/ki-studio.js`.
- Edge: `functions/_pro.mjs` (Lizenz-Validierung, Cache, `PRO_TEST_KEY`), `api/pro-validate.js`,
  `api/generate.js` (Texte/E-Mail/Fahrplan/Content-Plan/E-Mail-Serie/Übersetzen/Prompt).
- Pro-Gating in `api/hype-check.js` (Claude-Umschreibung) + `api/ki-erwaehnung.js` (KI-Check).
  Die **kostenlosen** Tools bleiben unverändert.
- `ki-werkzeug.html` nutzt mit gültigem Pro-Schlüssel automatisch die echte KI.
- Verlinkt: Nav/Footer, online-tools, founding.html (Upsell), Sitemap.

## Troubleshooting

| Symptom | Ursache | Fix |
|---|---|---|
| Tool sagt „noch nicht aktiv" | `ANTHROPIC_API_KEY` fehlt in Pages | Schritt 1 |
| „Schlüssel ungültig" trotz Kauf | License keys nicht aktiviert / falscher Schlüssel | Schritt 2.3, Schlüssel aus LS-Mail prüfen |
| Buttons „Start in Kürze" | `PRO_*`-Links leer | Schritt 2.5 |
| 429 / „zu viele Anfragen" | Rate-Limit pro IP | kurz warten (Schutz gegen Missbrauch) |
