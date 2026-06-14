# ⚖️ Rechtstexte & Policies — Status + Lessons (LuxeStyle)

**Stand 2026-06-14** — alle Änderungen live via Shopify-MCP (kein Repo-Code, daher hier dokumentiert).

## 🔑 WICHTIGSTE LESSON (damit nächste Session es per API selbst kann)
Die **Checkout-Richtlinien** (Settings → Richtlinien: Kontakt, Impressum/Legal Notice, Versand, AGB,
Rückerstattung, Datenschutz) sind per GraphQL editierbar über die Mutation **`shopPolicyUpdate`**
(`ShopPolicyInput { type: ShopPolicyType, body: String }`, types: `REFUND_POLICY`, `SHIPPING_POLICY`,
`PRIVACY_POLICY`, `TERMS_OF_SERVICE`, `LEGAL_NOTICE`, `CONTACT_INFORMATION`, …).

**ABER:** Der aktuelle Shopify-MCP-Token hat den Scope **`write_legal_policies` NICHT** →
`shopPolicyUpdate` liefert `Access denied … Required access: write_legal_policies access scope.`
→ **User muss die Shopify-MCP-Verbindung einmal mit diesem Scope neu autorisieren.** Danach kann
die nächste Session die Policies **vollautonom** setzen (kein Copy-Paste durch den User mehr nötig).

Die **Footer-Seiten** (`/pages/agb`, `/pages/impressum`, `/pages/widerruf`, `/pages/datenschutz`) sind
dagegen normale **Pages** → mit `pageUpdate` **frei editierbar** (kein Sonder-Scope). Diese sind erledigt.

## ✅ Erledigt (2026-06-14, live)
- **„High-End · Luxus" entfernt** (passt nicht zu fairem CH-Shop):
  - Collection `luxus-highend` → Titel **„💎 Premium-Auswahl"** (Handle unverändert, SEO/Description entschärft).
  - Hauptmenü-Item „✨ High-End" → **„💎 Premium"** (menuUpdate, ganze Struktur erhalten).
- **Kontakt-E-Mail überall `info@luxestyle.ch`** (vorher allengchour@gmail.com / hello@luxestyle.ch):
  - Pages **Impressum, AGB, Widerruf** umgestellt (live).
- **AGB-Seite:** „Gratis-Versand ab **CHF 50**" → **CHF 65** (war Widerspruch zum Rest des Shops); Datum + Kontakt aktualisiert.
- **Widerruf-Seite:** neue Dropship-Retouren-Logik:
  - Defekt/falsch → Foto an info@ → **Erstattung/Ersatz meist OHNE Rücksendung**.
  - Echter Widerruf → Kunde meldet sich → Retourenadresse **individuell** (CJ-Lager, nichts fix gedruckt).
  - **Hinweis ergänzt:** „Impressum-Adresse ist KEINE Retourenadresse — nichts unaufgefordert dorthin."
    → so kommt **kein Paket zur Privatadresse** des Users (User-Wunsch 2026-06-14).
- **Adresse:** User ist ok damit, dass die Belp-Adresse im Impressum steht (kein Virtual-Office nötig);
  nur **Pakete** sollen nicht hinkommen → über „erst melden"-Logik gelöst.

## 🟡 Vom User manuell gemacht (weil Scope fehlte)
- **Checkout-Policies** (Rückerstattung, Kontakt, Impressum, Versand, AGB) hat der User am 2026-06-14
  per Copy-Paste auf `info@luxestyle.ch` / CHF 65 / ohne Platzhalter aktualisiert (fertige Texte geliefert).
  → Nächstes Mal per `shopPolicyUpdate` selbst, sobald der Scope da ist (siehe oben).

## ℹ️ Bekannte Defekte, die behoben wurden
- Refund-Policy hatte Platzhalter `[RÜCKSENDEADRESSE EINFÜGEN]` + „Telefon: info@luxestyle.com" (E-Mail im Telefonfeld).
- Widerruf-Page nutzte unmonitortes `hello@luxestyle.ch`.
- Inkonsistenter Gratis-Versand-Schwellwert (CHF 50 vs. 65).
