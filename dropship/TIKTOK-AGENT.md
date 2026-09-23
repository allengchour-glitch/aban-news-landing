# TikTok über den Hetzner-Agenten — Stand 23.09.2026, 18:25 UTC (gemessen, nichts verändert)

Paket «tiktok-agent». Auftrag: nur MESSEN und VORBEREITEN. An TikTok wurde nichts geändert,
nichts gepostet, nichts geklickt. Alle Zahlen unten sind gemessen; Quellen stehen dabei.

## Kurzfassung

1. **Das Agenten-Profil ist bei TikTok NICHT angemeldet.** Vier unabhängige Belege (siehe §1).
   Die Politur-Quittung vom 23.09. deutet das falsch («angemeldet als anderes Konto?»).
2. **Bio-Link: geht heute nicht, auch nicht mit einem Klick.** TikTok verlangt laut offizieller
   Hilfe **mindestens 1'000 Follower** (wir: **553**) **oder einen Verified Business Account**
   (Geschäftsprüfung mit Dokumenten; laut CLAUDE.md gibt es weder UID noch HR-Eintrag).
3. **Alle 3 Posts seit August (21.08., 23.09. 06:37 und 18:51) schreiben «(Link in Bio)»**, obwohl es in
   der Bio keinen Link gibt. Der Schalter `DIREKTLINK_TEXT=1` in `automation/metricool_tiktok_post.mjs`
   liegt schon bereit (Standard AUS) — Entscheid beim Hauptagenten.
4. **Neues Werkzeug `automation/browser/tiktok_statistik_lesen.mjs`** liest die 10 neuesten Videos
   (Aufrufe, Likes, Kommentare, Shares, Saves, Ton, Upload-Auflösung, Caption-Befunde). Es läuft
   als Agenten-Auftrag UND aus der Cloud (`--curl`). Kein Klick im Code — der Selbsttest prüft das.
5. **Zwei Auftrags-Entwürfe** liegen in `dropship/auftrag_entwuerfe/` (nicht in `auftraege/offen/`).

## 1. Ist das Agenten-Profil bei TikTok angemeldet? — Nein

| Wann | Quelle | Befund |
|---|---|---|
| 17.09. | `auftraege/erledigt/anmeldungen-nach-login.json` | TikTok Studio → `tiktok.com/login?redirect_url=…tiktokstudio…` → `angemeldet: false` |
| 18.09. | `auftraege/erledigt/32-anmeldungen-cj-tiktok.json`, `36-anmeldungen-mit-status.json`, `anmeldungen-2026-09-18.json` | dreimal dasselbe, Status 200 auf der Login-Seite |
| 23.09. 17:18 | `auftraege/ergebnis/social-profil-politur-2026-09-23-tt-vorher.png` | Kopfzeile und Seitenleiste zeigen den Knopf **«Anmelden»**; das Video-Raster zeigt «Es ist etwas schiefgelaufen» |
| 23.09. 18:25 | neues Werkzeug, Agentenpfad im Container | Server-HTML ohne `app-context.user` → abgemeldet |

⚠️ **Fehldiagnose in der Politur-Quittung** (`auftraege/erledigt/social-profil-politur-2026-09-23.json`):
TikTok meldet dort `"offen": ["«Profil bearbeiten» nicht sichtbar — angemeldet als anderes Konto?"]`
und `"nichtAngemeldet": false`. Das Skript öffnet die **öffentliche** Profilseite — die leitet
abgemeldet NICHT auf `/login` um, also greift `ist_anmeldeseite()` nie. Der Screenshot zeigt
eindeutig «Anmelden». Dieselbe Klasse bei Instagram: `accounts/edit/` zeigte «Page ist nicht
verfügbar» (abgemeldet), gemeldet wurde «bio-Feld nicht gefunden». (Datei gehört nicht zu diesem
Paket → Vorschlag unten, §6.)

Die wöchentliche Prüfung `auftraege/wiederkehrend/anmeldungen.json` läuft das nächste Mal am
**25.09.** (letzte Datei `anmeldungen-2026-09-18.json`, `alle_tage: 7`).

