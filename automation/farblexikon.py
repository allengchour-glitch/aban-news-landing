# -*- coding: utf-8 -*-
"""Erkennt, ob ein Variantenwert eine REINE Farbe ist – und welche.

Gemeinsames Lexikon für `farbe_je_variante.py` (Google-Feed) und den CJ-Importer.

LEITSATZ: Lieber nichts als geraten. `farbe_von()` gibt nur dann eine Farbe zurück,
wenn der GANZE Wert aus Farbwörtern besteht – Grössen- und Massangaben daneben werden
abgetrennt, alles andere (Stilnummern, Lieferantencodes, «Style», «Male», «Birthstone»)
lässt den Wert durchfallen. Aus dem Probelauf über 62'325 Optionswerte:
  aufgelöst 78 %  ·  «Warm Sand Camel», «Grey C Thin», «Midnight Blue-38or40mm»,
  «Lotus Root Color», «S-Color», «JM721» bleiben bewusst ohne Farbe.

FEHLTREFFER, die der Probelauf zeigte und die hier abgestellt sind:
  «PCpink» → das Wort endet auf «pink», der Vorsatz ist aber ein Lieferantenkürzel
      (Regel: Wortstamm mind. 3 Buchstaben und nicht durchgehend gross).
  «Blaublau» → doppelt übersetzter Altwert, wird zu «Blau» zusammengezogen.
  «Wine Red-0XL» → zerfiel beim Trennen zu «Weinrot/Rot»; mehrteilige englische
      Wendungen werden jetzt VOR dem Trennen nachgeschlagen.
  «Handschuh», «Lichterkette», «Straps» → fallen durch, wie es die Hausregel zu
      deutschen Zusammensetzungen verlangt.
"""
import re

MODIFIER = {"light":"Hell","dark":"Dunkel","deep":"Dunkel","bright":"Leuchtend",
            "pale":"Blass","neon":"Neon","fluorescent":"Neon","matte":"Matt"}

EN2DE = {
 "black":"Schwarz","white":"Weiss","red":"Rot","blue":"Blau","green":"Grün","yellow":"Gelb",
 "grey":"Grau","gray":"Grau","pink":"Pink","purple":"Lila","brown":"Braun","beige":"Beige",
 "gold":"Gold","golden":"Gold","silver":"Silber","orange":"Orange","navy":"Marineblau",
 "khaki":"Khaki","violet":"Violett","ivory":"Elfenbein","coffee":"Kaffeebraun","cream":"Creme",
 "nude":"Nude","camel":"Camel","turquoise":"Türkis","burgundy":"Bordeaux","apricot":"Aprikose",
 "amber":"Bernstein","champagne":"Champagner","lavender":"Lavendel","rose":"Rosé",
 "wine red":"Weinrot","dark gray":"Dunkelgrau","dark grey":"Dunkelgrau","light gray":"Hellgrau",
 "light grey":"Hellgrau","dark blue":"Dunkelblau","light blue":"Hellblau","sky blue":"Himmelblau",
 "navy blue":"Marineblau","army green":"Armeegrün","dark green":"Dunkelgrün",
 "light green":"Hellgrün","rose red":"Rosarot","hot pink":"Pink","light pink":"Rosa",
 "dark brown":"Dunkelbraun","light brown":"Hellbraun","multicolor":"Bunt","multicolour":"Bunt",
 "transparent":"Transparent","clear":"Transparent","bronze":"Bronze","copper":"Kupfer",
 "mint":"Mintgrün","olive":"Oliv","teal":"Petrol","maroon":"Bordeaux","fuchsia":"Fuchsia",
 "magenta":"Magenta","indigo":"Indigo","taupe":"Taupe","charcoal":"Anthrazit",
 "rose gold":"Roségold","wine":"Weinrot","claret":"Bordeaux","emerald":"Smaragdgrün",
 "sapphire":"Saphirblau","lake blue":"Seeblau","dark red":"Dunkelrot","dark purple":"Dunkellila",
 "light purple":"Helllila","light yellow":"Hellgelb","dark yellow":"Dunkelgelb",
 "peacock blue":"Pfauenblau","caramel":"Karamell","apricot color":"Aprikose",
 "denim blue":"Jeansblau","champagne gold":"Champagnergold","lake blue":"Seeblau",
 "grass green":"Grasgrün","milk white":"Milchweiss","off white":"Cremeweiss",
 "brick red":"Ziegelrot","gray blue":"Graublau","grey blue":"Graublau",
 "coffee color":"Kaffeebraun","black gray":"Schwarz/Grau","black grey":"Schwarz/Grau",
 "jean blue":"Jeansblau","sea blue":"Meeresblau","fruit green":"Hellgrün",
 "lemon yellow":"Zitronengelb","ginger":"Ingwer","rust":"Rost","haze blue":"Rauchblau",
}

