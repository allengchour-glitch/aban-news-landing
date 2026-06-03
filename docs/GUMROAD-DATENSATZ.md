# Gumroad — KI-Tools-Datensatz verkaufen (Schritt für Schritt)

> **Ziel:** Den fertigen Datensatz (CSV + JSON, 326 Tools) auf **Gumroad** stellen
> und den Verkaufs-Link bekommen. Gumroad ist Merchant of Record → kümmert sich um
> Zahlung **und** EU-MwSt automatisch. Du brauchst nur ein Gumroad-Konto.
>
> Wenn du den Link hast → **gib ihn mir im Chat**, ich trage ihn in
> `ki-tools-datensatz.html` ein (`DATENSATZ_BUY_URL`) und pushe. Fertig.

## Die Datei zum Hochladen
Du hast sie im Chat bekommen: **`ki-tools-datensatz-gumroad.zip`** (enthält
`ki-tools-dach-voll.csv`, `…voll.json`, `…sample.csv`, `LIESMICH.txt`).

## Schritte in Gumroad
1. **gumroad.com** → einloggen → **Products → New product**.
2. Typ: **Digital product**. Name: `KI-Tools-Datensatz DACH (CSV & JSON) — 326 Tools`.
3. **Preis:** `19` (Währung EUR; Gumroad rechnet für Käufer um). Optional „pay what you
   want" mit Mindestpreis 19 — ich würde **Festpreis 19** nehmen, klarer.
4. **Datei hochladen:** `ki-tools-datensatz-gumroad.zip`.
5. **Beschreibung:** den Block unten 1:1 einfügen.
6. **Cover/Thumbnail** (optional): wenn du eins willst, sag Bescheid — ich kann ein
   schlichtes on-brand Bild bauen. Ohne geht auch.
7. **URL/Permalink:** z. B. `ki-tools-dach` → Link wird `gumroad.com/l/ki-tools-dach`.
8. **Settings → Tax:** Gumroad als Merchant of Record macht die MwSt automatisch —
   nichts weiter nötig. (Dein Steuer-/Auszahlungs-Profil einmal ausfüllen, falls neu.)
9. **Publish.** Den **Share-Link** kopieren (`https://…gumroad.com/l/…`).
10. **Link mir im Chat geben** → ich schalte den Kauf-Button live.

## Produkt-Beschreibung (1:1 einfügen)

```
KI-Tools-Datensatz DACH — 326 Tools, sauber strukturiert

Eine kuratierte Liste von 326 KI-Tools mit DACH-Blick. Als CSV und JSON, sofort
nutzbar in Excel, Google Sheets, Notion, Airtable oder im eigenen Code.

Was drin ist:
• 326 Tools aus allen Bereichen (Buchhaltung, Video, Voice, Newsletter, Chatbots,
  Automatisierung, Musik, Lifestyle u. v. m.)
• Spalten: Name, Bereich(e), EU-Hosting (ja/nein/unbekannt), offizielle URL
• 53 Tools mit bestätigtem EU-Hosting markiert — praktisch für DSGVO-Themen
• Beide Formate: ki-tools-dach-voll.csv und ki-tools-dach-voll.json

Ehrlich gesagt:
Die Daten sind von Hand kuratiert, keine erfundenen Bewertungen oder Preise. Wo etwas
nicht sicher belegt ist, steht „unbekannt" statt einer Behauptung. Jede Zeile hat die
offizielle URL zum Selber-Prüfen. Anbieter-Angaben können sich ändern — Stand laufend.

Lizenz: Einzelplatz-Nutzung. Keine Weiterverbreitung oder Weiterverkauf des Datensatzes
als Ganzes.

Gratis-Probe (30 Tools) liegt bei, falls du erst reinschauen willst.
```

## Danach (mache ich)
- `DATENSATZ_BUY_URL` in `ki-tools-datensatz.html` setzen → Button „Jetzt kaufen" zeigt
  auf Gumroad statt auf den Mail-Fallback.
- Hinweistext von „Lemon Squeezy" auf „Gumroad" angepasst (schon erledigt).
- Board #3 + #4 auf erledigt.

## Daten aktualisieren (später)
`cd daten-produkt && python3 generate_datensatz.py` → neue `dist/…voll.csv|json`.
Neu zippen, in Gumroad die Datei ersetzen — Käufer bekommen das Update.
```
