# Startseite: 11 Bereichs-Reihen (24.11.2026 abends)

Betreiber: «ergänze mehr startseiten zb kategorie kleider, winter oder so viele verschiedene produkten anzeigen von allem bereichen».

**Live seit 24.11.2026 ~23:00 UTC (Theme MAIN 214565814663):** 16 Produktreihen in `sections/luxe-edit-home.liquid`
(Reihenfolge: Weihnachtszauber → Winter → **Kleider** → Schmuck → **Damenmode** → Geschenke → **Herrenmode** → **Technik & Gadgets**
→ **Schuhe** → Zuhause → **Taschen & Rucksäcke** → **Beauty-Helfer** → **Küche & Kochen** → **Für Haustiere** → **Kinder & Baby** → **Sport & Outdoor**).
Je 4 Karten aus einem eigenen manuellen Pool, Fenster 12, Wechsel alle 4 h (gleiche Rechnung wie die Saisonreihen).

Mechanik (verallgemeinert): `lx_edit_groups` = `Schlüssel|Sammlung für «Ganze Auswahl ansehen»|Pool-Endung`; jede Reihe mit drittem Feld
zieht aus `startseite-pool-<Endung>` (vorher fester `case` für weihnachten/winter/geschenke). Texte `luxe_home.extra.<Schlüssel>_{eyebrow,heading,intro}` de/fr/en.
Fehlt ein Pool oder hat er < 12 Produkte, verschwindet die Reihe von selbst.

| Reihe | Pool | Produkte | Ganze Auswahl |
|---|---|---|---|
| Kleider | startseite-pool-kleider | 19 | damen-kleider |
| Damenmode | startseite-pool-damenmode | 20 | damen-mode |
| Herrenmode | startseite-pool-herrenmode | 20 | fur-ihn |
| Schuhe | startseite-pool-schuhe | 19 | schuhe |
| Taschen & Rucksäcke | startseite-pool-taschen | 18 | sub-taschen |
| Beauty-Helfer | startseite-pool-beauty | 12 | beauty-pflege |
| Technik & Gadgets | startseite-pool-technik | 16 | elektronik-technik |
| Küche & Kochen | startseite-pool-kueche | 17 | kueche-kochen |
| Für Haustiere | startseite-pool-haustier | 14 | sub-haustier |
| Kinder & Baby | startseite-pool-kinder | 13 | sub-baby-kids |
| Sport & Outdoor | startseite-pool-sport | 18 | sport-outdoor |

Auswahl: Workflow wf_a26e579f-4e5 (5 Auswähler + 5 unabhängige Prüfer mit eigenem Kontaktbogen): 283 vorgeschlagen, 186 behalten
(`keep.json`), 97 abgelehnt mit Befund (`abgelehnt.json`: Chanel-/Dior-Requisiten, Marken-Logos, Titel ≠ Bild, Heilversprechen, zu kleine Bilder …).
Pools versteckt (seo.hidden=1), nur Online Store, ohne Überschneidung mit den bisherigen 7 Pools (152 IDs ausgeschlossen).
Geprüft: alle 16 Reihen im HTML mit 4 Karten (Schmuck 3, Wohnen 2 wie bisher), kein «Liquid error», Handy-Screenshot 390 px.

**Rückweg:** `sicherung/` = Live-Dateien vor dem Schreiben (Section, de/fr/en) per themeFilesUpsert zurückspielen; oder einen Pool leeren/löschen (Reihe verschwindet).
**Pflege:** Beauty (12) und Kinder (13) liegen knapp über dem Minimum 12 — fällt ein Produkt aus (ausverkauft/Entwurf), zeigt das Fenster weniger gültige Karten; bei < 12 Pool-Produkten verschwindet die Reihe. Nachfüllen mit demselben Workflow-Muster.
