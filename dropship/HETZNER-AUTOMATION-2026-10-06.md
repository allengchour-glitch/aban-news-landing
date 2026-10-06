# Hetzner-Server für die Automation — Befund und Reparatur (06.10.2026)

Betreiber: «hetzner verbessern und für die automation».
Gemessen wurde über zwei Server-Aufträge, die nur lesen: `server_zustand.mjs` und `server_runner_bilanz.mjs`.

## GEMESSEN (Server ubuntu-4gb-nbg1-1: 2 CPU, 3,8 GB RAM, /tmp = tmpfs 1,9 GB)

| Befund | Zahl | Folge |
|---|---|---|
| /tmp voll | 97 % belegt, «No space left on device» in den Logs | Wächter scheitern beim Schreiben von Exporten und Tokens |
| numpy und PIL fehlen | reel_engine_runner: «No module named 'numpy'»; textbild_fix: «No module named 'PIL'» | Reel- und Bild-Motoren laufen auf dem Server ins Leere |
| CJ-Runner ohne Text-KI | **3'903× `skip(gemini)`, 0 Produkte angelegt** | ~39'000 CJ-Punkte pro Tag ohne Ergebnis, rund ein Drittel des Kontotopfs (~120k) |
| Geheimnisse | `/etc/luxe/secrets.env` enthält nur Shopify, CJ und Judge.me | GROQ*, GEMINI, DEEPSEEK und die CJ-Zusatzkonten kamen nie an |

**Warum die Punkte verloren gingen:** `cj_category_fill.mjs` ruft zuerst `product/query` auf (10 Punkte) und schreibt erst danach den Text.
Ohne Schlüssel endet jedes Produkt nach der bezahlten Abfrage mit `skip(gemini)`.

## GETAN (`automation/engine_keepalive.sh`, Abschnitt 0, sowie Importer)

1. **/tmp-Hygiene** ab 85 % Belegung:
   - Dateien über 20 MB, die älter als 4 h sind, werden gelöscht. Ausnahme: `kost*`.
   - Logs über 20 MB werden gekürzt.
2. **numpy und PIL:** auf dem Server (Hostname `ubuntu-4gb-*`) einmal täglich `apt-get install python3-numpy python3-pil`, im Hintergrund und mit Zeitlimit.
3. **Geheimnisse:** `/etc/luxe/secrets.env` wird direkt in die Umgebung der Motoren geladen.
   - CJ2/CJ3 → `/tmp/cj_konten.env` (Format wie in `cj_lager_abgleich.py`).
   - GEMINI → `/tmp/gemini_key`.
   - Alle Dateien mit Rechten 600; Werte werden nie geloggt.
4. **KI-Weiche (`KI_DA`):**
   - Ohne Text-KI-Schlüssel setzt das Keepalive die Grind-Zahl auf diesem Rechner auf 0 («GRIND AUS auf <host>»).
   - Ohne Schlüssel wird der Such-Runner `cj_queue_runner` nicht gestartet bzw. beendet.
   - In der Cloud sind alle vier Schlüssel vorhanden; dort läuft der Grind unverändert mit 3 Runnern.
5. **Importer als zweite Sicherung:** `cj_category_fill.mjs` beendet sich ohne Text-KI **vor** der ersten CJ-Abfrage. `OHNE_KI_OK=1` hebt das auf.
6. **Vorlage:** `server/luxe-waechter-setup.sh` führt die optionalen Schlüssel GROQ/GEMINI/DEEPSEEK/CJ2/CJ3 jetzt mit auf.

## OFFEN

- **Nachmessen beim nächsten Server-Lauf:**
  - Steht «GRIND AUS» im Log?
  - Sinkt /tmp unter 85 %?
  - Sind numpy und PIL importierbar?
  - Gibt es keine `skip(gemini)`-Zeilen mehr?
- **Betreiber-Option, nur per SSH auf dem Server:** in `/etc/luxe/secrets.env` die Zeilen `GROQ_API_KEY=`, `GEMINI_API_KEY=`, `CJ2_API_KEY=` und `CJ3_API_KEY=` ergänzen.
  - Danach importiert der Server rund um die Uhr. Heute geht das nur, solange der Cloud-Container wach ist.
  - Der Lagerabgleich nutzt dann auch dort die Zusatzkonten.
  - Ohne diese Zeilen bleibt der Server Wächter (Bestand, Kategorien, Ampel), und der Grind läuft nur in der Cloud. Auch das ist ein sauberer Zustand.
