# Sichtprüfung der Neuimporte seit 01.10. + Malen nach Zahlen / Diamond Painting (04.10.2026, 22:20–23:15 UTC)

Betreiber: «fix 12 h lang alles» · Plan-Tag 6 (Bilder + Vision-QA) vorgezogen.

## 1 · Messung
- 1-Bild-Anteil CJ-Ware (aktiv, `cj-real`): **128 von 46'829 (0,27 %)** — 94 «CJ hat keine weiteren», 15 «nichts brauchbar»,
  13 mit früher ergänzten Bildern, die `bildtext_entfernen` (Werbetext) wieder entfernt hat (gewollt). Nachfüllen geht nicht.
- **1'645 aktive Neuimporte** (created > 01.10.) als 46 Kontaktbögen mit Titel; je Block ein Sichter + ein Gegenprüfer (Workflow).
  618 Befunde, Stichprobe 30/30 korrekt. Rund jeder dritte Neuimport hatte einen falschen oder unsinnigen Titel.

| Klasse | Befunde | erledigt |
|---|---:|---|
| Titel benennt andere Ware / Unsinn («Schneeknauf», «Kissenmantel», «Handpumpen-Pumpe») | 221 | Titel korrigiert (nur wenn Live-Titel = geprüfter Titel) |
| Titel englisch | 133 | korrigiert |
| Titel Grammatik/Tippfehler | 93 | korrigiert — zusammen 447, Ledger `_sicht_titel_2026-10-04.tsv` |
| Hauptbild mit Werbetext/Infografik | 84 | 78 per OCR auf sauberes Bild, 5 von Hand, 1 Anatomiemodell aus Werbung |
| Hauptbild zeigt Ware nicht (Stoff-Nahaufnahme, Karton) | 21 | 21 von Hand umgestellt (`_sicht_hauptbild_2026-10-04.tsv`) |
| Hausregel | 66 | s. unten |

## 2 · Hausregeln (Ledger `_sicht_hausregel_2026-10-04.tsv`)
- **Klingenregel hatte ein Loch:** «5‑Stück‑Set Küchenmesser mit Obstschneidebrett» war für die VERSANDfrage false — das
  Kontextwort «schneidebrett» stach vor jeder Prüfung. Jetzt: Kontextwort hinter einem Messer-Wort (mit/und/&) = Beigabe.
  Py + JS, Tests 54/54 + 28/28 + Tor. Wache: 2 gedraftet (Messerset, Tortenmesser-Set).
- **Minoxidil 5 %** («Haar für kräftigeres Haar», Text verschwieg den Wirkstoff) → DRAFT; `medizin_zweck.json` sperrt
  Arzneimittel-Wirkstoffe (Minoxidil, Finasterid, Melatonin, Lidocain, Hydrochinon, Tretinoin, Hydrocortison) beim Import.
- Aus Werbekanälen: Wolfskopf-Maske + Hunde-Sträflingskostüm (kostuem), Akt-Lampe (adult), Labubu-Bild (lizenz),
  Schutzweste/Körperpanzer (waffe-pruefen).
- ~50 Kosmetik-Meldungen (Lippenstift, Lidschatten) **bewusst nicht** angefasst: Regel 30.08. = nicht BEWERBEN, nicht nicht verkaufen.

## 3 · Ursachen an der Quelle
- Texter sah nur den englischen CJ-Namen: **CJ-Kategorie geht jetzt in den Prompt** (beide Grind-Importer).
- **gpt-oss-20b-Tageskontingent auf beiden Groq-Organisationen leer, DeepSeek + Gemini 402** → Importe ohne Text
  («skip(gemini)» ≈ jeder zweite). `gpt-oss-120b` als zweite Stufe (gemessen 1,7 s, bessere Titel). Test 3/3:
  Pufferjacke / Schneeflocken-Innensechskantschlüssel / Malen nach Zahlen – Tiermotiv.
- `fallenSicher()` deterministisch: «digital oil painting» → «Malen nach Zahlen».
- `titel_bild_wache.py` (Titel vs. Hauptbild, Gemini + Zweitprüfer) gebaut, **pausiert ohne Gemini-Guthaben** — eine
  Massenprüfung über Groq-Vision würde den Bildvergleich echter Bestellungen aushungern. Ampel meldet «KI-Guthaben leer».

## 4 · Zwei neue Kollektionen (Semrush CH)
| Kollektion | Suchen/Mt | KD | Produkte | Arbeit |
|---|---:|---:|---:|---|
| /collections/malen-nach-zahlen | 5'400 | 30 | 69 | 70 Titel («Digitales Ölgemälde» → «Malen nach Zahlen – Motiv»), 37 Motiv-Hauptbilder statt leerer Leinwand, CJ-Namen geprüft |
| /collections/diamond-painting | 8'100 | 16 | 209 | 62 Titel («Diamantmalm», «Diamantpiktur», «Edelsteinmalerei» → «Diamond Painting – Motiv») |
Beide: SEO-Titel/Meta, Text, 6 Kanäle, Hauptmenü unter «Wohnen & Garten › Basteln & DIY» (HTTP-Links, `menue_links.py` 0 Befunde),
`cat_tags.mjs` taggt Neuimporte selbst.

## Betreiber
- **Gemini-Guthaben aufladen** (402 seit 21:53 UTC) und **OpenAI** (leer seit 20:11 UTC) — Zweitprüfer-Wachen pausieren.
- Optional: Groq Dev-Tier, wenn der Grind mehr als ~200 Texte/Tag braucht.
