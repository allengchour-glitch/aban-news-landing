"""Zahlen aus dem Bildschirm lesen.

Bisher konnte der Bot nur erkennen, ob etwas DA ist - nie, wie viel. Damit
waren alle Wuensche unerreichbar, die eine Menge nennen: "Versammlung starten,
wenn ueber 20 Energie", "nur Monster bis Stufe 6", "Versammlung beitreten,
ausser der Gegner ist zu stark". Das hier schliesst die Luecke.

Kein OCR und keine fremde Bibliothek: die Ziffern eines Spiels sind zehn feste
Bilder. Wer sie einmal ausschneidet, kann jede Zahl zusammensetzen - mit
demselben Vergleich, der ohnehin schon alle Knoepfe findet.
"""

from __future__ import annotations

import os
from typing import Dict, List, Optional, Sequence

from . import matcher
from .image import Image


def _ueberdeckt(a, b, breite: int) -> bool:
    """Zwei Funde an derselben Stelle? Dann ist es dieselbe Ziffer."""
    return abs(a[0] - b[0]) < max(3, breite // 2)


def lies_zahl(
    screen: Image,
    ziffern: Dict[str, Image],
    region: Optional[Sequence[float]] = None,
    threshold: float = 0.80,
    scale: float = 1.0,
    hoechstens: int = 6,
) -> Optional[int]:
    """Die Zahl im Ausschnitt oder None.

    Vorgehen: jede der zehn Ziffern im Ausschnitt suchen, alle Funde ueber der
    Schwelle sammeln, Doppelfunde an derselben Stelle auf den besten eindampfen
    und den Rest von links nach rechts aneinanderreihen.

    Wichtig ist das Eindampfen: eine 8 findet sich auch dort, wo eine 3 oder
    eine 6 steht, nur mit kleinerem Wert. Ohne diesen Schritt kaeme aus "83"
    schnell "883" - und eine falsch gelesene Zahl ist schlimmer als gar keine,
    weil danach mit ihr gerechnet wird.
    """
    if not ziffern:
        return None

    funde: List[tuple] = []   # (x, ziffer, score, breite)
    for zeichen, vorlage in sorted(ziffern.items()):
        if vorlage.width < 2 or vorlage.height < 2:
            continue
        for treffer in matcher.find_all(
            screen, vorlage, threshold=threshold, region=region,
            scale=scale, limit=hoechstens,
        ):
            funde.append((treffer.x, zeichen, treffer.score, treffer.w))

    if not funde:
        return None

    # Beste zuerst, dann jeden Platz nur einmal vergeben.
    funde.sort(key=lambda f: -f[2])
    behalten: List[tuple] = []
    for fund in funde:
        if any(_ueberdeckt(fund, schon, fund[3]) for schon in behalten):
            continue
        behalten.append(fund)
        if len(behalten) >= hoechstens:
            break

    behalten.sort(key=lambda f: f[0])
    text = "".join(f[1] for f in behalten)
    try:
        return int(text)
    except ValueError:
        return None


def lade_ziffern(ordner: str) -> Dict[str, Image]:
    """Die Ziffern-Vorlagen aus einem Ordner: 0.png bis 9.png."""
    gefunden: Dict[str, Image] = {}
    if not os.path.isdir(ordner):
        return gefunden
    for zeichen in "0123456789":
        pfad = os.path.join(ordner, f"{zeichen}.png")
        if os.path.exists(pfad):
            try:
                gefunden[zeichen] = Image.load(pfad)
            except Exception:
                continue
    return gefunden
