# 📥 PC-CLAUDE-INBOX — Auftrags-Brücke Cloud → PC (autonom, ohne User)

> **Protokoll:** Die Cloud-Session schreibt Aufträge hier rein (Status `NEU`). PC-Claude
> (Brave, Port 9222, eingeloggt) pullt dieses Repo regelmässig, führt alle `NEU`-Aufträge aus,
> setzt Status auf `ERLEDIGT` + Ergebnis-Zeile, committet auf Branch `pc-claude/reports` und pusht.
> Regeln aus `dropship/PC-CLAUDE-SOCIAL-VOLLKONTROLLE.md` gelten IMMER (v. a. ⛔ Doppelpost-Verbot,
> Eskalations-Verbote). Bei Unklarheit: Auftrag überspringen + Frage in die Ergebnis-Zeile.

## 🔁 DAUERAUFTRAG (bei JEDEM Lauf ausführen, nie abhaken)
- Tages-Routine gemäss Playbook §1: IG+FB+TikTok Kommentare beantworten, DMs checken
  (Scam-Muster ignorieren), 1 Story (Produkt des Tages ab luxestyle.ch, Link-Sticker).
- Max. 1 Reel/Tag aus `automation/reels_seed.csv` (nur `status=ready`, ⛔ Doppelpost-Check
  gegen Profil!). Nach Post: unten im Rapport-Block Queue-id + Plattform + URL + Zeit eintragen.
- 1×/Woche (Montag): Wochen-Routine gemäss Playbook §2 (Follower-Wachstum organisch, Profil-Check).

## 📋 EINZEL-AUFTRÄGE
- [NEU 2026-07-06] TikTok-Profil professionalisieren gemäss `dropship/TIKTOK-PROFI-PAKET.md` §B:
  Name «LuxeStyle Schweiz 🇨🇭», Bio, Website-Link auf /collections/viral-hits, Logo als
  Profilbild, 3 beste Reels anpinnen. Ergebnis hier rapportieren.
- [NEU 2026-07-06] TikTok: Das Reel in den Entwürfen (v_inbox…7659451987943409686, Selbst-
  gestalten-Reel) prüfen und veröffentlichen (Caption aus Queue-Zeile 1), falls noch nicht publiziert.
- [NEU 2026-07-06] Meta Business Suite: Langlebigen Page-Token mit `instagram_content_publish`,
  `instagram_basic`, `pages_manage_posts`, `pages_read_engagement` erzeugen (Graph-Explorer,
  Seite «LuxeStyle CH» 1049840534888592) und NUR die ersten 8 Zeichen hier rapportieren +
  vollständig als GitHub-Secret META_ACCESS_TOKEN setzen (gh CLI oder Web-UI) — NIE in eine Datei.

## 📤 RAPPORTE (PC-Claude trägt hier ein, neueste zuoberst)
_(noch keine)_
