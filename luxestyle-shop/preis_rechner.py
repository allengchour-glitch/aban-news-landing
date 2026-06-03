#!/usr/bin/env python3
"""Preis-Rechner für 3D-Druck-Produkte (luxestyle.ch, CHF).

Rechnet von den echten Kosten zum Verkaufspreis — kein erfundener Preis, sondern
Material + Maschine + Arbeit + Verpackung × Marge. Das Filament-Gewicht kann es
direkt aus einer STL schätzen (Mesh-Volumen), oder du gibst die echte Zahl aus
dem Slicer (Bambu Studio) an — die ist immer genauer.

Nutzung:
  # Gewicht aus STL schätzen:
  python3 preis_rechner.py --stl ../luxestyle-3d/products/mimi/mimi_einfarbig_komplett.stl

  # Echtes Slicer-Gewicht (genauer) + Druckzeit angeben:
  python3 preis_rechner.py --gramm 18 --zeit 2.5

  # Mengen-Rabatt-Logik / eigene Marge:
  python3 preis_rechner.py --gramm 18 --zeit 2.5 --marge 3.0 --arbeit-min 10

Konfiguration (Filamentpreis, Maschinensatz, Marge …) in config.json — anpassbar,
keine erfundenen Werte, alle als „Annahme, prüf sie" dokumentiert.

Reine Python-stdlib. Schätzung ≠ Slicer-Wahrheit: das STL-Volumen nimmt das Modell
als grob gefülltes Volumen; echter FDM-Druck (Wände + Infill) wiegt weniger. Drum
gibt es einen --fuellfaktor (Default 0.4) und der Hinweis: für die Serie das echte
Bambu-Studio-Gewicht (--gramm) nehmen.
"""
import json, struct, sys, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
CONFIG = HERE / "config.json"

DEFAULT_CONFIG = {
    "_hinweis": "Annahmen — vor dem ersten echten Verkauf prüfen. Schweizer Werte (CHF).",
    "filament_chf_pro_kg": 25.0,      # PLA, typischer CH-Preis (Bambu/Sunlu). Prüfen.
    "maschine_chf_pro_h": 0.80,       # Strom + Verschleiss/Abschreibung X1C, grob. Prüfen.
    "arbeit_chf_pro_h": 30.0,         # dein Stundensatz für Rüsten/Nacharbeit/Verpacken.
    "verpackung_chf": 1.20,           # Karton/Polster/Etikett pro Stück.
    "marge_faktor": 2.5,              # Verkaufspreis = Selbstkosten × Faktor (Handarbeit).
    "runden_auf": 0.90,               # psychologisches Runden: x.90 (CHF).
    "fuellfaktor_default": 0.40,      # STL-Volumen → echtes Druckgewicht (Wände+Infill), grob.
    "pla_dichte_g_cm3": 1.24,         # PLA-Dichte.
}