# Eigenständige deutsche Farbwörter, die auf kein Grundfarbwort enden.
DE_SOLO = {
 "beige","gold","silber","khaki","camel","creme","nude","bordeaux","champagner","aprikose",
 "bernstein","lavendel","rosé","rose","türkis","tuerkis","elfenbein","kupfer","bronze",
 "anthrazit","ocker","petrol","fuchsia","magenta","indigo","taupe","ecru","sand","oliv",
 "senf","flieder","koralle","terrakotta","perlmutt","karamell","mokka","bunt","transparent",
 "marine","mint","lila","rosa","pink","orange","violett","burgunder","natur","klar","zyan",
 "smaragd","saphir","rubin","platin","titan","graphit","schiefer","denim","stahl","kaffee",
}
# Grundfarbwörter: jedes Wort, das auf eines davon endet, gilt als Farbe
# («Dunkelmarineblau», «Elfenbeinweiss», «Leuchtendrot», «Olivgrün», «Roségold»).
BASIS = ("blau","grün","gruen","rot","gelb","grau","braun","schwarz","weiss","weiß",
         "lila","rosa","violett","gold","silber","türkis","tuerkis","beige","orange","pink")

GROESSE = re.compile(r'^(?:XXS|XS|S|M|L|XL|XXL|XXXL|[0-9]XL|0XL|FREE\s?SIZE|ONE\s?SIZE|ONESIZE)$', re.I)
NURBUCH = re.compile(r'^[A-Za-zÄÖÜäöüßé]+$')
TRENNER = re.compile(r'[\s\-–—/]+')
# Reine Mass-/Mengenangaben, die neben der Farbe stehen: «58to61cm», «42or44or45mm», «8cm».
# Sie sagen über die Farbe nichts und dürfen weg – anders als «Birthstone», «Male», «Style»,
# die beweisen, dass der Wert eben KEINE reine Farbe ist.
MASS = re.compile(r'^(?:\d+(?:[.,]\d+)?(?:or|to|x|×)?)+(?:cm|mm|ml|m|g|kg|l|zoll|inch(?:es)?|yards?)?$', re.I)


def _wort_farbe(w):
    """Ein einzelnes Wort → deutsche Farbe oder None."""
    k = w.lower().strip()
    if not k or not NURBUCH.match(w):
        return None
    if k in EN2DE:
        return EN2DE[k]
    if k in DE_SOLO:
        return w[:1].upper() + w[1:]
    if k in BASIS:
        return w[:1].upper() + w[1:]
    for b in BASIS:
        if len(k) > len(b) and k.endswith(b):
            stamm = w[:len(w) - len(b)]
            # «PCpink», «AFred»: ein zwei Buchstaben kurzer oder durchgehend grosser
            # Vorsatz ist ein Lieferantenkürzel, kein Farbwort.
            if len(stamm) < 3 or stamm.isupper():
                return None
            if stamm.lower() == k[len(stamm):]:      # «Blaublau» → «Blau»
                return stamm[:1].upper() + stamm[1:]
            return w[:1].upper() + w[1:]
    return None


def farbe_von(wert):
    """Gibt die Farbe zurück, wenn der GANZE Wert eine reine Farbe ist – sonst None.

    Grösse-Präfixe/-Suffixe werden abgetrennt («L-Schwarz», «Black-1XL»).
    Sobald ein einziger Bestandteil keine Farbe und keine Grösse ist, wird nichts
    zurückgegeben: «Warm Sand Camel», «Grey C Thin», «Navy blue-40 or 41» sind keine
    verlässlichen Farbangaben, und eine geratene Farbe ist schlechter als keine.
    """
    w = (wert or "").strip()
    if not w or len(w) > 40:
        return None
    k = w.lower()
    # mehrteilige englische Wendungen zuerst («wine red», «sky blue», «rose gold»)
    if k in EN2DE:
        return EN2DE[k]
    teile0 = [t for t in TRENNER.split(w) if t]
    kern = [t for t in teile0 if not GROESSE.match(t) and not MASS.match(t)]
    if len(kern) == 2:
        m = MODIFIER.get(kern[0].lower())
        g = EN2DE.get(kern[1].lower()) or (kern[1] if kern[1].lower() in DE_SOLO else None)
        if m and g:
            return m + g.lower()
        z = " ".join(kern).lower()
        if z in EN2DE:
            return EN2DE[z]
    teile = teile0
    if not kern or len(kern) > 3:
        return None
    teile = kern
    farben = []
    for t in teile:
        f = _wort_farbe(t)
        if not f:
            # zweiteilige englische Wendung, die durch das Trennen zerfiel
            return None
        farben.append(f)
    if not farben:
        return None
    # Doppelnennungen zusammenziehen, Reihenfolge behalten
    raus = []
    for f in farben:
        if f not in raus:
            raus.append(f)
    return "/".join(raus[:3])
