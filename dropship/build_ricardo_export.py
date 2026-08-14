#!/usr/bin/env python3
# Baut aus den LuxeStyle-Top-Produkten einen listing-fertigen Ricardo-Export (CSV + Markdown-Vorschau).
# Quelle: Live-Katalog via Shopify-MCP (Stand 2026-06-15). Beschreibungen bei 600 Zeichen gekuerzt.
# Der shop-spezifische "Lieferzeit (je nach Land)"-Vorspann wird entfernt.
import csv, re, json, os
from ricardo_bigbuy import BIGBUY

# Kategorie-Vorschlag: Shopify productType -> grobe Ricardo-Kategorie (User waehlt exakt beim Einstellen)
CAT = {
    "Accessoires": "Kleidung & Accessoires > Accessoires",
    "Uhren": "Uhren & Schmuck > Uhren",
    "Sonnenbrillen": "Kleidung & Accessoires > Accessoires > Sonnenbrillen",
    "Beauty": "Beauty & Gesundheit > Kosmetik",
    "Baby & Kleinkind": "Baby & Kind",
    "Schmuck": "Uhren & Schmuck > Schmuck",
    "Wohnen": "Haushalt & Wohnen",
    "Elektronik": "Elektronik & Computer",
    "Reisen & Outdoor": "Sport & Outdoor > Reise",
    "Büro & Home Office": "Büro & Gewerbe",
    "Sport & Recovery": "Sport & Outdoor",
    "Parfum": "Beauty & Gesundheit > Parfum & Düfte",
    "Taschen & Rucksäcke": "Kleidung & Accessoires > Taschen",
    "Kleidung": "Kleidung & Accessoires > Damen",
}

def clean(desc:str)->str:
    # Den Lieferzeit-Vorspann abschneiden — er gilt fuer den eigenen Shop, nicht fuer Ricardo.
    # ⚠️ 14.08.2026: Der alte Schnitt suchte nur nach "Werktage, inkl. Produktion". Genau
    # diese Formulierung gibt es seit der Versandaussagen-Korrektur nicht mehr (die Bloecke
    # nannten EU und USA als Lieferziel, obwohl der Shop nur in die Schweiz liefert). Ohne
    # das zweite Muster waere der Shop-Baustein ungeschnitten in die Ricardo-Anzeige
    # gewandert. Beide Formen werden jetzt erkannt.
    m = re.split(r"Werktage, inkl\.\s*Produktion\s*", desc, maxsplit=1)
    txt = m[1] if len(m) == 2 else desc
    txt = re.sub(r"^\s*📦\s*Lieferzeit Schweiz:\s*\d{1,2}\s*[–-]\s*\d{1,2}\s*Werktage"
                 r"[^A-ZÄÖÜ]*(?:·[^A-ZÄÖÜ]*)*", "", txt)
    return re.sub(r"\s+", " ", txt).strip()