## 2. Öffentliches Profil @luxestyle.ch (curl, 23.09. 18:11 UTC)

| Feld | Wert |
|---|---|
| Name | Luxestyle.ch |
| Bio | «Mode · Beauty · Wohnen · Technik 🇨🇭 / luxestyle.ch · -10% mit WELCOME10» |
| Bio-Link (`bioLink`) | **fehlt** — «luxestyle.ch» steht nur als Text in der Bio |
| Kontotyp | `commerceUserInfo.commerceUser: false` → **Privatkonto** (kein Business) |
| Follower / folgt / Likes / Videos | **553** / 945 / 269 / 68 |
| Konto erstellt | 24.05.2026 (`createTime`) |
| Code WELCOME10 | im Shop **aktiv**, 10 %, bis 31.12.2027 (Admin-API gelesen; Kanarienvogel-Code → `null`) — die Bio-Zusage stimmt |

## 3. Die 10 neuesten Videos (Werkzeug, `--curl`, 23.09. 18:25 UTC)

| Gepostet (CH) | Aufrufe | ♥ | 💬 | Ton (TikTok-Lautheit) | Upload | Befunde |
|---|---:|---:|---:|---|---|---|
| Mi 23.09. 18:51 · Cosmo-Dog-Projektor | 76 | 0 | 0 | Originalton (-15.6) | 576×1024* | Link in Bio ohne Link · Auflösung noch offen* |
| Mi 23.09. 06:37 · Smart-Projektor P62 | 544 | 3 | 0 | Originalton (-15.6) | 1080×1920 | Link in Bio ohne Link · #fashionschweiz/#ootdschweiz auf Technik |
| Fr 21.08. 17:15 · Dino-Hundespielzeug | 298 | 3 | 0 | Originalton (-15.6) | 1080×1920 | Link in Bio ohne Link |
| Do 02.07. 10:08 · Chetti Stella | 855 | 4 | 0 | Originalton (-14) | 720×1280 | Upload unter 1080p |
| Mi 01.07. 18:08 · Luxe Papillon | 850 | 5 | 0 | Originalton (—) | 720×1280 | **Versand ab CHF 65** · unter 1080p |
| Mi 01.07. 11:30 · Luxe Coeur | 849 | 4 | 0 | Originalton (—) | 720×1280 | **Versand ab CHF 65** · unter 1080p |
| Mi 01.07. 11:08 · Bucket Manchester | 863 | 1 | 0 | Originalton (—) | 720×1280 | **Versand ab CHF 65** · unter 1080p |
| So 28.06. 18:30 · Blazer Roma | 313 | 2 | 1 | Originalton (-13.8) | 720×1280 | **Versand ab CHF 65** · unter 1080p |
| So 28.06. 10:08 · Crossbody Lido | 301 | 1 | 0 | Originalton (-14) | 720×1280 | unter 1080p |
| Sa 27.06. 19:08 · Armchetti Papillon | 56 | 2 | 0 | Originalton (-14) | 720×1280 | unter 1080p |

**Summe:** 5'005 Aufrufe, Median 429, 25 Likes, 1 Kommentar, 0 Shares, 1 Save.
Interaktion ≈ 0,5 % der Aufrufe.

\* **Cosmo-Dog:** die Quelldatei `social/reels/reel_2408290840481605200.mp4` ist **1080×1920**
(ffmpeg gemessen). TikTok lieferte 2 h nach dem Post erst 2 Stufen aus; das P62-Video (14 h alt)
hat 5 Stufen bis 1080×1920. Das Werkzeug meldet junge Videos deshalb als «noch offen», nicht als Fehler.

Was die Messung sonst zeigt (nur beobachtet, nichts geändert):
- **Ton:** alle 10 gemessenen Videos laufen mit «Originalton» (die ins Video gemischte Musik), keines mit
  einem TikTok-Sound. Die Lautheit ist sauber (-13.8 bis -15.6). ⚠️ Korrektur zu einer ersten Annahme:
  die Metricool-OpenAPI (`/tmp/mc_swagger.json`) kennt sehr wohl `tiktokData.music`
  (ScheduledPostTikTokTrack: musicId, soundVolume, originalVolume …), `autoAddMusic` und
  `GET /v2/scheduler/catalogs/tiktok/trending-tracks` («from TikTok Business API»). Ob das für ein
  **Privatkonto** greift, ist unbelegt und wurde NICHT probiert (wäre eine Planung → gesperrt).
