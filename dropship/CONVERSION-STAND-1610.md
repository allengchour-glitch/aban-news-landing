# 📊 Conversion-Stand 16.10.2026 — und warum die Rohzahlen zu schlecht aussehen

## Was Shopify meldet (letzte 30 Tage)

| Kennzahl | Wert |
|---|---|
| Sitzungen | **1787** |
| mit Warenkorb-Zugabe | 44 (2,5 %) |
| bis zur Kasse | **28** |
| Kauf abgeschlossen | **7** |
| Conversion | 0,39 % |
| Bestellungen / Umsatz | **8 · CHF 410.90 brutto**, CHF 315.78 total |
| Warenkorb im Schnitt | **CHF 47.09** |

**Das ist ein anderer Shop als im Juni.** Gedächtnisstand 13.06.: 2994 Sitzungen, 0,37 % Warenkorb-Zugabe,
**0 Käufe**. Heute: weniger Verkehr, aber **2,5 % Warenkorb-Zugabe und 8 Bestellungen**. Der Engpass
„Traffic-Qualität" ist nicht mehr der gleiche.

## ⚠️ Die Kassen-Zahlen sind durch Testkäufe verfälscht

28 Kassengänge, 7 Abschlüsse — das liest sich wie ein 75-%-Leck. Nachgesehen:

- **Ein einziges Konto verursacht 17 der 28 abgebrochenen Kassengänge** (13 davon am 13.10., 4 am 10.10.).
- Dieses Konto hat **E-Mail-Domain `example.com`**, wurde am **10.10. angelegt** und hat **0 Bestellungen**.
- Die abgebrochenen Beträge wiederholen sich paarweise (2× 38.32, 2× 57.02, 2× 67.32 …) — wiederholte
  Versuche, keine verschiedenen Käufer.

**Das sind Testkäufe, keine Kunden.** Die echten Abbrüche verteilen sich auf ~8 Konten.
Rechnet man sie heraus, hat der Kassengang **nicht 25 %, sondern grob zwei Drittel** Abschlussquote.
Keiner der 7 Abschlüsse stammt aus dem Testkonto (es hat 0 Bestellungen) — die Verkäufe sind alle echt.

**Folge für jede Sitzung:** Wer „0,39 % Conversion" oder „28 Kassengänge, 7 Abschlüsse" aus der Analytics
liest, liest teilweise Testverkehr. Vor Schlussfolgerungen die abgebrochenen Kassengänge nach Konto
aufschlüsseln.

## Geprüft und NICHT defekt

Verdacht war, der Kassengang scheitere am T-Shirt «Alphorn» (13 Abbrüche an einem Tag, alle mit diesem
Artikel). **Am echten Warenkorb getestet** (Storefront-API, CH-Adresse):

| Warenkorb | Ware | Versandoptionen |
|---|---|---|
| T-Shirt allein | CHF 29.90 | Standard **0.00** |
| T-Shirt + Tasse | CHF 46.80 | Kostenloser Versand **0.00** |
| T-Shirt + Sticker | CHF 34.80 | Standard **7.00** |

Der Kassengang funktioniert. Die Preisunterschiede haben eine saubere Ursache: Das **T-Shirt liegt im
Profil «Druck auf Bestellung»** (eigener Gratis-Versand), **Sticker und Tasse im «General profile»**
(CHF 7 unter der 45er-Schwelle). Mischt man beides, gilt die Schwelle.

**🟡 Für den User — eine Überlegung, keine Änderung:** Wer ein Shirt im Korb hat (gratis Versand) und
einen Sticker für CHF 4.90 dazulegt, zahlt plötzlich CHF 7 Versand — der Sticker kostet effektiv
CHF 11.90. Das ist nicht falsch berechnet, aber überraschend. Ich habe **nichts geändert**: Die
naheliegende „Lösung", alle POD-Artikel ins General-Profil zu holen, würde das Shirt allein (CHF 29.90)
von gratis auf CHF 7 verteuern und damit mehr Körbe treffen als sie rettet.

## Woran es jetzt wirklich hängt
Bei **1787 Sitzungen und 2,5 % Warenkorb-Zugabe** ist der Engpass die **Zahl der Besucher mit
Kaufabsicht**, nicht mehr der Shop. 44 Körbe aus 1787 Sitzungen heisst: Wer kommt, schaut meistens nur.
