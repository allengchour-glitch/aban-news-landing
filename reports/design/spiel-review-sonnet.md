# Traumhaus — Design-Review (Art Direction)

Screenshots gesichtet (Handy quer 844×390), Code nur gelesen (traumhaus.html, ~15'700 Zeilen).

## 1. Warum es „KI-generiert" wirkt

1. **Jeder Button hat seine eigene Farbe — es gibt keine Palette, nur eine Werkzeugkiste.**
   Beleg: `#villaBtn` lila→blau (`#8a5ad0,#5a7ae0`), `#kircheBtn` pink→lila (`#e07ac0,#b04a90`),
   `#werkBtn` blau→dunkelblau (`#4a7ad0,#2a5aa0`), `#markthalleBtn` grün (`#8fd86a,#5aba3a`),
   `#shopBtn` gelb→orange (`#ffd166,#ffb04a`), `#npcBtn` hellblau (`#4aa0d8,#2a6aa8`),
   `#fahrtBtn` blau→lila (`#2f8fd8,#7a3ad0`), `#crimeBtn` navy→lila (`#2a2a3e,#5a3a6e`),
   `#nitroBtn` orange→rot, `#lieferBtn` grün, `#exitCar` orange, `#buskBtn` gelb, `#growBtn`
   dunkelgrün, `#coasterBtn` rot→pink, `#coupBtn` schwarz→bordeaux (Zeilen 250–274). Das sind
   über zehn Zwei-Farb-Gradienten in einem einzigen HUD, jede Aktion bekommt eine neue Laune
   statt eine Bedeutung. Genau dieses Muster — „für jeden Button eine hübsche neue Farbe" statt
   ein System — ist die klassische Signatur von Komponente-für-Komponente generiertem UI-Code.
   Sichtbar in jedem Screenshot: Bauen ist Blau-Lila, Leben ist Blau-Lila (aber eine andere
   Mischung), Villa-Vorlage ist wieder Lila-Blau — drei fast identische Verläufe, die für drei
   unterschiedliche Dinge stehen.

2. **Die Häuserzeile hat eine Bonbon-Palette statt eine Ortsidentität.**
   Beleg: `WANDF=[0xf2e4c8,0xe8d0b0,0xd8e0e8,0xf0d8d8,0xe0e8d0,0xf4ead4,0xd8c8e0,0xe8e2d0]` (Zeile
   3049) — Creme, Rosa, Hellblau, Mintgrün, Flieder, alles pastellig gleich gesättigt, per
   `seed%WANDF.length` rein zyklisch verteilt, keine Rücksicht auf Nachbarschaft. Im Screenshot
   `stadt-6-park.png` stehen deshalb ein rosa-, ein beige- und ein blaustichiges Haus nebeneinander
   wie aus einem Kinder-Setzkasten — keine Altstadt mit erkennbarem Stil, sondern ein
   Zufallsgenerator, der „hübsche Pastelltöne" ausspuckt. Das ist der Unterschied zwischen einem
   Ort mit Charakter (z. B. ein Schweizer Dorf mit 3–4 warmen Erdtönen) und einem Farbkasten.

3. **Die Fahrzeuge und Figuren sind namenlose Platzhalter-Formen.**
   Beleg: Screenshots `spieler-4c-auto-flach.png` / `spieler-5-fahrt.png` — ein einzelnes
   gelbes Auto ohne erkennbares Modell/Silhouette, die Spielfigur ein flacher, kantenloser
   Farbklecks ohne Gesicht oder Kleidungsdetail aus der Vogelperspektive. Kein Rendering-Fehler,
   sondern fehlende „Handschrift": keine Chrom-Highlights, keine zweite Lackfarbe, kein Logo,
   keine Silhouette, die man auch als Icon wiedererkennen würde. Wirkt wie ein Asset-Store-
   Platzhalter, der nie durch etwas Eigenes ersetzt wurde.

4. **Toasts/Hints beginnen fast ausnahmslos mit einem Emoji + Ausrufezeichen — ein einziges Sprachmuster, endlos wiederholt.**
   Beleg (`hint(...)`-Aufrufe, u. a. Zeilen 9320–11500): „🎆 Stadtfest am See! …", „🦆👫 Zu
   zweit gefüttert — der ganze Schwarm kommt! +Laune", „🍦 Eine Kugel für alle! −3 $", „🎯
   Mission geschafft: … +180 $", „🏁 Anpfiff — neues Spiel!". Fast jede Meldung: Emoji, Ausruf,
   Formel „X — Y! +Z". Menschlich geschriebene Spieltexte variieren Satzbau und Tonfall gerade
   bei so vielen Zeilen; hier klingt jede zweite Meldung wie aus derselben Vorlage generiert.
   Für ein „schweizerdeutsch-nüchtern" positioniertes Produkt (Website-Ton) ist das zudem der
   falsche Ton — durchgehend Ausrufe-Enthusiasmus statt trockener Understatement-Humor.

5. **Materialwerte sind über 15'000 Zeilen verstreut copy-pasted statt aus einer Konstanten-Palette gezogen.**
   Beleg: `roughness` taucht mit 0.06, 0.18, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.7, 0.75, 0.8,
   0.85, 0.86, 0.9, 0.92, 0.95, 0.98, 1 als Literal an Dutzenden Stellen auf (Zeilen 549–3490),
   `metalness` mal 0, mal 0.1, 0.2, 0.25, 0.3, 0.45, 0.65, 0.7 — jedes Mal von Hand an der
   `new THREE.MeshStandardMaterial({...})`-Stelle eingetippt statt über 3–4 benannte Presets
   (`matStoff`, `matMetall`, `matPutz`, `matGlas`). Das Ergebnis: leicht unterschiedliche
   Glanzgrade auf optisch gleichartigen Flächen (Wand hier 0.85, dort 0.86, Dach 0.75 vs. 0.8),
   was sich nicht als Stilentscheidung liest, sondern als Rauschen — ein Symptom von Zeile-für-
   Zeile-Generierung ohne Redesign-Pass.

6. **Kein durchgehendes Licht-/Stimmungskonzept — die Belichtung ist ein technischer Kompromiss, kein gestalteter Look.**
   Beleg: Kommentar Zeile 473–481 „Schatten auf dem Handy AUS … Ohne Schatten sieht die Szene
   flacher aus, aber sauber" — nachvollziehbar als Performance-Entscheidung, aber sichtbar in
   jedem Handy-Screenshot: Häuser, Rasen und Auto wirken papieren, ohne Bodenkontakt-Schatten,
   ohne Ambient Occlusion in den Ecken. Das ist kein Stilmittel (z. B. bewusst „flat/toon"),
   sondern fehlende Tiefe, die wie ein unfertiger Render aussieht statt wie ein kuratiertes
   Cozy-Look.

7. **HUD-Pillen sind durchweg dieselbe Cream-Pille mit Schlagschatten — visuell korrekt, aber ohne Hierarchie/Charakter.**
   Beleg: `.panel{background:rgba(255,253,248,.94);border-radius:16px;...box-shadow:0 6px 20px
   rgba(40,30,10,.22)}` (Zeile 38) wird für Geld, Zeit, Beziehung UND Missionen gleich benutzt
   (sichtbar `hud-844x390.png`: vier optisch identische weiße Pillen in einer Reihe). Ohne
   Akzentfarbe/Icon-Bühne pro Kategorie sieht das HUD aus wie ein generisches „Figma-Community-
   Kit"-Template, nicht wie eine eigene Marke.

8. **Die Kamera-Vignette + Sättigungsfilter ist der einzige „Cinematic"-Move — ein Standard-Rezept ohne weitere Regie.**
   Beleg: Zeile 488–497, `saturate(1.07) contrast(1.03)` + radialer Vignette-Div. Das ist exakt
   das Standard-Snippet, das in jedem „so machst du dein Spiel filmischer"-Tutorial steht —
   funktional richtig (günstig, kein Post-Pass), aber es ist die einzige „Regie"-Entscheidung im
   ganzen Bild; ohne begleitende Licht-/Paletten-Arbeit bleibt sie ein Filter über einem sonst
   ungestalteten Bild statt Teil eines Looks.

## 2. Die 8 wirksamsten Massnahmen (nach Wirkung, mit Handy-Kosten)

1. **Eine Palette statt zehn Gradienten — HUD/Buttons auf 1 Akzent + 1 Neutral reduzieren.**
   Ersetzt die Farb-Suppe in Abschnitt 1 (`#villaBtn`, `#kircheBtn`, `#werkBtn`, `#shopBtn`,
   `#npcBtn`, `#fahrtBtn` usw., Zeilen 250–274) durch EIN Bernstein-Verlauf für alle „primären"
   Aktionsbuttons (site-Palette: `--amber:#d97706`, `--amber-dk:#b45309`, `--amber-lt:#fde9c8`,
   `--cream:#fef3c7` aus `index.html`), plus höchstens eine zweite Akzentfarbe für „besonders/
   riskant" (z. B. das Krimi-System bleibt dunkel/violett, weil es bewusst anders sein soll).
   Konkret: `linear-gradient(90deg,#d97706,#b45309)` für alles Positive/Alltägliche (Bauen,
   Einsteigen, Ansprechen, Einkaufen, Ernte, Aufwerten), Rot/Dunkel bleibt reserviert für
   Gefahr/Fahndung/Krimi. Das ist eine reine CSS-Textänderung — 0 Handy-Kosten, aber der Hebel
   mit dem grössten Wiedererkennungswert, weil er in jedem Screenshot sofort sichtbar ist.
   Ehrlich: es macht das Spiel kurzzeitig „langweiliger" bunt, weil die Regenbogen-Buttons auch
   Orientierung geben („grün = Geld verdienen"); ein Icon-Vokabular (Zeile-für-Zeile schon da:
   Emoji im Button-Text) übernimmt diese Rolle stattdessen.

2. **Häuser-Palette auf 3–4 warme Erdtöne einkochen statt 8 Pastell-Bonbons.**
   `WANDF` (Zeile 3049) von 8 auf 3–4 Töne kürzen, z. B. `[0xe8d8b8,0xd8c8a8,0xe0d0c0,0xc8b898]`
   (Cremeweiss/Sandstein/warmes Grau, an die Bernstein-Markenfarbe angelehnt), `DACHF` (Zeile
   3050) auf 2 Rot-/Brauntöne + 1 Schiefergrau. Kostet nichts (gleiche Anzahl Materialien, nur
   andere Hex-Werte) — macht aber aus „zufälligem Setzkasten" eine erkennbare Altstadt/Dorf mit
   eigenem Look. Bei Bedarf 1 hellere Fassade für „besonderes Gebäude" (Kirche, Bahnhof) als
   bewusster Ausreisser behalten, damit Landmarken auffallen.

3. **Belichtung: Exposure/Tone-Mapping bewusst wärmer und kontrastreicher stimmen statt neutral belassen.**
   Aktuell `renderer.toneMappingExposure=0.78` fix und Sonnenfarbe `0xfff0d0` (Zeile 485/521,
   Tag/Nacht-Kurve Zeile 14939 `0.62+dayA*0.36`). Ohne neuen Pass: Sonnenintensität leicht senken
   (1.12→0.95) und Hemisphere-Licht kühler/dunkler (`0x6a8a58`→ etwas gesättigter Grün, z. B.
   `0x5a8248`), dazu Exposure auf 0.82–0.85 zur goldenen Stunde. Das drückt mehr Kontrast
   zwischen Licht/Schatten ins Bild, ohne einen einzigen zusätzlichen Draw-Call — nur drei
   Zahlen. Ehrlich: mehr Kontrast heisst auch, dass ohne Schatten (Punkt 4) die Flachheit auf
   dem Handy noch auffälliger wird — die beiden Massnahmen gehören zusammen.

4. **Schatten auf dem Handy nicht komplett aus, sondern EIN billiger Fake-Schatten unter Objekten.**
   Aktuell `_schattenAn=!mobil` (Zeile 482) — Handy hat gar keinen Bodenkontakt-Schatten mehr.
   Statt den teuren `PCFSoftShadowMap` zu reparieren: pro Haus/Baum/Auto eine simple runde,
   halbtransparente `PlaneGeometry`-Textur direkt auf dem Boden (kein Licht, kein Shadow-Pass,
   nur ein zusätzliches Alpha-Quad pro Objekt, das schon `depthWrite:false`-Technik im Code
   existiert, Zeile 915/935). Das ist der Standard-„Blob-Shadow"-Trick aus Mobile-Games (Genshin-
   Impact-mobil, Animal Crossing-Klone) — kostet fast nichts (ein Quad, keine Shadow-Map-Render-
   Passes), gibt aber sofort Bodenhaftung zurück. Ehrlich: es ist ein Fake, keine echte Schatten-
   richtung — bei tiefstehender Sonne (Morgen/Abend) fällt das auf, ist für ein Cozy-Spiel aber
   ein akzeptabler Kompromiss.

5. **Ein Leit-Icon-System statt Emoji-Wildwuchs für Hints/Toasts.**
   Alle `hint(...)`-Aufrufe (Beispiele Zeilen 9320–11500) beginnen mit einem von ~40
   verschiedenen Emojis. Auf ca. 8–10 Kategorien reduzieren (Geld 💰, Beziehung 💞, Auto 🚗,
   Job 💼, Ernte 🌿, Erfolg 🏆, Gefahr 🚨, Fest 🎉) und den Text selbst variieren lassen statt
   das Emoji. Reine Textänderung, 0 Performance-Kosten — sorgt aber dafür, dass das Auge das
   Emoji als Kategorie-Anker lernt statt als Deko-Rauschen wahrzunehmen.

6. **Tonfall der Toasts auf „nüchtern-schweizerdeutsch" statt „Ausrufezeichen-Enthusiasmus" umschreiben.**
   Beispiele wie „🎉 GEFUNDEN! +100 $ und alle haben Spaß!" (Zeile 11500) oder „🏁 Anpfiff —
   neues Spiel!" passen im Ton eher zu einer generischen Mobile-Game-Vorlage als zur trockenen
   Website-Stimme. Kürzer, weniger Ausrufezeichen, mehr Understatement: „Gefunden. +100 $" statt
   „GEFUNDEN! +100 $ und alle haben Spaß!". Reiner Text-Edit, aber es ist der Unterschied
   zwischen „von einer Vorlage generiert" und „von jemandem geschrieben, der das Spiel kennt".

7. **HUD-Panels bekommen eine dünne Akzentkante pro Kategorie statt identischer weisser Pillen.**
   `.panel` (Zeile 38) ist für Geld/Zeit/Beziehung/Missionen identisch. Ein 2px `border-left` in
   der jeweiligen Akzentfarbe (Geld = Bernstein, Zeit = neutral Grau, Beziehung = Rosé, Karriere
   = Blau) macht die Leiste sofort scanbar, ohne Layout oder Grösse zu ändern — reines CSS, keine
   Handy-Kosten. Kleine Änderung mit spürbarem „das wurde gestaltet"-Effekt, weil es in jedem
   Screenshot oben sichtbar ist.

8. **Ein bis zwei handgezeichnete Sonderteile statt durchgehend prozeduraler Wiederholung — gezielt, nicht überall.**
   Nicht das ganze Spiel umbauen (zu teuer), aber 1–2 Wahrzeichen (Bahnhof, Kirche — beide schon
   Sondergeometrie, Zeilen ~1832ff/1900ff) bekommen einen echten Rufus/Detail-Pass: ein Wappen-
   Emblem, eine echte zweifarbige Lackierung nur beim „Flitzer"-Auto (Achievement existiert schon,
   Zeile 10453 `auto_flitzer`), ein Fähnchen. Kostet ein paar zusätzliche kleine Meshes an genau
   zwei Stellen im Spiel — nicht spürbar auf dem Handy — aber genau diese „von Hand gemachten"
   Details sind es, die ein Cozy-Game von einem Prozedural-Demo unterscheiden: der Spieler
   merkt sich die eine besondere Ecke, nicht die 40 gleich texturierten Häuser.

