# R156 Master-Ingest- und Freigabe-Preflight

Der bestehende Master `luxe_sternenprojektor_master_20261018` wurde weiterentwickelt, ohne eine Ersatz-MP4 zu erzeugen.

Neu ist ein ausführbarer Preflight. Er bindet genau eine aktuelle A–G-Ausführung an die passende Varianten-ID und SKU, eine CJ-VID, einen einheitlichen `unitToken`, das echte Produktbild, den ungeschnittenen Identitätsclip sowie vier native Hochkanttakes. Er prüft SHA-256, 1080×1920, echte 30 fps, Mindestdauern, hashgebundene kommerzielle Bearbeitungs-, Shop-, Social-, Werbe- und Metricool-Rechte, die kanonische Musik samt Rechte-, Hör- und Mixfreigabe sowie den finalen 18-Sekunden-/540-Frame-Export mit einer Video- und einer AAC-Stereo-Spur. Final-QA und Inhaberabnahme sind Pflicht.

Sechs Tests sind bestanden: gültiger Metadatenvertrag, gesperrte historische Variante, abweichender `unitToken`, fehlendes Metricool-Recht, 539 statt 540 Frames und fehlende reale Dateien. Ein strukturell vollständiges synthetisches Metadatenmanifest erhält absichtlich nur `PASS_METADATA_ONLY_NOT_RELEASEABLE`. Der echte Live-Preflight bleibt `FAIL_BLOCKED`.

Seit R155 liegt in den eng bekannten Pfaden kein neuer gebundener Take und kein neuer Rechtebeleg vor. Offen bleiben: Wahl einer aktuellen A–G-Einheit mit CJ-VID, fünf reale Clips derselben Einheit, hashgebundener Rechtegrant, Musikrechte-/Hör-/Mixfreigabe, finaler Export und Inhaberabnahme. Es wurde nicht gerendert, hochgeladen, terminiert oder veröffentlicht.
