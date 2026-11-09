# R155 – Aufnahme- und Abnahmeblock für denselben Projektor-Master

Stand: 09.11.2026, 14:16 Europe/Zurich. Master-ID: `luxe_sternenprojektor_master_20261018`.

## Gegenprobe seit R154

Im Workspace wurden elf MP4-Dateien technisch geprüft. Keine erfüllt gleichzeitig 15–20 Sekunden, 1080×1920 und konstante 30 fps. Die einzige Shopify-Projektquelle bleibt SHA-256 `2bb28156f28beed60f7db0980e870fff89c5e0648911a06ab91324f27fdf1d57`, 27,96 Sekunden, 960×540 und 25 fps. Seit dem R154-Prüfzeitpunkt wurde ausser Git-Metadaten keine neue Medien-, Take- oder Rechtedatei gefunden. `/workspace/social-audio-korrektur/kristall-ohne-sprache.mp4` fehlt weiterhin.

Die Pflichtmusik ist am kanonischen Pfad vorhanden und hashgleich: `automation/music/luxe-premium.wav`, SHA-256 `a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688`. Build-/Lizenzbindung sowie finale Hör- und Mixabnahme sind weiter offen. Der alte Rechtebogen ist ausdrücklich ein unausgefüllter Entwurf und nennt zudem die veraltete Variante; er ist kein Rechtegrant.

Ergebnis: `INTAKE_GO=false`, `RENDER_GO=false`, `RELEASE_GO=false`, `PUBLISH_GO=false`. Keine professionelle Master-MP4, kein Render, Upload oder Socialwrite.

## Aufnahmeblock

Vor der Aufnahme wird genau eine aktuelle A–G-Ausführung gewählt und mit Shopify-Varianten-ID, SKU und CJ-VID in den R151-Vertrag eingetragen. Ein nur für den Beleg verwendetes `unitToken` verbindet Identitätsclip, vier Takes und Rechteanlage. Es darf das Produkt im finalen Bild nicht verändern.

Alle Takes müssen dieselbe physische Einheit zeigen und nativ mindestens 1080×1920 bei echten 30 fps aufgenommen werden; bevorzugt 2160×3840. Kamera hochkant und stabil, Belichtung, Fokus und Weissabgleich nach einer neutralen Referenz sperren. Kein digitaler Zoom, keine Hochskalierung, keine Zwischenbildberechnung, kein generischer Stock und keine künstlich ergänzte Projektion. Produktform, Farbe, Logo und Bedienablauf bleiben unverändert.

| Take | Mindestaufnahme | Verbindliche Handlung | Bild und Licht | Ablehnung |
|---|---:|---|---|---|
| Identitätsclip | 6,0 s | ungeschnittener Weg von Verpackungs-/Modellbezug und Auswahl-Slate zu genau derselben Einheit und dem echten Motiv | diffuse Grundbeleuchtung; alle Kennzeichnungen lesbar | Schnitt, verdeckte Kennzeichnung, anderes Gerät oder unklare Auswahl |
| `P_OPERATION` | 9,0 s | eine vollständige reale Bedienung von Ruhe über Kontakt bis zur sichtbaren Reaktion; Hand, Gerät und Kontaktpunkt gleichzeitig im Bild | weiches Führungslicht etwa seitlich, Reflexe kontrollieren; Gerät vollständig innerhalb der Safe-Zone | abgeschnittene Hand, verdeckter Kontakt, erfundene oder nicht nachvollziehbare Funktion |
| `P_PROJECTION` | 10,0 s | dieselbe Einheit und das exakt gebundene Motiv; Gerät zu Beginn mindestens eine Sekunde im Bild, danach reale Projektion ohne Compositing | Raum kontrolliert abdunkeln, Projektion nicht ausfressen lassen, Farbtemperatur sperren | nur anonyme Wandprojektion, Motivwechsel, digital ergänzte Sterne oder Flimmern |
| `P_DETAIL` | 7,0 s | Linse, Gehäuse, Tasten und belegte Anschlüsse derselben Einheit; langsame reale Kamerabewegung | weiches Licht, klare Kanten, keine Fingerabdrücke; kein digitaler Ken-Burns-Effekt | fremdes Modell, unlesbare Details, behauptete Funktion ohne sichtbaren Beleg |
| `P_HERO` | 8,0 s | ruhige echte Produkteinstellung mit freiem Raum für End-CTA | taupe/cream-Umgebung, kontrollierter Verlauf, konsistente Produktfarbe | sichtbare Markenfremdelemente, generische Szene oder Produkt ausserhalb Safe-Zone |

