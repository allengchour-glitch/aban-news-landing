# Social-Pflege 16.11.2026 (Metricool)

Besitzer 16.11.: «codex in max modus heute, metricool analyise inkl sozial pflege», später «heute voll gas codex, inklusive alte post löschen in sozial und repost».
Grundlage: Analyse `dropship/social-analyse-1611/README.md`. Marken: GEMESSEN, Hypothese, unbekannt.

## Entscheide des Besitzers (16.11., gezielte Fragen)

| Frage | Antwort |
|---|---|
| Gemüsehobel-Entwürfe (vom Besitzer zurückgestellt) | «Freigeben» |
| Zehn Videos mit Musik (Sternenlicht 4, Knoblauchhacker 4, Medizin-Box, Wasserwellen) | «Ton weg, einplanen» |
| 15 Foto-Entwürfe 25. bis 28.11. | «Halten» (Regel «nur noch Videos») |

## Umgesetzt

**Stumme Fassungen (GEMESSEN)**
- Vier Videos ohne Ton neu verpackt: Bild unverändert kopiert, Tonspur still (`anullsrc`, AAC 64 kbit/s).
- Die Bildspur ist je Datei bytegleich zur Vorlage (md5 des Bildstroms). Gemessen −91 dB.
- Hochgeladen als Shopify-Dateien `luxe-stumm-1611-{stern,hacker,medizin,welle}.mp4`.
  - sha256 beginnt mit `12bceafa`, `4dd6b921`, `7c88b3c8` und `819e996a`.
- In den zehn Entwürfen die Medien getauscht, je `PUT` HTTP 200.
- Danach frisch gelesen: zehn von zehn tragen die stumme Datei.

