# Verkaufsaktion zur Freigabe: Lieferumfang klar nach Variante

Die aktuelle Seite bietet sieben Ausführungen. Der Variantenabsatz nennt das Grundmodell und unterschiedliche Ausstattung, setzt danach aber einen vollen Lieferumfang pauschal voraus. Derselbe Lieferumfang steht nochmals im Faktenblock.

Vorschlag: genau diese zwei pauschalen Stellen durch einen klaren Hinweis auf die gewählte Ausführung ersetzen. Die vorhandenen Beschreibungen von A–G, Preise, Masse, SEO, Bilder und Links bleiben unverändert. A erhält keine zusätzliche Zubehörzusage.

# Präziser Vorschlag für genau zwei Stellen

Vorher SHA-256: `a7a1fad350f26aec87d1583b297a4ca3b431ad54e5457efb7125ba4b7fbd549b`
Nachher SHA-256: `5ab094c114daf9cfe73b957c9c652c3b6d9ef2c58915de848f51521cfb7cc69c`

```diff
@@ Variantenabsatz: pauschaler Lieferumfang @@
-Der volle Lieferumfang umfasst ein Nachtlicht, sechs Farbscheiben, ein wiederaufladbares Bluetooth-Drehteil und eine Galaxie-Scheibe, schau dir die gewünschte Ausführung also genau an.
+Der Lieferumfang hängt von der gewählten Ausführung ab. Vergleiche die Angaben zu den Modellen A–G, bevor du deine Auswahl triffst.
@@ Faktenblock: pauschale Zubehörliste @@
-<h4>Lieferumfang</h4>
-<ul>
-<li>1 Nachtlicht</li>
-<li>6 Farbscheiben</li>
-<li>1 wiederaufladbares Bluetooth-Drehteil</li>
-<li>1 Galaxyscheibe</li>
-</ul>
+<h4>Lieferumfang nach Ausführung</h4>
+<p>Motivscheiben und zusätzliche Ausstattung gehören je nach Auswahl zu den oben beschriebenen Ausführungen. Massgeblich ist die gewählte Variante.</p>
```

Alle übrigen HTML-Bytes bleiben erhalten. Kein Shopify-Write.

Quelle: aktuelles Shopify-descriptionHtml und aktueller CJ-Detailauszug. Die vollständige CJ-Antwort wurde nicht gesichert; vor einer späteren Live-Änderung gezielt frisch gegenprüfen. Kein Rabatt, keine Lieferzusage, keine Konfiguration oder Flow-Aktivierung.