- **Auflösung:** die Juni/Juli-Posts (ältere Poster-Kette) sind als 720×1280 hochgeladen; die Posts
  seit August sind 1080×1920. Die neue Kette ist also in Ordnung.
- **Versand:** vier Juni/Juli-Captions nennen «Gratis-Versand ab CHF 65» (die alte Schwelle; heute gilt 50).
  Die neuen Captions sagen korrekt «ab CHF 50». Die Preise im P62- und im Cosmo-Post stimmen mit dem Shop
  überein (86.90 / 29.90, beide ACTIVE).
- TikTok stuft das Cosmo-Dog-Video selbst als «Advertisement» ein (`diversificationLabels`); die
  Metricool-Posts setzen «Your brand» (`commercialContentOwnBrand: true`). Ob das die Reichweite dämpft,
  ist **nicht belegt** — nur festgehalten.

### Wiedergabezeit — der eigentliche Engpass (Metricool-Analytics, nur GET, 23.09. 18:35 UTC)

`GET /v2/analytics/posts/tiktok` (01.06.–23.09.) liefert, was das öffentliche HTML nicht hat:
- **74 Posts, 31'111 Aufrufe.** Neuester Eintrag **21.08.** — die zwei Posts vom 23.09. fehlen noch (Verzug).
- **Durchschnittliche Wiedergabe: Median 1.38 s** bei Videolänge Median 13 s; **ganz angesehen: Median 1.37 %**.
- **Herkunft: 91–99 % «Für dich»**, Suche 0 %, Profil 0–7 %.
- Heisst: TikTok zeigt die Videos durchaus her, aber nach gut einer Sekunde wird weitergewischt. Der Hebel
  ist die **erste Sekunde** (Bild + Text + Ton sofort), nicht die Menge und nicht der Bio-Link.
- Drei dort gelistete Videos vom 30.06./02.07. gibt es auf TikTok nicht mehr (`statusCode 10204 item doesn't
  exist`) — zwei davon waren das dritte und vierte «Chetti Stella» am selben Tag.
- Der parallele Wächter `automation/social_qualitaet_wache.mjs` (anderes Paket) liest dieselbe Quelle.
  Das neue Werkzeug hier ergänzt ihn: es sieht jedes Video sofort und liefert TikToks eigene Lautheit,
  die Upload-Auflösung und die Moderationsfelder.

## 4. Bio-Link: was TikTok verlangt, was `social_profil_politur.mjs` heute tut