# (title, productType, price_chf, url, [bild-urls], beschreibung_roh)
P = [
 ("Slim Wallet Echtleder · RFID-Schutz, Vollnarbenleder","Accessoires","49.90","https://luxestyle.ch/products/premium-leder-geldborse-slim",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sf1206e470524423cb1e5b8c3ccabfd31L.webp?v=1779792422","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Aaa1108a2126c44fc91ba324f1de49e5fm_55546e16-cc3b-4bbb-9c10-8fc549f7207f.jpg?v=1779792423","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S55a91162563e4b679742ea091f531ac2j.webp?v=1779812613","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S844695c5e00045f1896025fca7557e1a8.webp?v=1779812612"],
  "📦 Lieferzeit (je nach Land): 🇨🇭 CH / 🇪🇺 EU: 6–12 Tage · 🇺🇸 USA: 9–16 Tage · Werktage, inkl. Produktion Schlank genug für die Vordertasche, edel genug fürs Sakko. Die Slim Wallet aus echtem Vollnarbenleder schützt deine Karten zuverlässig vor unbemerktem Auslesen – und wird mit jedem Tag, an dem du sie trägst, ein Stück schöner. Integrierter RFID-Schutz blockiert das kontaktlose Auslesen deiner Karten (13,56 MHz). Echtes pflanzlich gegerbtes Vollnarben-Rindsleder, das eine natürliche Patina entwickelt."),
 ("Klassische Herrenuhr Edelstahl · Saphirglas, 50m wasserdicht","Uhren","129.90","https://luxestyle.ch/products/edelstahl-uhr-herren-klassisch",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S3fd1754a28234ac4b0838d54ea43c29cx.webp?v=1779811748","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S4a86d2e1aafa4f99bf991d3eff8a68c3L.webp?v=1779811748","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Se82c311ca2b04b369e8ce8bdabe7bfafZ.webp?v=1779811748","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S21e9537a208c417b894424d7b4e0fc33U.webp?v=1779811748"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Zeitlos. Präzise. Für jeden Anlass. Saphirglas – die härteste Glasart nach Diamant: kratzfest wie bei einer Luxusuhr. 50 m wasserdicht – Händewaschen, Regen und Duschen sind kein Problem. Robustes, leichtes Edelstahl-Gehäuse. Präzises Quarzwerk."),
 ("Retro Sonnenbrille Polarisiert UV400 · Unisex Vintage","Sonnenbrillen","39.90","https://luxestyle.ch/products/sonnenbrillen-set-retro-polarized",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/27x27_png_960x960_7__png_ea2e4cea-e551-4bf7-b2d9-b2d7f767c611.jpg?v=1780065807"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Zeitloser Vintage-Look, der zu jedem Outfit passt – mit kompromisslosem UV400-Schutz. Polarisierte Gläser reduzieren Blendung, federleichtes PC-Gestell, unisex geschnitten. Voller UV400-Schutz blockiert schädliche UVA- und UVB-Strahlen."),
 ("Jade Roller & Gua Sha Premium Set · Anti-Aging Facelift","Beauty","24.90","https://luxestyle.ch/products/jade-roller-gua-sha-premium-set-anti-aging-facelift",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Scecede96e85b4435acf6c2d3d6ac49ccG.webp?v=1779792433","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S0c7b33a73fac4f3594f9732516bd2897T_3cb5c19a-a053-49ab-a50a-7ba4926667be.webp?v=1779815460","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sc5750098b5344eacaade37e44b9c7b9fU_068cb736-3b6e-4642-b514-2d2c09dcc0d0.webp?v=1779815460"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Dein tägliches Beauty-Ritual aus echtem Jade. Zwei klassische Beauty-Tools aus echtem, tiefgrünem Jade als aufeinander abgestimmtes Set. Der Jade Roller mit Doppelkopf rollt morgendliche Schwellungen weg; der Gua Sha Stein definiert Konturen. Glatt poliert, angenehm kühl, langlebig."),
 ("Sternenhimmel Projektor · Baby Nachtlicht mit Musik","Baby & Kleinkind","39.90","https://luxestyle.ch/products/sternenhimmel-projektor-baby-nachtlicht-mit-musik",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S768d319fe6da433cb7df7eeffe56c671D.webp?v=1780066713"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Sanftes Einschlafen, Nacht für Nacht. Der rotierende Projektor wirft sanfte Lichtpunkte an Decke und Wände, dazu spielen 12 leise Schlaflieder mit Timer – ein beruhigendes Einschlafritual für dein Baby."),
 ("Unisex Slim Wallet RFID · 7 Farben Echtleder für Sie und Ihn","Accessoires","49.90","https://luxestyle.ch/products/unisex-slim-wallet-rfid-7-farben-echtleder-fur-sie-und-ihn",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S5d01c6e79dd047618c5e1b12bb13c6b9j.webp?v=1780066724"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Schlankes Echtleder-Wallet, dünner als eine Kreditkarte – für sie und ihn. Handverarbeitetes Cowhide-Vollnarbenleder mit Patina. RFID/NFC-Schutz, 8 Kartenfächer."),
 ("Premium Schlüsselanhänger Leder · Personalisierbar mit Gravur","Accessoires","19.90","https://luxestyle.ch/products/premium-schlusselanhanger-leder-personalisierbar-mit-gravur",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sc70e934069274afbab5e6d7388da3d26y.webp?v=1780072118"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Schlüsselanhänger aus echtem Vollnarbenleder, veredelt mit persönlicher Gravur (bis 12 Zeichen) – Name, Datum oder Initialen. Das durchdachte Detail-Geschenk, das mit den Jahren Charakter gewinnt."),
 ("Slim Kartenetui RFID · Echtleder + Aluminium, bis 8 Karten","Accessoires","34.90","https://luxestyle.ch/products/slim-kartenetui-rfid-echtleder-aluminium-bis-8-karten",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S126422f9ba7e4f92ad466c0d15b4e5bd4.webp?v=1780066731"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Schlank genug für die Vordertasche, robust genug für jeden Tag. Aluminium-Innenrahmen blockt kontaktloses Auslesen (RFID, 13.56 MHz). Platz für bis zu 8 Karten."),
 ("Herren Lederarmband Edelstahl-Anker · Premium Maritime Style","Schmuck","29.90","https://luxestyle.ch/products/herren-lederarmband-edelstahl-anker-premium-maritime-style",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/H1b0608fab31f43baa32903b1c6683334i.webp?v=1779793496","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sc04e35400b5540ae88172b7ad6b16be6d.webp?v=1779813044","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Saf4287ffabef4638829bd48a97762151P.webp?v=1779813044"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Maritimes Statement-Armband: echtes Vollnarbenleder mit massivem, salzwasser-resistentem Edelstahl-Anker. Passt zum Business-Outfit wie zum Wochenende am Wasser."),
 ("Seiden-Kissenbezug 100% Maulbeerseide · Anti-Aging & Haarpflege","Wohnen","39.90","https://luxestyle.ch/products/seiden-kissenbezug-100-maulbeerseide-anti-aging-haarpflege",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S58c9ef36bec74931b97d5da4844d976cZ_8a071ec9-c4d1-4788-8eba-6af367a09012.webp?v=1779792430","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S8d856b1a476c47ecb395994e15243d11j.webp?v=1779811997"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion 100% Maulbeerseide gleitet nahezu widerstandslos über Haar und Haut: weniger Haarbruch, weniger Schlafknitter im Gesicht, gepflegtes Aufwachen – ohne Mehraufwand."),
 ("Manschettenknöpfe Edelstahl · Klassisches Design für Anzug & Hemd","Schmuck","24.90","https://luxestyle.ch/products/manschettenknopfe-edelstahl-klassisches-design-fur-anzug-hemd",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sf6097630ba604e279101afbeb21a6aedY.webp?v=1779793100","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S8c44d08e509241b49e62f1711ce23266k.webp?v=1779812671"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Manschettenknöpfe aus massivem Edelstahl 316L – rostfrei, anlauffrei, hypoallergen. Der bewusste letzte Akzent für Hemd und Anzug."),
 ("Damen Portemonnaie XL Echtleder · 12 Kartenfächer & RFID","Accessoires","54.90","https://luxestyle.ch/products/damen-portemonnaie-xl-echtleder-12-kartenfacher-rfid",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sd44bb0d0a5f349f6afe8e84b80ab8430Y.webp?v=1780072126"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion XL-Portemonnaie aus echtem Vollnarbenleder: 12 Kartenfächer, 2 Sichtfächer, RFID-Blocker, Münzfach. Aufgeräumt und griffbereit."),
 ("Aroma Diffuser Bambus 500ml · 7 LED Farben, Ultraschall","Wohnen","44.90","https://luxestyle.ch/products/aroma-diffuser-bambus-500ml-7-led-farben-ultraschall",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S462e1cfb669347c6af32b30abaecd3abg.webp?v=1779811545","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Saf779ef18ab0457e8225bcb49aecd66a6.webp?v=1779811545"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Echtes Bambus-Gehäuse, 500ml-Tank, flüsterleise Ultraschall-Vernebelung – bis zu 10 Stunden Dauerbetrieb. 7 LED-Farben, natürliche Holzoptik."),
 ("Damen-Armband Edelstahl · Minimalistisch & Hypoallergen","Schmuck","24.90","https://luxestyle.ch/products/damen-armband-edelstahl-minimalistisch-hypoallergen",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sbaff6e207f914877b9a45917be35ae7fw.webp?v=1779793096","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S9f617917089a4f4da79b57577437b01fC.webp?v=1779812903"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Minimalistisches Damen-Armband aus Edelstahl 316L: klare Linien, hautfreundlich (hypoallergen), anlauffrei. Passt zum Business-Outfit wie zum Abend."),
 ("Smartwatch Pro AMOLED · Herzfrequenz, 100+ Sportmodi, 7 Tage Akku","Elektronik","79.90","https://luxestyle.ch/products/smartwatch-pro-amoled-herzfrequenz-100-sportmodi-7-tage-akku",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S999a7c4138b642d682163261eb9f6b91m.webp?v=1780080350","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S6326ef7426f344cc846701a19dd83a07F.webp?v=1780080352"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Komplette Smartwatch zum fairen Preis: helles AMOLED-Display, Herzfrequenz/SpO₂/Schlaf/Stress, über 100 Sport-Modi, bis zu 7 Tage Akku."),
 ("Bluetooth Kopfhörer ANC · Active Noise Cancellation, 40h Akku","Elektronik","69.90","https://luxestyle.ch/products/bluetooth-kopfhorer-anc-active-noise-cancellation-40h-akku",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S71b957870b544a1db0a260fb261ddd05b.webp?v=1779792740","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S0ecd3cdc9cf143cbbd3b0b8e6957ed68I.webp?v=1779812537"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Over-Ear-Kopfhörer mit Active Noise Cancellation (bis -35 dB), bis zu 40 Stunden Akku, faltbar, mit Hardcase für unterwegs."),
 ("Anti-Aging Serum Hyaluron + Vitamin C · Vegan, Made in EU","Beauty","29.90","https://luxestyle.ch/products/anti-aging-serum-hyaluron-vitamin-c-vegan-made-in-eu",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S652d2cc4e7a441b993e6ab255b9768d6N.webp?v=1779793507","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sa976459fb7724bf1bca6e153a425a8ebg.webp?v=1779812195"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Hyaluronsäure (3 Molekulargewichte) + Vitamin C: leichte Pflege, die morgens und abends in Sekunden einzieht. Vegan, Made in EU, für alle Hauttypen."),
 ("Bluetooth Speaker 360° · IPX7 wasserdicht, 24h Akku","Elektronik","54.90","https://luxestyle.ch/products/bluetooth-speaker-360-ipx7-wasserdicht-24h-akku",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S43a77d5986554643b58c64a60f0bfcbfM.webp?v=1779793511"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion 360°-Surround-Sound in jede Richtung, bis zu 24 Stunden Wiedergabe (5200 mAh), IPX7 wasserdicht – für Pool, Garten, Dusche und Grill."),
 ("Reise-Toilettentasche Premium · Hängend, Wasserabweisend, 4 Fächer","Reisen & Outdoor","27.90","https://luxestyle.ch/products/reise-toilettentasche-premium-hangend-wasserabweisend-4-facher",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S05054e0aa2ad4202b833450e494c072az.webp?v=1779813487","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S08277e3753f742abb9e81ca5e442280dZ.webp?v=1779813487"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Wasserabweisende Reise-Toilettentasche mit Hängehaken (Hotelhaken, Türklinke, Handtuchhalter) und 4 Fächern. Alles griffbereit, kein Kramen."),
 ("Herren Gürtel Echtleder · Edelstahl-Schliesse, Kürzbar","Accessoires","34.90","https://luxestyle.ch/products/herren-gurtel-echtleder-edelstahl-schliesse-kurzbar",
  ["https://cdn.shopify.com/s/files/1/0943/6856/3585/files/Sde60fdc9b78c45649ab51fcd6517c4928.webp?v=1779793516","https://cdn.shopify.com/s/files/1/0943/6856/3585/files/S6951b45bad9c4cebb3308e8512a49cd14.webp?v=1779813000"],
  "📦 Lieferzeit ... Werktage, inkl. Produktion Herren-Gürtel aus Vollnarbenleder mit rostfreier Edelstahl-Schliesse 316L, stufenlos kürzbar. Entwickelt mit der Zeit eine eigene Patina."),
]

