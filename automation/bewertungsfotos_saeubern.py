"""Nimmt aus den Judge.me-Bewertungen der vier «Bewertungssieger» die Fotos heraus, die den
LIEFERANTEN oder eine FREMDE MARKE zeigen — ohne eine einzige Bewertung anzufassen.

═══════════════════════════════════════════════════════════════════════════════════════════
DER BEFUND (14.08.2026)
═══════════════════════════════════════════════════════════════════════════════════════════
Vier Produkte tragen zusammen 115 Bewertungsfotos, alle von `ae-pic-a1.aliexpress-media.com`
hotverlinkt (Judge.me-AliExpress-Import, `source: "aliexpress"`):

    Klassische Herrenuhr Edelstahl   15396249960833   49 Fotos
    Slim Wallet Echtleder            15396249502081   43 Fotos
    Jade Roller & Gua Sha Set        15397247385985   12 Fotos
    Strand-Maxikleid «Bali»          15412915339649   11 Fotos

Ich habe alle 115 heruntergeladen, mit Tesseract gelesen und als Kontaktbogen angesehen.
Zwölf davon zeigen nicht das Produkt, sondern seine Herkunft.

═══════════════════════════════════════════════════════════════════════════════════════════
DIE ENTSCHEIDUNGSREGEL — und warum sie so eng ist
═══════════════════════════════════════════════════════════════════════════════════════════
Der erste Entwurf wollte «jedes Foto entfernen, auf dem eine fremde Marke lesbar ist». Der
Probelauf zeigte, warum das falsch gewesen wäre: Die Geldbörse trägt den Schriftzug CONTACTS
IM LEDER GEPRÄGT. Bei 43 Wallet-Fotos ist er auf mindestens 11 lesbar (#075 #078 #083 #093
#095 #096 #098 #103 #108 #113 …), bei der Uhr steht auf jedem Gehäuseboden «STAINLESS STEEL
BACK · WATER RESISTANT · 5ATM». Nach dieser Regel wäre die Hälfte der Bildergalerie weg —
und genau davor warnt der Befund selbst: dann «stehen die Bewertungen der Vertrauensanker
ohne Bilder da».

Entfernt wird deshalb nur, wenn das MOTIV des Fotos die Herkunft ist, nicht das Produkt:
  • Marktplatz-Screenshots (AliExpress-App / Bestellabrechnung),
  • Lieferanten-Etiketten: Versandaufkleber, Barcodes, SKU-Zettel, Fabrikangaben,
  • Marken-Papiere und -Verpackung als Bildgegenstand: Garantiekarte, Konformitäts-
    zertifikat, Markenheft, Markenschachtel, bedruckter Staubbeutel,
  • ein Foto, das ein ganz anderes, fremd gemarktes Gerät zeigt.

BEHALTEN wird das Produktfoto, auch wenn die Herstellerprägung darauf lesbar ist. Diese
Prägung ist auf der Ware, die die Kundin bekommt — sie wegzuretuschieren würde die Fotos zu
einem Versprechen machen, das das Paket bricht. Dass die Ware eine Fremdmarke trägt, während
sie unter «LuxeStyle» verkauft wird, ist ein Titel-/Vendor-Problem (wie der Chanel-Fall vom
12.08.) und wird nicht dadurch gelöst, dass man Kundenfotos löscht.

═══════════════════════════════════════════════════════════════════════════════════════════
DIE ZWÖLF — jedes einzeln belegt
═══════════════════════════════════════════════════════════════════════════════════════════
Uhr    A6af78be…64   AliExpress-Bestellabrechnung: «Cupom AliExpress −R$18,00», «Choice
                     Shop11042…», «Entrar em contato com vendedor», Total R$82,23
Uhr    Afc0c8df…5cT  «AIMIMO Design GUARANTEE CARD» (Fremdmarke) + Markenschachtel
Uhr    A049e6ee…73S  «AIMIMO DESIGN» Schachteldeckel + «GUARANTEE CARD»
Uhr    A79ff3c1…ew   AIMIMO-Markenheft im Beutel MIT Lieferantenetikett: Barcode
                     12000052902874061, englischer Listing-Text, «Manufacturer ShenZhenShi
                     AIMIMO Tech Co.,Ltd»
Uhr    Aeecdddc…5d   AIMIMO-Schachteldeckel + Markenanhänger am Handgelenk-Foto
Uhr    Ad66558c…b9C  Zifferblatt trägt die Fremdmarke «DjiKo» — und es ist gar nicht die
                     verkaufte Uhr (braunes Lederband statt Stahlband)
Wallet Ac8e5e46…01X  AliExpress-App, russische Oberfläche: «AliExpress Shopper», dazu FREMDE
                     Angebote («Zekye Spring Hoodies Women», «CONTACT'S Genuine Leather RFID»)
Wallet A57b6db2…82j  Staubbeutel «CONTACTS genuine leather» + Lieferanten-SKU «M1280-brown»
                     mit Barcode
Wallet Af036d6d…31p  Staubbeutel + orange Markenkarte «CONTACT'S — Your best choice»
Wallet Af2ba404…51x  Staubbeutel + «CERTIFICATE OF CONFORMITY»: Brand CONTACT'S, Made in
                     China, Retail Price 660 RMB, Fabrikadresse Guangzhou — das nennt den
                     Lieferanten UND den Einkaufsmarkt neben dem CHF-Preis
Wallet A0db259d…82o  Staubbeutel «CONTACTS genuine leather» als Bildgegenstand
Bali   Acaf3583…b2Q  Versandbeutel mit chinesischem Logistiketikett «TRAN STORE 38320403»,
                     Barcode AP0079390202..., chinesische Adressfelder

FEHLTREFFER, die der Probelauf verhindert hat (bewusst NICHT entfernt):
  • #026 #031 #053 #062 #065 (Uhr): «STAINLESS STEEL BACK · WATER RESISTANT · 5ATM · 18K» auf
    Gehäuseboden und Schliesse — das ist eine Materialangabe, keine Marke.
  • #052 (Uhr): «SUNDAY» auf dem Zifferblatt ist der Wochentag, kein Markenname.
  • #080 #104–#107 (Wallet): Luftpolstertasche und Klarsichtfolie ohne jedes Etikett —
    Verpackung allein verrät niemanden.
  • #097 (Wallet): auf dem Tisch liegt ein Beutel mit Etikett, aber unlesbar unscharf; das
    Motiv ist die Geldbörse in den Händen. Ein unlesbares Etikett ist kein Beleg.
  • #074 #092 #094 #110 #112 (Wallet): geprägtes «Genuine Leather Collection» im Innenfach —
    Prägung auf der Ware, siehe Regel oben.
  • #071 #060 (Uhr): schlichte schwarze Schachtel ohne sichtbares Logo.

═══════════════════════════════════════════════════════════════════════════════════════════
WARUM DIESER WEG UND KEIN ANDERER
═══════════════════════════════════════════════════════════════════════════════════════════
Judge.me lässt Bewertungsfotos über die API NICHT bearbeiten. Die eigene Spezifikation
(https://judge.me/api/docs.yaml, PUT /reviews) sagt wörtlich: «For authenticity reason, we
don't support editing reviews via API» — der einzige erlaubte Parameter ist
`curated: ok|spam`, also die GANZE Bewertung ein- oder ausblenden. Das wäre hier falsch: bei
sechs der neun betroffenen Bewertungen hängen an demselben Text noch gute Produktfotos, und
Bewertungen dürfen ohnehin nicht verschwinden.

⚠️ Und eine 200er-Antwort ist hier kein Beleg. `PUT /reviews/{id}` quittiert JEDEN erfundenen
Parameter (`picture_urls`, `pictures`, `remove_pictures`, `delete_pictures`) mit
«Action performed successful» — geändert hat sich nach der Kontroll-Abfrage nichts. Erst der
Gegentest mit einem dokumentierten Feld (`featured`, sofort zurückgesetzt) zeigte, dass die
Route überhaupt lebt. Wer nur auf den Statuscode geschaut hätte, hätte zwölf Fotos als
erledigt abgehakt, die noch alle im Shop stehen.

Der Weg, der wirkt: Judge.me legt die fertige Widget-Ausgabe in ZWEI Shopify-Metafeldern des
Produkts ab, und der Shop rendert sie von dort in die Produktseite —
  judgeme.widget              (HTML: <a class='jdgm-rev__pic-link' href='…'><img data-src='…'>)
  judgeme.review_widget_data  (JSON: reviews[].pictures_urls + photo_gallery[])
Beide gehören dem Shop und sind über die Admin-API schreibbar. Dieses Skript schneidet die
zwölf Bilder strukturbewusst heraus: im HTML das ganze <a>-Element, im JSON den Eintrag aus
der Liste. Danach steht die Adresse nicht mehr im Quelltext — nicht nur unsichtbar, sondern
weg.

⚠️ ZUR QUELLE (Regel 7): Judge.me schreibt diese Metafelder bei jeder Cache-Erneuerung neu.
Dieses Skript ist deshalb wiederholbar gebaut und gehört in den Hygiene-Lauf
(automation/website_hygiene_runner.sh), der es alle zwei Stunden nachzieht. Das ist eine
Nachkontrolle, keine Heilung: die Fotos liegen weiterhin in Judge.mes Datenbank. Endgültig
weg sind sie erst, wenn im Judge.me-Backend bei jedem der zwölf Bilder «hide picture» geklickt
wird — dafür braucht es einen Browser, den diese Session nicht hat. Der Auftrag steht im
Bericht.

Aufruf:  python3 automation/bewertungsfotos_saeubern.py            (Probelauf, schreibt nichts)
         python3 automation/bewertungsfotos_saeubern.py --scharf   (schreibt)
"""
import json
import os
import re
import sys
import time
import urllib.request

