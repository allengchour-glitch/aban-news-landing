# 📥 PC-CLAUDE-INBOX — Auftrags-Brücke Cloud → PC (autonom, ohne User)

> **Protokoll:** Die Cloud-Session schreibt Aufträge hier rein (Status `NEU`). PC-Claude
> (Brave, Port 9222, eingeloggt) pullt dieses Repo regelmässig, führt alle `NEU`-Aufträge aus,
> setzt Status auf `ERLEDIGT` + Ergebnis-Zeile, committet auf Branch `pc-claude/reports` und pusht.
> Regeln aus `dropship/PC-CLAUDE-SOCIAL-VOLLKONTROLLE.md` gelten IMMER (v. a. ⛔ Doppelpost-Verbot,
> Eskalations-Verbote). Bei Unklarheit: Auftrag überspringen + Frage in die Ergebnis-Zeile.

## 🔁 DAUERAUFTRAG (bei JEDEM Lauf ausführen, nie abhaken)
- Tages-Routine gemäss Playbook §1: IG+FB+TikTok Kommentare beantworten, DMs checken
  (Scam-Muster ignorieren), 1 Story (Produkt des Tages ab luxestyle.ch, Link-Sticker).
- QUALITÄT VOR MENGE (User 2026-07-06): max. 3–4 Posts/WOCHE, bevorzugt die langen Showcase-Videos; Reel nur posten wenn wirklich stark. Quelle `automation/reels_seed.csv` (nur `status=ready`, ⛔ Doppelpost-Check
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

- [NEU 2026-07-06b] POST-AUDIT ALLE KANÄLE (User-Freigabe: Löschen erlaubt!): Auf IG, FB und
  TikTok JEDEN Post der letzten 60 Tage durchgehen: (a) Doppelposts/identische Reels → den
  schwächeren LÖSCHEN (Freigabe User 2026-07-06 «wenn du willst auch löschen»), (b) Posts mit
  totem Link/PureMax/fremdem Branding → löschen, (c) schwache aber saubere Posts → stehen lassen,
  (d) Ausnahme: Posts mit >500 Views/Likes NIE löschen, nur rapportieren. Ergebnis-Liste
  (gelöscht/behalten/warum) in den Rapport-Block.
- [NEU 2026-07-06b, ⚠️ AKTUALISIERT 07-07] Best-of-Mix posten: **NUR NOCH TIKTOK** — auf IG+FB hat
  die Cloud-Session am 07.07. bereits automatisch gepostet (instagram.com/reel/DagJ_sgDjT_)!
  CLEAN-Variante nehmen (https://cdn.shopify.com/s/files/1/0943/6856/3585/files/bestof-20260706-clean.mp4?v=1783369433)
  und in der App einen AKTUELLEN Trend-Sound drüberlegen. Caption aus Queue-Eintrag bestof-20260706.

- [⭐ DAUERAUFTRAG 2026-07-07 — TIKTOK-POSTING-DIENST (User-Entscheid «Weg 2»)]
  **Du übernimmst TikTok komplett.** WICHTIG: Die Cloud-Session postet IG+FB seit 07.07.
  vollautomatisch per API (automation/meta_reel_post.mjs, 48h-Kadenz) — **du postest NIE mehr
  selbst auf IG/FB** (Doppelpost-Gefahr!), nur noch TikTok + Stories + Community. Regeln:
  1. **Kadenz:** 2 TikTok-Posts/Woche (z. B. Di + Fr, 18–20 Uhr).
  2. **Quelle:** `automation/reels_seed.csv` — nur status=ready mit Plattform tiktok. Immer die
     `-clean.mp4`-Variante + in der App einen **aktuellen Trend-Sound** (Commercial Music Library)
     drüberlegen — jedes Mal einen anderen.
  3. **Vor jedem Post:** (a) Ledger + eigenes Profil prüfen → NIE Doppelpost; (b) beworbenes
     Produkt auf luxestyle.ch aufrufen — wenn 404/nicht kaufbar: Zeile auf
     status=skip-produkt-offline setzen, nächstes Video nehmen.
  4. **Nach jedem Post:** Zeile auf status=posted-tiktok + posted_at + Post-URL, committen, pushen.
  5. **⛔ NIE auf Threads posten** (User-Stopp bis Follower da sind).

## 📤 RAPPORTE (PC-Claude trägt hier ein, neueste zuoberst)
_(noch keine)_