Jede Originaldatei erhält Dateiname, vollständigen SHA-256, ffprobe-Daten und eine unveränderte Kontrollbildreihe. Vorschlag: `LS-PROJ-{A-G}-{unitToken}-{TAKE}-v1.mov`. Die Rechteanlage muss genau diese Hashes aufführen.

## Präziser Schnittplan, 540 Frames

Hook A und Hook B sind zwei Wahlmöglichkeiten für denselben Master. Es wird später genau eine gewählt; die Master-ID bleibt unverändert.

| Frames | Zeit | Quelle | Bildhandlung und Overlay |
|---:|---:|---|---|
| 0–59 | 0,00–2,00 s | Hook A: `P_PROJECTION`; Hook B: `P_DETAIL` | A: echte gebundene Projektion, «Dein Raum.» und «Neues Licht.»; B: echtes Gehäuse-/Bedienelementdetail, «Licht im Detail.» |
| 60–155 | 2,00–5,20 s | `P_OPERATION` | eine durchgehende Bedienhandlung, «Sternenlicht-Projektor» |
| 156–239 | 5,20–8,00 s | `P_DETAIL` | Linse, Taste oder Gehäuse, «Aus der Nähe entdecken.» |
| 240–389 | 8,00–13,00 s | `P_PROJECTION` | reales gebundenes Motiv derselben Einheit, «Lichtmomente.» |
| 390–449 | 13,00–15,00 s | `P_HERO` | ruhiger Hero-Take ohne Text |
| 450–539 | 15,00–18,00 s | `P_HERO` | «Produkt ansehen» und «LuxeStyle · luxestyle.ch» |

Die Quellsegmente benötigen an jedem Schnitt mindestens 0,2 Sekunden echte Handles. Kein Standbild darf fehlende Bewegung ersetzen. Text maximal zweizeilig und mindestens 48 px. Allgemeine sichere Textzone: x 96–984 / y 220–1450; End-CTA bevorzugt y 1120–1450. Produkt und Hand dürfen nicht durch Text verdeckt werden.

## Ton und Farbkorrektur

Quellton vollständig verwerfen. Ausschliesslich die kanonische WAV verwenden, aber erst nach belegter kommerzieller Lizenzbindung und Hörfreigabe. Ziel für die finale Mischung: ungefähr −16 LUFS integriert und höchstens −1 dBTP; keine Sprache oder fremden Effekte. Anfang und Ende sauber ein- beziehungsweise ausblenden.

Farbkorrektur gleicht die vier Takes aneinander an, nicht das Produkt an eine erfundene Markenfarbe. Referenz ist das frisch bestätigte Shopify-Bild mit SHA-256 `bb5526ce54c7eca8ac2bb38bb720d53a590a97e6df5bc1904de9cef8e8544b5d`. Jede relevante Abweichung bei Gehäuseform, Farbe, Linse, Logo oder Bedienung führt zur Ablehnung.

## Abnahmeblock

Eine Datei darf erst «Master-MP4» heissen, wenn alle Punkte belegt sind:

1. exakt 18,00 Sekunden, 1080×1920, CFR 30/1, genau 540 dekodierte Frames, H.264 High/yuv420p;
2. genau eine AAC-Stereo-Spur, keine Sprache, nur die freigegebene Pflichtmusik;
3. ausgewählte A–G-Variante, SKU, CJ-VID, `unitToken` und alle Quellhashes stimmen mit dem Identitätsclip und der Rechteanlage überein;
4. Form, Farbe, Logo, Linse, Tasten, Anschluss, Funktion und Projektion sind durch reale Aufnahmen nachvollziehbar;
5. Kontrollframes 0, 59, 60, 155, 156, 239, 240, 389, 390, 449, 450 und 539 zeigen keine Schwarzbilder, Freeze-Fehler, Zwischenschnitte oder Textüberläufe;
6. Texte sind in Instagram, TikTok, YouTube Shorts, Facebook, Threads und Pinterest lesbar und nicht von Plattform-UI verdeckt;
7. EBU-R128-/True-Peak-Prüfung und vollständige Hörabnahme bestanden;
8. der unterschriebene Rechtegrant umfasst exakt alle Take-Hashes, Schnitt, Crop, Re-Encoding, Farbkorrektur, Tonersatz, Overlays, Shop, Metricool, organische Nutzung, Paid Ads und alle sechs Kanäle;
9. die Inhaberabnahme ist mit Datum und Referenz dokumentiert;
10. erst danach frischer Produkt-, Sperrtag-, Kanal-, Historien-, Kollisions- und Metricool-Preflight.

Fehlt ein Punkt, bleibt der Zustand `BLOCKED`; der alte Landscape-Clip und die kurzen Socialvideos dürfen die Aufnahme nicht ersetzen.
