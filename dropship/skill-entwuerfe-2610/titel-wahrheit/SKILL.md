---
name: titel-wahrheit
description: Immer wenn ein LuxeStyle-Produkttitel etwas verspricht, das das CJ-Datenblatt nicht belegt oder dem es widerspricht - Material (Leder, Leinen, Edelstahl, Baumwolle, Seide), Eigenschaft (wasserdicht), Produktart ("Hundekuscheldecke", die ein Hundepullover ist) - und vor jedem Lauf von titel_korrigieren.mjs. Enthält den Vorfilter gegen den Datenblatt-Zwischenspeicher, die Regeln, wann ein Titel stehen bleibt oder geändert wird, die exakten Befehle, die SEO-Falle (Ersetzen) und die Gegenproben. Im Ablauf gilt die Reihenfolge Titel, dann Texte, Auswahl, Kategorien.
---

# Titel-Wahrheit: der Titel darf nicht mehr versprechen als das Datenblatt

**Warum:** Ein falscher Material- oder Produktname im Titel ist eine irreführende Angabe (so der Kommentar in `automation/titel_korrigieren.mjs`: UWG; die Rechtslage selbst ist **nicht geprüft**, Auftrag F in `dropship/CHATGPT-AUFTRAEGE-2610.md` ist offen). Und der neue Fliesstext wäre zum Titel im Widerspruch.
**Auslöser (GEMESSEN 26.10.2026):** Text-Agenten, die dem Datenblatt folgten, meldeten rund zwanzig Titel, die ihm widersprechen. Sechs Beispiele aus dem ersten Lauf (`/tmp/titel_fix_1.json`):
«Leinen-Set» (Datenblatt: kein Leinen) · «Kinderleder-Schuhe» (Datenblatt: *synthetic leather*, obwohl `materialNameEn` `["Plastic","Leather"]` lautet) · «Hundekuscheldecke» (CJ: *Dog Cat Sweater … Pet Sweaters*) ·
«Präzisions-Messschieber» (CJ: *Electronic Measuring Ruler*) · «Flying Squirrel … Set-Top Box» (CJ-Name *Set-Top Box*, aber Packliste *Mini Keyboard x1*) · «Intelligentes Glas» (Touch-Lichtschalter, Nennspannung AC90-250V).
**Werkzeug:** `automation/titel_korrigieren.mjs` (Eingabe `{ "<handle>": "<neuer Titel>" }`). Es **prüft nicht, ob der neue Titel stimmt** - das ist ein Urteil und bleibt beim Hauptmodell/Menschen (nicht an Haiku delegieren).
Zugang: `SHOPIFY_SHOP`, `SHOPIFY_CLIENT_ID`, `SHOPIFY_CLIENT_SECRET`; CJ für den Zwischenspeicher: `CJ_EMAIL`, `CJ_API_KEY`. Node = `/opt/node22/bin/node`. Marken: **GEMESSEN** · **SETZUNG**.

## Wann einsetzen

- Der User oder ein Agent sagt: «der Titel passt nicht zum Produkt / zum Material», «Leder ist es gar nicht», «ist gar nicht wasserdicht».
- Vor Textarbeit an CJ-Produkten (der Fliesstext folgt dem Datenblatt; steht der Titel dagegen, wird die Seite widersprüchlich).
- Nach einem Import mit maschinell übersetzten Titeln (Maschinen-Deutsch wie «Mannlich» ist ein anderes Werkzeug: `titel_deutsch_fix.mjs`).

## Messen - nur lesen

```bash
N=/opt/node22/bin/node    # Repo-Wurzel
# a) Datenblatt je Produkt in den Zwischenspeicher /tmp/cj_fakten_cache/<handle>.json holen und den Quelltext zeigen (kein Modell, kein Schreiben im Shop):
KEIN_LLM=1 HANDLES=a,b $N automation/cj_fakten_block.mjs        # LISTE=datei.csv LIMIT=40 (Kopfzeile nötig); FORCE=1 auch bei Produkten mit Fakten-Block
# b) Katalogdatei mit Titeln (Bulk ~1 Min.):
$N automation/katalog_bulk.mjs /tmp/katalog_voll.json
```

**Vorfilter (Skizze, nicht im Repo; am 26.10.2026 gegen 634 Zwischenspeicher-Produkte gelaufen - 5 Verdachtsfälle).** Er findet nur **Material-/Eigenschafts-Behauptungen**:

