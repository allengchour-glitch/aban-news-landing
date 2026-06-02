# LuxeStyle — 3D-Druck-Pipeline (personalisierte Geschenke + Flexi)

Werkzeuge und Gedächtnis für den Geschäftszweig „3D-Druck-Produkte" im Shop
**luxestyle.ch** (Shopify Basic, CHF, Schweiz). Selbst erzeugte Designs = null
Lizenzproblem. **Erst Sample, dann Shopify. Live schalten nur der Inhaber.**

> 🚫 **FESTE REGEL (Kunde, verbindlich):** KEINE flachen Teile mehr — nie wieder flach
> bauen/posten. Es gibt **genau 2 Katzen, beide Vollkörper-3D**, keine neuen Tiere/Varianten,
> nur diese zwei ändern:
> 1. **Pancake** — gespreizt liegend, schwarze X-Augen, orange Zunge (Meshy image-to-3D aus
>    Geminis Bild → `polish.py`; X erhaben aufgesetzt). Datei: `samples/cat3d_finalX/smallX.stl`.
> 2. **Full-Body** — sitzende Katze, ganzer Körper, RUNDE Augen, rosa Ohren, weiß.
>    Prompt: „cute chubby white cat sitting upright, full body, four legs, tail, big round
>    simple eyes, pink inner ears, orange tongue, smooth stylized, solid" → `polish.py`.
>    Datei: `samples/cat3d_fullbody.stl`.
> Flache `.scad` (kawaii/pancake/charm) wurden **gelöscht**. Augen via Meshy-Prompt einbacken.

## Generator-Baukasten

| Datei | Produkt |
|-------|---------|
| `keychain.scad` | Namens-Schlüsselanhänger |
| `nameplate.scad` | Namensschild (Tür / Schreibtisch) |
| `caketopper.scad` | Cake-Topper mit Wunschtext |
| `nametag_base.scad` | Grundplatte (ohne Text) für mehrfarbige Anhänger (X1C + AMS) |
| `animal.scad` | 8 Tier-Silhouetten (cat, bear, rabbit, fish, paw, dog, heart, star) |
| `flexi_chain.scad` | Print-in-Place Gliederkette (beweglich, in einem Stück) |
| `flexi.scad` | **Print-in-Place Flexi-Tier** (Kugel-Pfannen-Gelenke): `kind=cat\|snake\|caterpillar`, `n` Segmente. Katze mit Ohren/Augen/Öse. Bewegliche Segmente, captive Gelenke (im Querschnitt geprüft) |
| `make.py` | erzeugt aus jedem Text eine druckfertige `.stl` |
| `meshy_text.py` | **Text → 3D** (Meshy v2): Prompt → GLB, optional `REFINE=1`. Key aus `MESHY_API_KEY` |
| `meshy_image.py` | **Bild → 3D** (Meshy v1): ein Referenzbild → texturiertes GLB (treffsicherer bei Vorlage) |
| `polish.py` | **Veredelung (Blender):** Mesh säubern, glätten, Schuppen-/Detail-Struktur, auf mm skalieren, STL + Render |
| `texture_to_parts.py` | **Meshy-Textur → Bambu/AMS-Farbteile** (liest Textur, sortiert in Filament-Palette, zerlegt in STL pro Farbe) |
| `colorize.py` | **Universelles Farb-Tool**: MODE=texture (Meshy-Textur) ODER rules (Plain-Modell nach Regionen) → Farb-STLs + farbiges OBJ + Vorschau; Palette frei |
| `hole.py` | **Schlüsselring-Loch:** skaliert GLB auf mm, bohrt vertikales Loch durch solides Material, exportiert GLB (Textur bleibt) + Kontroll-Render. Danach `colorize.py` für die Bambu-Teile |
| `assemble.py` | **Farb-Teile → EINE fertige 3MF** (Bambu-nativ): aus `colored.obj` oder `color_*.stl`-Ordner. Jedes Dreieck trägt seine Farbe → Bambu öffnet 1 Objekt, matcht Farben auto auf Filamente. Kein 4-fach-Import |
| `build_all.sh` | **1 Befehl** → kompletter Katalog als STL (alle Tiere, Flexi, Beispiel-Namen) |

