"""Mobile Prüfung mit der echten Produktkarte, exklusiv über lokale Browserantworten."""

import base64
import hashlib
import os
import shutil
import subprocess
import tempfile
from pathlib import Path
from urllib.parse import urlsplit



BASIS = "8b3ab325a67292cd6a5c498d08a744b9d4aa3a6e"
QUELLE = "pod/v6/lspod-designer-v6-6.4.0.js"
VARIANTE = "55777979629953"
PNG = base64.b64decode("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==")
# Gleiche Steuerelemente in allen Sprachen, Reihenfolge wie im Kaufweg.
DE = ("➕ Text", "Druckvorschau prüfen", "Druckvorschau bestätigen und in den Warenkorb",
      "Ich habe alle Druckflächen und die gewählte Ausführung geprüft.", "Weiter gestalten", "Druckfläche")
EN = ("➕ Text", "Review print preview", "Confirm print preview and add to cart",
      "I have checked every print area and the selected option.", "Keep designing", "Print file")
FR = ("Ajouter du texte", "Vérifier le bon à tirer", "Confirmer le bon à tirer et ajouter au panier",
      "J’ai vérifié chaque zone d’impression et la variante choisie.", "Continuer à personnaliser", "Zone d’impression")


def original(pfad):
    return subprocess.check_output(["git", "show", f"{BASIS}:{pfad}"])


def pruefen(browser, sprache, dateien, texte):
    add, cta, bestaetigen, zustimmung, weiter, zone = texte
    context = browser.new_context(viewport={"width": 390, "height": 844}, service_workers="block")
    schreibversuche = []
    fehler = []

    def nur_lokale_antworten(route):
        request = route.request
        url = urlsplit(request.url)
        if request.method not in ("GET", "HEAD"):
            schreibversuche.append((request.method, url.path))
            return route.abort()
        if url.hostname == "127.0.0.1" and url.path in dateien:
            typ, daten = dateien[url.path]
            return route.fulfill(body=daten, content_type=typ)
        if request.resource_type == "image":
            return route.fulfill(body=PNG, content_type="image/png", headers={"Access-Control-Allow-Origin": "*"})
        return route.abort()

    try:
        context.route("**/*", nur_lokale_antworten)
        page = context.new_page()
        page.on("pageerror", lambda fehlertext: fehler.append(str(fehlertext)))
        page.goto(f"http://127.0.0.1/test?karte=tasse&vorschau=tasse&pflicht=1&bearbeiten=1&varianten={VARIANTE}:Standard&lang={sprache}")
        editor = page.locator(".lsp6").first
        editor.get_by_role("button", name=add, exact=True).click()
        eingabe = editor.locator("textarea:visible")
        eingabe.fill("Motif 28")
        eingabe.press("Tab")
        editor.get_by_role("button", name=cta, exact=True).click()
        dialog = page.get_by_role("dialog")
        knopf = dialog.get_by_role("button", name=bestaetigen, exact=True)
        knopf.wait_for()
        assert knopf.is_disabled() and zone in dialog.inner_text()
        dialog.get_by_role("checkbox", name=zustimmung, exact=True).check()
        assert knopf.is_enabled()
        dialog.get_by_role("button", name=weiter, exact=True).click()
        assert not knopf.is_visible()
        page.wait_for_function("() => Object.keys(localStorage).some(k => k.startsWith('lspod6:entwurf:') && localStorage.getItem(k).includes('Motif 28'))")
        page.reload()
        page.wait_for_function("() => [...document.querySelectorAll('.lsp6')].some(e => e.innerText.includes('Motif 28'))")
        assert not fehler and not schreibversuche, (fehler, schreibversuche)
    finally:
        context.close()


def main():
    from playwright.sync_api import sync_playwright

    basis = original(QUELLE)
    assert hashlib.sha256(basis).hexdigest() == "e7e30bc231e6817f70e2cbd8089f57c82ad5ea7c285585709223798c16adb930"
    patch = Path(__file__).resolve().with_name("pod-v640-fr.patch")
    with tempfile.TemporaryDirectory() as tmp:
        ziel = Path(tmp, QUELLE)
        ziel.parent.mkdir(parents=True)
        ziel.write_bytes(basis)
        subprocess.run(["git", "apply", "--check", patch], cwd=tmp, check=True)
        subprocess.run(["git", "apply", patch], cwd=tmp, check=True)
        kandidat = ziel.read_bytes()
    assert hashlib.sha256(kandidat).hexdigest() == "60bcc4fbbdbdab43288b2797eda9c70c9a9c48c22a51f9a37445c14bfa5dfb48"
    dateien = {
        "/test": ("text/html; charset=utf-8", original("pod/v6/test/mock.html")),
        "/karten/tasse.json": ("application/json", original("pod/v6/maps/lspod-15422823465345.karte.json")),
        "/vorschau/tasse.json": ("application/json", original("pod/v6/maps/lspod-15422823465345.vorschau.json")),
    }
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or shutil.which("chromium"))
        for version, js, sprache, texte in [
            ("Basis", basis, "fr-CH", DE),
            ("Vorschlag", kandidat, "fr", FR),
            ("Vorschlag", kandidat, "fr-CH", FR),
            ("Vorschlag", kandidat, "de-CH", DE),
            ("Vorschlag", kandidat, "en", EN),
        ]:
            dateien["/lspod-designer-v6.js"] = ("application/javascript; charset=utf-8", js)
            pruefen(browser, sprache, dateien, texte)
            print(f"{version} {sprache} OK", flush=True)
        browser.close()


if __name__ == "__main__":
    main()
