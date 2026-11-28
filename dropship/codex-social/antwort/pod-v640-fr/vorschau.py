"""Erstellt eine private, offline bedienbare FR-Vorschau. Keine Shop-Schreibzugriffe."""

import argparse
import base64
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
from urllib.request import urlopen

from pruefen import QUELLE, VARIANTE, original


HIER = Path(__file__).resolve().parent
NEUE_BASIS = "pod/v6/lspod-designer-v6-6.4.2.js"
FOTO_SHA = "58f409c6763e16f48a504c3d2d1704c18b291c882f5749c18fad184d50fdbbb4"


def pruefsumme(daten, erwartet):
    if hashlib.sha256(daten).hexdigest() != erwartet:
        raise ValueError("Abweichende Quelldatei")


def kandidat(version="6.4.2"):
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        basis = original(QUELLE)
        pruefsumme(basis, "e7e30bc231e6817f70e2cbd8089f57c82ad5ea7c285585709223798c16adb930")
        pfad = tmp / QUELLE
        pfad.parent.mkdir(parents=True)
        pfad.write_bytes(basis)
        subprocess.run(["git", "apply", HIER / "pod-v640-fr.patch"], cwd=tmp, check=True)
        subprocess.run(["git", "apply", HIER / "bestellwerte.patch"], cwd=tmp, check=True)
        pruefsumme(pfad.read_bytes(), "e41d0e6cebae111588f06332d8d8c2f7509412b2a0b8c88ac8fe34464f803cb3")
        if version == "6.4.0":
            return pfad.read_bytes()
        if version != "6.4.2":
            raise ValueError("Unbekannte Vorschauversion")
        alt, neu = tmp / "basis640.js", tmp / "basis642.js"
        alt.write_bytes(basis)
        neu.write_bytes(original(NEUE_BASIS))
        pruefsumme(neu.read_bytes(), "7d4c3639d310bc2a5592f6a8d21a6e347f1875bd7eeb3b8177aee7af5faf35ff")
        # Eine einzige Übersetzungsquelle für beide Versionen. Bei Konflikt bricht der Bau ab.
        merge = subprocess.check_output(["git", "merge-file", "-p", neu, alt, pfad])
        ziel = tmp / "portage.js"
        ziel.write_bytes(merge)
        subprocess.run(["git", "apply", HIER / "portage-642.patch"], cwd=tmp, check=True)
        code = ziel.read_bytes()
        pruefsumme(code, "66e54d346e2887f635f557155d1f2e4d539c4a5331654e83c8a1a7fc76ae9adb")
        return code


def karte(art):
    return json.loads(original(f"pod/v6/maps/lspod-15422823465345.{art}.json"))


def foto_holen(adresse):
    with urlopen(adresse, timeout=12) as antwort:
        return antwort.read(300000)


def inline_json(obj):
    return json.dumps(obj, ensure_ascii=False).replace("<", "\\u003c")


def html(code, foto):
    pruefsumme(foto, FOTO_SHA)
    druck = karte("karte")
    vorschau = karte("vorschau")
    tassenansicht = vorschau["modelle"]["19"]["tasse"]["1320"]
    tassenansicht["foto"] = "data:image/jpeg;base64," + base64.b64encode(foto).decode()
    # Einziger sichtbarer Wert ist 325 ml. Andere Varianten und ihre Fotos sind nicht Teil der lokalen Probe.
    for feld in (druck["platzierungen"][0], *druck["platzierungen"][0]["geometrien"]):
        feld["vorlage"]["bildUrl"] = None
    source = base64.b64encode(code).decode()
    return f"""<!doctype html>
<html lang="fr-CH"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' data:; style-src 'unsafe-inline'; img-src data: blob:; connect-src 'none'; form-action 'none'; base-uri 'none'">
<title>Tasse en céramique – aperçu privé de personnalisation</title>
<style>body{{margin:0 auto;max-width:46rem;padding:1rem;color:#27231f;background:#faf8f5;font:16px/1.5 system-ui}}h1{{line-height:1.2}}p{{margin:.5rem 0 1rem}}</style>
<h1>Tasse en céramique à personnaliser</h1><p>325 ml · CHF 22.90</p>
<p>Aperçu privé. Ajoutez votre texte, puis vérifiez le bon à tirer. Aucun fichier ni aucune commande ne sont envoyés.</p>
<p id="retour" role="status"></p>
<form action="/cart/add" method="post"><label>Contenance <select name="id"><option value="{VARIANTE}" selected>325 ml</option></select></label></form>
<div class="lspod-designer-v6" id="lspod-start" data-variant="{VARIANTE}" data-product-title="Tasse en céramique à personnaliser" data-karte-pflicht="1" data-bearbeiten="1">
<script type="application/json" id="lspod-karte">{inline_json(druck)}</script>
<script type="application/json" id="lspod-vorschau">{inline_json(vorschau)}</script></div>
<script>
window.Shopify={{locale:"fr-CH"}};
document.addEventListener("submit",function(e){{e.preventDefault()}},true);
document.addEventListener("click",function(e){{
 if(e.target.closest(".lsp6-review-confirm, .lsp6-toolbar input[type=file]")){{
  e.preventDefault();e.stopImmediatePropagation();
  document.getElementById("retour").textContent="Fin de l’essai. Aucune commande et aucun envoi.";
  if(e.target.closest(".lsp6-review-confirm")) document.querySelector(".lsp6-review-back").click();
 }}
}},true);
</script><script src="data:text/javascript;base64,{source}"></script></html>"""


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--version", choices=["6.4.0", "6.4.2"], default="6.4.2")
    p.add_argument("ausgabe", type=Path, help="Neue lokale HTML-Datei")
    p.add_argument("--foto", type=Path, help="Vorhandenes Originalfoto für vollständig netzlosen Bau")
    args = p.parse_args()
    adresse = karte("vorschau")["modelle"]["19"]["tasse"]["1320"]["foto"]
    foto = args.foto.read_bytes() if args.foto else foto_holen(adresse)
    seite = html(kandidat(args.version), foto)
    with args.ausgabe.open("x", encoding="utf-8") as f:
        f.write(seite)
    print(args.ausgabe)


if __name__ == "__main__":
    main()
