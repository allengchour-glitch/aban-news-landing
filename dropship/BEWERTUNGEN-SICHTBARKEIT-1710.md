# Bewertungen: wo verpufft echter Sozialbeweis? (17.10.2026, spätabends)

Anschluss an `BEWERTUNGEN-STILLER-ERFOLG-1710.md`. Dort ging es um Bewertungen, die der Importer
für Fehler hielt. Hier um die andere Hälfte der Arbeit: **eine importierte Bewertung nützt nur,
wenn die Produktseite erreichbar ist.** Alles nur gelesen (ausser der einen Freischaltung unten),
**0 CJ-Punkte verbraucht** — gefragt wurde ausschliesslich Shopify.

Wiederholbar: `PQUERY='tag:elektronik' SCAN=5000 node automation/bewertungen_sichtbar.mjs`
(nur lesen; `BERICHT=<datei.md>` schreibt eine Tabelle).

## 1. Die Anzeige funktioniert — beide Stellen nachgemessen

Die Notiz vom 02.06. führte „Judge.me-Sterne auf Kacheln" als offen. **Ist erledigt**, belegt:

- **Produktseite:** `walkie-talkie-mit-frequenz-scanning-639000` liefert HTTP 200 und rendert
  server-seitig das Judge.me-Widget mit allen **3 Bewertungen** samt Vorschau-Abzeichen
  (`data-average-rating='5.00'`). Das `style='display:none'` am Abzeichen ist Judge.mes eigener
  Platzhalter — der App-Extension-Loader (`…/judgeme-786/assets/loader.js`) ist auf der Seite
  und deckt es auf.
- **Kacheln:** das Theme hat seit dem 01.09. einen eigenen Sternblock (`lx-card-sterne` in
  `snippets/product-card.liquid`), Schwelle **≥ 3 Stimmen und ≥ 4,0★**. Auf
  `/collections/gaming` tragen **2 von 28** Kacheln ein Abzeichen (`5.0 (8)` und `4.8 (8)`) —
  wenige, weil wenige Produkte Bewertungen haben, nicht weil die Anzeige fehlt.

Erste Messung war falsch: ich hatte nach Judge.mes Klassen auf den Kacheln gesucht, das Theme
malt die Sterne aber selbst. **Ein Messgerät, das nach dem falschen Merkmal sucht, meldet „fehlt".**

## 2. Der echte Verlust: 55 gut bewertete Produkte sind DRAFT

| Region (Tag) | gelesen | mit Bewertung | stark & sichtbar | stark, aber DRAFT |
|---|---|---|---|---|
| `tag:gaming` | 728 | 75 (10,3 %) | 50 | 7 |
| `tag:gadgets` | 2298 | 97 (4,2 %) | 62 | 7 |
| `tag:elektronik` | 5000 | 316 (6,3 %) | 205 | 41 |

(Regionen überlappen; zusammen **55 starke DRAFTs**, 318 sichtbare.)

Der auffälligste Fall ist der aus dem Importer-Bericht: **`m8-puls-4k-retro-game-console-956928`,
12 Bewertungen, 4,75★ — DRAFT, HTTP 404.** 12 echte Käuferstimmen, die niemand sieht. Grund:
`marge-verlust-draft` (VK 15.90 bei höherem EK) — **richtig gesperrt, Preisentscheid beim User.**

Nebenbei: **109 Produkte haben 1–2 Stimmen** und liegen damit unter der Kartenschwelle. Ihre
Sterne stehen auf der Produktseite, nur die Kachel zeigt sie nicht. Mehr CJ-Bewertungen helfen
dort kaum — CJ liefert pro Produkt alles auf einmal, wer 1 hat, hat nicht mehr.

## 3. 🔑 Mein Messgerät meldete 32 Gelegenheiten — es gab keine einzige

Die erste Fassung von `automation/lib/bewertung_sichtbarkeit.mjs` kannte nur die Sperrgründe, die
in CLAUDE.md namentlich stehen (`marge-verlust-draft`, `18plus`, `medizinprodukt-pruefen` …).
Sie meldete **32 „Kandidaten ohne Sperr-Tag"**. Einzeln nachgesehen trug fast jeder einen
**anderen, genauso triftigen** Grund, den die Liste nicht kannte:

| Grund-Tag | Produkte im Katalog | Status | Befund |
|---|---|---|---|
| `duplikat-auto-draft` | 4000+ | 4000 DRAFT | **3998 ohne Bild** → echte Doppel |
| `bilder-geloescht-speicher` | 382 | 382 DRAFT | 335 ohne Bild → Seite wäre leer |
| `nicht-fit-elektronik-draft` / `nicht-fit-auto-draft` | 170 | 170 DRAFT | falsch einsortiert |
| `dublette-bild`, `dublette-original-…` | — | DRAFT | Doppel |
| `lizenz-nicht-bewerben` | — | DRAFT | PS4/PS5/Xbox-Lizenz = Kontosperr-Risiko |
| `cj-entfernt-…`, `ohne-ek-cj-weg` | — | DRAFT | Lieferant weg, Marge unprüfbar |
| `auto-entwurf-0926` | **3223** | 3193 DRAFT / **30 ACTIVE** | **kein Bild fehlt** → kein harter Grund |