SHOP = "au3j0y-hq.myshopify.com"
API = f"https://{SHOP}/admin/api/2024-10/graphql.json"
LEDGER = "dropship/_bewertungsfotos_entfernt.txt"
SICHERUNG = "dropship/_bewertungsfotos_backup"

PRODUKTE = {
    "15396249960833": "Klassische Herrenuhr Edelstahl",
    "15396249502081": "Slim Wallet Echtleder",
    "15397247385985": "Jade Roller & Gua Sha Premium Set",
    "15412915339649": "Strand-Maxikleid «Bali»",
}

# Nur der Dateiname reicht als Schlüssel — er ist ein eindeutiger Hash. Der Grund steht
# daneben, damit ein späterer Lauf nicht raten muss, warum ein Bild gesperrt ist.
BLOCKIERT = {
    "Acaf3583b754541f4a53e05c6b3f3b7b2Q.jpg":
        "Versandbeutel mit chinesischem Logistiketikett (TRAN STORE 38320403, "
        "Barcode AP0079390202...)",                    # Bali   · Bewertung 1203815774
    "Ad66558c6a94b4d54ab5bab43a405b0b9C.jpg":
        "Zifferblatt Fremdmarke DjiKo (zudem eine andere Uhr, braunes Lederband)",
                                                       # Uhr    · Bewertung 1199206459
    "Afc0c8df5759b4e65b73354bdf443a55cT.jpg":
        "AIMIMO DESIGN GUARANTEE CARD (Fremdmarke) + Markenheft",
                                                       # Uhr    · Bewertung 1199206463
    "A79ff3c1a26bd43feb64273c3da74f6bew.jpg":
        "AIMIMO-Markenheft + Lieferantenetikett (Barcode 12000052902874061, "
        "Manufacturer ShenZhenShi AIMIMO Tech Co.,Ltd)",  # Uhr · Bewertung 1199206468
    "A6af78be77c884d1baa332b77a11e15364.jpg":
        "AliExpress-Bestellabrechnung (Cupom AliExpress -R$18.00, Choice Shop11042, "
        "Total R$82.23)",                              # Uhr    · Bewertung 1199206470
    "A049e6ee1b1854447a48744e87e4c3a73S.jpg":
        "AIMIMO DESIGN Schachtel + GUARANTEE CARD",    # Uhr    · Bewertung 1199206491
    "Aeecdddcf6ab8490ab1916d91233ab395d.jpg":
        "AIMIMO DESIGN Schachteldeckel + Markenanhaenger",  # Uhr · Bewertung 1199206491
    "A57b6db22ff7b446e98023bf3e8b23f82j.jpg":
        "CONTACTS-Staubbeutel + Lieferanten-SKU-Etikett M1280-brown mit Barcode",
                                                       # Wallet · Bewertung 1199159792
    "Af036d6d409724e2c9ce85875d10de131p.jpg":
        "CONTACTS-Staubbeutel + orange Markenkarte CONTACT'S",
                                                       # Wallet · Bewertung 1199159792
    "Af2ba40433e164ed19245959cf1b74c51x.jpg":
        "CONTACTS-Staubbeutel + CERTIFICATE OF CONFORMITY (Brand CONTACT'S, Made in China, "
        "Retail Price 660 RMB, Fabrikadresse Guangzhou)",  # Wallet · Bewertung 1199159792
    "A0db259d3193b47db9d57b770af95f882o.jpg":
        "CONTACTS-Staubbeutel als Bildgegenstand",     # Wallet · Bewertung 1199159794
    "Ac8e5e4638eea4bbf9d3c5829c2be6d01X.jpg":
        "AliExpress-App-Screenshot (AliExpress Shopper, russ. Oberflaeche, fremde Angebote)",
                                                       # Wallet · Bewertung 1199159799
}


