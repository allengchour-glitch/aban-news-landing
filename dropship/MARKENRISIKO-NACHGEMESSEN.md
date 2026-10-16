# ⚖️ Markenrisiko im aktiven Katalog — nachgemessen 16.10.2026

> **Ergebnis: kein Marken- oder IP-Problem im Livekatalog.** Die alarmierende Zahl aus dem Juni
> (*„1082 Risiko-Produkte, davon 765 Marken/IP"*, `dropship/BIGBUY-IMPORT-BEFUND.md`, nur auf dem alten
> Branch `claude/lade-projekt-luxestyle-fUo70`) hält der Prüfung nicht stand — sie betraf einen
> Produktbestand, der heute **vollständig deaktiviert** ist.

## 1. Der Juni-Befund ist gegenstandslos

| Abfrage | Stand 16.10.2026 |
|---|---|
| `tag:bigbuy AND status:ACTIVE` | **0** |
| `tag:bigbuy` (alle Status) | ≥10 000 (archiviert/Entwurf) |
| `tag:fortura AND status:ACTIVE` | 2376 |
| `tag:cj-real AND status:ACTIVE` | ≥10 000 |

Die 765 beanstandeten Produkte stammten aus dem BigBuy-Import. **Kein einziges davon ist aktiv.**
Die 0 ist belastbar; die 10 000er sind von Shopifys Zähler gedeckelt und nur als „mindestens" zu lesen.

## 2. Frische Messung über 50 000 aktive Produkte

Titel **und** Vendor gegen 48 eindeutige Marken (Wortgrenzen, kein Teilwort-Treffer) plus 12 mehrdeutige
Begriffe getrennt geprüft. Gegenprobe des Musters: „Nike Air Max" trifft · „Nikotinfrei" trifft nicht ·
„Applikation" ist kein „Apple" · „Puma Trainingsjacke" trifft in der mehrdeutigen Liste.

| Gruppe | Zahl | Urteil |
|---|---|---|
| **Kompatibilitäts-Nennung** («Armband für Apple Watch», «Hülle für Nintendo Switch») | **159** | ✅ zulässig — die Marke zu nennen, um Passung anzugeben, ist erlaubt |
| **Figuren-/IP-Ware** (Batman, Harry Potter, Pokemon, Hello Kitty, Barbie, Paw Patrol, Spiderman, Superman) | **21** | ✅ **lizenziert** — siehe unten |
| Sonstige (Netzteil, Bausteinmodell, Umrichter …) | 7 | ✅ Zubehör/Modellbau |
| „polo" | 166 | ❌ **Falschtreffer**: durchweg **Polo-Shirts**, die Kleidungsart |

## 3. Warum die 21 Kostüme in Ordnung sind

Alle tragen SKU-Präfix **`fortura-`** und die Tags `ch-lager`, `schweiz-versand` — sie kommen vom
Schweizer Grossisten Fortura, mit echtem Lagerbestand. Die genannten Hersteller sind **Widmann**
(«Kostüm Superman · Widmann Nr. 58026»), **RU** = Rubie's und **CK** = Ciao — die drei grossen
**Lizenznehmer** für genau diese Figuren. Lizenzware, die über einen autorisierten Händler bezogen wird,
darf weiterverkauft werden (Erschöpfungsgrundsatz). Kein Eingriff nötig.

## 4. Die eigentliche Lehre

Die Juni-Zahl entstand vermutlich so, wie meine erste Messung heute auch beinahe ausgegangen wäre:
**ein Muster, das jede Markennennung als Verletzung zählt**, meldet 187 Treffer, wo 180 harmlos sind.
Wer danach handelt, nimmt lizenzierte Ware und zulässiges Zubehör vom Netz.

**Regel:** Ein Markentreffer ist erst ein Befund, wenn geprüft ist, **wie** die Marke genannt wird
(Kompatibilität vs. Herkunftsbehauptung) und **woher die Ware kommt** (Lizenznehmer/autorisierter
Händler vs. unbekannt). Messwerkzeug dieser Prüfung: `tools/markenpruefung.mjs`.

## 5. Offen

`dropship/BIGBUY-IMPORT-BEFUND.md` und `bigbuy-risiko-kandidaten.csv` liegen **nur** auf dem alten
Branch und sind nie nach `main` gekommen. Sie sollten dort **nicht** nachträglich eingespielt werden,
ohne diesen Nachtrag daneben zu legen — sonst wird eine überholte Warnung zur Handlungsgrundlage.
