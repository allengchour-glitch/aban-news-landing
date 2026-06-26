# 🎯 Organic-Traffic-Playbook (nach MoMike Chamberlin, „$100/Tag, 1 Std")

> Quelle: YouTube „How I Make $100/Day Only Working 1 Hour" (MoMike Chamberlin, @MoMikeChamberlin).
> Kernthese, angewandt auf LuxeStyle. **Erstellt autonom 2026-06-26.**

## Die Lehre in 3 Sätzen
1. **EIN klarer „Winning Product"** (hoher Wunsch, löst ein Problem, „Wow"-Effekt, Impuls-Preis,
   im Laden schwer zu kriegen, in 5 Sek. Video zeigbar) — nicht 600 Produkte gleichzeitig pushen.
2. **Gratis-Reichweite über organisches Kurzvideo** (TikTok/Reels), KEIN Ad-Budget nötig zum Start —
   Hook in den ersten 1–2 Sek., Produkt in Aktion, klare Reaktion/Verwandlung.
3. **Der Shop schliesst den Verkauf** (sauberes Produktbild, Trust, Preis, Angebot). „1 Std/Tag" =
   1–3 Clips schneiden + posten; der Rest läuft.

## Warum das GENAU unser Hebel ist
Klaviyo-Diagnose (CLAUDE.md): Bestellungen=0, Checkout=0, **Produktansichten=0** über 90 Tage →
der Engpass ist zu **100 % REICHWEITE**, nicht der (polierte) Shop. MoMikes ganze These ist die
Reichweite-Maschine, die uns fehlt — und die Technik (`reels/` + Autopost `automation/post-next-reel.mjs`)
ist **schon gebaut**. Es fehlt nur frischer Content auf einem klaren Winner + der Post-Klick.

## Unsere 2 Sommer-Winner (Juni 2026, MoMike-Kriterien erfüllt)

### 1) Mobiler Nackenventilator — CHF 16.90 ✅ live & kaufbar
`/products/mobiler-nackenventilator-dein-frischekick-fur-unte-904694`
- ✓ Impuls-Preis (<CHF 20) ✓ saisonal (Hitze/Sommer) ✓ Problem-Löser ✓ in 5 Sek. demonstrierbar
- **Hooks (on-screen Text, KEIN Voiceover):**
  1. „POV: 32 °C im Zug — und dir ist trotzdem kühl 🥶" → Person setzt Fan auf, lächelt.
  2. „Der Sommer-Gadget, den 2026 alle tragen werden." → Close-up Rotor, dann Lifestyle-Shot.
  3. „Klima-Anlage zum Umhängen für CHF 16.90?? 👀" → Hand zeigt Grösse, dann am Hals in Aktion.
- **Caption:** „Hands-free Frische für den Sommer 😮‍💨 Akku-Nackenventilator, leise & den ganzen Tag.
  Nur CHF 16.90 — mit Code WELCOME10 nochmal −10%. Link in Bio 🔗"
- **Hashtags:** `#sommer2026 #gadgets #tiktokmademebuyit #ventilator #hitze #schweiz #fyp #luxestyle`

### 2) Sternenhimmel-Projektor — CHF 23.90 ✅ live & kaufbar
`/products/sternenhimmel-projektor-magische-lichtmomente-erle-996535`
- ✓ Impuls-Preis ✓ visueller „Wow"/satisfying-Effekt (perfekt für Kurzvideo) ✓ Geschenk-tauglich
- **Hooks (on-screen Text):**
  1. „Licht aus … 3 … 2 … 1 …" → harter Cut auf Galaxie-Decke, Beat-Drop.
  2. „Mein Schlafzimmer in eine Galaxie verwandeln für CHF 23.90 🌌"
  3. „Date-Night-Hack, den keiner kennt." → Projektor an, Reaktion des Partners.
- **Caption:** „Dein Zimmer = Galaxie 🌌✨ Sternenhimmel-Projektor mit Fernbedienung & Timer.
  CHF 23.90, Code WELCOME10 −10%. Link in Bio 🔗"
- **Hashtags:** `#roomtransformation #galaxyprojector #aesthetic #tiktokmademebuyit #zimmerdeko #schweiz #fyp`

## Format-Regeln (aus VIDEO-PRAEFERENZEN.md — FEST)
- **9:16**, KEIN Voiceover, **on-screen Text** statt Stimme.
- Musik: energetische Clips → `automation/music/luxe-hype-pro.mp3`; ruhige → `luxe-premium.wav`.
- Hook in den ersten 1–2 Sek. (Bewegung/Frage/Reaktion). 7–15 Sek. ideal.
- Ehrliche Claims (Versand 8–14 Tage, kein „Swiss made"). IG = „Link in Bio", FB = Link ok.

## 🔑 ONLY-USER (das kann die Cloud-Session NICHT)
1. **Posten** (IG/TikTok-Login = User/PC-Claude) ODER **Autopost scharfschalten:** Secret
   `PUBLISH_WEBHOOK_URL` (n8n→IG/TikTok) setzen → `automation/post-next-reel.mjs` fängt die
   `status=ready`-Reihen in `reels_seed.csv` automatisch ab (läuft alle 4 h via GitHub-Action).
2. **Video drehen/schneiden:** In dieser Cloud-Session ist **kein ffmpeg** → Clips macht PC-Claude
   (Browser+Video) oder der User aus den obigen Hook-Skripten. Produktbilder liegen im Shop.
3. (Optional, Reichweite-Boost) kleines TikTok-Spark-Ads-Budget auf den best-performenden Organik-Clip.