Gefixt: `SPERR_MUSTER` (Grund-Familien statt Einzelnamen) + 29 Tests. Die **Gegenprobe in die
andere Richtung ist der wichtigere Test**: harmlose Chargen-Tags dürfen NICHT sperren —
`rueckhol-0907` liegt auf über 10 000 aktiven Produkten und hat am Vormittag schon einmal
3142 von 4000 Artikeln aus dem Merchant-Feed geworfen. Nach der Korrektur: **0 Kandidaten.**

**Dieselbe Fehlerklasse wie das Sperrmuster im Merchant-Feed, nur umgekehrt:** zu kurz gefasst
erzeugt es Arbeit, die es nicht gibt; zu breit gefasst wirft es den halben Katalog weg. Beide
Male sieht das Ergebnis plausibel aus.

## 4. Eine Freischaltung, vollständig geprüft

`auto-entwurf-0926` ist die einzige Familie ohne harten Grund (3223 Produkte, alle mit Bild,
30 davon längst ACTIVE) — und deckt sich mit dem Dauerauftrag „Autopilot-Drafts veredeln →
ACTIVE → publizieren". Von den vier Produkten dieser Familie mit **belegter positiver Marge**
hält genau eines einen Abstand, der einen Rückläufer verkraftet:

| Produkt | VK | EK | Marge | Sterne | Entscheid |
|---|---|---|---|---|---|
| `smartwatch-pulsefit-fitness-anrufe-611100` | 53.90 | 24.76 | **+29.14 (54 %)** | 4,6★/5 | **live gestellt** |
| `mini-hd-projektor-fur-zuhause-018944` | 38.90 | 32.75 | +6.15 (16 %) | 5,0★/8 | bleibt DRAFT |
| `usb-mehrfachsteckdose-…-5d5cb0` | 26.90 | 22.43 | +4.47 (17 %) | 4,88★/8 | bleibt DRAFT |
| `wasserdichte-elektronische-herren-sportuhr-166400` | 21.90 | 18.45 | +3.45 (16 %) | 5,0★/8 | bleibt DRAFT |

Die drei unteren bleiben bewusst DRAFT: bei CHF 3–6 Rohmarge frisst **eine** Rückerstattung den
Gewinn von mehreren Verkäufen — und der Shop hatte auf 12 Bestellungen 4 Rückerstattungen.
**Preisentscheid beim User**, nicht ein Klick auf ACTIVE.

Vor dem Schreiben geprüft, nicht angenommen: 5 Medien `READY`, Lieferzeit-Block vorhanden
(10–18 Tage, neuer `ls-liefer`-Stil), `tracked:false` + Policy `CONTINUE` → kaufbar, EK aus
echter `unitCost` aller drei Varianten, Kanal-Sperrtags **0** (`kanal_sperren.sperrTags`).
Das Skript bricht ab, falls zwischen Messung und Schreiben ein Sperrtag auftaucht.

Danach live nachgeprüft (mit Cache-Buster): **HTTP 200**, Vorschau-Abzeichen
`data-average-rating='4.60' data-number-of-reviews='5'`, publiziert in Online Store, Shop,
TikTok, Facebook & Instagram, Google & YouTube, Pinterest, Headless.
Tag `auto-entwurf-0926` entfernt, `bewertet-live-1710` gesetzt.

**Eine falsche Messung hätte hier 32 Produkte scharf gestellt — darunter Lizenzartikel und
Produkte ohne Bild.** Das Skript ändert darum von sich aus nichts.

## 5. Offen / beim User

- **`m8-puls-4k-retro-game-console-956928`** (12 Bewertungen, 4,75★): Preis 15.90 liegt unter EK.
  Mit rentablem Preis wäre das das am besten bewertete Gerät im Katalog.
- **Die drei Dünnmargen-Produkte** oben: Preis anheben oder bewusst draussen lassen.
- **Nächster Bewertungs-Lauf** (nach CJ-Punkte-Reset):
  `QUERY='tag:elektronik AND tag:cj-real' SORT=UPDATED_AT REVERSE=1 LIMIT=150–250`.
  Die Messung bestätigt die Richtung: in der Elektronik-Region haben **6,3 %** eine Bewertung
  gegen **0 %** in Mode/Kostümen — und 4684 von 5000 sind dort noch sternlos.
- **Offene Fläche:** die 19 übrigen CJ-Skripte tragen den alten `cjGet`-Block ohne Wiederholung.