def token():
    p = "/tmp/cj_shop_token.txt"
    if not os.path.exists(p):
        sys.exit("Kein Shopify-Token unter /tmp/cj_shop_token.txt")
    return open(p).read().strip()


def gql(query, variables=None, versuche=4):
    """Eine gescheiterte Anfrage ist kein Ergebnis (Regel 6): erst nach echter Antwort weiter."""
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    letzter = None
    for i in range(versuche):
        try:
            req = urllib.request.Request(
                API, data=body,
                headers={"X-Shopify-Access-Token": token(),
                         "Content-Type": "application/json"})
            roh = urllib.request.urlopen(req, timeout=60).read().decode()
            antwort = json.loads(roh)
            if antwort.get("errors"):
                letzter = str(antwort["errors"])[:200]
                time.sleep(2 + 2 * i)
                continue
            return antwort["data"]
        except Exception as e:                       # noqa: BLE001
            letzter = f"{type(e).__name__}: {e}"[:200]
            time.sleep(2 + 2 * i)
    raise RuntimeError(f"Shopify antwortet nicht: {letzter}")


def bilder_im_html(html):
    """Alle Bewertungsbild-Dateinamen, die das Widget-HTML als <a>-Element rendert."""
    return re.findall(r"jdgm-rev__pic-link[^>]*href='[^']*/([A-Za-z0-9]+\.jpg)'", html)


