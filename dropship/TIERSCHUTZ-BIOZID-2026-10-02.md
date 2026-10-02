# Tierschutz + Biozide: 35 Haustier-Geräte aus dem Verkauf (02.10.2026)

**Anlass.** Beim Semrush-SEO-Lauf stand unter den Seiten, die in der Schweiz für einen Suchbegriff ranken, auch das
«Automatische Anti-Bell Halsband» (Suchbegriff «anti bell halsband», 140/Mt). Im Text stand nur «Vibration», das
Produktbild zeigte aber zwei Metall-Kontaktstifte auf der Hautseite.

## Rechtslage
| Regel | Wortlaut / Inhalt | Marke |
|---|---|---|
| TSchV Art. 76 Abs. 2 (SR 455.1) | «Die Verwendung von Geräten, die elektrisieren, für den Hund sehr unangenehme akustische Signale aussenden oder mittels chemischer Stoffe wirken, ist verboten.» | QUELLE fedlex.admin.ch/eli/cc/2008/416/de#art_76 |
| TSchV Art. 76 Abs. 6 | «Das Anwenden von Mitteln zur Verhinderung von Laut- und Schmerzensäusserungen ist verboten.» → jedes Anti-Bell-Gerät, egal welche Wirkung | QUELLE ebd. |
| Biozidprodukteverordnung SR 813.12 | Floh-/Zecken-/Insektenschutz-Halsbänder mit Wirkstoff (Deltamethrin, Metofluthrin …) brauchen vor dem Inverkehrbringen eine Zulassung; «Bandwurmschutz»/«Leishmaniose» = Tierarzneimittel | QUELLE (Verordnungstitel), nicht im Einzelnen nachgeprüft |

Der Shop verkauft nur in die Schweiz. Verboten ist laut Art. 76 die *Verwendung*, nicht ausdrücklich der Verkauf. Einem
Schweizer Shop ein Gerät zu verkaufen, dessen einziger Zweck hier verboten ist, ist trotzdem nicht vertretbar.
Die bisherige Sperre (`tierschutz_geraet.json`, seit 20.08.) fing nur Strom und Spray ab, und auch das nur, wenn der Text die Wirkung nannte.

## GEMESSEN
- Bildprüfung (Workflow `tierschutz-biozid-klasse`): 3 Prüfer sahen sich die Produktbilder an, je Block ein Gegenprüfer. Ergebnis über 35 Kandidaten:
  13× **strom** (Blitz-Taste, Kontaktstifte, «Electrostatic Pulse», «2 x Metal probes»), 4× **antibell**, 8× **biozid**,
  1× **tierarznei**, 4× **ultraschall_hund**, 5× **ok** (RC-Helikopter, Nylon-Trainingshalsband, Ultraschall-Mückenuhr, elektrischer Insektenschutz, «Katzenflohball»).
- Bei 4 der 13 Strom-Geräte nannte der deutsche Text die Wirkung nie. Nur das Bild verriet sie.
- Der Bestands-Wächter mit den neuen Regeln fand im ganzen Katalog (895 passende aktive Produkte) 26 Treffer. 5 davon fehlten in der Kandidatenliste.
- **35 Produkte → DRAFT** (34 + «Bellenkontrollhalsband» aus dem zweiten Katalog-Lauf mit der Fern-Regel), alle zurückgelesen. Ledger mit Vorher-Status und Beleg: `dropship/_tierschutz_biozid_2026-10-02.tsv`.
  Tags: `tierschutz-tschv76` bzw. `biozid-ch-zulassung` + `tierschutz-<klasse>`/`biozid-<klasse>` + `tierschutz-pruefung-0210`.
- Bewusst AKTIV gelassen: «Solar Ultraschall Tier- & Vogelabwehr». Das ist ein Gartengerät gegen Kleintiere und Vögel, kein Gerät für den eigenen Hund, und solche Geräte sind im Schweizer Handel üblich.
- «Katzenflohball» war eine Kugelbahn: «Floh» ist eine Fehlübersetzung von «Flash Tunnel». Titel und SEO wurden zu «Katzen-Kugelbahn mit Ball und Tunnel».
- Nebenbefunde: Zwei Biozid-Halsbänder zeigen die Marke Scalibor (MSD) unverpixelt; der tragbare Mückenschutz ist Xiaomi/ZMI-Ware.

## Regel (Importer + Bestand, eine Datei `automation/tierschutz_geraet.json`)
Neu: `antibell-art76-abs6` (Zweck genügt, kein Wirkwort nötig), `ultraschall-hund-art76-abs2`, `biozid-tier-zulassung`
(Tag `biozid-ch-zulassung`), `fern-erziehungshalsband` (Fernbedienung + Halsband + Hund; 6/6 im Bild = Strom).
Neu ist auch das Feld **`nicht` je Regel**. Es nimmt Zeckenzange, Flohkamm, Türvorhang, Ultraschall-Insektenabwehr, Spielzeug und GPS-Tracker mit App aus.
Beide Leser sind angepasst (`tierschutz_geraet.mjs`, `tierschutz_guard.py`); die Importer (`cj_sku_import`, `cj_category_fill`) setzen den Tag je Regel.
Kanarienvögel: 10/10 in Node und Python gleich, dazu 4/4 für die Fern-Regel. Der Wächter läuft wie bisher täglich im Aufseher (SEIT = 3 Tage).

## Rückweg
Ein Produkt mit Unterlagen (z. B. Biozid-Zulassungsnummer, reines Vibrationsgerät ohne Anti-Bell-Zweck) lässt sich zurückholen:
Tag entfernen, Status ACTIVE. Das Ledger nennt den Vorher-Status.
