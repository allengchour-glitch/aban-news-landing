# "Glut" veroeffentlichen - Schritt fuer Schritt

Praktische Anleitung fuer Band 1. Reihenfolge nach Wirkung. Alles kostenlos
vorab; du zahlst nur mit Marge (Provision je Kanal).

## Wichtigste Vorentscheidung: exklusiv oder ueberall?
- **KDP Select** (Kindle-exklusiv): bessere Amazon-Sichtbarkeit + Kindle
  Unlimited (Leihtantiemen), aber du darfst das E-Book NIRGENDWO sonst
  verkaufen - also kein Tolino, kein Direktverkauf des ePub.
- **"wide"** (ueberall): KDP + Tolino + Direktverkauf parallel. Kein KU.

Fuer ein deutsches Buch ist **"wide"** meist klueger - Tolino = der deutsche
Buchhandel (Thalia, Weltbild, Hugendubel, buecher.de). Diese Anleitung geht
von "wide" aus.

Dateien liegen bereit:
- E-Book: `ausgabe/glut-aschebund-trilogie-band-1.epub`
- Manuskript (zum Korrigieren): `...-band-1.md`
- Cover: `ausgabe/cover-glut.png` (1600x2560)

---

## 2) Tolino Media (deutscher Buchhandel) - GRATIS

Tolino Media verteilt dein E-Book an Thalia, Weltbild, Hugendubel, buecher.de
und weitere deutsche Shops - mit einem Upload.

**Schritte:**
1. Konto anlegen: `https://www.tolino-media.de` -> Registrieren (Name, Adresse,
   Bankverbindung fuer Auszahlung, Steuerangaben).
2. "Neues E-Book" -> Titel "Glut", Untertitel "Aschebund-Trilogie, Band 1".
3. Datei hochladen: die **.epub** (`glut-aschebund-trilogie-band-1.epub`).
4. Cover hochladen: `cover-glut.png`.
5. Metadaten:
   - Autor: Aban
   - Sprache: Deutsch
   - Kategorie/Genre: Fantasy -> (Romantasy / Dark Fantasy)
   - Schlagworte: Drachen, Romantasy, Dark Fantasy, Enemies to Lovers,
     Drachenreiter, Slow Burn, New Adult
   - Klappentext: siehe unten
6. Preis: **3,99-5,49 EUR** (Band 1 als Serienauftakt eher guenstig).
7. ISBN: Tolino vergibt auf Wunsch kostenlos eine - annehmen.
8. Veroeffentlichen. Sichtbar wird es meist nach 1-3 Tagen in den Shops.
9. Den Thalia- (oder Tolino-) Produktlink kopieren -> in
   `js/glut-config.js` als `TOLINO_URL` eintragen.

Marge: ~70 % vom Nettopreis (je Shop leicht unterschiedlich).

---

## 3) Direktverkauf ueber die eigene Seite (hoechste Marge) - GRATIS vorab

Eigene Verkaufsseite ist schon gebaut: **`glut.html`** (Pretty-URL `/glut`).
Sie zeigt Buttons automatisch, sobald in `js/glut-config.js` Links stehen.

**Schritte:**
1. Verkaufskonto anlegen (eines genuegt):
   - **Gumroad** (`gumroad.com/signup`) - am schnellsten. Provision ~10 %.
     Du kuemmerst dich selbst um Umsatzsteuer.
   - **Lemon Squeezy** (`app.lemonsqueezy.com`) - "Merchant of Record",
     uebernimmt die EU-MwSt fuer dich. Ideal aus der Schweiz in die EU.
   - **Payhip** - simpel, gratis-Tarif mit ~5 % Gebuehr.
2. Neues digitales Produkt: Name "Glut - Aschebund Band 1".
3. Datei(en) hochladen: **.epub** (und optional die PDF, falls vorhanden).
4. Preis: **4,99 EUR** (oder "Pay what you want", Vorschlag 4,99).
5. Beschreibung: Klappentext (unten). Produktbild: `cover-glut.png`.
6. Veroeffentlichen -> Produktlink kopieren.
7. In `js/glut-config.js` als `DIREKT_URL` eintragen, committen, pushen.
   -> Auf `/glut` erscheint der Direktkauf-Button automatisch.

Marge: ~90 % (Gumroad/Payhip) bzw. ~85 % (Lemon Squeezy nach MwSt) - der
hoechste Anteil aller Kanaele.

**Wichtig:** Direktverkauf bringt nur Geld, wenn Leute auf `/glut` kommen.
Der Hebel dafuer ist BookTok/Bookstagram - siehe `VERMARKTUNG.md`.

---

## Reihenfolge in einem Satz
KDP (Kindle+Print) zuerst, dann Tolino fuer den deutschen Buchhandel, dann
Direktverkauf als Marge-Bonus auf `/glut`. Sichtbarkeit (BookTok) entscheidet
ueber die Verkaufszahl, nicht die Zahl der Kanaele.

---

## Klappentext (zum Kopieren)

Im Aschekonkordat von Vyr binden sich Drachen nur an Menschen, die bereits
im Sterben liegen. Die Bindung haelt dich am Leben - doch jeder Zauber
verbrennt deine Tage.

Als die todkranke Sayra Vael zur beruechtigten Akademie Korvath gebracht
wird, bindet sich gegen jede Regel der uralte, todmuede Drache Kaelith an
sie. Zwischen toedlicher Ausbildung, einem Ausbilder, den sie hassen will,
und einer Wahrheit, die ihren Vater das Leben kostete, begreift Sayra: Das
Reich ruht auf einer Luege - und sie traegt den ersten Beweis in einer
Erinnerung, die nicht ihre eigene ist.

Eine dunkle Romantasy ueber Liebe unter tickender Uhr, ueber Macht, die
toetet, waehrend sie rettet - und ueber die Frage, wie weit du gehst, wenn
jeder Funke dich Leben kostet.

Auftakt der Aschebund-Trilogie.
