#!/usr/bin/env python3
"""shopify_host.py — EINE Quelle für «ist das ein Shop-Host, an den Zugangsdaten gehen dürfen?» (19.10.2026).

ANLASS: Am 19.10. war SHOPIFY_CLIENT_SECRET der Umgebung verdorben (gültiger Schlüssel + «=SHOPIFY_CLIENT_SECRET»; lib/shopify_secret.sh
heilt das). Derselbe Einfügefehler kann SHOPIFY_SHOP treffen — dann ginge das gültige Secret an einen Fantasie-Host.
GEMESSEN 19.10. (grep «admin/oauth/access_token», 125 Dateien, 123 senden wirklich): 39 nehmen den Host roh aus der Umgebung, 24 prüfen
nur das Suffix `myshopify\\.com$`, 1 prüft streng (publish_guard.mjs, noch nicht eingecheckt), 59 haben ihn fest eingebaut.
IDEE aus Codex #2673 (lib/shopify_host.mjs, QUELLE): Host-Regex vor dem Anfügen von Zugangsdaten. Hier als drei Umsetzungen mit
EINER Regel (shopify_secret.sh · shopify_host.mjs · dieses Modul) und EINER Fallliste (shopify_host_faelle.tsv).

REGEL (ASCII-genau, in allen drei Umsetzungen gleich):
 0. Länge über 253 (Hostname-Maximum, DNS) ist «falsch» und wird NIE bereinigt. GEMESSEN 19.10.: die Bash-Umsetzung trimmt auf langem Leerraum
    quadratisch (40'000 Leerzeichen 4,08 s · 130'000 45,5 s), die Node-Umsetzung bei «Zeichen + Leerraum + Zeichen» ebenso
    (40'000: 1,9 s · 130'000: 20,5 s; bei 1,3 Mio. Zeichen lief ein Prozess über 3 Minuten und wurde abgebrochen). Die Schranke greift VOR jeder Bereinigung; hier (Python, strip ist linear) steht sie wegen der gleichen Regel.
 1. Leerraum (Leerzeichen, Tab, CR, LF, VT, FF) am Rand weg; ein Paar umschliessender Anführungszeichen weg; nochmals Leerraum weg.
 2. Kleinschreibung (nur A–Z).
 3. «https://» am Anfang weg (nur dieses Schema); Vorsatz «shopify_shop=» ODER Anhang «=shopify_shop» weg (Variablenname aus einem
    Einfügefehler); EIN «/» am Ende weg. Jeder Schritt höchstens einmal.
 4. Der Rest muss ganz auf ^[a-z0-9]([a-z0-9-]*[a-z0-9])?\\.myshopify\\.com$ passen. Hosts unter myshopify.com gehören Shopify: Zugangsdaten
    gehen so nie an einen fremden Betreiber. Zusätzlich muss er (Standard) der LuxeStyle-Host sein (SHOP_ECHT).
 Nicht gesetzt (None oder «») ist «leer» — nichts zu prüfen. Gesetzt, aber nur Leerraum, ist «falsch». Ein Paar Anführungszeichen muss GLEICH sein.
 Fehlertexte nennen nie den Wert, nur Länge und Merkmale (host_struktur) — der Wert könnte ein vertauschter Schlüssel sein.

AUFRUF
    import sys, os; sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "lib"))     # aus automation/
    from shopify_host import assert_shopify_host, heile_shopify_host
    SHOP = assert_shopify_host(os.environ.get("SHOPIFY_SHOP"))             # wirft ShopifyHostFehler, bevor ein Schlüssel angefügt wird
    SHOP = heile_shopify_host(os.environ.get("SHOPIFY_SHOP"))["host"]       # wie lib/shopify_secret.sh: bei falsch der echte Host
    python3 automation/lib/shopify_host.py --selbsttest
"""
import os
import re
import sys
import time