**Offizielle TikTok-Hilfe (am 23.09. gerendert und gelesen):**
- «You can add a link to a website on your TikTok profile if you have **at least 1,000 followers**, or if you
  have a **Verified Business Account**.» Weg in der App: *Profil → Profil bearbeiten → bei «Links» auf
  «Hinzufügen»* — Quelle: [Adding a website link to your profile](https://www.tiktok.com/support/faq_detail?id=7581821550328896012)
- Kontotyp wechseln: *Profil → ☰ → Einstellungen und Datenschutz → Konto → Business verification* —
  «Depending on your location, the process and required business documents … may vary»; die Prüfung dauert
  bis zu 5 Arbeitstage. Und: **Verified Business Accounts haben nur die Commercial Music Library, nicht die
  allgemeine Musikbibliothek.** — Quelle: [Account types on TikTok](https://www.tiktok.com/support/faq_detail?id=7598614283081030165)
- Die Zwischenstufe «TikTok Account with Advanced Access» (TikTok-Konto mit TikTok for Business verknüpft)
  erlaubt, den Bio-Link zu **bearbeiten, aber nicht anzuzeigen** («… bio-link, and Business Page, but cannot
  display on profile»). Nützt für diesen Zweck also nichts. — Quelle: [About TikTok account entitlements](https://ads.tiktok.com/help/article/about-tiktok-account-entitlements)

**Unser Stand:** Privatkonto, 553 Follower → **es fehlen 447 Follower**, oder die Geschäftsprüfung.
Für die Geschäftsprüfung fehlen nach CLAUDE.md (gemessen 22.09.) UID und HR-Eintrag — ob TikTok für die
Schweiz andere Dokumente annimmt, kann nur der Betreiber in der App nachsehen (nur ansehen, nichts einreichen).

**Was `automation/browser/social_profil_politur.mjs` heute für TikTok tut:**
- öffnet `https://www.tiktok.com/@luxestyle.ch` (öffentlich), sucht «Profil bearbeiten», setzt Name
  «LuxeStyle · Schweizer Shop», Bio `TEXTE.bio_tt` und das Profilbild, speichert, und schreibt zum Schluss
  «Bio-Link … nur im Business-Konto setzbar» ins Ergebnis.
- **Lücke 1:** keine Anmeldeprüfung auf dieser Seite → abgemeldet meldet es «anderes Konto?» statt «nicht angemeldet».
- **Lücke 2:** `TEXTE.bio_tt` endet auf **«Link 👇»** — solange es keinen Bio-Link gibt, verspricht die neue
  Bio genau das, was fehlt (dieselbe Klasse wie «Link in Bio»). Besser: «… · luxestyle.ch».
- **Lücke 3:** «nur im Business-Konto» ist ungenau — ein Wechsel auf Business allein zeigt keinen Link;
  nötig ist 1'000 Follower ODER die bestandene Geschäftsprüfung.
- Das Setzen des Bio-Links selbst ist darin (richtig) nicht vorgesehen; es wäre bei 1'000 Followern ein Feld
  «Links → Hinzufügen», das man erst nach einer Messung (Screenshot des Dialogs) automatisieren sollte.

## 5. Das neue Werkzeug

`automation/browser/tiktok_statistik_lesen.mjs`
- **Quellen:** Creator-Einbettung `tiktok.com/embed/@luxestyle.ch` (10 neueste Videos), Profilseite
  (Bio, Follower, Anmeldesignal), je Video die Videoseite (Zahlen, Ton, `bitrateInfo`, `volumeInfo`).
  Alles steht serverseitig im HTML — kein Login nötig, kein Klick.
- **Agentenpfad:** Seiten öffnen mit abgeschalteten Bildern/Videos (Route nur für diese Seite, `fallback()`),
  HTML aus der Navigations-Antwort lesen, auf der Profilseite nur **nachsehen**, ob ein «Anmelden»-Knopf
  oder ein Profil-Symbol da ist. Schreibt **eine** Datei: `auftraege/ergebnis/<id>.json`; die Quittung
  trägt nur Zusammenfassung + Kurztabelle.
- **Prüfregeln** (je Video): «Link in Bio» ohne Bio-Link · Versandschwelle ≠ CHF 50 oder ohne Schwelle ·
  Upload unter 1080×1920 bzw. nicht 9:16 (junge Videos < 24 h nur Hinweis) · Ton stumm/zu leise/zu laut ·
  fremder geschützter Ton · Moderation (privat/entfernt/in Prüfung) · Sprache ≠ de · Mode-Hashtags auf
  Nicht-Mode (entschieden an TikToks eigener Einordnung).
- **Geprüft:** `node --check` OK · `--selbsttest` 26/26 (mit Kanarienvögeln: Bio-Link vorhanden, «ab CHF 50»,
  #luxestyle/#lifestyle, eigener Ton mit `isCopyrighted`) · Gegenprobe: ein eingeschleustes `.click(` wird
  vom Selbsttest gefunden · `--curl`-Lauf 24 s, 10/10 Videos voll gelesen · **Agentenpfad** (default-Export mit
  echtem Chromium-Kontext, Anfragen per curl durchgereicht) 43.8 s, 12 Dokumentabrufe, 0 Probleme.
- Erster Lauf hatte zwei Fehlalarm-Klassen, beide behoben und als Test hinterlegt: «style» traf #luxestyle/
  #lifestyle; eigener Originalton mit `isCopyrighted: true` wurde als Urheberrechts-Hinweis gemeldet.

Aufrufe:
```
/opt/node22/bin/node automation/browser/tiktok_statistik_lesen.mjs --selbsttest
/opt/node22/bin/node automation/browser/tiktok_statistik_lesen.mjs --curl --out /tmp/tt_statistik.json
```

## 6. Entwürfe und Vorschläge (nichts davon ist aktiv)

- `dropship/auftrag_entwuerfe/tiktok-statistik.json` — Erstlauf; aktivieren = nach `auftraege/offen/` kopieren und pushen.
- `dropship/auftrag_entwuerfe/tiktok-statistik-wiederkehrend.json` — täglich; aktivieren = nach
  `auftraege/wiederkehrend/tiktok-statistik.json` kopieren, **erst nach sauberem Erstlauf**.
- Vorschlag für `social_profil_politur.mjs` (nicht meine Datei): vor der Edit-Suche
  `[data-e2e="top-login-button"]`/«Anmelden» prüfen → `nichtAngemeldet = true`; `TEXTE.bio_tt` ohne «Link 👇».
- Vorschlag für die Metricool-Kette: `DIREKTLINK_TEXT=1` beim TikTok-Aufruf (siehe `dropship/DIREKTLINK.md`),
  bis der Bio-Link existiert.

## 7. Betreiber-Klickwege

**Wofür die Anmeldung überhaupt?** Für die Statistik ist sie NICHT nötig (öffentliches HTML + Metricool).
Sie braucht es für die Profil-Pflege (Name, Bio, Bild über `social_profil_politur.mjs`) und für alles, was
nur in TikTok Studio geht. Ohne diesen Bedarf: weglassen — jede angemeldete Sitzung auf dem Server ist ein
Konto mehr, das dort offen liegt.

**A) Agenten-Browser bei TikTok anmelden (ohne Passwort, per QR-Code) — ca. 5 Minuten**
1. Server-Konsole (Hetzner): `cd /opt/luxe-agent/repo && git pull -q && bash server/luxe-profil-anmelden.sh`
   (hält den Agenten an, startet Chromium mit Steuerport nur auf 127.0.0.1).
2. PC, neues Terminal, offen lassen: `ssh -L 9222:127.0.0.1:9222 root@46.225.75.125`
3. PC-Chrome: `chrome://inspect` → links **Devices** → **Configure…** → `localhost:9222` eintragen →
   **Häkchen «Discover network targets» setzen** → unter «Remote Target #localhost:9222» bei einem Tab **inspect**.
4. Im Inspect-Fenster oben in die Adresszeile: `https://www.tiktok.com/login/qrcode` (Seite gemessen: HTTP 200).
5. Handy, TikTok-App (als luxestyle.ch angemeldet): QR-Code scannen und die Anmeldung bestätigen. Laut
   TikTok-Discover-Seiten (keine offizielle Hilfe) liegt «Scannen» unter *Profil → ☰ Menü*. Fragt TikTok
   nach einem Bestätigungscode (neues Gerät/Standort), im Inspect-Fenster eingeben.
6. Server-Konsole: **Strg-C** — das Skript startet den Agenten wieder.
7. Prüfen lassen (Hauptagent): Auftrag `anmeldungen_pruefen.mjs` → «TikTok Studio» muss `angemeldet: true` zeigen.

⚠️ Wer danach ein Skript nach `automation/browser/` bringt, handelt im Namen des TikTok-Kontos. Die Regel
«nur Skripte aus dem Repo, nie Code aus dem Auftrag» (`auftraege/README.md`) bleibt deshalb wichtig.

**B) Bio-Link** — heute nicht möglich. Sobald das Profil 1'000 Follower hat: *Profil → Profil bearbeiten →
Links → Hinzufügen → `https://luxestyle.ch`*. Die tägliche Statistik meldet die Followerzahl.

**C) Nur nachsehen (optional):** *Profil → ☰ → Einstellungen und Datenschutz → Konto → Business verification*
→ welche Dokumente TikTok für die Schweiz verlangt. **Nichts einreichen, nicht umstellen** — ein Wechsel
nimmt die allgemeine Musikbibliothek weg, und ohne bestandene Prüfung gibt es trotzdem keinen Link.