def html_saeubern(html, gesperrt):
    """Entfernt das komplette <a class='jdgm-rev__pic-link' …>…</a> und den Eintrag im
    escapten Galerie-JSON. Beides ist flach — kein verschachteltes {} in den Bildobjekten."""
    entfernt = []
    for datei in gesperrt:
        # (1) das sichtbare Element samt Bild
        muster = re.compile(
            r"\s*<a class='jdgm-rev__pic-link[^']*'[^>]*?"
            + re.escape(datei) + r"[^>]*>.*?</a>", re.S)
        html, n = muster.subn("", html)
        # (2) das Bildobjekt im HTML-escapten JSON der Galerie, samt trennendem Komma
        obj = re.compile(r",?\{&quot;compact&quot;:&quot;[^{}]*?"
                         + re.escape(datei) + r"[^{}]*?\}")
        html, m = obj.subn("", html)
        # ein führendes Komma darf nicht direkt hinter der öffnenden Klammer stehen bleiben
        html = html.replace("pictures_urls&quot;:[,", "pictures_urls&quot;:[")
        if n or m:
            entfernt.append((datei, n, m))
    return html, entfernt


def daten_saeubern(daten, gesperrt):
    """Filtert pictures_urls in reviews[] und photo_gallery[] des review_widget_data-JSON."""
    weg = 0

    def filtern(liste):
        nonlocal weg
        behalten = []
        for bild in liste or []:
            url = (bild.get("original") or bild.get("compact") or "")
            if url.rsplit("/", 1)[-1] in gesperrt:
                weg += 1
                continue
            behalten.append(bild)
        return behalten

    for schluessel in ("reviews", "photo_gallery"):
        neu = []
        for bewertung in daten.get(schluessel) or []:
            bewertung["pictures_urls"] = filtern(bewertung.get("pictures_urls"))
            # In der Foto-Galerie hat eine Bewertung ohne Bild nichts verloren; die Bewertung
            # selbst bleibt in reviews[] mit ihrem Text stehen.
            if schluessel == "photo_gallery" and not bewertung["pictures_urls"]:
                continue
            neu.append(bewertung)
        if schluessel in daten:
            daten[schluessel] = neu
    return daten, weg


