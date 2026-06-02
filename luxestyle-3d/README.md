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
| `make.py` | erzeugt aus jedem Text eine druckfertige `.stl` |
| `polish.py` | **Veredelung (Blender):** Mesh säubern, glätten, Schuppen-/Detail-Struktur, auf mm skalieren, STL + Render |
| `build_all.sh` | **1 Befehl** → kompletter Katalog als STL (alle Tiere, Flexi, Beispiel-Namen) |

### Benutzen
```bash
python3 make.py keychain  "Mia"
python3 make.py nameplate "Familie Müller"
python3 make.py caketopper "Happy Birthday"

openscad -o tier_cat.stl -D 'kind="cat"' animal.scad
openscad -o flexi_chain.stl flexi_chain.scad
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

---

## In-House drucken (Bambu Lab X1C + 2 AMS)

Eigener Drucker → Stückkosten in Rappen, kein Zoll (CH → CH), volle Kontrolle.
Craftcloud bleibt **Backup** bei Überlast.

**Mehrfarbig (AMS):** `nametag_base.scad` als Platte importieren → Bambu-Studio-Text-Werkzeug
für den Namen in zweiter Farbe → AMS druckt automatisch zweifarbig. Kostet Filament für
den Spülturm + etwas mehr Zeit.

---

## Flexi (print-in-place)

- **Eigene Flexi = sicher verkaufbar.** `flexi_chain.scad` ist der zuverlässige Start.
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
- **Farbpalette (PLA):** gelb, rot, braun, grau, grün, weiß, schwarz, beige.
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

### Prompt-Bibliothek (erprobt)
- Funktioniert: `"a cute <tier> figurine, smooth stylized, solid, simple, no separate base"`
  (+ `"long tail curled to the side"` für Schwanz, + `"lying down"` für liegend).
- Vermeiden: „fluffy / long-haired" → wird ein Blob. Für Druck: „chunky, thick limbs".
- Pipeline: Meshy (Form, ~50–70%) → `polish.py` (säubern, decimate, Boden, Loop, Größe, Render).

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
