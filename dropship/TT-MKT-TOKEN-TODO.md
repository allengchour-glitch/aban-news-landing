# ✅ TODO: TikTok Marketing-API-Token (`TT_MKT_TOKEN`) holen

> **Wozu?** Mit diesem Token startet die CH-Kampagne **vollautonom & deterministisch** über die API
> (kein fragiler Browser-Bot mehr). Hart auf **70 CHF** gedeckelt. Konto ist schon da & finanziert:
> **Advertiser-ID `7646349875793182738` (LuxeStyle CH Ads)**.
>
> **Ehrlich:** TikTok prüft neue Marketing-API-Apps **2–3 Tage**. Kein Same-Day. (Sandbox geht sofort,
> aber ohne echtes Geld/echten Launch.) Token gehört in `luxe-secrets.ps1` — **NIE ins Repo.**

## Schritt für Schritt (einmalig, ~15 Min + Wartezeit)

- [ ] **1. App anlegen:** [business-api.tiktok.com/portal](https://business-api.tiktok.com/portal) → **My Apps** → **Create New**
- [ ] **2. Scopes ankreuzen:** **Ads Management** + **Creative Management** + **Reporting**
- [ ] **3. Redirect-URL** eintragen: `https://luxestyle.ch/`
- [ ] **4. Speichern** → **`App ID`** und **`Secret`** notieren (Secret geheim halten)
- [ ] **5. Zum Review einreichen** → ⏳ **2–3 Tage warten** auf Freigabe
      *(Solange du wartest: Sandbox-Toggle = sofort testen ohne echtes Geld.)*
- [ ] **6. Nach Freigabe – Konto autorisieren:** die **Authorized-URL** der App öffnen → **LuxeStyle CH Ads
      (`7646349875793182738`)** freigeben → du bekommst einen **`auth_code`** (in der Redirect-URL).
- [ ] **7. Token tauschen:** `POST https://business-api.tiktok.com/open_api/v1.3/oauth2/access_token/`
      mit JSON `{ "app_id": "...", "secret": "...", "auth_code": "..." }` → Antwort enthält **`access_token`** (langlebig).
- [ ] **8. Token speichern (auf dem PC, NICHT ins Repo):** in `C:\Users\<du>\luxe-secrets.ps1` ergänzen:
      ```powershell
      $env:TT_MKT_TOKEN = "DEIN_ACCESS_TOKEN"
      ```
- [ ] **9. Mir Bescheid sagen: „token da"** → ich queue **`campaign-api-go`** → die Kampagne läuft
      automatisch (Traffic · Schweiz · 18-34 · de+fr · Pixel D8EKVR · **70 CHF Cap** · Wasserfest-Reel).

## Was DANN automatisch passiert (ich/der Bot)
`campaign-api-go` → `tiktok-campaign-api.mjs` macht selbst: Kampagne → Video-Upload → Identity → AdGroup
(zeitbegrenzt = harter 70-CHF-Cap) → Ad. Ergebnis in `reports/campaign-api-last-run.json`.
**Test ohne Geld vorher:** `campaign-api-dry` (zeigt nur, was es täte + den Budget-Cap).

## Sicherheit (fest)
- Token **nur** in `luxe-secrets.ps1` / ENV — **nie** committen.
- Budget **70 CHF** (von 350 freigegeben) — **nie** eigenmächtig erhöhen.
- Pasted Tokens nach Gebrauch **rotieren**.

## Schneller Plan B (kein Warten)
Falls du nicht 2-3 Tage warten willst: **manueller 5-Min-Launch** mit exakt dieser Config (steht auch in
SHARED-MEMORY): Objective **Traffic** · Standort **Schweiz** · Alter **18-34** · Sprache **de+fr** ·
Placement **nur TikTok** · Pixel **D8EKVR3C77U6KT5BTBD0** · **Lifetime-Budget 70 CHF** · Creative =
sauberes Wasserfest-/See-Test-Reel · CTA **Shop Now** · Landing `luxestyle.ch/collections/wasserfester-schmuck`.
