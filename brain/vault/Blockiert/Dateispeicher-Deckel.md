---
tags: [blockiert, speicher, betreiber-entscheid]
quelle: CLAUDE.md 04.09./08.09./09.09., Upload-Probe 14.09. 06:55 UTC
gelernt: 2026-09-14
---
# Dateispeicher-Deckel — Google-Drive hilft nicht, nur Plan oder Katalog

Betreiberfrage 14.09.: «Dateispeicher von Google nehmen oder Upgrade?»

## Gemessen (14.09.)
- Plan: **Basic** (`shop.plan.displayName`).
- Upload-Probe (25-Byte-Textdatei, volle Kette): `stagedUploadsCreate` ok → Upload HTTP 201 →
  `fileCreate` `UPLOADED` → 25 s später am Knoten **FAILED · FILE_STORAGE_LIMIT_EXCEEDED**.
  Der Deckel ist seit dem 01.09. ununterbrochen erreicht; 2,07 GB Aufräumen (04.09.) haben nichts geändert.
- Was den Platz frisst (Messung 09.09.): Produktmedien ~66 GB (Ø 1,3 MB je aktivem Produkt, ~52'000 aktiv),
  Entwürfe ~10,5 GB, Dateien-Bibliothek 0,6 GB, Videos 0,36 GB. **Jede 10'000 Produkte kosten ~13 GB.**

## Warum Google-Drive das Problem NICHT löst
Shopify liefert Produktbilder aus dem **eigenen CDN**. Ein Bild auf Drive ist kein Produktmedium;
wer es importiert, braucht denselben Shopify-Platz. Drive berührt damit 99 % des Problems nicht.
Es löst genau EINE Sache: den Transport der TikTok-Queue zum PC (liegt seit 09.09. dort).

## Die zwei echten Wege
1. **Plan-Upgrade** — Shopify gibt die GB-Grenze in KEINER API aus; die Zahl je Plan steht nur auf der
   Preisseite und gehört dort gelesen, nicht aus dem Gedächtnis genommen (Korrektur 04.09.: «Basic = 100 GB»
   war unbelegt). Kosten laufend, sofort wirksam.
2. **Katalog verkleinern** — Entwürfe MIT Medien löschen (nicht nur entbildern). ~10,5 GB möglich, davon nur
   ~0,3 GB beweisbar sicher; `duplikat-auto-draft` (3,5–6 GB) braucht den Bild-Hash-Beweis gegen einen
   aktiven Zwilling. Aufräumen ist Aufschub: der Grind legt ~0,25–1 GB/Tag nach.

Verwandt: [[Drei-User-Klicks]] · [[Masse-ist-kein-Hebel]]
