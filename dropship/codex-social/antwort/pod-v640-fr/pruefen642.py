"""Lokale Browserprobe des Portierungsvorschlags mit der echten 325-ml-Produktkarte."""

import argparse
import os
import shutil
import time
from pathlib import Path

from playwright.sync_api import sync_playwright
from pruefen import DE, EN, FR, QUELLE, VARIANTE, original
from vorschau import NEUE_BASIS, foto_holen, html, karte, kandidat

URL = "http://127.0.0.1/fr/products/keramik-tasse-selbst-gestalten"
AKTIONSLOS = "/privat/tasse"


def pruefe(browser, code, foto, sprache, texte, breite=390, ausverkauft=False):
    add, cta, bestaetigen, zustimmung, weiter, zone = texte
    quelle = html(code, foto).replace('locale:"fr-CH"', f'locale:"{sprache}"')
    # Für dieses Szenario darf der Browser einzig die lokale Verfügbarkeitsattrappe lesen.
    if ausverkauft:
        quelle = quelle.replace("connect-src 'none'", "connect-src 'self'")
    context = browser.new_context(viewport={"width": breite, "height": 844}, service_workers="block")
    erwartet = URL if ausverkauft else "http://127.0.0.1" + AKTIONSLOS
    fehler, fremd, bestandsabfragen = [], [], []

    def lokal(route):
        req = route.request
        if req.method == "GET" and req.url == erwartet:
            return route.fulfill(body=quelle, content_type="text/html; charset=utf-8")
        if ausverkauft and req.method == "GET" and req.url == URL.replace("/fr/", "/") + ".js":
            bestandsabfragen.append(req.url)
            return route.fulfill(json={"variants": [{"id": VARIANTE, "available": False}]})
        fremd.append((req.method, req.url))
        return route.abort()

    try:
        context.route("http*/**", lokal)
        page = context.new_page()
        page.on("pageerror", lambda exc: fehler.append(str(exc)))
        page.goto(erwartet)
        editor = page.locator(".lsp6").first
        editor.get_by_role("button", name=add, exact=True).click()
        editor.locator("textarea:visible").fill("Lune")
        editor.locator("textarea:visible").press("Tab")
        if ausverkauft:
            knopf = editor.get_by_role("button", name=cta, exact=True)
            assert knopf.get_attribute("aria-disabled") == "true"
            knopf.click(force=True)
            assert editor.locator('[data-feld="status"]').inner_text() == "Cette variante est épuisée. Choisissez-en une autre."
            assert not page.get_by_role("dialog").count() and bestandsabfragen
            return

        editor.get_by_role("button", name=cta, exact=True).click()
        dialog = page.get_by_role("dialog")
        knopf = dialog.get_by_role("button", name=bestaetigen, exact=True)
        knopf.wait_for()
        assert knopf.is_disabled() and "325 ml" in dialog.inner_text() and zone in dialog.inner_text()
        imgs = dialog.locator("img")
        imgs.last.wait_for()
        result = imgs.evaluate_all("""async xs => {
          await Promise.all(xs.map(i => i.decode()));
          const ed = window.LSPOD6.editors[0], druck = await ed.druckdateiErzeugen('default');
          const hash = async bytes => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)), x => x.toString(16).padStart(2,'0')).join('');
          const v = xs.find(i => i.hasAttribute('data-review-product')), cv = document.createElement('canvas');
          cv.width=v.naturalWidth; cv.height=v.naturalHeight;
          const ctx = cv.getContext('2d'); ctx.drawImage(v,0,0);
          return {druck:await hash(await druck.arrayBuffer()), foto:await hash(ctx.getImageData(0,0,cv.width,cv.height).data),
                  masse:xs.map(i=>[i.naturalWidth,i.naturalHeight]), eigenschaften:ed.eigenschaften()};
        }""")
        assert result["masse"] == [[2700, 1050], [800, 800]]
        dialog.get_by_role("checkbox", name=zustimmung, exact=True).check()
        assert knopf.is_enabled()
        knopf.click()
        assert "Fin de l’essai" in page.locator("#retour").inner_text()
        for _ in range(20):
            if page.evaluate("Object.keys(localStorage).some(k=>k.startsWith('lspod6:entwurf:') && localStorage.getItem(k).includes('Lune'))"):
                break
            time.sleep(0.1)
        else:
            raise AssertionError("Entwurf wurde nicht lokal gespeichert")
        page.reload()
        page.locator(".lsp6").first.get_by_text("Lune", exact=True).first.wait_for()
        # Eigene reine Serialisierungsprobe: keine Datei auswählen oder hochladen.
        result["beschreibungen"] = page.evaluate("""() => {
          const ed = window.LSPOD6.editors[0], ebenen = ed.st.ebenen.default;
          const bild = {type:'image'}, sticker = {type:'sticker', name:'Artikelprobe'};
          const einzel = [bild, sticker].map(e => {
            ebenen.push(e);
            try { return ed.eigenschaften(); } finally { ebenen.pop(); }
          });
          return einzel;
        }""")
        return result
    finally:
        context.close()
        assert not fehler and not fremd, (fehler, fremd)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--foto", type=Path)
    args = parser.parse_args()
    foto = args.foto.read_bytes() if args.foto else foto_holen(karte("vorschau")["modelle"]["19"]["tasse"]["1320"]["foto"])
    code = kandidat()
    with sync_playwright() as pw:
        browser = pw.chromium.launch(executable_path=os.environ.get("CHROMIUM") or shutil.which("chromium"))
        try:
            for lang, texte in [("fr-CH", FR), ("de-CH", DE)]:
                reference = pruefe(browser, original(QUELLE), foto, lang, DE)
                altkandidat = pruefe(browser, kandidat("6.4.0"), foto, lang, texte)
                assert reference == altkandidat, lang
                print(f"6.4.0 mit stabilen Bestellwerten bestätigt ({lang})")
            basis = pruefe(browser, original(NEUE_BASIS), foto, "fr-CH", DE)
            for lang, texte, breite in [("fr", FR, 390), ("fr-CH", FR, 390), ("fr-CH", FR, 1280), ("de-CH", DE, 390), ("en", EN, 390)]:
                r = pruefe(browser, code, foto, lang, texte, breite)
                erwartet = pruefe(browser, original(NEUE_BASIS), foto, lang, EN) if lang == "en" else basis
                assert r == erwartet, (lang, breite, r, erwartet)
                print(f"{lang} bei {breite} px, Prüfung, Druck-PNG, Fotopixel und Warenkorbeigenschaften bestätigt")
            pruefe(browser, code, foto, "fr-CH", FR, ausverkauft=True)
            print("Getrennter Testfall für die französische Ausverkauft-Meldung bestätigt.")
            print("SHA-256 Druckdatei", basis["druck"], "Fotopixel", basis["foto"])
        finally:
            browser.close()


if __name__ == "__main__":
    main()