SHOP_ECHT = "au3j0y-hq.myshopify.com"
MAX_LAENGE = 253                                                              # Hostname-Maximum (DNS), Regel 0
HOST_RE = re.compile(r"[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.myshopify\.com")      # mit fullmatch (kein «$», das vor einem Zeilenende passt)
LEERRAUM = " \t\r\n\v\f"
NAME = "shopify_shop"
_KLEIN = str.maketrans("ABCDEFGHIJKLMNOPQRSTUVWXYZ", "abcdefghijklmnopqrstuvwxyz")
_SCHLUESSEL = re.compile(r"shp[a-z]{2}_|[0-9a-fA-F]{32}\Z")
FAELLE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "shopify_host_faelle.tsv")


class ShopifyHostFehler(ValueError):
    """art ∈ falsch | fremd | leer. Der Text enthält nie den Wert."""

    def __init__(self, art, text):
        super().__init__(text)
        self.art = art


def host_struktur(roh):
    """Länge und Merkmale des Werts, NIE Zeichen daraus."""
    if not isinstance(roh, str):
        return f"Typ {type(roh).__name__}"
    m = [f"Länge {len(roh)}"]
    if len(roh) > MAX_LAENGE:                       # Regel 0: nicht weiter scannen (gleich in bash und node)
        return f"{m[0]}, länger als {MAX_LAENGE}"
    if any(c in LEERRAUM for c in roh):
        m.append("Leerraum")
    if '"' in roh or "'" in roh:
        m.append("Anführungszeichen")
    if "://" in roh:
        m.append("enthält «://»")
    if "/" in roh:
        m.append("enthält «/»")
    if "=" in roh:
        m.append("enthält «=»")
    if "@" in roh:
        m.append("enthält «@»")
    if ":" in roh.replace("://", ""):
        m.append("enthält «:»")
    if any("A" <= c <= "Z" for c in roh):
        m.append("Grossbuchstaben")
    if NAME in roh.translate(_KLEIN):
        m.append("enthält den Variablennamen")
    if _SCHLUESSEL.match(roh.strip(LEERRAUM)):
        m.append("schlüsselartig (vertauscht?)")
    if not roh.strip(LEERRAUM).translate(_KLEIN).endswith(".myshopify.com"):
        m.append("endet nicht auf .myshopify.com")
    return ", ".join(m)


def bereinige_shopify_host(roh):
    """Schritte 1–3 der Regel → Kandidat. Urteilt nicht (das tut host_urteil)."""
    w = str(roh).strip(LEERRAUM)
    if len(w) >= 2 and w[0] == w[-1] and w[0] in "\"'":
        w = w[1:-1].strip(LEERRAUM)
    w = w.translate(_KLEIN)
    if w.startswith("https://"):
        w = w[len("https://"):]
    if w.startswith(NAME + "="):
        w = w[len(NAME) + 1:]
    elif w.endswith("=" + NAME):
        w = w[:-(len(NAME) + 1)]
    if w.endswith("/"):
        w = w[:-1]
    return w


def host_urteil(roh, erwartet=SHOP_ECHT):
    """→ (art, host). art: leer (None/«»), ok (schon kanonisch), bereinigt, falsch, fremd (gültige Struktur, aber nicht `erwartet`).
    host ist nur bei ok/bereinigt gefüllt. erwartet=None prüft nur die Struktur (dann gibt es kein «fremd»)."""
    if roh is None or roh == "":
        return "leer", ""
    if not isinstance(roh, str) or len(roh) > MAX_LAENGE:
        return "falsch", ""
    k = bereinige_shopify_host(roh)
    if not HOST_RE.fullmatch(k):
        return "falsch", ""
    if erwartet is not None and k != erwartet:
        return "fremd", ""
    return ("ok" if k == roh else "bereinigt"), k


def normalize_shopify_host(roh):
    """Nur Struktur (wie Codex #2673): '' bei leer, sonst der bereinigte Host; wirft ShopifyHostFehler bei falsch."""
    art, host = host_urteil(roh, None)
    if art == "leer":
        return ""
    if art == "falsch":
        raise ShopifyHostFehler(art, f"SHOPIFY_HOST: kein Shop-Host unter myshopify.com ({host_struktur(roh)})")
    return host


