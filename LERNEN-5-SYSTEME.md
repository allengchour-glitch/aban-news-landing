# Gelernt aus dem TikTok von @herr_tech — „Nicht 5 Tools. 5 Systeme."

**Quelle:** `https://www.tiktok.com/@herr_tech/video/7684308282038603041`
(Kurzlink `vm.tiktok.com/ZN8jrV361`), Autor **„Mr. Tech"**, 98 Sekunden, Hashtag `#claude`.
Auftrag des Users am 2026-09-12: „lerne alles selbstständig" und danach
„obsidian 2te gehirn, installiere super skills und tools, werde auto besser".

Die Caption nennt die fünf Systeme **nicht**. Sie stehen nur im Video. Deshalb wurde die
deutsche ASR-Untertitelspur aus den TikTok-Metadaten geholt (`subtitleInfos`, WebVTT) — das
vollständige Transkript steht unten.

---

## Die fünf Systeme, und was davon hier schon stand

Gemessen am 2026-09-12 im Repo, nicht geschätzt.

| # | System (Video) | Befund im Repo | getan |
|---|---|---|---|
| 1 | **Zweites Gehirn** in Obsidian, Claude greift auf zusammenhängendes Wissen zu | 158 KB **Prosa** in `CLAUDE.md` + `SHARED-MEMORY.md`, linear zu lesen | Obsidian-Vault `brain/vault/` mit 39 verlinkten Notizen + 2 Abfragewerkzeugen |
| 2 | **Content-Maschine**, Trends scannen, eigener Ton, bis 10 Posts/Tag | steht seit Monaten, 14 Bausteine | nichts gebaut — bewusst, siehe unten |
| 3 | **Lead-Maschine**, Kommentar → DM → Qualifizierung → Termin oder Freebie | Bausteine da, **Kette fehlt** | Lücke dokumentiert und begründet |
| 4 | **Angebots-Agent**, Anfrage rein, Entwurf raus | fehlt, und zwar **an der Quelle** | Lücke dokumentiert, Entscheidung liegt beim User |
| 5 | **Claude Skills** („Königsdisziplin") | **`.claude/skills/` existierte überhaupt nicht** | 5 Skills gebaut |

### Der eigentliche Fund

`find . -name SKILL.md` lieferte **nichts**. Genau das Stück, das das Video als absolute
Königsdisziplin bezeichnet, war das einzige, das in diesem Repo vollständig fehlte — obwohl hier
seit Monaten teuer gelernte Regeln existieren. Sie standen als Prosa in einer 470-Zeilen-Datei,
die jede Session komplett liest und trotzdem einzelne Fallen übersieht.

### Warum System 2 bewusst nicht erweitert wurde

Das Video verkauft Reichweite (8 Mio. LinkedIn-Views in 30 Tagen). Dieses Repo **hat** Reichweite:
2994 Sessions in 30 Tagen — bei **0,37 % Add-to-Cart, 0 Käufen, CHF 0 Umsatz**. Mehr Content ist
hier gemessen ein Null-Hebel (`brain/vault/Sackgassen/Masse-ist-kein-Hebel.md`). Das System noch
grösser zu machen wäre Arbeit ohne Wirkung.

Der Satz aus dem Video, der trotzdem stimmt: **„Content ist nie das Ziel, Content ist der Motor."**
Der Motor läuft hier. Es fehlt das Getriebe — System 3.

---

## Was gebaut wurde

### System 5 — fünf Skills in `.claude/skills/`

Ein Skill lädt sich **selbst**, wenn seine Beschreibung zur Aufgabe passt. Die Beschreibung ist
deshalb der wichtigste Teil: sie muss die Wörter enthalten, die der User wirklich benutzt.

| Skill | löst aus bei | trägt |
|---|---|---|
| `messgeraet-zuerst` | „besser", „schöner", „eleganter", „optimieren" | Messgerät mit Gegenprobe, vorher/nachher messen |
| `shopify-publizieren` | Produkt/Collection anlegen, Token, 404, FAILED-Bild | die 4 Publish-Fallen, Client-Credentials-Token |
| `massen-html-aendern` | eine Änderung über viele der 1133 HTML-Seiten | Diff-Pflicht, Generator-Vorlagenkette, `background-image` |
| `gedaechtnis` | „wo war ich", Stand, Sackgassen, Gedächtnis pflegen | welche Datei die Wahrheit ist, wie man nachträgt |
| `git-und-pr` | Branch, Push, PR, GitHub-404, Rate-Limit | Stale-Ref-Falle, feste Branches, Spam-Markierung |

### System 1 — der Obsidian-Vault `brain/vault/`

39 atomare Notizen, über Wikilinks verbunden, jede mit `quelle` und `gelernt`-Datum im
Frontmatter. Einstieg: `brain/vault/00 Start hier.md`.

| Ordner | Inhalt |
|---|---|
| `Systeme/` | die fünf Systeme mit gemessenem Ist-Stand |
| `Fallen/` | 13 teuer gelernte Fallen, je eine Notiz |
| `Sackgassen/` | 5 Dinge, die nachweislich nicht funktionieren |
| `Blockiert/` | 5 Blockaden, die nur der User lösen kann |
| `Projekte/` | LuxeStyle, abannews, Traumhaus, Reviews-Importer, erste Verkäufe |
| `Stand/` | erzeugte Zeitleiste aus den 📌-Blöcken von `CLAUDE.md` |

Die grossen Dateien bleiben die **Historie** und werden nicht ersetzt. Der Vault ist der
**Zugriff** darauf.

### Vier Werkzeuge, jedes mit Gegenprobe

```bash
python3 tools/gedaechtnis.py "reviews"     # Fakten zum Stichwort, mit Quelle und Datum
python3 tools/gedaechtnis.py --sackgassen  # was nachweislich nicht funktioniert
python3 tools/gedaechtnis.py --offen       # was nur der User klicken kann
python3 tools/gedaechtnis.py --stand       # die neuesten Stand-Blöcke

python3 tools/vault.py bauen               # Index + Zeitleiste bauen, Links prüfen
python3 tools/skills_pruefen.py            # verrottete Datei- und Workflow-Verweise
python3 tools/lehre.py --titel "…" --text "…" --art falle --skill messgeraet-zuerst
```

Jedes Werkzeug hat `--selbsttest` beziehungsweise `selbsttest`. **Das war keine Formalität:**

- `skills_pruefen.py --selbsttest` fand sofort einen echten Fehler im eigenen Code
  (`frontmatter_pruefen` hatte den Repo-Pfad fest verdrahtet und stürzte auf jeder Kopie ab).
- `lehre.py --selbsttest` fand einen zweiten: die Umlaut-Ersetzung lief **nach** der
  Unicode-Normalisierung und griff deshalb nie — aus „öäü" wurde „oau" statt „oeaeue".

Beide Fehler hätten sonst erst die nächste Session getroffen. Das ist der Beleg für die Regel
aus `brain/vault/Fallen/Messgeraet-Gegenprobe.md`.

### Der Kreis, der ihn „auto besser" macht

`automation/brain-wake.sh` läuft bei jedem Session-Start (Haken in `.claude/settings.json`) und
zeigt jetzt zusätzlich: Zahl der Notizen und Skills, die sechs Blockaden, die nur der User lösen
kann, und die drei Befehle für Lehre-Aufnehmen und Prüfen. Der Haken bleibt **schreibfrei**.

Ablauf, der sich damit schliesst:

1. Session-Start → Haken zeigt Stand und offene Blockaden
2. Arbeit → Skills laden sich selbst
3. etwas Teures gelernt → `tools/lehre.py` legt es als Notiz ab
4. vor dem Commit → `skills_pruefen.py` und `vault.py bauen` finden verrottete Verweise
5. Session-Ende → Stand-Block in `CLAUDE.md`, **mit Zahlen**

---

## Was NICHT gebaut wurde, und warum

### System 3 — Lead-Maschine (die interessanteste Lücke)

Das Video: „Wer kommentiert, bekommt automatisch eine Nachricht. Wer passt, bekommt einen
Terminlink. Wer nicht passt, bekommt etwas Kostenloses und bleibt in der Liste."

Vorhanden sind die Bausteine, aber **nicht die Kette**:

| Datei | kann | kann nicht |
|---|---|---|
| `automation/social-comment-reply.mjs` | öffentlich unter Posts antworten | keine private DM |
| `automation/ig-dm-reply.mjs` | eingehende DMs thematisch beantworten | wartet passiv, löst nichts aus |
| `automation/social-comment-moderate.mjs` | Spam erkennen | — |

Es gibt keinen Weg von *Kommentar mit Schlüsselwort* zu *privater DM* zu *Qualifizierung* zu
*Liste*. Niemand verbindet die zwei Enden.

**Warum das hier der relevanteste Hebel wäre:** Masse ist bewiesen wirkungslos, weil die
Kaufabsicht fehlt. Ein Kommentar mit einem Schlüsselwort **ist** ein Absichtssignal — das
einzige kostenlose, das diese Konten erzeugen. Genau das fängt bisher niemand auf.

**Was fehlt:** der Meta-Scope `instagram_manage_messages` **zusätzlich** zu
`instagram_manage_comments`. Ohne die zweite Erlaubnis kann kein Skript auf einen Kommentar
privat antworten — das ist eine Freigabe, die nur der User erteilen kann. Die Kette jetzt zu
bauen hätte ein Skript ergeben, das nie laufen kann. Detail:
`brain/vault/Systeme/Lead-Maschine.md`.

### System 4 — Angebots-Agent

Das Hindernis ist nicht das Schreiben des Angebots, sondern der **Eingang**: abannews.com sammelt
Anfragen über `mailto:hallo@abannews.com`, und auf dieses Postfach hat keine Session Zugriff. Ein
Agent ohne Anfrage-Eingang wäre toter Code — und `automation/` hat schon 254 Dateien.

Der User müsste einen maschinenlesbaren Eingang benennen, eines von: ein Formular in Datei oder
Webhook (n8n liegt bereit, `social/N8N-WEBHOOK.md`), IMAP auf `hallo@abannews.com`, oder ein
Google-Sheet. Detail: `brain/vault/Systeme/Angebots-Agent.md`.

Für den Shop existiert die Variante schon: Kundenfragen kommen als Instagram-DM und werden von
`automation/ig-dm-reply.mjs` thematisch beantwortet.

---

## Vollständiges Transkript (deutsche ASR-Spur, 98 s)

> 5 Dinge, die ich in Claude an einem Wochenende bauen würde — danach bist du im oberen
> 1 Prozent der Menschen, die mit KI arbeiten. Und das Beste: du baust sie einmal, danach werden
> sie jeden Tag besser, an dem du sie benutzt.
>
> **Erstens, dein zweites Gehirn.** In Obsidian speicherst du alles, was für dich wichtig ist:
> Projekte, Meetings, Ideen, Kundenwissen, Entscheidungen. Mit Claude ziehst du alles mit einem
> Prompt rein, und Claude bekommt im Anschluss Zugriff auf dieses zusammenhängende Wissen.
>
> **Nummer 2, die Content-Maschine.** Claude scannt jeden Morgen, welche viralen Beiträge gerade
> auf Social Media funktionieren, baut daraus eine eigene Version in meinem Ton, fertiges Bild
> direkt dazu. Und jetzt kann ich auf Insta oder LinkedIn gehen und bis zu 10 Posts am Tag
> raushauen. Schau dir das an: in 30 Tagen 8 Millionen Views auf LinkedIn, 23 000 Profilbesucher,
> 8000 neue Follower und zahlreiche Kontakte — und mein Anteil dabei minimal.
>
> [Einschub: Webinar-Bewerbung, nächster Dienstag, Kommentar „WEBINAR".]
>
> **Nummer 3, die Lead-Maschine.** Wer kommentiert, bekommt automatisch eine Nachricht. Wer
> passt, bekommt einen Terminlink mit meinem Team. Wer nicht passt, bekommt was Kostenloses und
> bleibt aber in der Liste. Das läuft, während ich schlafe — ich seh nur noch die Termine im
> Kalender. Content ist nie das Ziel, Content ist der Motor.
>
> **Nummer 4, der Angebots-Agent.** Anfrage rein, eingeordnet, Angebot vorbereitet, und es liegt
> als Entwurf bei mir. Aus 2 Stunden werden 4 Minuten.
>
> **Und jetzt kommen wir zur absoluten Königsdisziplin, der Nummer 5:** statt jedes Mal neu zu
> prompten, bringst du Claude einmal bei, wie du arbeitest. Deswegen fuchs dich unbedingt rein
> in Claude Skills.

Anmerkung zur Quelle: die ASR-Spur schreibt „Claude" durchgehend als „clot" beziehungsweise
„Claud"; oben korrigiert. Das Video ist eine Webinar-Bewerbung — die Reichweitenzahlen sind
Marketingangaben des Autors und hier nicht nachprüfbar. Der methodische Kern (Systeme statt
Tools, Skills statt Prompts) ist davon unabhängig brauchbar.

---

## Einstiegspunkte

- `brain/vault/00 Start hier.md` — der Vault
- `brain/vault/Systeme/00-Die-fuenf-Systeme.md` — die fünf Systeme mit Ist-Stand
- `.claude/skills/` — die fünf Skills
- `python3 tools/gedaechtnis.py --offen` — was gerade nur der User lösen kann
