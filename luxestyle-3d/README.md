# LuxeStyle — 3D-Druck-Pipeline (personalisierte Geschenke + Flexi)

Werkzeuge und Gedächtnis für den Geschäftszweig „3D-Druck-Produkte" im Shop
**luxestyle.ch** (Shopify Basic, CHF, Schweiz). Selbst erzeugte Designs = null
Lizenzproblem. **Erst Sample, dann Shopify. Live schalten nur der Inhaber.**

## Generator-Baukasten

| Datei | Produkt |
|-------|---------|
| `keychain.scad` | Namens-Schlüsselanhänger |
| `nameplate.scad` | Namensschild (Tür / Schreibtisch) |
| `caketopper.scad` | Cake-Topper mit Wunschtext |
| `nametag_base.scad` | Grundplatte (ohne Text) für mehrfarbige Anhänger (X1C + AMS) |
| `animal.scad` | 8 Tier-Silhouetten (cat, bear, rabbit, fish, paw, dog, heart, star) |
| `flexi_chain.scad` | Print-in-Place Gliederkette (beweglich, in einem Stück) |
| `kawaii_cat.scad` | **Flache Kawaii-Katze** (Loaf): graviertes Gesicht (X-Augen, Schnurrhaare, Mund), erhabene Zunge, Loop-Loch, parametrisch 50–90 mm |
| `pancake_cat.scad` | **Flache Kawaii-Pfannkuchen-Katze** (gespreizte Pose, Beine raus) + graviertes Derp-Gesicht + Schwanz + Loch |
| `cat_charm.scad` | **Mehrfarbiger** flacher Kawaii-Katzen-Charm (AMS): weiß + orange Flecken, **schwarze X-Augen**, **orange Zunge** — Farbteile als eigene Geometrie |
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
- **Runde 3D-Figur** (Meshy Image/Text→3D) → `polish.py` → **flache eckige schwarze
  X-Augen auf die Augen-Beulen** setzen (Bars in Gesichtsebene, um Y-Achse gedreht,
  NICHT senkrecht; Position ~`(±6, -22, 11)` bei der Katze — pro Tier neu finden).
- Körper **hellgrau**, **Zunge orange**, X-Augen **komplett schwarz**.
- Eye-Carving (Differenz) vermeiden → gibt Zickzack. Stattdessen erhabene Bars (Union).
- **Farbpalette (PLA):** gelb, rot, braun, grau, grün, weiß, schwarz, beige.
- Pro Tier: Augen-Beulen per Nahaufnahme-Render finden, dann X platzieren (1–2 Nudges).

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
