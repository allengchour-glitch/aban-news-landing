# R277: Projektorquelle konkret geprüft – 21.11.2026

Derselbe Master `luxe_sternenprojektor_master_20261018`, Produkt15521256604033, VarianteA68122445283719, SKU CJSN139239101AZ. Kein Film neu produziert.

**Tatsächlich gelesen:** Ein begrenzter aktueller CJ-Detailread für den neuen Zweck «öffentliche Produkt-URL» bestätigte A und lieferte [diese Produktseite](https://www.cjdropshipping.com/product/galaxy-projector-starry-sky-projection-bedroom-bedside-decoration-night-light-p-1477820492730732544.html). Ein öffentlicherGET wurde auf `frontend.cjdropshipping.com/egg/cj/validation.html` umgeleitet: HTTP200,20107Bytes, keine Produkt-/Video-ID, keine MP4-Adresse. Das ist eine Validierungsseite, kein erfolgreich gelesener Produktinhalt, keine404 und kein Beweis fehlender Videos. Keine Umgehung, kein weiterer Seitenversuch.

**Neu belastbar geklärt:** Die aktuelle [offizielle API-Dokumentation](https://developers.cjdropshipping.cn/en/api/api2/api/product.html#_6-1-query-product-videos-post) führt `POST /product/queryVideosByProductId` mit `{"productId":"1477820492730732544"}`. Erfolgsform ist `success===true` plus `code===0`; Videoantwort kann URL, Cloudvideo-ID, Produktbindung, Grösse, Dauer, Abmessungen und Preis-/Copyrightflags enthalten. Download verlangt Referer `https://developers.cjdropshipping.com/`. Die Doku wurde frisch mitHTTP200 gelesen.

Vorhandener Helfer: `dropship/tiktok-cj-videos-0311/cj_videos_holen.mjs` (Blobadecbfc647c9eb9c72183aa515199147e282870b). Ihn nicht als Ganzes starten: er holt Tokens, schreibt einen Token-Cache, löst SKU/PID redundant auf und wiederholt die Videolistenabfrage bisviermal. Der ältereKommentar «kein zweiter API-Weg» in `automation/lib/cj_video.mjs` stammt vom24.10. und ist durch diesen später dokumentierten Weg überholt. Kein Quellcode geändert.

**Ausführbare nächste Abgrenzung:** `VIDEO-METADATEN-LESEVERTRAG.json` spezifiziert exakt einen Leseaufruf, keineRetries/Downloads/Käufe,2MiB/15s und enge Identitätsprüfung. Im aktuellen CJ-App-Werkzeugkatalog fehlt ein Videolisten-Werkzeug; der erfolgreiche Produktread beweist vorhandenenCJ-Zugang, aber keine übertragbare lokale Tokenbindung. Credentials wurden weder gesucht noch kopiert. Kein neues Plugin installiert und kein Workflow gestartet.

**Rechte:** Besitzer03.11. «es ist erlaubt» ist als historische Inhaberquelle in `PAKET.md` vorhanden. Video-ID, Gratis-/Kauf-/Copyrightflags und technische Quelle würden eine genaue Bearbeitungs-/Werbe-/Plattformlizenz nicht ersetzen. Der neue Rechtebeleg bleibt ausdrücklich leer. PhysischeA-Probe/Motiv-/Packungsbindung bleiben ebenfalls offen.

**Ergebnis:**1CJ-Detailread,1öffentlicher Produktseiten-GET und offizielle Quellenprüfung. Tatsächlich spielbare aktuelle MP4: **unbekannt/nicht gelesen**. Keine neue Master-MP4, kein Render, keinePublikation und keine kostenpflichtige Aktion.

Verwendeter Dokumentationsskill: [read-docs](skill://plugin_asdk_app_6a314a73f8ac819195b0d55e36b9c609/read-docs/SKILL.md). Er diente der aktuellen offiziellen API-Gegenprobe, keine Rechtefreigabe.