def assert_shopify_host(roh, erwartet=SHOP_ECHT):
    """Der bereinigte Host — oder ShopifyHostFehler (leer, falsch, fremd). Vor JEDEM Anfügen von Zugangsdaten rufen."""
    art, host = host_urteil(roh, erwartet)
    if art in ("ok", "bereinigt"):
        return host
    text = {"leer": "nicht gesetzt",
            "falsch": "kein Shop-Host unter myshopify.com",
            "fremd": "gültiger myshopify.com-Host, aber nicht der erwartete Shop"}[art]
    raise ShopifyHostFehler(art, f"SHOPIFY_HOST: {text} ({host_struktur(roh)})")


def heile_shopify_host(roh, erwartet=SHOP_ECHT):
    """Wie shopify_shop_pruefen in lib/shopify_secret.sh → {"host", "art", "grund"}.
    leer → host «» (nichts zu heilen); ok/bereinigt → der Host; falsch/fremd → `erwartet` (das Secret geht nie an den Wert), grund nennt Länge/Merkmale."""
    if not erwartet:
        raise ValueError("heile_shopify_host braucht einen erwarteten Host")
    art, host = host_urteil(roh, erwartet)
    if art in ("falsch", "fremd"):
        return {"host": erwartet, "art": art, "grund": host_struktur(roh)}
    return {"host": host, "art": art, "grund": ""}


def _entschluessele(feld):
    """«…» aus der Fallliste → Wert (Escapes \\t \\r \\n)."""
    assert feld.startswith("«") and feld.endswith("»"), "Fallliste: roh muss in «…» stehen"
    return feld[1:-1].replace("\\t", "\t").replace("\\r", "\r").replace("\\n", "\n")


def faelle(pfad=FAELLE):
    """Liest die gemeinsame Fallliste → [(roh, art, host)]."""
    out = []
    with open(pfad, encoding="utf-8") as f:
        for z in f:
            z = z.rstrip("\n")
            if not z or z.startswith("#"):
                continue
            roh, art, host = z.split("\t")
            out.append((_entschluessele(roh), art, "" if host == "-" else host))
    return out