### Benutzen
```bash
python3 make.py keychain  "Mia"
python3 make.py nameplate "Familie Müller"
python3 make.py caketopper "Happy Birthday"

openscad -o tier_cat.stl -D 'kind="cat"' animal.scad
openscad -o flexi_chain.stl flexi_chain.scad
openscad -o flexi_cat.stl   -D 'kind="cat"'            flexi.scad
openscad -o flexi_snake.stl -D 'kind="snake"' -D 'n=12' flexi.scad
```
Voraussetzung: OpenSCAD (https://openscad.org/downloads.html). Für Render/Mesh-Cleanup
zusätzlich Blender headless (siehe Lern-Memory).

### Veredeln & Bauen
```bash
bash build_all.sh                                  # ganzer Katalog -> samples/

# Mesh (z. B. von Meshy) druckfertig machen + Struktur drauf:
python3 polish.py meshy_cat.glb --detail scales --cell 4 --strength 0.5 --size 50 --render
```
`polish.py`-Detailmuster: `scales` · `reptile` · `rough` · `none`.
**Ehrlich:** Detail = echte Geometrie (Drucker druckt Form). Auf **FDM** nur grobe
Struktur möglich (kräftige Schuppen ja, fotorealistische Mikro-Haut nein → Resin).
Funktioniert am besten auf **organischen/runden** Meshes, nicht auf flachen Platten.

### Rezept: Idee → druckfertige Farb-3MF (End-to-End, Meshy-Pipeline)
```bash
# 0) Key bereitlegen (NIE committen). Einmal pro Session:
export MESHY_API_KEY=msy_...          # oder: echo msy_... > /tmp/meshy.key

# 1) Form erzeugen  (Text ODER Bild — Bild ist treffsicherer bei Vorlage)
PROMPT="a cute sitting cat figurine, round eyes, pink ears, full body, solid" \
  REFINE=1 OUT=/tmp/cat.glb python3 meshy_text.py
# IMG=/tmp/cat_ref.jpg OUT=/tmp/cat.glb python3 meshy_image.py

# 2) Druckfertig machen (säubern, manifold, auf mm)
python3 polish.py /tmp/cat.glb --size 50 --remesh 0.45 --decimate 0.5 --render

# 3) Optional: Schlüsselring-Loch (erst Geometrie abtasten, dann bohren!)
IN=/tmp/cat.glb OUT=/tmp/cat_hole.glb PNG=renders/check.png \
  SIZE=50 AXIS=x HY=-7 HZ=21 HD=5 blender --background --python hole.py

# 4) Farbe → Bambu/AMS-Teile (Meshy-Textur in Palette einsortieren)
IN=/tmp/cat_hole.glb OUTDIR=samples/cat_parts MODE=texture \
  blender --background --python colorize.py

# 5) Zu EINER fertigen 3MF zusammenfügen (Farbe pro Dreieck)
IN=samples/cat_parts/colored.obj OUT=samples/cat.3mf PNG=renders/cat.png \
  blender --background --python assemble.py
# -> samples/cat.3mf in Bambu Studio öffnen, Farbe→Filament bestätigen, drucken.
```
**Augen-Stil = Prompt-Sache** (Meshy backt ihn in die Geometrie): „round eyes" vs
„X eyes" vor dem Generieren festlegen — NIE blind im Mesh nachsetzen.
**Vor der 20er-Serie** erst 1 Proof bei 30 % Skalierung drucken (fängt Farb-Fehler günstig ab).

---

## In-House drucken (Bambu Lab X1C + 2 AMS)

Eigener Drucker → Stückkosten in Rappen, kein Zoll (CH → CH), volle Kontrolle.
Craftcloud bleibt **Backup** bei Überlast.

**Mehrfarbig (AMS):** `nametag_base.scad` als Platte importieren → Bambu-Studio-Text-Werkzeug
für den Namen in zweiter Farbe → AMS druckt automatisch zweifarbig. Kostet Filament für
den Spülturm + etwas mehr Zeit.

---

## Flexi (print-in-place)

- **Eigene Flexi = sicher verkaufbar.** `flexi_chain.scad` (Kette) und `flexi.scad`
  (Flexi-Tier: Katze/Schlange/Raupe) sind beide selbst gebaut → frei verkaufbar.
- **`flexi.scad`** nutzt Kugel-Pfannen-Gelenke: Pfanne umschliesst >Halbkugel (Kugel
  gefangen), Spalt `clear=0.35`. Im Querschnitt geprüft, dass die Kugel sitzt; per
  Loose-Parts geprüft, dass alle Segmente getrennt sind (CGAL `Volumes = Segmente+1`).
  Default `$fn=48` (Bau ~2 Min); Segmente bewusst gleich gross (Pfanne braucht Material,
  dünner Schwanz unmöglich). `n=3` für Test-Druck, dann hochdrehen.
- **Fremde Flexi** (MakerWorld/Thingiverse) sind fast immer NonCommercial → **nicht
  verkaufbar**. Bearbeiten in Blender macht sie NICHT legal.
- **Echte Tier-Flexi** (Drache, Axolotl) → kommerzielle Lizenz (Cinderwing3D ~10 $/Mt)
  oder selbst in printpal.io bauen.
- Flexi braucht das richtige **Spaltmaß** → einmal auf dem X1C testen.

---

## Lern-Memory (Stand: Juni 2026)

Was in dieser Session gelernt/entschieden wurde — damit es nicht verloren geht:

**Werkzeuge im Container** (ephemer, pro Session neu via `apt`):
- `openscad` (parametrische STL + Renders), `blender` 4.0 headless + `xvfb`
  (Mesh-Reparatur/Cleanup von KI-Modellen, Format-Konvertierung, Renders).

**Flexi-Technik:**
- CGAL meldet `Volumes = Anzahl Glieder + 1` (Außenraum zählt mit).
  Geprüft `flexi_chain.scad`: `pitch` 11–11.5 → alle 6 Glieder getrennt UND verhakt
  (Volumes 7). Verhakt nur solange `pitch < 2*R - r` (= 13.8).
- Tuning: **verkleben → pitch erhöhen**; **fällt auseinander → pitch verringern**.
- Flexi braucht echten Test-Druck; am besten auf eigenem X1C (Toleranz steuerbar),
  über Craftcloud riskanter (Glieder können verkleben).
- Komplexe Tier-Flexi (Kater mit Beinen) ist schwer zu skripten → printpal/Lizenz.

**KI-3D (Meshy):**
- Erzeugt nur **statische** Meshes, **kein** Flexi (keine Gelenke).
- Meshes oft nicht druckbar → Blender-Cleanup (manifold) nötig.
- Sicherer ohne API-Key: Meshy-Download-Link schicken → hier per Skript verarbeiten.

**Recht / Lizenzen:**
- „Keine Lizenz" = automatisch verboten. Verkaufbar nur **CC0** oder **Commercial**.
- Fremde Produktfotos (MakerWorld) NICHT verwenden.

**Auto-Versand-Apps:**
- WAZP+ = fertiger Katalog (kein eigener STL-Upload, EU, hands-off).
- Shop3D / Slant3D = eigene STLs hochladen (Slant3D = USA → Zoll).
- Nur 1 Fulfiller pro Produkt. Personalisiertes bleibt manuell.

---

## Verbesserungs-Backlog (Selbstkritik — was noch besser werden muss)

Damit „alle Tiere/Gegenstände" zuverlässig druckbar + verkaufbar werden:

- **Standfläche/Boden:** Modelle müssen flach auf der Druckplatte sitzen (FDM ohne
  Stützen). → polish.py: Modell auto auf Z=0 setzen + `--base` (Boden flach schneiden). [erledigt]
- **Loop-Platzierung:** jetzt **senkrechter Bügel** (echter Anhänger-Look, Loch horizontal)
  statt flachem Heiligenschein. [verbessert] — Position noch generisch oben-mittig;
  perfekt pro Tier platzieren (Nacken/höchster solider Punkt) bleibt [TODO].
- **Dünne Stellen** (Ohren/Schwanz/Beine) können zu dünn zum Drucken sein. Auto-Verdicken
  ist heikel → besser im Meshy-Prompt „dicke, kräftige Gliedmaßen, keine dünnen Teile". [Prompt]
- **Manifold/Artefakte:** AI-Meshes haben oft Naht-Artefakte (schwarze Zacken am Rücken).
  → mit `--remesh 0.45` (Voxel) beheben = garantiert manifold/druckbar (weicht feine
  Details wie Schnurrhaare etwas auf — Kompromiss). [gelöst]
- **`--base` (flacher Boden):** hatte Bug (Hilfs-Würfel blieb im Export). → Hilfs-Meshes
  werden jetzt vor Export/Render entfernt. sit-on-plate reicht meist; `--base` mit Vorsicht.
- **Bewährter Befehl:** `python3 polish.py meshy.glb --size 50 --remesh 0.45 --decimate 0.5 --render`
- **Decimate** fix 0.2 → besser Ziel-Polycount statt festem Verhältnis. [TODO]
- **Render-Kamera** modellabhängig (Standalone-Render hatte Framing-Bugs) → robustere
  Rahmung. [TODO]
- **Standard-Größen** festlegen: Anhänger ~40 mm, Figur ~55–60 mm (statt ad hoc). [merken]
- **Mehrfarbig**: kein Auto-Multicolor; nur einfarbig (Filament) + manuell in Bambu Studio.
- **Flexi an Figuren**: nicht möglich; nur eigenständige Flexi (Kette) oder Lizenz.

### Stil-Vorgaben (Kunde — merken)
- **Standard = flache, liegende Kawaii-Katze/-Tiere**, taschentauglich (~10 mm dünn, 5–9 cm).
- **Gesicht GEZEICHNET/graviert**, keine 3D-Schnurrhaare (die mochte der Kunde nicht).
- Beliebt: „Derp/tote Katze" — **X-Augen, Zunge raus**, kawaii.
- **Flache, gravierte Designs → OpenSCAD** (`kawaii_cat.scad`), nicht Meshy (scharf, sauber,
  kein Artefakt). Meshy nur für **runde 3D-Figuren**.
- Farbe: einfarbig (Filament) ODER **AMS 2-farbig** (Körper + Gesicht/ Zunge in 2. Farbe).
- Flexi-Gelenke an Figuren: weiterhin nicht möglich.

### Finaler 3D-Stil (Kunde bestätigt)
- **Runde 3D-Figur** (Meshy Image/Text→3D) → `polish.py` → Augen = **die vorhandenen
  Meshy-Augen-Beulen einfach SCHWARZ einfärben** (KEIN extra X/keine Scheibe).
  Region um `(±6.5, -22, 11)`, R~4.5, Faces schwarz (kein Inflate → sonst stachelig).
- Körper **mittelgrau**, **Zunge orange** (Zungen-Faces per Region einfärben).
- Kunde-Entscheid „A": Beulen sind die Augen, nur Farbe. STL bleibt die Figur; Farben
  in Bambu Studio (AMS) malen: Augen-Beulen schwarz, Zunge orange, Körper grau.
- **Farbpalette (PLA):** gelb, rot, braun, grau, grün, weiß, schwarz, beige, pink, blau, violett.
- Pipeline-Skripte (Blender headless): in der Session unter `/tmp` (lenseye-Muster).

### Produktion / Batch (gelernt)
- Bei **Serie (z. B. 20 Stk)** muss das **Master-Modell perfekt** sein — KEIN Nacharbeiten
  pro Teil. Fehler im Master = 20× Handarbeit.
- **Augen NICHT nachträglich** auf die 3D-Figur setzen/editieren (blind unzuverlässig,
  landet daneben/spikt). → Stattdessen **die richtigen Augen von Anfang an per Meshy-Prompt
  einbacken**: „big round simple eyes" für runde Augen; „X eyes" backt X-Vertiefungen ein
  (von Geminis X-Augen) → die lassen sich NICHT sauber blind entfernen.
- Meshy backt den Augen-Stil aus dem Prompt in die Geometrie → Prompt = einzige zuverlässige
  Stell­schraube für die Augenform.

### Farbe für Bambu/AMS (gelöst)
- Meshy-Farbe = **Textur**; Bambu/AMS druckt Farbe pro **Region/Teil**, nicht aus Texturen.
- Tool `texture_to_parts.py` löst das: Textur auslesen → Filament-Palette → **STL pro Farbe**.
- In Bambu: alle `color_*.stl` importieren → „als ein Objekt zusammenfügen" → je Teil ein
  Filament → drucken. Einmal eingerichtet, dann 20× drucken. KEIN Malen.
- **Noch einfacher:** `assemble.py` packt die Teile in **eine 3MF** (Farbe pro Dreieck).
  Bambu öffnet 1 Objekt, fragt nur Farbe→Filament (Auto-Match). 3MF = nur ein ZIP mit
  XML (`basematerials` + Dreiecke mit `p1`), von Hand geschrieben — Blender hat kein 3MF.
- Palette per `PALETTE`-Env anpassbar (Default: weiss/schwarz/orange/rosa).

### Schlüsselring-Loch (gelöst)
- **Wichtig:** Meshy-GLBs kommen in **normierten Einheiten** (~2 Einheiten lang), NICHT mm.
  Boolean-Loch erst nach Skalieren auf mm setzen, sonst sitzt der Zylinder daneben/zerstört alles.
- `hole.py` (allgemein): `AXIS=z|x|y`, Position `HX/HY/HZ` (mm) oder `HXF/HYF/HZF` (Anteil),
  Ein-/Ausgabe glb **oder** obj (Farben bleiben). Pancake (flach): `AXIS=z HYF=0.62 HD=4.5`.
  Full-Body (sitzend): `AXIS=x HY=-7 HZ=21 HD=5` (Nacken/Scruff, waagrecht).
- **Blind-Bohren ist tabu** — genau wie bei den Augen. Erst die Geometrie **abtasten**
  (`scene.ray_cast`), dann bohren. 1. Versuch Full-Body ging durch **Luft** (Punkt war
  ausserhalb des Körpers). Ray-Cast = Bodentruth: 4 Treffer entlang der Achse = sauberer
  Tunnel; Wand über dem Loch ≥3 mm lassen (sonst reisst PLA).
- **Render-Macke:** Kamera exakt entlang X/Y (waagrecht, ohne Z-Versatz) rendert oft leer.
  Lösung: Kamera leicht erhöht/diagonal **oder** Modell 90° um Z drehen + Front-Kamera.
- Reihenfolge farbig+Loch: GLB → `hole.py` → `colorize.py` → `assemble.py`  ODER
  `colorize.py` → `hole.py` (obj→obj) → `assemble.py`.

### Prompt-Bibliothek (erprobt)
- Funktioniert: `"a cute <tier> figurine, smooth stylized, solid, simple, no separate base"`
  (+ `"long tail curled to the side"` für Schwanz, + `"lying down"` für liegend).
- Vermeiden: „fluffy / long-haired" → wird ein Blob. Für Druck: „chunky, thick limbs".
- Pipeline: Meshy (Form, ~50–70%) → `polish.py` (säubern, decimate, Boden, Loop, Größe, Render).

### Generatoren & Hilfe (Recherche Juni 2026)
Stand der besten Text/Bild→3D-Tools — Reihenfolge nach Nutzen für uns (Bambu, Figuren):
- **Meshy** — unser Haupttool. Einziges mit **1-Klick-Bambu-Studio-Plugin + 3MF-Export**,
  ~97 % Slicer-Pass. Auch in Bambus **MakerWorld** integriert (Bild→3D→Mehrfarbdruck).
- **Hitem3D / Hi3D** — höchste Mesh-Auflösung (1536³), gemacht für **Tabletop-Figuren** +
  Bambu, „print-ready STL in 2 Min". Antesten, wenn Meshy zu grob wird.
- **Tripo** — am schnellsten (~8 s), saubere wasserdichte Meshes, Gratis-Stufe. Gut für Figuren.
- **Rodin Gen-2** — höchste Foto-Realität/Detail (10-Mrd-Modell), aber teurer/langsamer.
- **Hunyuan3D 2** (Tencent, **Open Source, Apache 2.0, gratis**) — selbst hosten, läuft ab
  ~6 GB VRAM. Kein Abo → passt zu „lieber selbst statt Abo", braucht aber eine GPU.
- **Trellis** (Microsoft, Open Source) — gratis, lokal via ComfyUI.
- **3D AI Studio** — mehrere Modelle unter einem Dach (Abo ~19–29 $/Mt).

Druck-/Aufräum-Tipps (decken sich mit unserer Pipeline):
- KI liefert 70–90 %, **immer Aufräum-Pass** (machen wir mit `polish.py`); dünne Teile
  auf ~8 000 Faces remeshen.
- **3–5 kräftige Farben mit klaren Zonen** drucken am saubersten im AMS (unsere Katzen passen).
- **Vor der 20er-Charge erst 1 Proof bei 30 % Skalierung** drucken → fängt Farb-Fehlzuordnung
  in 20 Min statt 5 h ab. (Wichtigster Tipp für Serien.)
- Bambu: **Variable Layer Height** für glatte Figuren; 0,12–0,16 mm Detail, Tree-Supports
  für organische Überhänge, 15–20 % Infill, PLA.

---

## Projekt-Gedächtnis

- **Markt:** Schweiz zuerst. EU/DACH später (GPSR, Einfuhr-MwSt/IOSS, EU-Widerruf).
- **Betreiber:** Allen Chour, Hühnerhubelstrasse 37, 3123 Belp, CH ·
  Einzelfirma, nicht im HR, nicht mehrwertsteuerpflichtig.
- **Recht:** 6 Shop-Texte geschrieben → in Shopify → Einstellungen → Richtlinien einfügen.
- **Drucker:** Bambu Lab X1C + 2 AMS. In-House = Hauptweg, Craftcloud = Backup.
- **Shopify (DRAFT, nichts live):** Tier-Schlüsselanhänger (8 Tiere × 6 Farben),
  Namens-Anhänger, Namensschild, Cake-Topper.
- **Social:** `posts.json` für `../social/post.py` (eigene LuxeStyle-Kanäle nutzen).
- **Bestehender Shop:** CJdropshipping-Artikel (Mode + Gadgets) — Sortiment unfokussiert.