rows = []
# 1) LuxeStyle-Top-Produkte (Versand 6–12 Werktage)
for title, ptype, price, url, imgs, desc in P:
    rows.append({
        "Titel": title,
        "Marke": "LuxeStyle",
        "Kategorie (Vorschlag)": CAT.get(ptype, ptype),
        "Preis_CHF": price,
        "Zustand": "Neu",
        "Versand": "6–12 Werktage",
        "Beschreibung": clean(desc),
        "Bild_URLs": " | ".join(imgs),
        "Quelle": "LuxeStyle",
        "Quelle_Shop": url,
    })
# 2) BigBuy-Markenprodukte (EU-Lager, 5–10 Werktage) — Beschreibung bereits bereinigt
for title, marke, price, ptype, url, img, desc in BIGBUY:
    rows.append({
        "Titel": title,
        "Marke": marke,
        "Kategorie (Vorschlag)": CAT.get(ptype, ptype),
        "Preis_CHF": price,
        "Zustand": "Neu",
        "Versand": "EU-Lager, 5–10 Werktage",
        "Beschreibung": clean(desc),
        "Bild_URLs": img,
        "Quelle": "BigBuy",
        "Quelle_Shop": url,
    })

out_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(out_dir, "ricardo_export.csv")
md_path = os.path.join(out_dir, "ricardo_export.md")