**Freigabe-Werkzeug (PR #3193, gemergt `41eee2e1ca`)**
- Nur noch Videos: Ein Entwurf ohne Video bleibt stehen (`NUR_VIDEOS`, Vorgabe an).
- TikTok `autoAddMusic` wird beim Einplanen immer ausgeschaltet.
- Bestand 0 heisst nicht ausverkauft: Ein Produkt wird nur gehalten, wenn keine Ausführung kaufbar ist.
- Tests 137, Mutationsprobe 54 von 54.

**Halteliste `dropship/METRICOOL-HALTEN.txt`**
- PR #3192: 15 Foto-Entwürfe gehalten.
- PR #3193: Hobel 3, Sternenlicht 4, Knoblauchhacker 4, Medizin-Box und Wasserwellen freigegeben.
- Weiter gehalten: «3 Ideen für Hund und Katze» (neu rendern, Paket B an Codex) und das Krallenschleifer-Foto.

**Wasserwellen**
- Den Termin auf Fr 20.11. 19:30 verschoben.
- Den fehlenden YouTube-Short als Entwurf neu angelegt (uuid `5345343768312041034`).
- Metricool hat die Datei auf eine eigene Adresse kopiert. Sie ist bytegleich zur stummen Fassung.

**Wegweiser `aus-tiktok-und-instagram`**
- Medizin-Box aufgenommen.
- Die Sammlung so geordnet, dass alle 19 Produkte der nächsten zehn Tage auf Seite 1 stehen (vorher 12 von 19).
- `collectionReorderProducts` ohne Fehler, danach frisch gelesen: gleich dem Soll.

**Freigabe-Läufe von Hand**
- Lauf 43856861177 (Start 11:46 UTC nach 26 Minuten Warteschlange):
  - 12 Entwürfe eingeplant, je Kontrolle OK.
  - Hobel YouTube, TikTok und IG/FB am 17.11.
  - Sternenlicht IG und FB am 16.11., TikTok am 17.11., YouTube am 19.11.
  - Medizin-Box YouTube am 17.11.
  - Knoblauchhacker IG/FB, Threads, TikTok und YouTube am 18.11.
- Lauf 43861028788: Wasserwellen TikTok und YouTube am 20.11. eingeplant, Kontrolle OK.

**Kontrolle danach (GEMESSEN 16.11. ca. 11:50 UTC, Planer 16. bis 28.11.)**
- 64 Beiträge, 0 doppelte uuid, 0 TikTok-Beiträge mit `autoAddMusic`.
- 0 Paare auf demselben Netzwerk unter 3 Stunden Abstand.
- Alle acht freigegebenen Videodateien sind still (max −91 dB).
- 36 schon automatisch eingeplante Fotobeiträge bis 28.11. laufen aus wie bestellt («Eingeplantes läuft aus»).

## Neu in diesem PR: Produktlink geht vor Wortvergleich

- **Fund (GEMESSEN):** Im zweiten Freigabe-Lauf erkannte die Freigabe beim Wasserwellen-Beitrag drei Produkte statt einem.
  - Erkannt wurden auch Wasser-Speaker und LED-Rose, weil «LED», «Wasser…» und «Licht…» als Wortteile trafen.
  - Am 16.11. blieb das ohne Folgen. Ein falsch erkanntes, nicht kaufbares Nachbarprodukt hätte den Beitrag aber zu Unrecht gehalten.
  - Umgekehrt konnte ein Beitrag mit Link auf ein Produkt ausserhalb des Wegweisers über Wörter eines anderen Produkts durchkommen.
- **Änderung (`automation/metricool_freigabe.py`):**
  - Enthält der Text einen Link `luxestyle.ch/(xx/)products/<handle>`, gilt genau dieses Produkt.
  - Fehlt es im Wegweiser, bleibt der Beitrag stehen mit dem Grund «verlinktes Produkt nicht in der Wegweiser-Sammlung: <handle>».
  - Ohne Produktlink gilt der Wortvergleich wie bisher.
- **Test:** 148 Prüfungen, 11 neu. Mit dem alten Code ist der Test rot, mit dem neuen grün.
- **Mutationsprobe:** 62 von 62 erkannt (8 neue Mutanten).
- **Gegenprobe am echten Planer (71 Beiträge, Wegweiser 41 Produkte):**
  - Die Erkennung wird nur bei 4 Beiträgen enger (Wasserwellen 2, Threads Tasse, Threads Christbaumdecke).
  - Bei keinem Beitrag ändert sich das Urteil.

## Alte Beiträge aufräumen (läuft)

- **Bestand:**
  - TikTok: 182 öffentliche Videos.
  - Instagram: 229 sichtbare Beiträge, 85 davon Reels.
  - Dazu YouTube, Facebook, Pinterest und Threads.
  - Rohdaten nur im Scratch der Sitzung.
- **Ton (GEMESSEN):**
  - 193 von 207 Videos aus dem Planer haben Ton.
  - Der Referenzvergleich erkennt nur einen Teil der Stücke sicher, die meisten Treffer liegen unter 0,5.
  - Darum gruppiert ein Workflow den Ton aller Videos nach Musikstück und macht je Gruppe eine Hörprobe.
- **Plüsch (Text, GEMESSEN):** TikTok 8 Beiträge (Hochlandrind, Panda und Waschbär je 2, Kaiserpinguin 1, Geschenke-Video 1), Instagram 9.
- **Bilder:** Die Prüfung auf den Vorschaubildern läuft im selben Workflow.
- **Löschen:** nur der Besitzer oder PC-Claude nach dem Ja des Besitzers.
  - Vorschlag: umkehrbar statt endgültig. TikTok «Nur ich», Instagram «Archivieren», YouTube «Privat».

## Lehren

1. Die REST-Anlage `POST /v2/scheduler/posts?userId=&blogId=` antwortete mit HTTP 403 «Access denied to blog: ''». Das Metricool-Werkzeug `createScheduledPost` (blogId 6227837) legte denselben Entwurf an. Neue Entwürfe darum über das Werkzeug anlegen, Änderungen weiter über `PUT`.
2. In `while read u; do curl …; done` liest `curl` den Rest der Liste von der Standardeingabe: `curl … </dev/null`.
3. Ein Handstart der Freigabe kann eine halbe Stunde in der GitHub-Warteschlange stehen, ohne Störung bei GitHub. Er läuft trotzdem; nicht neu starten.
4. Wortvergleiche erkennen Nachbarprodukte («LED», «Licht», «Wasser»). Ein Produktlink im Text ist der eindeutige Beleg.
