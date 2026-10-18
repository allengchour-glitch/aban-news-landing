# Metricool 7 Tage voraus (Betreiber 18.10.2026)

Auftrag, wörtlich: «pushe metricool 7 tage voraus bis sonntag 22.00 uhr verbessere automatisch / sichtbarkeit erweitern auf maximum»
und «schaue was chatgpt bei metricool gemacht hat … volles bild etc».
Marken: **GEMESSEN** = hier nachgerechnet, **QUELLE** = fremde Angabe, **BEHAUPTUNG** = ungeprüft.

## Was gebaut ist

| Baustein | Datei | Aufgabe |
|---|---|---|
| Treiber | `automation/social_vorlauf.py` | legt Raster-Slots bis So 25.10. 22:00 Zürich (= 21:00 UTC) an, startet je Slot den bestehenden Poster mit `PUBLISH_AT`, quittiert am Planer-Eintrag |
| Regeln | `automation/data/vorlauf_regeln.json` | Raster, Mindestabstände, Versatz, Feed-übergreifender Abstand (45 min), Drossel-Nachlauf (180 min) |
| Termin | `automation/lib/publish_at.mjs` | ein Ort für den Sendetermin; ungültig/leer/zu nah = Exit 1, nie still «jetzt» |
| Drossel | `dropship/_vorlauf_drossel.tsv` | der Autopilot postet ein Format nicht selbst, solange der Planer es abdeckt (+ 180 min Nachlauf) |
| Prüfer | `--pruefen` (alle 2 h im Autopiloten, unter STOPP bei jedem Lauf) | zieht Posts zurück, deren Produkt weg/umgepreist/pausiert ist |
| Notbremse | `--notbremse` + `dropship/_vorlauf_halt.txt` | eigene Sperre, löscht alle Slots und hält den Plan-Lauf an (Datei löschen = weiter) |
| Zustand | `dropship/_vorlauf_plan.json`, `_vorlauf_log.tsv` | neustartfest; defekte Datei wird aus git hergestellt, nie als leerer Plan behandelt |

Raster (Zürcher Zeit, Mo–So gleich — GEMESSEN: kein Wochenend-Einbruch): TikTok 08:05/13:05/20:05 · YouTube 07:20/16:05 · IG+FB-Reel 12:15/20:15 ·
IG-Bild 09:45 · IG-Karussell 21:15 · Story 12:45 · Pin 14:40/17:10/19:40/21:50 → 17 Planer-Einträge je Tag, 119 bis zum Ende.
Zeitumstellung 25.10. 03:00 → 02:00: keine Slots in der Doppelstunde, Ende bleibt 22:00 Ortszeit (geprüft).
Planer-Limit 700 Einträge/Monat (ADVANCED_15, GEMESSEN am Konto): Prognose Ende Oktober ≈ 540.

Stand 18.10. 22:25 UTC: **79 von 98 Slots geplant** (bis 25.10. 12:45), Rest füllt der Autopilot (≤ 38 min je 15-min-Runde).
Offen mit Grund: Karussell 6 (kein ready-Set; Nachschub läuft, Aufseher baut 2/Tag), TikTok 6 (laufen mit Trendton), Pin 4.

## Prüfung (3 unabhängige Prüfer, nur lesend; 43 Roh-Befunde)

Behoben und getestet (`python3 automation/social_vorlauf.py --selbsttest` = OK):
1. **STOPP wirkte nicht auf vorausgeplante Posts** (hoch) — Autopilot UND Keepalive rufen den Prüfer jetzt auch unter `_SOCIAL_STOPP`.
2. **Ein Netzfehler hätte den ganzen Plan gelöscht** (hoch, GEMESSEN: `medium_ok()` gab bei curl «000» False) — nur 404/410, zweimal; plus Massen-Schutz:
   mehr als max(3, 10 %) Beanstandungen in einem Lauf = NICHTS gelöscht, Zeile «⚠️ PRÜFER-SCHUTZ» (`VORLAUF_MASSE_OK=1` hebt auf).
