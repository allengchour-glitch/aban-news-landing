# Morgen-To-Do (nur DU) — Stand 2026-06-08

> Alles Code-seitige ist gebaut & gemergt. Hier stehen nur die Schritte, die **ein
> Konto/Login** brauchen (kann ich nicht). Reihenfolge = Wirkung. Danach macht der
> Rest die Maschine (Sync/Workflows). Zeit gesamt: ~15 Min.

## 🔴 1. Cloudflare-Token reparieren — der eine Hebel für ALLES (~3 Min)
Ohne ihn geht **nichts** öffentlich live (Deploy hängt: Auth-Fehler 10000).
- dash.cloudflare.com → Profil → **API Tokens**
- Token mit Rechten **Account › Cloudflare Pages › Edit** + **Account › Account Settings › Read**
- als Repo-Secret **`CLOUDFLARE_API_TOKEN`** setzen → Deploy läuft, alle Seiten gehen live.

## 🟡 2. Lemon-Squeezy: Monitor-Produkt anlegen (~2 Min) → treibt den Branchen-Funnel
- app.lemonsqueezy.com → **New Product → Subscription**
- Name **enthält „Monitor"** · Preis **9 €/Monat** · **Publish**
- Dann mir **„sync"** sagen → ich verdrahte den Link automatisch (Button live auf Monitor- + 5 Branchen-Seiten).

## 🟢 3. (optional) Weitere LS-Produkte (~je 2 Min)
Paket (29 € einmalig) · Datensatz-Abo (9 €/M) · Vorlagen-Set (19 €) → anlegen, dann „sync".

## 🟢 4. Affiliate scharfschalten (~5 Min)
Writesonic-Freigabe prüfen (oder Jasper `jasper.ai/partners`) → **Link an mich**.
Ich: `abanctl wire-affiliate ki-tools-radar <tool> <link>` → live.

## 🟢 5. Webbaukasten-Radar deployen (~3 Min, Browser)
dash → Pages → Connect Git → Build `cd webbaukasten-radar && python generate.py`,
Output `webbaukasten-radar/dist`, Domain `webbaukasten.abannews.com`.

---
**Schon erledigt (musst du nicht):** ElevenLabs (`XI`) + Pexels-Secrets gesetzt → Reels rendern
mit Stimme + Footage. Gumroad-Datensatz + Buch + Premium + 5 Starter-Kits sind live verdrahtet.

**Status jederzeit sehen:** `python3 tools/abanctl.py status`
