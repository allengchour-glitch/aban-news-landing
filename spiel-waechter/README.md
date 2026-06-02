# Spiel-Wächter (Desktop-App)

Eine kleine Desktop-App, die dir hilft, dein **selbst gesetztes Limit** beim
Glücksspiel einzuhalten. Sie überwacht **deine Grenzen — nicht dein Spiel**.

## Was sie macht

- **Verlust-Limit** und **Zeit-Limit** vor der Sitzung festlegen.
- Du buchst jede Runde (Einsatz → Auszahlung). Die App zeigt live:
  - verbleibende Zeit (mit Fortschrittsbalken),
  - verbrauchtes Verlust-Limit,
  - tatsächlichen Saldo,
  - **erwarteten Verlust** aus dem RTP (die ehrliche Mathematik des Hausvorteils).
- **Stopp-Hinweis**, sobald ein Limit erreicht ist.
- **Realitäts-Check** in einstellbarem Intervall.
- **Hilfe-Hotlines** (DE/AT/CH) immer sichtbar.

## Was sie ausdrücklich NICHT macht

- **Keine Gewinn-Tipps.** Es gibt keine Spielweise, die den Hausvorteil dreht.
  Wer das verspricht, verkauft einen Trick.
- **Keine Casino-Anbindung, kein Mitlesen** deines Spiels (das würde gegen die
  AGB lizenzierter Anbieter verstoßen).
- **Kein Netzwerk, kein Tracking.** Alle Daten bleiben über `localStorage` auf
  diesem Gerät; die laufende Sitzung wird beim Beenden gelöscht.

## Starten

```bash
cd spiel-waechter
npm install     # lädt Electron (einmalig)
npm start
```

Getestet mit Node 18+. Die UI ist eine einzelne `index.html` ohne externe
Abhängigkeiten; `main.js` öffnet nur das Fenster (kein Node im Renderer,
`contextIsolation` an, `sandbox` an).

## Hinweis

Diese App ist ein Werkzeug zur Schadensbegrenzung, keine Aufforderung zum
Spielen. Glücksspiel kann süchtig machen — Glücksspiel ab 18.
Hilfe: BZgA 0800 1 372 700 · check-dein-spiel.de
