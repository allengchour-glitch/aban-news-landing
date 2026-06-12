# 🇨🇭 Schweizer-Follower-Maschine — echte CH-Follower auf IG + TikTok

> Ziel: **echte** Schweizer Follower (NIE gekauft, NIE Fakes). Funktioniert über gezieltes
> Folgen + Liken genau der Zielgruppe, die unter CH-Hashtags postet. Wenn Profil + Content
> stimmen (Bio/Bild sind poliert), folgt ein guter Teil zurück.
>
> **Warum Browser statt API?** Instagram & TikTok haben **keine** Follow-/Such-API. Wachstum
> geht nur über die eingeloggte Web-Session → läuft auf deinem **immer laufenden PC-Claude**
> (Brave, Port 9222). **Du tippst kein PowerShell** — du sagst dem PC-Claude eine Zeile.

## So startest du es (kein PowerShell nötig)
Sag deinem **PC-Claude** einfach:
> „Hol Schweizer Follower" → er führt `automation/local/ch-follower-growth.mjs` aus.

Oder manuell (falls du doch willst), im Ordner mit der Datei:
```
npm install playwright-core      # einmalig
node ch-follower-growth.mjs       # IG + TikTok, Tageslimit
node ch-follower-growth.mjs --dry # Trockenlauf (klickt nichts)
node ch-follower-growth.mjs instagram   # nur eine Plattform
```

## Was es tut (und was bewusst NICHT)
- ✅ Öffnet CH-Hashtags (**#schweizmode #ootdschweiz #zürichstyle #swissmade #bern #berncity …** IG ·
  **#schweiz #fypschweiz #swisstiktok #bern …** TikTok), liked 1–2 aktuelle Beiträge und **folgt** dem Profil.
- ✅ **Idempotent:** schon kontaktierte Handles in `ch-growth-ledger.txt` → nie doppelt.
- ✅ **Sicher gegen Sperren:** harte Tages-Caps (IG 40 / TikTok 30), zufällige Pausen 25–70 s, Stopp sobald
  ein „Action blocked"-Banner auftaucht.
- ❌ **Keine** automatischen Kommentare (häufigster Bann-Grund), **kein** Massen-Spam, **kein** Follower-Kauf.

## Tempo & Erwartung
- **1× pro Tag** laufen lassen = stetig & sicher. Lieber wenig & dauerhaft als ein Strohfeuer.
- Caps anpassbar per Env: `IG_FOLLOWS=25 TT_FOLLOWS=20 node ch-follower-growth.mjs`.
- Realistisch: ein Teil folgt zurück; nach 1–2 Wochen die nicht-zurückfolgenden wieder entfolgen
  (separater Schritt, kann ich bauen, wenn gewünscht).

## Seed-Accounts (optional, stärker)
Noch gezielter wird es, wenn man die **aktiven Liker bekannter CH-Mode-/Lifestyle-Profile** anspricht.
Trag deren Handles (ohne @) in `IG_SEED_ACCOUNTS` im Skript ein — z. B. CH-Mode-Boutiquen oder
Micro-Influencer, deren Publikum genau unsere Wunschkund:innen sind.

## Verankert
Diese Methode + die Autonomie-Regel (IG/TikTok = nur PC-Claude-Browser, alles andere autonom via
Secrets/Actions + Handy-Widget) stehen in `CLAUDE.md` unter **Stand / 2026-06-12**.
