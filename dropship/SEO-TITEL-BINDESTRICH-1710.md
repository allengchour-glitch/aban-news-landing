# Der SEO-Optimizer hätte 41 % der Titel falsch geschrieben — in die Google-Überschrift

**Gemessen und behoben am 2026-10-17.** `automation/seo-optimizer.mjs` ist eines der 60 Skripte, die in
dieser Umgebung nie bis zu einer Shopify-Anfrage kamen (`dropship/SHOPIFY-AUTH-STILLER-NOOP.md`). Nachdem
der Secret-Fix sie arbeitsfähig gemacht hat, habe ich es zuerst im DRY-Modus laufen lassen — und genau
hingesehen, statt die Zahl zu lesen.

## Fund 1: der Bindestrich mitten im Wort

Die Titel-Normalisierung lautete:

```js
title.replace(/\s*[·–—-]\s*/g, ' – ')
```

Gemeint waren Trennzeichen wie `·` oder `–`. Getroffen wird aber auch der **Bindestrich innerhalb eines
Wortes**, weil `\s*` auch „kein Leerzeichen" erlaubt:

| Produkttitel | hätte in Google gestanden |
|---|---|
| Tanz- & Fitness-Armbänder für Switch Joy-Con | Tanz – & Fitness – Armbänder für Switch Joy – Con \|… |
| G8 Gamepad mit Type-C für Android | G8 Gamepad mit Type – C für Android |
| Orion-Android-Gamepad | Orion – Android – Gamepad |
| Macro-Programmierbarer Joystick-Griff | Macro – Programmierbarer Joystick – Griff |

**Betroffen: 985 von 2415** aktiven Produkten ohne SEO-Titel (**41 %**), gemessen an den 6000 zuletzt
geänderten. Das ist **dieselbe Fehlerklasse wie „3-5 Minuten" → „3." auf 264 Seiten** (Lehre vom 07.09.):
**bei Massenersetzungen den Diff lesen, nicht die Zahl.** Beide Male war es ein Muster mit einem
blanken Bindestrich.

## Fund 2: die Marke fiel ab und liess ein hängendes „|…" zurück

`clip(titel + ' | LuxeStyle CH', 60)` kürzt erst nach dem Anhängen. Bei langen Titeln bleibt das
Trennzeichen stehen und die Marke verschwindet: **255 von 2415 (11 %)**. Jetzt kommt die Marke nur dran,
wenn sie ganz hineinpasst — sonst steht der Titel sauber und vollständig da.

## Fund 3: eine Lieferzusage, die der Shop nicht hält

Die Meta-Beschreibung versprach **„schnelle Lieferung"**. CJ-Produkte brauchen **10–20 Werktage**. Das
wäre auf tausenden Seiten eine falsche Zusage gewesen. Die Beschreibung nennt jetzt nur geprüfte Fakten:
Schweizer Online-Shop · **Gratis-Versand ab CHF 50** (bewusst 50, s. `dropship/VERSAND-SCHWELLE.md`) ·
**30 Tage Rückgabe** · **WELCOME10** (heute live geprüft: ACTIVE bis 31.12.2027).

## Der Fix

`automation/lib/seo_titel.mjs` + Test (`seo_titel_test.mjs`, 28 Fälle):

- Vereinheitlicht werden nur `·`, `•` und `–`/`—`/`-` **mit Leerzeichen drumherum**. Ein Bindestrich
  zwischen zwei Zeichen bleibt unberührt.
- Marke nur, wenn sie in 60 Zeichen passt; gekürzt wird an der Wortgrenze und **ohne hängendes
  Trennzeichen** vor dem Auslassungszeichen.
- Beschreibung ohne Lieferzeit-Versprechen, höchstens 155 Zeichen.
- Dazu bekam das Skript die Drosselungs-Geduld aus `automation/lib/shopify_gql.mjs` — ein Lauf über
  tausende Produkte endete sonst nach wenigen Seiten mit „Throttled".

**Gegenproben im Test** (das ist der wichtigere Teil):
- Die fünf echten Titel oben dürfen **kein** ` – ` bekommen.
- Aber `Roll-On · 10 ml`, `Haaröl - 60 ml` und `A — B` **müssen** vereinheitlicht werden — sonst wäre die
  Regel einfach abgeschaltet statt richtig.
- Die Beschreibung darf `schnelle Lieferung`/`express`/`sofort` **nicht** enthalten und muss die drei
  geprüften Fakten nennen.
- Ein überlanges Einzelwort darf nicht zu einem leeren Titel führen; ein Emoji im Titel bleibt stehen.

**Gegenprobe am alten Code:** dieselben drei echten Titel, durch die alte `mkSeo` geschickt → **3 von 3
kaputt**. Die Prüfung greift also wirklich.
