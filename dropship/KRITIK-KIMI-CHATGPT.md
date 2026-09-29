# Kritik von Kimi + ChatGPT — Werkzeug und erste Anwendung (29.09.2026)

Betreiber: «kimi und chatgpt nutzen für kritik».

## Werkzeug
`automation/kritik.py` schickt dieselbe Frage (+ Dateien) parallel an **ChatGPT (`gpt-5.5`)** und **Kimi (`kimi-k3`)**,
Rolle: strenger Prüfer, nummerierte Befunde je «Behauptung · warum · wie nachprüfen», kein Lob.

    python3 automation/kritik.py "Was ist an diesem Vorgehen falsch?" datei1 datei2
    NUR=chatgpt|kimi · AUSGABE=dropship/_kritik/<name>.md · MODELL_GPT=… · KIMI_MODELL=…

GEMESSEN beim Bau:
- OpenAI von hier erreichbar (133 Modelle; neueste stabile `gpt-5.5`), Antwort auf 3'900 Zeichen in ~105 s.
- `kimi-k3` lehnt `temperature ≠ 1` ab (HTTP 400) → in `kimi_frage.py` und `kritik.py` behoben.
- `kimi-k3` denkt > 5 min: Timeout nach 180 s, dann «RemoteDisconnected» nach 300 s (Proxy schliesst stille
  Verbindungen) → Kimi läuft jetzt im **Streaming** (Denk-Stücke halten die Verbindung offen).

**Hausregel bleibt:** Antworten sind HINWEISE, keine Belege — jeder Befund wird am Objekt nachgemessen, bevor gehandelt wird.

## Erste Anwendung: Aufseher-Reparatur «START-Marke» (heute 19:55)
ChatGPT: 20 Befunde. Nachgemessen:

| # | Befund | Messung | Urteil |
|---|---|---|---|
| 13 | `/proc/uptime` zeigt evtl. Host statt Container | `uptime` 22 min = PID 1 seit 20:57 | **widerlegt** |
| 7 | FERTIG mit > 3 Folgezeilen gilt als «nicht fertig» | alle Schleifen-Logs: 0 Fälle | kein aktueller Fall |
| 2 | «START » kollidiert mit Skriptzeilen | 4 Skripte schreiben «START …» — immer als 1. Zeile ihres Laufs | harmlos → **Regel** im Aufseher notiert |
| 5 | `still_gestorben` sucht FERTIG/PAUSE unverankert | «noch nicht FERTIG» hätte Nachholen verhindert | **behoben** (verankert wie Haupttor, Kanarienvögel 2/2) |
| 3 | `letzter_lauf` gibt die START-Zeile mit aus | stimmt; START-Zeile enthält nie FERTIG | harmlos |
| 8, 9, 16 | Tod zwischen flock und echo; echo scheitert; grep/awk lesen zweimal | Fenster im Mikrosekundenbereich / Platte voll = auch Python-Ausgabe weg | nicht behandelt |
| 20 | «FERTIG» sagt nichts über fachlichen Erfolg | richtig, anderes Thema (Wächter-Artefakte) | offen, bewusst |

Volltext ChatGPT: `dropship/_kritik/2026-09-29-aufseher-startmarke.md`.

### Kimi (kimi-k3, 699 s im Streaming, 12 Befunde) — Volltext `dropship/_kritik/2026-09-29-aufseher-startmarke-kimi.md`
| Kimi # | Befund | = ChatGPT | Messung / Urteil |
|---|---|---|---|
| 1 | `still_gestorben` unverankert | #5 | **beide unabhängig** → schon behoben |
| 2 | `/proc/uptime` = Host | #13 | **beide unabhängig — und beide falsch**: gemessen Container (22 min) |
| 9 | START-Namensraum | #2 | 4 Skripte, immer 1. Zeile → Regel notiert |
| 6 | andere Startpfade schreiben keine Marke | #1 | stimmt für Handstarts; Regel: nur über den Aufseher starten |
| 3 | 3 Nachholungen/Tag zu wenig | #17 | gilt nur für `still_gestorben`-Jobs (Fortura u. a.), nicht für die Schleife |
| 4 | 20-h-Regel lässt Startzeiten driften | — | bekannt und gewollt («FERTIG gilt 20 h», 04.09.) |
| 11 | FERTIG in fremdem Format → Dauer-Neustart | — | gemessen: 0 Zeilen in fremdem Format, 0 Wächter ≥ 3 Starts heute |

**Lehre:** Zwei Modelle, die unabhängig dasselbe sagen, sind ein Grund zuerst zu PRÜFEN, kein Beweis: Beide behaupteten
«/proc/uptime zeigt im Container den Host» — die Messung (1 Befehl) widerlegte es. Kimi fand nichts, was ChatGPT nicht
auch fand, brauchte aber 7× so lange (699 s vs. 105 s) → Standard: beide parallel, ChatGPT-Antwort zuerst lesen.