cols = ["Titel","Marke","Kategorie (Vorschlag)","Preis_CHF","Zustand","Versand","Beschreibung","Bild_URLs","Quelle","Quelle_Shop"]
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=cols)
    w.writeheader()
    w.writerows(rows)

with open(md_path, "w", encoding="utf-8") as f:
    f.write("# Ricardo-Listing-Export — LuxeStyle Top-Produkte\n\n")
    f.write(f"Stand 2026-06-15 · {len(rows)} Produkte · Preise in CHF · Zustand: Neu\n\n")
    for r in rows:
        f.write(f"## {r['Titel']}\n")
        f.write(f"- **Marke:** {r['Marke']}  |  **Preis:** CHF {r['Preis_CHF']}  |  **Kategorie:** {r['Kategorie (Vorschlag)']}  |  **Zustand:** Neu  |  **Versand:** {r['Versand']}  |  **Quelle:** {r['Quelle']}\n")
        f.write(f"- **Beschreibung:** {r['Beschreibung']}\n")
        f.write(f"- **Bilder:** {r['Bild_URLs']}\n")
        f.write(f"- **Shop:** {r['Quelle_Shop']}\n\n")

print(f"OK: {len(rows)} Produkte")
print("CSV:", csv_path)
print("MD :", md_path)