**Was macht ein Spiel „cool" — die Kurzformel dahinter:** Identität (eine Palette, ein Licht,
eine Typo — hier: Bernstein statt Regenbogen, ein warmes Golden-Hour-Licht statt neutralem
Standard-Setup, System-Font ist bereits konsistent mit der Website), Feedback/„Juice" (das Spiel
hat davon schon sehr viel — Kombo-HUD, Beeps, Partikel, Achievements mit Fortschrittsbalken;
das ist eine Stärke, siehe unten), und Details von Menschenhand (die zwei-drei Landmarken, ein
Lieblings-Emoji-Set, ein wiederkehrender Sprachwitz) statt gleichförmiger Wiederholung.

## 3. Was gut ist und bleiben soll

- **Die prozedurale Häuser-/Landschaftsgenerierung selbst ist technisch clever und günstig**
  (Canvas-Texturen für Putz/Ziegel statt Bilddateien, Material-Cache Zeile 538ff, Instancing für
  Gras/Blumen) — genau richtig für ein Handy-Budget. Nicht anfassen, nur die Farbwerte, die sie
  füttern (Punkt 2 oben).
- **Die Kommentar-Kultur im Code ist aussergewöhnlich gut** — jede kniffligere Entscheidung
  (Schatten-Akne, Auflösungs-Ramping, Filmlook-Kosten) ist mit Begründung und Handy-Bezug
  dokumentiert. Das ist kein Design-Fund, aber es zeigt: das Team weiss genau, welche
  Kompromisse es warum eingeht — die Vorschläge oben bauen bewusst darauf auf, statt dagegen.
  In diesem Sinne bitte NICHT anfassen (nur lesen war der Auftrag), aber es ist erwähnenswert.
