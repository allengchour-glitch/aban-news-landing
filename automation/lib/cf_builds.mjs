/**
 * Cloudflare Workers Builds: Bau-Ausloeser lesen und gezielt abschalten.
 *
 * WARUM: Drei Checks melden an JEDEM Commit `failure` — `Workers Builds: aban-news-landing`,
 * `Workers Builds: aban-a`, `Workers Builds: ki-verzeichnis`. Der Cloudflare-Bot schreibt dabei
 * selbst „⚠️ Deployment skipped"; GitHub macht daraus einen roten Check. Im Repo gibt es fuer
 * keinen der drei Namen eine `wrangler.toml` (nur workers/*: aban-inserate-brain, aban-site-brain,
 * ki-werkzeug-ai, shop-brain, pinterest-cron), und die Hauptseite wird als Cloudflare **Pages**
 * ueber `.github/workflows/cf-deploy-mainsite.yml` veroeffentlicht. Die drei Bau-Ausloeser sind
 * also im Cloudflare-Konto verdrahtet, nicht im Repo — und sie koennen nie etwas bauen.
 *
 * Der Schnitt ist der Bau-Ausloeser (`DELETE /builds/triggers/{uuid}`), NICHT die Repo-Verbindung:
 * eine Verbindung kann mehrere Worker tragen, ein Ausloeser gehoert genau einem.
 *
 * SICHERUNGEN (dieser Code aendert ein fremdes Konto):
 *  - `trocken: true` ist die Vorgabe — ohne ausdrueckliches `trocken: false` wird nichts geloescht.
 *  - Es wird nur angefasst, was in `skripte` namentlich steht. Keine Muster, keine Platzhalter.
 *  - Ein Ausloeser, dessen Repository nicht `repo` ist, wird NIE geloescht, auch wenn der Name passt.
 */

const BASIS = "https://api.cloudflare.com/client/v4";

async function cfFetch(pfad, { token, methode = "GET", fetchImpl = fetch } = {}) {
  const r = await fetchImpl(BASIS + pfad, {
    method: methode,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" }
  });
  let d = null;
  try { d = await r.json(); } catch (e) { /* leere Antwort ist bei DELETE erlaubt */ }
  if (!r.ok || (d && d.success === false)) {
    const grund = d && d.errors && d.errors.length ? d.errors.map((e) => e.message).join("; ") : "HTTP " + r.status;
    const err = new Error("CF_API: " + grund);
    err.status = r.status;
    throw err;
  }
  return d ? d.result : null;
}

/** Die Bau-Ausloeser eines Workers, auf das Noetige eingedampft. */
export async function ausloeser(skript, opt) {
  const roh = await cfFetch(`/accounts/${opt.konto}/builds/workers/${encodeURIComponent(skript)}/triggers`, opt);
  const liste = Array.isArray(roh) ? roh : (roh && Array.isArray(roh.triggers) ? roh.triggers : []);
  return liste.map((t) => {
    const v = t.repo_connection || {};
    const repo = [v.repo_owner || v.owner, v.repo_name || v.name].filter(Boolean).join("/");
    return {
      uuid: t.trigger_uuid || t.uuid || t.id || "",
      skript,
      repo,
      zweig: t.build_branch || t.branch || "",
      pfade: t.path_includes || t.build_watch_paths || null,
      befehl: t.deploy_command || t.build_command || ""
    };
  }).filter((t) => t.uuid);
}

/**
 * Prueft (und loescht nur bei `trocken: false`) die Bau-Ausloeser der genannten Skripte.
 * Gibt je Skript zurueck, was gefunden und was getan wurde.
 */
export async function bauAusloeserAbschalten({ konto, token, skripte, repo, trocken = true, fetchImpl = fetch }) {
  if (!konto || !token) throw new Error("CF_KONFIG: Konto-ID und Token fehlen");
  if (!Array.isArray(skripte) || !skripte.length) throw new Error("CF_KONFIG: keine Skripte genannt");
  if (!repo) throw new Error("CF_KONFIG: kein Repository genannt — ohne das wird nichts geloescht");
  const opt = { konto, token, fetchImpl };
  const bericht = [];
  for (const skript of skripte) {
    const zeile = { skript, gefunden: [], geloescht: [], uebersprungen: [], fehler: null };
    try {
      zeile.gefunden = await ausloeser(skript, opt);
    } catch (e) {
      zeile.fehler = String(e.message || e);
      bericht.push(zeile);
      continue;
    }
    for (const t of zeile.gefunden) {
      if (t.repo.toLowerCase() !== repo.toLowerCase()) {
        zeile.uebersprungen.push({ ...t, grund: "fremdes Repository: " + (t.repo || "unbekannt") });
        continue;
      }
      if (trocken) { zeile.uebersprungen.push({ ...t, grund: "Trockenlauf" }); continue; }
      try {
        await cfFetch(`/accounts/${konto}/builds/triggers/${t.uuid}`, { ...opt, methode: "DELETE" });
        zeile.geloescht.push(t);
      } catch (e) {
        zeile.uebersprungen.push({ ...t, grund: "Loeschen fehlgeschlagen: " + String(e.message || e) });
      }
    }
    bericht.push(zeile);
  }
  return bericht;
}

export function berichtText(bericht, trocken) {
  const z = [];
  z.push(trocken ? "Trockenlauf — es wurde nichts geaendert." : "Scharfer Lauf.");
  for (const r of bericht) {
    if (r.fehler) { z.push(`• ${r.skript}: nicht lesbar — ${r.fehler}`); continue; }
    if (!r.gefunden.length) { z.push(`• ${r.skript}: kein Bau-Ausloeser (nichts zu tun)`); continue; }
    for (const t of r.gefunden) {
      const tat = r.geloescht.some((x) => x.uuid === t.uuid)
        ? "GELOESCHT"
        : (r.uebersprungen.find((x) => x.uuid === t.uuid) || {}).grund || "unberuehrt";
      z.push(`• ${r.skript}: ${t.repo || "ohne Repo"} (Zweig ${t.zweig || "?"}) → ${tat}`);
    }
  }
  return z.join("\n");
}
