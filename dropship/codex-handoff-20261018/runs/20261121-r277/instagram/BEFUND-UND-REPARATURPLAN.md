# R277: Instagram-Teilfehler gezielt untersucht

Prüfung20.11.2026,23:20UTC =21.11.2026,00:20Europe/Zurich. Nur lesend. Keine Kennzahlen, keine Credential-Suche, kein Planer-/Shop-Write, kein Retry oder Ersatzpost.

## Belegt

- Frisch gelesen: Post425726329, UUID`108318075245381964`, Termin20.11.17:00Europe/Zurich. FacebookPUBLISHED mit Plattform-ID`1049840534888592_122154525537350792` und URL`https://facebook.com/122108214291350792/posts/122154525537350792`; InstagramERROR wegen Abruf von Bild3. Globaldraft=false/autoPublish=true. `saveExternalMediaFiles=false`.
- Sechs vollständige HTTP-GETs: dreiOriginal-JPEGs jeweils mit Standard-UA und lokalemfacebookexternalhit-UA. AlleHTTP200 ohne Weiterleitung, unveränderteSHA256 wieR276, RGB1080×1350,140106–408228Bytes. Alledreiprogressiv,ICC424Bytes/EXIF172Bytes. Das ist ein gemessenes Merkmal, **keine nachgewiesene Fehlerursache**. Ein lokaler UA-Wechsel prüft keine Meta-Server-IP oder echte Meta-Authentifizierung.
- Im frischen Repo-Helfer`automation/metricool_freigabe.py`, Blob`2415675930266c072c329f9f6cc2b317e7f4a03a`, ist der echte Mischstatus-Post kein Freigabekandidat. Offlinegegenprobe mit Originalpost:0Kandidaten; Statusauswertung meldet genauInstagramERROR und übergeht das publizierteFacebook korrekt.
- Der generische`baue_put`-Body enthält beideProvider ohne ihre publiziertenStatus-/Plattformbelege. Er ist für Entwürfe gebaut und **kein nachgewiesener sicherer kanalgetrennter Retryweg**. Aktuelle Freigabe nicht für diesen Fehler umfunktionieren.
- DerselbeHelfer setztstandardmässig`NUR_VIDEOS=1`; reineFoto-Drafts werden dadurch nicht freigegeben. Nicht als technische Panne bezeichnen oder automatisiert umgehen. Quelle kommentiert Besitzerentscheid16.11. «nur nochVideos».
- `automation/metricool-schedule.mjs`, Blob`c8814e25d09d2df3c47f204911f4a0f09a98f3b4`, normalisiert Medien vor **Neuanlage** und verwendet dannPOST. DiesenAnlageweg nicht für die bestehende gemischteVeröffentlichung verwenden. Keine Normalisierung oderNeuanlage von mir ausgeführt.

Die offizielle Meta-Seite aus der Fehlermeldung wurde HTTP200 gelesen. Ihr dynamisch ausgeliefertes Dokument nennt JPEG, maximal8MB, Seitenverhältnis4:5bis1,91:1 und Breite320–1440px. Die gemessenen Dateien liegen innerhalb dieser Grössen-/Formatgrenzen. Quelle und Servermarkup-Auszüge mit Abrufhash stehen in`META-DOC-EVIDENCE.json`; daraus folgt keine Meta-seitige Erreichbarkeitszusage oder Vollfreigabe aller Parameter. Fehlendesbs4-Modul bei der lokalen Extraktion wurde ohne Installation durch Standardbibliothek ersetzt; keine Seitenänderung.

## Nicht belegt

Die gezielteICC-Prüfung des beanstandeten Bild3 liest Profilname/-beschreibung`c2ci` (ICC-SHA256`88309750b4d3e89bd82edfb350fe0a351eec8997fda0b85302cc9dd96c094b23`). RGB-Modus allein beweist kein sRGB-Profil. Eine semantisch genaue Farbprofil-Zuordnung wurde hier nicht nachgewiesen; ebenso kein Beleg, dass diesesProfil den Abruffehler verursacht. Keine Bildänderung.

Warum Meta Bild3 am20.11.17h nicht abrufen konnte. Mögliche zeitliche CDN-/Meta-Abrufstörung oder Meta-seitige Verarbeitung sind Hypothesen. ProgressiveJPEG ist nicht allein ein Fehlernachweis. Aktuelle HTTP200 ersetzen keine ursprünglichen Meta-Fehlercodes oder Container-Logs. Eine Ursache aus Dateiendung,URL-Query oder vorhandenenICC-Daten abzuleiten wäre unbelegt.

## Konkreter Reparaturplan ohne Facebook-Doppelpost

1. Unter derselbenUUID den Instagram-Fehler im Metricool-Eintrag öffnen und den ursprünglichen Meta-Code/subcode/Containerstatus sowie Zeitpunkt sichern. Nur die für diesenPost notwendigenLogs; keine Geheimnisse/Kundendaten.
2. Einen **nachweislich kanalgetrennten Wiederholungsweg für Instagram** prüfen. Vorher mussbelegtsein, dass erFacebook und dessenPlattform-ID/Publikations-URL nicht erneut anfordert oder umschreibt. Kein gemeinsamesScheduler-PUT, keinEntwurfsetzen, keinneuerPOST. Wenn dieUI/API das nicht belegt: Wiederholungblockiert, zuerst gezielte technischeKlärung diesesPostes.
3. Nur bei belegtemDateiverarbeitungsfehler dasselbeOriginalbild über einen legitimen Medienweg normalisieren; Produktbildidentität/Zuschnitt/Rechte vorMediaänderungprüfen und Exporthash notieren. Aktuell fehlt ein solcherDateifehlerbeleg; kein spekulativesRe-Encoding.
4. Unmittelbar vor einer späterenAktion Shop/Marke und dieUUID frisch lesen; Originalpayload/Facebookbelege sichern, kanalgetrenntenDiff und Nachbartermine21.11. kontrollieren. JedeAktion genaueinmal; unklarerWrite=unknown.
5. Anschliessend dieselbeUUID und jedenProvider getrennt zurücklesen:Facebook-ID/URL/Status unverändert,Instagram nur bei bestätigtemPUBLISHED alsveröffentlichtmelden. KeinbelegterRetryweg liegt hier bereitsvor; **keineReparaturausgeführt**.

Der Handlungsblock ist eine konkrete Diagnose-/Wiederherstellungsvorbereitung. Er erteiltkeine neuenMedienrechte und ersetztweder aktuelleInhaberfreigaben noch die Zuständigkeit der schreibendenSitzung.
