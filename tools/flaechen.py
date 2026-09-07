#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Flächen werden flach — ein Farbverlauf nur noch dort, wo er arbeitet.

    python3 tools/flaechen.py             # nur zählen
    python3 tools/flaechen.py --schreiben

⚠️ WOZU. `tools/ki_look.py` zählt 1111 Farbverläufe auf 657 Seiten. Nachgesehen, was
   sie tun: der grösste Teil sind **Flächen** — ein Kasten, der von einem Creme in ein
   anderes Creme läuft; ein 4-px-Balken neben der Überschrift, der von Bernstein nach
   Gelb geht. Das sieht niemand, und es ist genau das Muster, das eine Oberfläche
   „generiert" wirken lässt: nicht falsch, nur beliebig.

DIE ENTSCHEIDUNG (dieselbe wie im Spiel, wo aus 19 Knopf-Verläufen 0 wurden):
   **Eine Fläche ist eine Farbe.** Ein Verlauf bleibt nur, wo er etwas TUT.

WAS BLEIBT — und warum:
   · Masken (`transparent`, `rgba(…,0)`): blenden den Rand einer Laufschrift aus.
     Ohne den Verlauf schneidet der Text hart ab. 101 Stück.
   · Mehrstufige Verläufe (3+ Stopps): das sind die Bild-Hintergründe der Kopfbereiche,
     wo der Verlauf das Motiv IST. 376 Stück.
   · `-webkit-background-clip:text` — dort ist der Verlauf die Schrift selbst. Auf
     66 Seiten. Eine Datei mit dieser Eigenschaft wird komplett übersprungen.
   · `currentColor`-Verläufe (animierte Unterstriche).

ERSETZT WIRD: der zweistufige Flächen-Verlauf durch seinen ERSTEN Farbstopp — die
   Farbe, die die Fläche ohnehin trägt (Creme bleibt Creme, Bernstein bleibt Bernstein).
"""
import glob
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GRAD = re.compile(r'linear-gradient\(([^()]*(?:\([^()]*\)[^()]*)*)\)')
FARBE = re.compile(r'(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\)|var\(--[\w-]+\))')


def ersetzbar(inhalt):
    """Zweistufige Fläche ohne Maske, ohne currentColor."""
    if "transparent" in inhalt or "currentColor" in inhalt:
        return None
    if re.search(r'rgba\([^)]*,\s*0(\.0+)?\s*\)', inhalt):
        return None
    farben = FARBE.findall(inhalt)
    if len(farben) != 2:
        return None
    return farben[0]


def umschreiben(text):
    """(neuer Text, Anzahl). Dateien mit Verlaufs-SCHRIFT bleiben unangetastet."""
    if "background-clip:text" in text.replace(" ", ""):
        return text, 0
    n = [0]

    def rep(m):
        farbe = ersetzbar(m.group(1))
        if farbe is None:
            return m.group(0)
        # ⚠️ `background-image` (und Masken) nehmen KEINE Farbe an — dort würde aus dem
        # Verlauf eine ungültige Angabe, die der Browser still verwirft: die Fläche
        # wäre danach durchsichtig. Nur `background:` und `background-color:` ersetzen.
        vor = text[max(0, m.start() - 40):m.start()].replace(" ", "")
        if vor.endswith(("background-image:", "mask-image:", "-webkit-mask-image:", "mask:", "-webkit-mask:")):
            return m.group(0)
        n[0] += 1
        return farbe

    return GRAD.sub(rep, text), n[0]


def dateien():
    for muster in ("*.html", "*/*.html", "css/*.css"):
        for p in sorted(glob.glob(os.path.join(ROOT, muster))):
            yield p


def main():
    schreiben = "--schreiben" in sys.argv
    ges = betroffen = uebersprungen = 0
    for p in dateien():
        s = open(p, encoding="utf-8", errors="ignore").read()
        if "linear-gradient" not in s:
            continue
        neu, k = umschreiben(s)
        if k == 0 and "background-clip:text" in s.replace(" ", ""):
            uebersprungen += 1
        if k:
            ges += k
            betroffen += 1
            if schreiben:
                open(p, "w", encoding="utf-8").write(neu)
    print(f"Flächen-Verläufe: {ges} auf {betroffen} Dateien "
          f"{'flachgelegt' if schreiben else 'zu ersetzen'} · "
          f"{uebersprungen} Dateien mit Verlaufs-Schrift ausgelassen")
    if not schreiben:
        print("(nur gezählt — mit --schreiben wird geändert)")


if __name__ == "__main__":
    main()
