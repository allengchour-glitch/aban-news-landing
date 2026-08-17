# Schwarm 6 — Rest-Backlog (Finder-Befunde, noch NICHT verifiziert/umgesetzt)

Schwarm 6 (2026-08-16) lief mit 30/40 Findern ins Usage-Limit; die Verifizierer-Welle
starb komplett. 12 Befunde wurden von Hand verifiziert + umgesetzt (siehe Commit).
Diese hier sind OFFEN — vor Umsetzung erst am Code verifizieren:

1. **furn-Sync ohne gratis/wachs** (Z ~6778/9389): {t:"furn"} uebertraegt weder
   gratis-Flag noch Wachstums-Fortschritt; Villa-Vorlagen-Gratis-Flags nur lokal.
   -> Peers divergieren bei Abriss-Erstattung.
2. **hide-Abbruch** (Z ~7087): sendet angeblich auch der Gast, Host-Handler verwirft
   (m.t==="hide"&&!mpHost). Unklar, ob der Abbruch-Pfad je beim Gast laeuft — pruefen.
3. **confirm() im Netz-Callback** (Z ~7008, crimeAsk): blockiert rAF+Heartbeat,
   waehrend die Gegenseite einen 6s-Watchdog faehrt -> moeglicher Fake-Disconnect.
   Fix waere ein nicht-blockierendes Overlay statt confirm().
4. **Gast-Diebstahl konsequenzlos** (Z ~8975): wantedPlus bricht beim Gast ab,
   {t:"dieb"} traegt weder "gesehen" noch Fehlschlag.
5. **Gast-Grow-Fehlschlag** (Z ~9071): polizeiPending verpufft beim Gast, keine
   Nachricht fuer den Fehlschlag.
6. Finder-Luecke: Dimensionen npc (2 Slices), neubauten (alle 4), ui (alle 4)
   liefen NIE (Limit) — dort ist noch nicht gesucht worden.
