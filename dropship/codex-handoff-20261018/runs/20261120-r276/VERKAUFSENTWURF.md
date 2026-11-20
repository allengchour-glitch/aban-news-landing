# Genau eine Verkaufsaktion zur Freigabe: vorhandenen Modellvergleich erreichbar machen

Produkt15521256604033, `sternenlicht-projektor-fur-schlafzimmer-732544`. **Entwurf, nicht umgesetzt.**
Aktuell native Produktbeschreibung enthält genau die Überschrift «Welche Ausführung passt zu dir?» und den Satz «Der angezeigte Preis gilt für die ausgewählte Variante. Die Ausstattung eines anderen Modells gehört nicht automatisch dazu.» Sieben native Varianten A–G heute gelesen; keine neuen Ausstattungsbehauptungen nötig.

Vorschlag: Direkt unter der Variantenauswahl ein dezenter Textlink **«Modelle A–G vergleichen»**. Er führt zum bereits vorhandenen Vergleich; falls die Beschreibung eingeklappt ist, diesen Bereich öffnen. Auswahl, Preis und Warenkorbzustand beibehalten. Kein Rabatt und kein zusätzlicher Verkaufsclaim.

Begrenzter Inhalts-Diff:
```diff
-<h2>Welche Ausführung passt zu dir?</h2>
+<h2 id="luxe-modellvergleich">Welche Ausführung passt zu dir?</h2>
```
Neu bei der Variantenauswahl, nur für dieses Produkt:
```html
<a href="#luxe-modellvergleich">Modelle A–G vergleichen</a>
```

Vor Umsetzung genaues aktuelles Theme-Element und etwaige vorhandene ID frisch prüfen; keinen geratenen globalen Theme-Diff einspielen. Dann im Entwurf bei360/390/1440px mit Tastatur prüfen: Linkziel sichtbar und fokussierbar, gewählte Varianten-ID und Preis vor/nach Klick gleich; keine Änderung an Kaufbutton oder anderen Produkten. Erst nach bestätigter Freigabe live. Nutzen als Hypothese: erleichterte Auswahl; keine gemessene Kaufsteigerung.