```bash
/opt/node22/bin/node --input-type=module - <<'JS'
import fs from 'node:fs';
import { quelleAus } from './automation/lib/fakten_block.mjs';
const KAT = process.env.KATALOG || '/tmp/katalog_voll.json', CACHE = process.env.CACHE || '/tmp/cj_fakten_cache';
const titel = new Map(JSON.parse(fs.readFileSync(KAT, 'utf8')).produkte.map(p => [p.handle, p.title]));
const KUNST = /(pu|faux|artificial|synthetic|imitation|vegan)\s*leather|kunstleder|lederimitat/i, ECHT = /\b(genuine|real|cow|cowhide|sheep|goat)\s*leather\b/i;
const EHRLICH = /imitation|kunst|faux|vegan|pu-/i;   // der Titel sagt es selbst: kein Verdacht
const REGELN = [ // [Behauptung, Titel-Muster, Beleg im Datenblatt]
  ['Leder', /(^|[^a-zäöüß])(echt)?leder|kinderleder/i, /\bleather\b/i], ['Leinen', /leinen/i, /\blinen\b|\bflax\b/i],
  ['Edelstahl', /edelstahl/i, /stainless/i], ['wasserdicht', /wasserdicht|wasserfest/i, /water.?proof|water.?resist|\b\d+\s?atm\b|\bipx?\d/i],
  ['Baumwolle', /baumwoll/i, /cotton/i], ['Seide', /(^|[^a-zäöüß])seide/i, /\bsilk\b/i]];
let n = 0; const treffer = [];
for (const f of fs.readdirSync(CACHE).filter(f => f.endsWith('.json'))) {
  const h = f.slice(0, -5), t = titel.get(h); if (!t) continue; n++;
  const qq = quelleAus(JSON.parse(fs.readFileSync(`${CACHE}/${f}`, 'utf8'))), q = qq.text;
  const name = (q.match(/^Product name: (.*)$/m) || [])[1] || '';
  if (process.env.ALLE === '1') console.log([h, t.slice(0, 50), name.slice(0, 60), qq.kategorie].join('\t'));   // Produktart-Liste zum Lesen
  for (const [art, tm, bel] of REGELN) {
    if (!tm.test(t) || (art === 'Leder' && EHRLICH.test(t))) continue;
    if (!bel.test(q)) treffer.push([h, art, 'kein Beleg im Datenblatt', name.slice(0, 60)]);
    else if (art === 'Leder' && KUNST.test(q) && !ECHT.test(q)) treffer.push([h, art, 'Datenblatt nennt Kunst-/PU-Leder', name.slice(0, 60)]);
  }
}
if (process.env.ALLE !== '1') { console.log(`geprüft ${n} · Verdacht ${treffer.length}`); for (const x of treffer) console.log(x.join(' | ')); }
JS
```

**Grenzen des Vorfilters (GEMESSEN):** er fand 2 der 6 bekannten Fälle (Leinen-Set, Kinderleder) und 3 neue. Die **vier Produktart-Verwechslungen** findet er nicht - dafür `ALLE=1` ausgeben (Spalten: Handle · Titel · *Product name* bei CJ · CJ-Kategorie) und **lesen**: «Hundekuscheldecke» steht neben «Pet Sweaters». Nicht jede Verwechslung zeigt der CJ-Name: bei der «Set-Top Box» steht die Wahrheit erst in der Packliste - also den Quelltext (`KEIN_LLM=1 …`) und das Bild lesen, nicht nur die Tabelle.
Ein Verdacht ist **keine** Entscheidung: lies den ganzen Quelltext (`KEIN_LLM=1 …`) und **sieh das erste Bild an** (bei 4 von 5 geprüften Top-Seiten stand die Abweichung nie im Text, immer auf dem Herstellerfoto).
Eine «Zahl im Titel fehlt im Datenblatt»-Regel ist zu laut (14 von 634, fast alle Zahlwörter wie *Seven* oder Jahreszahlen) - nicht automatisieren. Das Datenblatt kann sich selbst widersprechen (*Product name: 3 makeup brush set* neben *Name: 13 makeup brush set*): dann **unbekannt**, Bild entscheidet.

## Entscheidungsregeln

| Lage | Entscheid |
|---|---|
| Titelwort fehlt im Datenblatt («Steel Watch» belegt kein *Edelstahl*, nur *stainless*; «Rainproof» belegt kein *wasserdicht*) | Behauptung **streichen** oder auf das Belegte senken («regenfest»), nicht durch ein anderes Behauptungswort ersetzen |
| Datenblatt widerspricht (*synthetic/PU/faux leather*, *Waterproof: no*) | Titel ehrlich: «Kunstleder», Wort entfernen |
| Datenblatt belegt (*Waterproof: Yes*, `IPX7`, `3 ATM`) | Titel **unverändert lassen**; nichts anfassen, was stimmt |
| Produktart falsch (Pullover statt Decke) | auf die Produktart laut Datenblatt + Bild ändern («Hundepullover mit V-Ausschnitt, Streifen») |
| Quelle widersprüchlich oder dünn | **unbekannt** → nicht ändern, im Bericht nennen |