def metafeld_setzen(pid, key, wert):
    gql("""mutation($m:[MetafieldsSetInput!]!){
             metafieldsSet(metafields:$m){ userErrors{ field message } } }""",
        {"m": [{"ownerId": f"gid://shopify/Product/{pid}", "namespace": "judgeme",
                "key": key, "type": "string" if key == "widget" else "json",
                "value": wert}]})


def main():
    scharf = "--scharf" in sys.argv
    os.makedirs(SICHERUNG, exist_ok=True)
    ledger = open(LEDGER, "a", buffering=1) if scharf else None   # Zeile für Zeile (Regel 5)

    gesamt_html = gesamt_json = 0
    unbekannt = set(BLOCKIERT)

    for pid, name in PRODUKTE.items():
        d = gql("""query($id:ID!){ product(id:$id){
                     w:metafield(namespace:"judgeme",key:"widget"){value}
                     d:metafield(namespace:"judgeme",key:"review_widget_data"){value} } }""",
                {"id": f"gid://shopify/Product/{pid}"})["product"]
        html = (d.get("w") or {}).get("value") or ""
        rohdaten = (d.get("d") or {}).get("value") or ""
        if not html or not rohdaten:
            print(f"  ⚠️ {name}: Judge.me-Metafelder fehlen — offen, nicht erledigt")
            continue

        vorhanden = set(bilder_im_html(html))
        treffer = sorted(vorhanden & set(BLOCKIERT))
        unbekannt -= vorhanden
        print(f"\n{name} ({pid})")
        print(f"  Bewertungsfotos im Widget: {len(vorhanden)} | davon gesperrt: {len(treffer)}")
        for t in treffer:
            print(f"    − {t}  ({BLOCKIERT[t]})")
        if not treffer:
            continue

        neu_html, entfernt = html_saeubern(html, treffer)
        daten = json.loads(rohdaten)
        vorher_bewertungen = len(daten.get("reviews") or [])
        daten, weg = daten_saeubern(daten, set(treffer))
        neu_daten = json.dumps(daten, ensure_ascii=False)

        # Kontrollen, bevor irgendetwas geschrieben wird
        rest_html = set(bilder_im_html(neu_html)) & set(treffer)
        nachher_bewertungen = len(daten.get("reviews") or [])
        fehler = []
        if rest_html:
            fehler.append(f"HTML enthaelt noch {rest_html}")
        if any(t in neu_daten for t in treffer):
            fehler.append("JSON enthaelt noch gesperrte Adressen")
        if nachher_bewertungen != vorher_bewertungen:
            fehler.append(f"Bewertungszahl veraendert {vorher_bewertungen}→{nachher_bewertungen}")
        if len(neu_html) > len(html):
            fehler.append("HTML ist laenger geworden")
        if fehler:
            print("  ⛔ NICHT geschrieben: " + "; ".join(fehler))
            continue

        print(f"  → HTML {len(html)}→{len(neu_html)} Zeichen, "
              f"{len(entfernt)} Bildelemente; JSON {weg} Bildeintraege; "
              f"Bewertungen unveraendert bei {nachher_bewertungen}")
        gesamt_html += len(entfernt)
        gesamt_json += weg

        if not scharf:
            continue
        open(f"{SICHERUNG}/{pid}.widget.html", "w").write(html)
        open(f"{SICHERUNG}/{pid}.data.json", "w").write(rohdaten)
        metafeld_setzen(pid, "widget", neu_html)
        metafeld_setzen(pid, "review_widget_data", neu_daten)
        for t in treffer:
            ledger.write(f"{time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())}\t{pid}\t{t}\t"
                         f"{BLOCKIERT[t]}\n")
        print("  ✅ geschrieben")

    if unbekannt:
        print(f"\n⚠️ {len(unbekannt)} gesperrte Adressen kamen in keinem Widget vor "
              f"(bereits entfernt oder Tippfehler): {sorted(unbekannt)}")
    print(f"\n{'GESCHRIEBEN' if scharf else 'PROBELAUF'}: "
          f"{gesamt_html} Bildelemente im HTML, {gesamt_json} Eintraege im JSON.")
    if not scharf:
        print("Zum Schreiben: --scharf")


if __name__ == "__main__":
    main()
