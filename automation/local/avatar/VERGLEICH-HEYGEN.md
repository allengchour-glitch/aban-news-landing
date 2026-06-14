# ⚖️ Vergleich: SadTalker (self-hosted) vs. HeyGen (Cloud)

Gleiches **Test-Skript** für beide → fairer Vergleich.

## 📝 Standard-Test-Skript (Bärndütsch)
> „Hoi zäme! Bi LuxeStyle findsch Premium-Mode us de Schwiz — fair im Priis, gäu?
>  Lueg mau verbii, mit em Code WELCOME zäh git's zäh Prozänt. Bis bald!"

Beide Outputs danach durch dasselbe 9:16-Finish (Hook oben, CTA in Safe-Zone) → fair vergleichbar.

## 🆚 So testest du beide
| | **SadTalker (self-hosted)** | **HeyGen (Cloud)** |
|---|---|---|
| Lauf | PC (NVIDIA-GPU), `MACHE-AVATAR.bat` | Cloud-API, `heygen_video.mjs` |
| Braucht | presenter.jpg + Setup (1×) | **HEYGEN_API_KEY** (Gratis-Tier) |
| Kosten | **0 €, unbegrenzt** | Gratis-Tier limitiert (Credits/Monat, evtl. Watermark); kommerziell = Bezahl-Plan |
| Stimme | piper (deutsch gefärbt) | HeyGen-Stimmen (sehr natürlich), dt. Stimmen vorhanden |
| Qualität | gut, leicht „KI" | meist höher/glatter |
| Daten | bleibt lokal | geht in die Cloud |

## 🔑 HeyGen-Key holen (Handy reicht, 2 Min)
1. **heygen.com** → kostenlos registrieren.
2. Avatar/Profil → **Settings → API** → **API Key** kopieren.
3. Key mir hier in den Chat geben (transient, wie damals der Luma-Key) ODER als Secret `HEYGEN_API_KEY`.
   → Dann generiere ich die HeyGen-Version **sofort aus der Cloud** (kein GPU nötig) mit obigem Skript.

## ▶️ Ablauf des Vergleichs
1. **HeyGen-Version (jetzt machbar):** du gibst Key → ich laufe `heygen_video.mjs "<Skript>"` → Video-URL → 9:16-Finish → schick's dir.
2. **SadTalker-Version (am PC):** `MACHE-AVATAR.bat` mit demselben Skript → `reels/avatar-*.mp4`.
3. **Du entscheidest:** welches sieht besser aus / klingt authentischer / ist den Aufwand wert.
   - Faustregel: HeyGen = schneller/glatter, aber Abo für kommerziell. SadTalker = gratis/unbegrenzt, etwas mehr Pflege.

## 💡 Empfehlung vorab
Für **Dauerbetrieb eines Shops** ist self-hosted (SadTalker, gratis/unbegrenzt) langfristig günstiger. HeyGen lohnt,
wenn dir Top-Qualität + null Setup wichtiger sind als die monatlichen Kosten. Der Vergleich zeigt dir, ob der
Qualitätsunterschied den Preis wert ist.