3. **Prüfer blind für Bild/Karussell/Story** (hoch, 15–24 % der Slots) — der Slot merkt sich die Produkte aus dem Poster-Ledger (`handles`); nur echte Shop-Handles zählen.
4. Pausenregel tot (Kopfzeile mit Tabs) — jetzt wie `lib/social_pause.mjs`.
5. Teilverlust bei IG+FB (Zwilling ungetrackt) — Geschwister werden mitgelöscht.
6. Fremde Entwürfe wurden «adoptiert» und danach vom Prüfer gelöscht — Entwürfe/autoPublish=false nie übernehmen.
7. Defekte Plan-Datei = leerer Plan = Doppelposts — Sicherung `.defekt`, Wiederherstellung aus git, sonst Abbruch.
8. Quittung nach 4 s zu knapp (Doppelpost-Gefahr) — bis ~60 s warten; Exit 0 ohne Eintrag und ohne «nichts fällig» wird nicht sofort wiederholt.
9. Netz-/Lock-Fehler verbrauchten Versuche (Slot 20 h gesperrt) — zählen nicht mehr.
10. Notbremse lief während der Füllphase ins Leere — eigene Sperre + HALT-Datei.
11. Drossel endete am letzten Slot (Autopilot postete 10–25 min danach) — +180 min Nachlauf, Datei nach jedem Slot geschrieben.
12. `9>&-` an den Treiber-Aufrufen (tote Autopilot-Sperre bis 45 min), Tracebacks nicht mehr weggefiltert.
13. **Doppelpost durch mich:** ein manueller Pilot-Poster und ein Treiber-Slot wählten dasselbe Reel (Prüfung 3 fand es). Dublette gelöscht;
    der Poster prüft nach dem Lock Queue und Ledger frisch (Exit 3 wenn vergeben). **Regel: nie einen Poster von Hand starten, solange der Autopilot läuft.**
14. IG/FB: Feed-Bild und Reel nie < 45 min (ChatGPT-Reel stand 15 min nach dem Bild).
15. Pins: Board-Regex («Verkleidung» ≠ Kleid, «Fledermaus» ≠ Leder), Fortura-Vorlagenmüll («Warum bei LuxeStyle kaufen?») aus der Beschreibung; 11 betroffene geplante Pins gelöscht, der Treiber plant sie neu.
16. Zwei Einzelposts gelöscht: Reel «Springkrebs» (englische Lieferanten-Einblendungen «…ode / swing mode» bei 5 s, per Kontaktbogen bestätigt, die Jury hatte es durchgelassen) und IG-Post «999er Silber» (Shop-Datenblatt sagt «Material: Metall»).

Offen (bewusst nicht heute):
- Prüfer-Löschung bucht Ware/Video nicht aus den Ledgern zurück (verbrennt sie). Durch den Massen-Schutz selten.
- Familien-/Abwechslungsregel fehlt in TikTok-, YouTube-, Pinterest- und Story-Poster (5 Küchenvideos in 4 Tagen, 5 von 10 Shorts Haustier).
- Jury sieht Fremdtext in der Videomitte nicht zuverlässig (OCR über 1-s-Bilder fehlt im Meisterwerk-Tor).
- Produkttexte mit ASCII-Umlauten («Gemuese») im Shop; Hashtag-Fehlzuordnung bei 4 Beiträgen; 13 Einträge hängen an `raw.githubusercontent.com/…/<Branch>/…`
  (Metricool holt die Datei erst zur Sendezeit); Pin-Bildformate (nur 1 von 19 im Format 2:3).
- Shop-Datenblatt «999er Sterling-Silber» / «Material: Metall» (Betreiber: Lieferantenangabe prüfen oder Aussage streichen).
- **Threads ist NICHT umgesetzt** (kein Format, kein Poster; die Zeile «Vorlauf nimmt es mit auf» war zu früh). Threads-Posts kommen nur von ChatGPT.
- Wächter/Ampel rechnen mit der Planungszeit (`posted_at`), nicht mit dem Sendetermin; Prüfer-Reaktionszeit bis 2 h 15 min.

## Betrieb

- Zeile im Keepalive: `VORLAUF: n Slots geplant bis … · offen …` (⚠️ bei Lücken < 12 h, Plan-Stand > 3 h, Prüfer-Schutz, HALT, STOPP).
- Notbremse: `SCHARF=1 python3 automation/social_vorlauf.py --notbremse` (löscht alle zukünftigen Treiber-Posts, setzt HALT).
  Weiter: `rm dropship/_vorlauf_halt.txt`. Betreiber-Stopp: `dropship/_SOCIAL_STOPP` (nur der Betreiber setzt/entfernt ihn).
- Plan ansehen: `python3 automation/social_vorlauf.py --liste`. Trockenlauf des Prüfers: ohne `SCHARF=1`.
