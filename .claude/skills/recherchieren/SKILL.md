---
name: recherchieren
description: Immer wenn im Netz gelernt werden soll - ein YouTube-Link, "schau mal was es Neues gibt zu X", Benchmarks, Anleitungen, Vergleiche, Trends - und immer wenn eine fremde Quelle eine Zahl oder ein Versprechen nennt. Sagt, wie man an den Inhalt kommt (und woran es scheitert), wie man Behauptung von Messung trennt und was vor dem Übernehmen ins Gedächtnis gegenprüft werden muss.
---

# Im Netz lernen, ohne Werbung für Wissen zu halten

## Die drei Sorten Aussage — jede Zeile wird markiert

| Marke | Bedeutung |
|---|---|
| **GEMESSEN** | hier selbst nachgeprüft, mit Befehl und Zahl |
| **QUELLE** | fremde Angabe, plausibel, nicht nachgeprüft |
| **BEHAUPTUNG** | Verkaufsversprechen, ungeprüft — Umsatzzahlen in Videotiteln |

Ohne diese Marken wird aus „ein Kanal behauptet 2,7 Mio." nach zwei Sessions eine Tatsache im
Gedächtnis. **Jede übernommene Zahl braucht die Marke direkt daneben.**

## YouTube: was geht und was nicht

**Transkripte gehen aus diesem Container NICHT.** `captionTracks` steht im Seitenquelltext, aber
der `timedtext`-Abruf liefert **HTTP 200 mit 0 Bytes** — in jedem Format (`srv1`, `vtt`,
`json3`, mit `tlang`). Innertube antwortet `UNPLAYABLE` (WEB) bzw. `FAILED_PRECONDITION`
(ANDROID). YouTube verlangt inzwischen ein PO-Token. Nicht erneut versuchen.

**`WebFetch` auf eine YouTube-Seite ist nutzlos** — es kommt nur die leere Hülle der Anwendung
zurück, keine Videodaten.

**Was geht:** `tools/yt_lernen.mjs` (11 Selbsttests) holt die Seite mit Browser-Kennung und
schneidet Titel, Kanal, Datum, Aufrufe, Dauer und die vollständige Beschreibung heraus. Bei
Anleitungskanälen stehen dort die **Kapitelmarken mit Minutenangaben** — das ist fast so gut
wie ein Transkript.

```
/opt/node22/bin/node tools/yt_lernen.mjs <id|url> [...]      # kurz, mit Kapiteln
/opt/node22/bin/node tools/yt_lernen.mjs --voll <id>         # ganze Beschreibung
```

**Zwei Fallen stecken als Gegenprobe im Werkzeug:**
1. **Grösse beweist nichts.** YouTubes Einwilligungsseite ist ebenfalls über 50 000 Bytes gross
   und trägt den Titel „Like this video?". Eine Längenprüfung hält sie für eine Videoseite.
   Geprüft wird darum auf `shortDescription` **und** `viewCount`.
2. **`19:90` mitten im Satz ist keine Kapitelmarke** — Zeilenanfang verlangen.

**Die Grenze, gemessen:** nach rund **einem Dutzend Abrufen** antwortet YouTube mit **HTTP 429**
(Antwort rund 3,3 KB). Höchstens eine Handvoll Videos am Stück, sonst ist YouTube für Stunden
zu. Eine 3-KB-Antwort ist **kein leeres Video**, sondern eine Drosselung.

## Bei TikTok geht es anders herum

Dort liegt die deutsche ASR-Untertitelspur in den Seitendaten (`subtitleInfos`, WebVTT) und
lässt sich holen — so entstand die Auswertung von `LERNEN-5-SYSTEME.md`. **Die Caption nennt
den Inhalt oft nicht**, das Transkript schon.

## Wer verdient an dem, was er lehrt?

Die grossen Dropshipping-Kanäle leben von Partnerlinks (Lieferanten, Spionage-Werkzeuge,
E-Mail-Dienste, eigene Kurse). Das macht den Inhalt nicht wertlos, aber:

- **Umsatzzahlen im Titel sind nie belegt.** Weglassen.
- **Empfohlene Werkzeuge sind bezahlte Platzierungen.** Erst prüfen, ob das Repo die Sache
  schon kann.
- **Offizielle Quellen zuerst** (Shopify, Anbieterdokumentation) — sie haben kein Motiv,
  einen Schritt aufzublasen.

## Rechtlich heikles erkennen

Mehrere Kanäle lehren: Produktseite eines Mitbewerbers als Ganzseiten-Screenshot, daraus
Wireframe, **Copy und Testimonials übernehmen**, Testimonial-Bilder erzeugen. Texte sind
urheberrechtlich geschützt, übernommene oder erzeugte Testimonials sind erfundene Bewertungen —
dieselbe Grenze wie die Hausregel **NIE Fake-Reviews** (UWG). Layout ansehen: ja. Inhalte
übernehmen: nein.

## Der Schritt, der aus Recherche Wissen macht

**Jede fremde Zahl wird am eigenen Bestand gegengeprüft, bevor sie eine Empfehlung wird.**

Beispiel vom 13.09.: die E-Mail-Benchmarks waren sauber (Warenkorb-Strecken 3.65 je Empfänger,
41 % des Umsatzes aus 5,3 % der Sendungen). Die Gegenprobe am eigenen Shop ergab **3 Abonnenten
bei 1498 Kundendatensätzen** — die Empfehlung „bessere Strecken bauen" wäre ins Leere gegangen.
Der Engpass war das Einsammeln. **Ohne Gegenprobe hätte die Recherche in die falsche Richtung
geschickt.**

## Ablegen

Bericht nach `dropship/LERNEN-*.md` (dort greift weder der Voice-Linter noch `build-pages.sh`),
Kurzfassung in den Stand-Block von `CLAUDE.md`, die einzelnen Lehren per
`python3 tools/lehre.py` in den Vault. Siehe Skill `gedaechtnis`.
