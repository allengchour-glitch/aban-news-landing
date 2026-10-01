# Pinterest-Autopilot abannews

Postet täglich 2 Pins auf die Gratis-Rechner von abannews.com. Dort sitzen die Kauf-Knöpfe
(Mietzins-Paket, Hochzeits-Budget, Budget-Plan, Schulden-Plan). Workflow: `.github/workflows/pinterest-aban.yml`,
1× pro Tag 09:17 UTC.

## Was ein Lauf macht

1. Schlüssel erneuern (Pinterest gibt bei neuen Apps alle paar Wochen einen neuen Erneuerungs-Schlüssel aus;
   der Lauf speichert ihn verschlüsselt in `data/pinterest-aban-token.enc`, AES-256-GCM, Schlüssel aus dem App-Secret).
2. Boards anlegen, falls sie fehlen (`pool.json` → `boards`).
3. **Lernen:** Klicks, Speicherungen und Impressionen der Pins, die 7–60 Tage alt sind. Themen mit vielen Klicks
   kommen öfter dran, pro KI-Quelle wird mitgezählt, wessen Texte besser laufen (`data/pinterest-aban.json` → `scores`, `quellen`).
4. **Auswahl:** gewichtet nach `gewicht` × Lernfaktor; Themen der letzten 3 Tage werden gebremst.
5. **Text:** Gemini und ChatGPT abwechselnd, der andere springt ein. Jeder Text muss den **Fakten-Prüfer** bestehen:
   nur Zahlen aus den `fakten`, keine Hype-Wörter, keine Emojis, Pinterest-Längen. Sonst: Vorlage ohne KI.
6. **Bild** 1000 × 1500: 4 Layouts im Wechsel (Frage, Zahl, Liste, Foto). Beim Foto-Layout macht Gemini den
   Hintergrund; der Pin wird bei Pinterest als `AI_MODIFIED` gekennzeichnet.
7. Pin mit UTM-Link (`utm_source=pinterest&utm_campaign=<thema>&utm_content=<layout>`).

## Einmal einrichten (nur du)

1. **Pinterest-Business-Konto** (kostenlos) für abannews, nicht das LuxeStyle-Konto.
2. **App anlegen:** developers.pinterest.com → My apps → Connect app. Redirect-URI:
   `https://abannews.com/api/pinterest-callback`. App-ID und App-Secret kopieren.
3. **GitHub-Secrets:** `ABAN_PINTEREST_APP_ID`, `ABAN_PINTEREST_APP_SECRET`. Der nächste Deploy überträgt sie ins
   Cloudflare-Projekt (für die Anmeldeseite).
4. **Trial → Standard:** Neue Apps haben zuerst *Trial access*, Pins sind dann nur in der Sandbox und nur für dich
   sichtbar. Für öffentliche Pins verlangt Pinterest ein Demo-Video:
   - Auf der App-Seite einen Sandbox-Token erzeugen → Secret `ABAN_PINTEREST_SANDBOX_TOKEN`.
   - Actions → „Pinterest-Autopilot abannews“ → `sandbox` anhaken → starten, dabei den Bildschirm aufnehmen
     (Workflow läuft, danach die Pins im Pinterest-Profil zeigen). Video bei Pinterest einreichen.
5. Nach der Freigabe: `https://abannews.com/api/pinterest-auth` öffnen → erlauben → Schlüssel als Secret
   `ABAN_PINTEREST_REFRESH_TOKEN` speichern. Ab dann läuft alles täglich von selbst.

Optional: `GEMINI_API_KEY`, `OPENAI_API_KEY` (beide gesetzt = Wechsel; keiner = Vorlagen ohne KI-Foto).

## Pflege

- Neues Thema: Eintrag in `pool.json` mit **geprüften** Fakten von der Zielseite. Nie Zahlen eintragen, die dort
  nicht stehen. `bildzahl` nur, wenn sie wörtlich in den Fakten vorkommt.
- Tests: `node automation/pinterest_aban/test_autopilot.mjs` (Prüfer mit Gegenproben, ganzer Lauf gegen nachgebaute
  Server für Pinterest, Gemini und ChatGPT).
- Probelauf lokal: `DRY_RUN=1 OUT=/tmp/pins node automation/pinterest_aban/autopilot.mjs` → Bilder ansehen.