def load_config():
    if CONFIG.exists():
        cfg = dict(DEFAULT_CONFIG)
        cfg.update(json.loads(CONFIG.read_text(encoding="utf-8")))
        return cfg
    CONFIG.write_text(json.dumps(DEFAULT_CONFIG, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"ℹ️  config.json mit Standard-Annahmen angelegt: {CONFIG}\n")
    return dict(DEFAULT_CONFIG)


def stl_volumen_cm3(path):
    """Liest binäre ODER ASCII-STL und gibt das Mesh-Volumen in cm³ (Einheit = mm angenommen)."""
    data = Path(path).read_bytes()
    tris = _read_binary(data)
    if tris is None:
        tris = _read_ascii(data)
    if not tris:
        raise ValueError("Keine Dreiecke in der STL gefunden.")
    vol_mm3 = 0.0
    for (a, b, c) in tris:
        # signiertes Tetraeder-Volumen gegen den Ursprung, aufsummiert
        vol_mm3 += (a[0]*(b[1]*c[2] - b[2]*c[1])
                    - a[1]*(b[0]*c[2] - b[2]*c[0])
                    + a[2]*(b[0]*c[1] - b[1]*c[0])) / 6.0
    return abs(vol_mm3) / 1000.0, len(tris)


def _read_binary(data):
    if len(data) < 84:
        return None
    n = struct.unpack_from("<I", data, 80)[0]
    if len(data) != 84 + n * 50:
        return None  # passt nicht zur binären Struktur → wahrscheinlich ASCII
    tris = []
    off = 84
    for _ in range(n):
        vals = struct.unpack_from("<12f", data, off)
        tris.append((vals[3:6], vals[6:9], vals[9:12]))
        off += 50
    return tris


def _read_ascii(data):
    try:
        text = data.decode("utf-8", "ignore")
    except Exception:
        return None
    if "facet" not in text:
        return None
    verts, tris = [], []
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("vertex"):
            _, x, y, z = line.split()[:4]
            verts.append((float(x), float(y), float(z)))
            if len(verts) == 3:
                tris.append(tuple(verts)); verts = []
    return tris


def rechne(gramm, zeit_h, cfg, arbeit_min, marge=None):
    marge = marge if marge is not None else cfg["marge_faktor"]
    material = gramm / 1000.0 * cfg["filament_chf_pro_kg"]
    maschine = zeit_h * cfg["maschine_chf_pro_h"]
    arbeit = arbeit_min / 60.0 * cfg["arbeit_chf_pro_h"]
    verpackung = cfg["verpackung_chf"]
    selbstkosten = material + maschine + arbeit + verpackung
    roh = selbstkosten * marge
    step = cfg["runden_auf"]
    # auf nächstes ganzes + step aufrunden (z. B. 14.23 -> 14.90)
    preis = math.floor(roh) + step
    if preis < roh:
        preis += 1.0
    return {
        "material": material, "maschine": maschine, "arbeit": arbeit,
        "verpackung": verpackung, "selbstkosten": selbstkosten,
        "marge": marge, "preis": round(preis, 2),
    }


def chf(x):
    return f"CHF {x:6.2f}"


def main():
    a = sys.argv[1:]
    def opt(name, default=None, cast=float):
        if name in a:
            return cast(a[a.index(name) + 1])
        return default

    cfg = load_config()
    gramm = opt("--gramm")
    zeit = opt("--zeit", 0.0)
    arbeit_min = opt("--arbeit-min", 8.0)
    marge = opt("--marge")
    stl = a[a.index("--stl") + 1] if "--stl" in a else None
    fuell = opt("--fuellfaktor", cfg["fuellfaktor_default"])

    geschaetzt = False
    if gramm is None and stl:
        vol_cm3, ntris = stl_volumen_cm3(stl)
        gramm = vol_cm3 * cfg["pla_dichte_g_cm3"] * fuell
        geschaetzt = True
        print(f"📐 STL: {Path(stl).name}  ·  {ntris:,} Dreiecke  ·  Volumen {vol_cm3:.2f} cm³")
        print(f"   Gewicht-Schätzung: {vol_cm3:.2f} cm³ × {cfg['pla_dichte_g_cm3']} g/cm³ "
              f"× Füllfaktor {fuell} = {gramm:.1f} g  (Slicer-Wert ist genauer!)\n")

    if gramm is None:
        print("Fehler: gib --gramm <g> ODER --stl <datei> an.\n")
        print(__doc__); sys.exit(1)

    r = rechne(gramm, zeit, cfg, arbeit_min, marge)
    print("🧮 Kalkulation" + ("  (Gewicht geschätzt)" if geschaetzt else ""))
    print("-" * 40)
    print(f"  Material   {gramm:5.1f} g     {chf(r['material'])}")
    print(f"  Maschine   {zeit:5.1f} h     {chf(r['maschine'])}")
    print(f"  Arbeit     {arbeit_min:5.0f} min   {chf(r['arbeit'])}")
    print(f"  Verpackung            {chf(r['verpackung'])}")
    print("-" * 40)
    print(f"  Selbstkosten          {chf(r['selbstkosten'])}")
    print(f"  × Marge {r['marge']:.1f}")
    print("=" * 40)
    print(f"  💰 Verkaufspreis      {chf(r['preis'])}")
    print("=" * 40)
    if zeit == 0.0:
        print("\n⚠️  Ohne --zeit fehlt der Maschinenanteil. Druckzeit aus Bambu Studio nachtragen.")
    print("\nEhrlich: Schätzung zum Starten. Für die Serie das echte Slicer-Gewicht (--gramm)\n"
          "und die Druckzeit (--zeit) aus Bambu Studio nehmen — dann stimmt die Marge.")


if __name__ == "__main__":
    main()