- **Die Erfolge/Achievements (`ACH`, Zeile 10440ff) sind gut geschrieben** — konkret, mit
  Charakter („Kleinganove", „Straßenstar", „Goldene Neunzig" für 1000 $ in einer Hetze), nicht
  generisch wie „Erfolg #12". Der nachträglich ergänzte Fortschrittsbalken je Erfolg
  (`ACHFORT`, Kommentar Zeile 10494) ist genau die Art Politur, die Punkt 8 oben meint — hier
  wurde es schon einmal richtig gemacht.
- **HUD-Ergonomie fürs Handquer-Format ist durchdacht**: `env(safe-area-inset-*)` überall,
  44px-Mindestgrössen für Touch-Targets, dynamische Auflösungsstufen (`_rrStufen`, Zeile 468)
  statt fixem Deckel. Das ist eine solide technische Grundlage, auf der sich die optischen
  Verbesserungen oben günstig aufsetzen lassen, ohne die Performance zu gefährden.
- **Tag/Nacht-Zyklus mit warmen Straßenlaternen (`nachtLampen`, Zeile 517–519)** ist ein
  hübscher Atmosphäre-Baustein, der im Screenshot `stadt-7-altstadt-nacht.png` schon funktioniert
  — genau diese Richtung (warmes Punktlicht gegen kühles Nachtblau) sollte die Referenz für die
  Tag-Belichtung werden (Punkt 3 oben), nicht umgekehrt verwässert werden.