Neuer Titel: 8-120 Zeichen, **kein `ß`**, keine chinesischen Zeichen, kein Wort aus `VERBOTEN` (`lib/fakten_block.mjs`: Marken wie iPhone/Samsung/Apple, `wasserdicht`, `bestseller`, `garantiert`, Heil-/Medizinwörter) - sonst «✗ Titel nicht zulässig». Eine Kompatibilitätsangabe («für iPhone») gehört in die Beschreibung, nicht in den Titel.
Das Handle (die Adresse) bleibt unverändert.

## Anwenden

```bash
# /tmp/titel_fix.json:  { "leinen-set-lino-weste-weite-hose": "Set «Lino» · Weste + Hose mit geradem Bein", "kinderleder-schuhe-weiter-kopf-624800": "Kinderschuhe aus Kunstleder, weiter Kopf" }
TITEL_DATEI=/tmp/titel_fix.json $N automation/titel_korrigieren.mjs          # Trockenlauf: «alt» → «neu» je Produkt, «WÜRDE ÄNDERN: n · abgelehnt a»
LIVE=1 TITEL_DATEI=/tmp/titel_fix.json $N automation/titel_korrigieren.mjs   # «GEÄNDERT: n»; ohne TITEL_DATEI wird von stdin gelesen
```
Je Produkt ein Ledger-Eintrag `titel <handle>` in `dropship/kategorien_ledger.txt`.

## Fallen

1. **`seo` ist bei Shopify ein ERSETZEN, kein Zusammenführen** (am 24.10.2026 live gemessen: nur `{description}` senden löscht den SEO-Titel). `titel_korrigieren.mjs` sendet **immer** `seo: seoTitel(neuerTitel)` - beide Felder, aber auch dann, wenn der SEO-Titel **von Hand geschrieben** war (164 handgeschriebene Titel gelten als besser und bleiben sonst unangetastet).
   **Vorher lesen:** `productByHandle{ seo{title description} }`. Nur wenn `seo.title` leer ist oder gleich `seoTitel(alterTitel).title` bzw. gleich dem alten Titel, ist der Lauf unschädlich; sonst von Hand entscheiden. `titel_deutsch_fix.mjs` macht genau diese Prüfung (`seoZiehen`), `titel_korrigieren.mjs` **nicht** - offene Lücke, im Skript nachziehen und testen, bevor viele Titel laufen.
2. Das Werkzeug prüft **nicht den Status**: auch ein DRAFT würde umbenannt.
3. **Reihenfolge:** Titel → Fliesstext/Fakten (Skill `produkttexte-aus-datenblatt`; die Textprüfung verlangt, dass der Text das Produkt aus dem Titel nennt) → Auswahl → Kategorien neu (Tags kommen aus Titel + Google-Kategorie: Katalog neu lesen, `FORCE=1 LIVE=1 PHASE=tags $N automation/kategorien_anlegen.mjs`, Skill `kategorien-nach-google`).
   Ein Produkt mit `text-v2`-Marker wird von `text_eingabe.mjs` nicht noch einmal eingelesen (kein FORCE) - ein bereits geschriebener Text, der den falschen Begriff nennt, muss von Hand neu angestossen werden.
4. **Massenänderung = Diff lesen, nicht die Zahl.** Das Muster mit einfachem Bindestrich machte aus «3-5 Minuten» ein «3.» auf 264 Seiten. Die Trockenlauf-Ausgabe «alt → neu» vollständig lesen.
5. Google bekommt den neuen Titel erst mit dem nächsten Feed-Lauf (der Merchant-Feed wird täglich erzeugt) und den SEO-Titel erst nach dem erneuten Crawl.

## Gegenproben

- **Vor LIVE:** jede Zeile «alt → neu» gelesen; für jeden Titel ein **Beleg** (Zeile aus dem Datenblatt oder Bildbefund) notiert. Ein Titel ohne Beleg wird nicht gesetzt.
- **Gegenprobe des Vorfilters in die andere Richtung:** ein belegtes Produkt (*Waterproof: Yes* + «wasserdicht» im Titel) darf **nicht** auftauchen; ein Titel «aus Imitation-Leder» auch nicht.
- **Nach LIVE:** frisch lesen `productByHandle{ title seo{title description} }` (Titel neu, SEO beide Felder gesetzt), Seite live mit Cache-Buster abrufen (HTTP 200), Vorfilter erneut laufen lassen → die geänderten Handles sind verschwunden.
- `node automation/lib/seo_titel_test.mjs` grün (Bindestrich-Muster, Marke nur wenn sie passt).
