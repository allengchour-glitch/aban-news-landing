---
tags: [falle, teuer-gelernt]
quelle: Messung 2026-09-12
gelernt: 2026-09-12
---
# productsCount ignoriert Preisfilter stillschweigend

Shopifys `productsCount` **wirft Preisfilter weg, ohne zu meckern**:

```
productsCount(query:"status:active variants.price:>99999")  →  10000
productsCount(query:"status:active variants.price:<5")      →  10000
productsCount(query:"status:active sku:bb-*")               →    279
productsCount(query:"status:active sku:zzzgibtesnicht*")    →      0
```

Der SKU-Filter greift (0 bei Unsinn), der Preisfilter nicht. Wer nach `variants.price` zaehlt,
bekommt die Gesamtzahl und haelt sie fuer ein Ergebnis. `productsCount` deckelt zudem bei
**10000** — vier verschiedene Abfragen lieferten deshalb exakt dieselbe Zahl, und nur das fiel
auf.

**Regel: jede Zaehlabfrage mit einer Abfrage gegenpruefen, die 0 ergeben MUSS.** Wer nach Preis
filtern will, holt die Produkte mit `products(first:250, query:"sku:…")` und rechnet selbst.


**Traegt der Skill `messgeraet-zuerst`** — dort gehoert die Regel hinein, damit sie
sich beim naechsten passenden Auftrag von selbst laedt.

Verwandt: [[Hypothese-mit-Datum]]
