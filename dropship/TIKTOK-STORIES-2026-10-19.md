# «tiktok stories verbessern» — was geht, was nicht, was geändert wurde (19.10.2026)

Betreiber 19.10.: «tiktok stories verbessern». Marken: **GEMESSEN** = hier selbst geprüft · **QUELLE** = fremde Angabe · **BEHAUPTUNG** = ungeprüft.

## 1. Echte TikTok-Stories lassen sich NICHT automatisch posten
- **GEMESSEN:** Das Metricool-Werkzeug `createScheduledPost` kennt den Story-Typ nur in `facebookData.type` (POST/REEL/STORY) und `instagramData.type`
  (POST/REEL/STORY/TRIAL_REEL). `tiktokData` hat nur `disableComment/Duet/Stitch`, `privacyOption`, `commercialContent*`, `title`, `autoAddMusic`,
  `photoCoverIndex`, `isAigc` — **kein Story-Feld**.
- **QUELLE:** Metricools Anleitung «TikTok Stories» (it/pt) beschreibt Stories als In-App-Funktion mit 24 h Lebensdauer und sagt nichts von geplanten Stories; die
  TikTok-Content-Posting-API (developers.tiktok.com) nennt Direct Post/Upload für Video und Foto, keine Stories (Suche 19.10., kein Beleg für Stories — Abwesenheit ist kein Beweis).
- **Folge:** TikTok-Stories gehen nur von Hand in der App (Handy/PC-Claude). Die neuen Story-Karten (1080×1920, JPG) in `social/stories/` taugen dafür 1:1.
  Der nächstliegende, automatisierbare TikTok-Ersatz ist der **Foto-Modus** (`tiktokData.photoCoverIndex`, `autoAddMusic`; `automation/tiktok_karussell.py`):
  im Bestand erst 3 von 64 TikTok-Posts (Median 261 Aufrufe vs. 273 bei Video) — zu wenig für ein Urteil (n = 3).

## 2. Was es heute an Stories gibt (GEMESSEN 19.10.)
- Nur **Instagram + Facebook**: 28 veröffentlichte Stories je Netz (04.–18.10.), 1 Fehler je Netz, bis So 25.10. je 2/Tag geplant (12:45, 19:10), Bildkarten.
- **Wirkung unbekannt:** Metricool-Abfrage der Story-Insights (IGST02/07–13, 30 Tage) liefert **0 Zeilen**, obwohl 28 Stories veröffentlicht wurden; Facebook-Stories
  haben im Konnektor nur Datum/Vorschau/Typ. Jede Aussage «die neue Karte wirkt besser» wäre BEHAUPTUNG.
- **TikTok-Lage zum Vergleich** (Metricool-Konnektor, 30 Tage, 64 Posts): fast jedes Video bleibt bei **250–290 Aufrufen**, Ø Sehdauer 1–3 s bei 11-s-Videos,
  Durchschau-Rate unter 0,2 %. Drei Abendkleid-Videos vom 30.09. 20:25–21:05 kamen auf 26'600–39'300 Aufrufe (Ø Sehdauer 1 s, 8–18 Likes) — **sehr wahrscheinlich
  bezahlt**: der TikTok-Ads-Konnektor zeigt die Kampagne «Lernen Okt26 · Kleider Traffic · Deckel CHF 80» (CHF 80.00, 88'944 Impressionen, 433 Klicks, 0 Käufe, Status BUDGET_EXCEED;
  Konto 7646326014504976401, 19.10. über den Konnektor gemessen; die Verknüpfung Video ↔ Anzeige ist nicht geprüft). Beide erreichbaren Werbekonten haben **0 Pixel** — «0 Käufe» ist dort kein Messwert.

## 3. Befunde an der alten Story-Karte (v1) und was v2 ändert (`automation/story_bauen.py`)
| Befund (GEMESSEN am Probebogen) | v2 |
|---|---|
| Zweizeiliger Titel ragte in den weissen Bildrahmen (Titel y 1400, Rahmenende 1378) | Layout von oben nach unten ohne Überlappung; Selbsttest prüft Abstände ≥ 8 px |
| Produkt ohne Zugkraft kam durch (Pfand-Jetons CHF 21.90, Tag `ch-lager`; Jury 9+) | Filter `NICHT_STORY` (Jetons/Wertmarken/Pfandmarken) |
| Graue, flache Karte; Titel gross, kein Anlass zum Anhalten | Abgerundete Produktkarte mit Schatten, dunklerer Verlauf, **ein Hook** über dem Titel, Preis als Goldpille |
| Hook-Wahl | Stabil nach Handle aus «Kennst du das schon?», «Dein neues Lieblingsteil?», «Schon entdeckt?», «Neu bei LuxeStyle»; Saisonzeilen nur im Zeitraum («Bereit für Halloween?» bis 31.10., «Schon an Weihnachten gedacht?» 01.11.–24.12.). Keine Zahl, keine Heilzusage, kein «alle fragen danach» |
- Sicherheitszonen: Marke ab y 240 (oben 250 px = Profil/Fortschritt), Preis endet vor y 1620 (unten ~340 px = Antwortfeld).
- **Jury (Gemini, gleiche Produktkarte):** v1 9.33 → v2 9.50 (beide bestanden) — ein einzelnes Urteil, kein Beweis für Wirkung.
- `STORY_LOOK=v1` stellt die alte Karte wieder her. Bereits geplante Stories (bis 25.10.) bleiben unverändert (Metricool hat die Bilder beim Planen kopiert).
- Selbsttest `python3 automation/story_bauen.py --selbsttest` (89 Prüfungen: Kästen, Sicherheitszonen, Hook, Filter; Mutationsprobe: zwei absichtlich
  verschobene Layouts → je 4 Fehler). Probebogen alt/neu: `python3 automation/story_bauen.py --vorschau <handle> …` (schreibt nach /tmp, reiht nichts ein).

## 4. Offen
- **Messung der Wirkung** fehlt: Story-Insights liefert Metricool nicht. Ein Weg: Instagram-Insights (Meta-Datenzugang endete 05.10., wird nicht erneuert) oder eine
  Stichprobe von Hand in der Instagram-App (Reichweite/Antworten je Story, 10 alte gegen 10 neue Karten).
- **Betreiber (optional):** echte TikTok-Stories von Hand posten (Karten aus `social/stories/`), oder Foto-Modus auf TikTok ausbauen (A/B ab n ≥ 10).