def selbsttest():
    ok = fehl = 0

    def pruefe(name, bed):
        nonlocal ok, fehl
        if bed:
            ok += 1
        else:
            fehl += 1
            print("FEHL:", name)

    tabelle = faelle()
    arten = {a for _, a, _ in tabelle}
    pruefe("A Fallliste gelesen, alle fünf Urteile belegt (Kanarienvogel gegen eine leere Tabelle)",
           len(tabelle) >= 30 and arten == {"leer", "ok", "bereinigt", "falsch", "fremd"})
    for roh, art, host in tabelle:
        pruefe(f"B Tabelle Länge {len(roh)} → {art}", host_urteil(roh) == (art, host))
    # Struktur-Variante (erwartet=None): «fremd» entfällt, die Fremd-Zeilen sind dann gültige Shop-Hosts
    pruefe("C ohne erwartet ist ein anderer Shop gültig", host_urteil("other-store.myshopify.com", None) == ("ok", "other-store.myshopify.com"))
    pruefe("D normalize: leer → ''", normalize_shopify_host(None) == "" and normalize_shopify_host("") == "")
    pruefe("E normalize: bereinigt", normalize_shopify_host(" HTTPS://Other-Store.myshopify.com/ ") == "other-store.myshopify.com")
    # Unicode-/Zeilenende-Fallen (ASCII-genau, fullmatch)
    pruefe("F Zeilenende wird nur als Leerraum am Rand getilgt", host_urteil("au3j0y-hq.myshopify.com\n") == ("bereinigt", SHOP_ECHT))
    pruefe("G Zeilenende mitten im Wert → falsch", host_urteil("au3j0y-hq.myshopify.com\nevil.example")[0] == "falsch")
    pruefe("H NBSP ist kein Leerraum → falsch", host_urteil(" au3j0y-hq.myshopify.com")[0] == "falsch")
    pruefe("I Kelvin-Zeichen wird nicht zu «k» → falsch", host_urteil("Kelvin.myshopify.com", None)[0] == "falsch")
    pruefe("J kein Text → falsch", host_urteil(12345)[0] == "falsch" and host_urteil(["a"])[0] == "falsch")
    # Regel 0: Längenschranke (Grenze 253 exakt, Polster zählt mit) und ein riesiger Wert bleibt schnell
    pruefe("F2 Grenze: 253 Zeichen (Polster + Host) bereinigt, 254 falsch",
           host_urteil(" " * (MAX_LAENGE - len(SHOP_ECHT)) + SHOP_ECHT) == ("bereinigt", SHOP_ECHT)
           and host_urteil(" " * (MAX_LAENGE + 1 - len(SHOP_ECHT)) + SHOP_ECHT)[0] == "falsch")
    gross = "x" + " " * 130000 + "y"
    t0 = time.monotonic()
    urteil_gross, struktur_gross = host_urteil(gross), host_struktur(gross)
    dauer = time.monotonic() - t0
    pruefe("F3 riesiger Wert: falsch, Struktur nennt nur Länge, unter 1 s",
           urteil_gross == ("falsch", "") and struktur_gross == f"Länge 130002, länger als {MAX_LAENGE}" and dauer < 1.0)
    # assert / heile
    pruefe("K assert liefert den Host", assert_shopify_host("  au3j0y-hq.myshopify.com ") == SHOP_ECHT)
    for roh, art in ((None, "leer"), ("", "leer"), ("evil.example.com", "falsch"), ("other-store.myshopify.com", "fremd"), ("   ", "falsch")):
        try:
            assert_shopify_host(roh)
            pruefe(f"L assert wirft bei {art}", False)
        except ShopifyHostFehler as e:
            pruefe(f"L assert wirft bei {art}", e.art == art and str(e).startswith("SHOPIFY_HOST:"))
    h = heile_shopify_host("evil.example.com=SHOPIFY_CLIENT_SECRET")
    pruefe("M heile: falsch → echter Host", h["host"] == SHOP_ECHT and h["art"] == "falsch")
    pruefe("N heile: leer bleibt leer, ok bleibt", heile_shopify_host("")["host"] == "" and heile_shopify_host(SHOP_ECHT) == {"host": SHOP_ECHT, "art": "ok", "grund": ""})
    pruefe("O heile: bereinigt", heile_shopify_host("SHOPIFY_SHOP=" + SHOP_ECHT)["art"] == "bereinigt")
    try:
        heile_shopify_host("x", erwartet=None)
        pruefe("P heile ohne erwartet wirft", False)
    except ValueError:
        pruefe("P heile ohne erwartet wirft", True)
    # Der Wert darf nie in Text oder Struktur stehen
    marke = "geheim-marker-4711.example"
    texte = [host_struktur(marke), host_struktur(marke + "=" + NAME), heile_shopify_host(marke)["grund"]]
    try:
        assert_shopify_host(marke)
    except ShopifyHostFehler as e:
        texte.append(str(e))
    pruefe("Q kein Wert in Fehlertext/Struktur", all("marker" not in t and "4711" not in t and "geheim" not in t for t in texte) and len(texte) == 4)
    schluessel = "shp" + "ss_" + "0123456789abcdef" * 2
    pruefe("R Schlüssel-Form wird erkannt, aber nicht ausgegeben", "schlüsselartig" in host_struktur(schluessel) and "0123" not in host_struktur(schluessel))
    print(f"Selbsttest: {ok}/{ok + fehl}")
    return 0 if fehl == 0 else 1


def main(argv):
    if argv == ["--selbsttest"]:
        return selbsttest()
    print(f"unbekannter Schalter {argv!r} — Abbruch (kein Lauf). Das Modul wird eingebunden; erlaubt: --selbsttest", file=sys.stderr)
    return 2


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
