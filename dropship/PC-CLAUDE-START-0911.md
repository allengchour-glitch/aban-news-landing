# PC-Claude: alle offenen Aufträge in einem Zug (Stand 09.11.2026 nachts)

Für den PC-Claude mit Brave (Port 9222, eingeloggt, siehe `dropship/BROWSER-AGENT-SETUP.md`). Diese Datei bündelt die vier offenen Browser-Aufträge. Cloud-Claude kann sie nicht selbst ausführen (kein Browser, kein Login). Jeder Auftrag hat seine eigene Datei mit Grenzen und Schritten; **die Grenzen dort gelten vor allem anderen**.

**Entscheide des Besitzers (10.11. ~00:00 UTC, auf gezielte Frage):** Liechtenstein = **Variante A** (Versanddienst pauschal CHF 14.90 anlegen). Der Pullover-Pilot (329 Produkte) ist freigegeben und bereits ausgeführt; das braucht PC-Claude nicht.

## Zum Einfügen bei PC-Claude (Besitzer: kopieren und senden)

> Hole das Repo `allengchour-glitch/aban-news-landing` (Zweig `main`) und führe nacheinander diese Aufträge aus. Lies jeden Auftrag ganz, bevor du beginnst, halte dich an seine Grenzen und melde nach jedem Auftrag kurz auf Deutsch, was du getan und gesehen hast (mit Bildschirmfotos). Bei Login-Wand, 2FA, Preisen oder Obergrenzen: anhalten und mich fragen. Nichts bezahlen, nichts anderes ändern.
> 1. `dropship/BROWSER-BEFEHL-UEBERSETZEN-FR-0911.md` (zuerst: läuft danach von selbst im Hintergrund)
> 2. `dropship/BROWSER-BEFEHL-MERCHANT-LI-0811.md` (Schritt 1 lesen; Änderung Variante A: Versanddienst Liechtenstein CHF 14.90)
> 3. `dropship/BROWSER-BEFEHL-BESTELLMAIL-0911.md` (nur Schritt 1: lesen und melden)
> 4. `dropship/BROWSER-BEFEHL-TIKTOK-LOESCHEN-0411.md` (ein Video löschen, nur das eine)

## Die vier Aufträge in einem Satz

| # | Datei | Was | Wirkung | Risiko |
|---|---|---|---|---|
| 1 | `BROWSER-BEFEHL-UEBERSETZEN-FR-0911.md` | Shopifys Übersetzer «Translate & Adapt» starten: Französisch für Produkte, Sammlungen, Blogbeiträge (nur nicht Übersetztes, nichts bezahlen) | Rest der rund 56 000 aktiven Produkte auf Französisch; `/fr` bleibt `noindex` bis mindestens 95 % | gering (Übersetzung ist rückholbar; bei Preis/Obergrenze stoppt PC-Claude) |
| 2 | `BROWSER-BEFEHL-MERCHANT-LI-0811.md` | Merchant Center: Versand für Liechtenstein anlegen (A: pauschal CHF 14.90) | 3 201 Varianten ohne Versandinfo, Warnung −20 % in Liechtenstein; Liechtenstein hatte 2 der letzten 8 Bestellungen (#1032, #1038) | gering (Versanddienst, rückholbar) |
| 3 | `BROWSER-BEFEHL-BESTELLMAIL-0911.md` | Kundenmails (Bestellbestätigung u. a.) auf widersprüchliche Rückgabe-Aussagen **lesen** | schliesst die letzte offene Stelle des Rückgabe-Textes; ändern nur nach deinem Ja | keins (nur Lesen) |
| 4 | `BROWSER-BEFEHL-TIKTOK-LOESCHEN-0411.md` | das TikTok-Video «Kuscheldecke Hasenfell-Imitat Tie-Dye» (25.10.) löschen, wie du am 04.11. gesagt hast | Video weg | nicht rückholbar (gelöscht ist gelöscht); nur das eine Video, bei Zweifel Liste zeigen |

Reihenfolge: 1 zuerst (läuft Stunden bis Tage von selbst), 2 und 3 danach, 4 zuletzt.

## Was Cloud-Claude danach tut
- Nach 1: Abdeckung messen (`python3 dropship/fr-produkte-0911/abdeckung.py PRODUCT`), Qualität prüfen (`qualitaet.py PRODUCT 4`), beschädigtes HTML suchen; `noindex` erst ab 95 % aufheben.
- Nach 2: nach etwa zwei Tagen neuer Merchant-Export «Probleme mit Artikeln» (kleine Fassung, unter 10 MB), Zeile «Liechtenstein» im Dashboard nachführen.
- Nach 3: Wortlaut mit dir abstimmen, dann PC-Claude Schritt 2 auslösen.
- Das Dashboard «Offene Punkte» (Zeilen `fr-produkte`, `liechtenstein`, `rueckgabe-rest`) wird nachgeführt.
