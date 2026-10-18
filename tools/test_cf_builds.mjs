/* test_cf_builds.mjs — prueft automation/lib/cf_builds.mjs gegen eine nachgebaute Cloudflare-API.
 * Die Gegenproben sind hier wichtiger als der Normalfall: der Code loescht im Konto des Users.
 *   node tools/test_cf_builds.mjs
 */
import { ausloeser, bauAusloeserAbschalten, berichtText } from '../automation/lib/cf_builds.mjs'

let ok = 0, fehl = 0
const pruef = (name, bedingung, detail) => {
  console.log((bedingung ? '  ✅ ' : '  ❌ ') + name + (detail ? ' — ' + detail : ''))
  bedingung ? ok++ : fehl++
}

/** Nachgebaute API: haelt Ausloeser je Skript und merkt sich jedes DELETE. */
function fakeCf (tabelle, { fehlerBei = {}, loeschFehler = [] } = {}) {
  const geloescht = []
  const rufe = []
  const impl = async (url, init) => {
    rufe.push((init.method || 'GET') + ' ' + url)
    const m = url.match(/\/builds\/workers\/([^/]+)\/triggers$/)
    if (m) {
      const skript = decodeURIComponent(m[1])
      if (fehlerBei[skript]) return { ok: false, status: fehlerBei[skript], json: async () => ({ success: false, errors: [{ message: 'kaputt' }] }) }
      return { ok: true, status: 200, json: async () => ({ success: true, result: tabelle[skript] || [] }) }
    }
    const d = url.match(/\/builds\/triggers\/([^/]+)$/)
    if (d && init.method === 'DELETE') {
      if (loeschFehler.includes(d[1])) return { ok: false, status: 403, json: async () => ({ success: false, errors: [{ message: 'kein Recht' }] }) }
      geloescht.push(d[1])
      return { ok: true, status: 200, json: async () => ({ success: true, result: null }) }
    }
    return { ok: false, status: 404, json: async () => ({ success: false, errors: [{ message: 'unbekannter Pfad' }] }) }
  }
  return { impl, geloescht, rufe }
}

const REPO = 'allengchour-glitch/aban-news-landing'
const TABELLE = {
  'aban-news-landing': [{ trigger_uuid: 't1', build_branch: 'main', repo_connection: { repo_owner: 'allengchour-glitch', repo_name: 'aban-news-landing' } }],
  'aban-a': [{ trigger_uuid: 't2', build_branch: 'main', repo_connection: { repo_owner: 'allengchour-glitch', repo_name: 'aban-news-landing' } }],
  'ki-verzeichnis': [{ trigger_uuid: 't3', build_branch: 'main', repo_connection: { repo_owner: 'allengchour-glitch', repo_name: 'aban-news-landing' } }],
  'fremder-worker': [{ trigger_uuid: 't9', build_branch: 'main', repo_connection: { repo_owner: 'jemand', repo_name: 'anderes-repo' } }],
  'ohne-ausloeser': []
}
const DREI = ['aban-news-landing', 'aban-a', 'ki-verzeichnis']

console.log('\n— Lesen —')
{
  const f = fakeCf(TABELLE)
  const t = await ausloeser('aban-a', { konto: 'k', token: 'x', fetchImpl: f.impl })
  pruef('ein Ausloeser gefunden', t.length === 1 && t[0].uuid === 't2')
  pruef('Repository wird benannt', t[0].repo === REPO, t[0].repo)
  pruef('nur gelesen, nichts geloescht', f.geloescht.length === 0 && f.rufe.every((r) => r.startsWith('GET')))
}

console.log('\n— Trockenlauf ist die Vorgabe (wichtigste Sicherung) —')
{
  const f = fakeCf(TABELLE)
  const b = await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: DREI, repo: REPO, fetchImpl: f.impl })
  pruef('ohne trocken:false wird NICHTS geloescht', f.geloescht.length === 0)
  pruef('alle drei als "Trockenlauf" gemeldet', b.every((r) => r.uebersprungen.length === 1 && r.uebersprungen[0].grund === 'Trockenlauf'))
  pruef('der Bericht sagt es auch', /Trockenlauf — es wurde nichts geaendert/.test(berichtText(b, true)))
}

console.log('\n— Scharfer Lauf —')
{
  const f = fakeCf(TABELLE)
  const b = await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: DREI, repo: REPO, trocken: false, fetchImpl: f.impl })
  pruef('genau die drei Ausloeser geloescht', f.geloescht.join(',') === 't1,t2,t3', f.geloescht.join(','))
  pruef('Bericht nennt jedes Loeschen', (berichtText(b, false).match(/GELOESCHT/g) || []).length === 3)
}

console.log('\n— Gegenproben: was NICHT passieren darf —')
{
  const f = fakeCf(TABELLE)
  const b = await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: ['fremder-worker'], repo: REPO, trocken: false, fetchImpl: f.impl })
  pruef('ein Ausloeser auf fremdem Repo bleibt stehen', f.geloescht.length === 0)
  pruef('und der Grund steht im Bericht', /fremdes Repository/.test(b[0].uebersprungen[0].grund))
}
{
  const f = fakeCf(TABELLE)
  await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: ['aban-a'], repo: REPO, trocken: false, fetchImpl: f.impl })
  pruef('nur das genannte Skript wird angefasst', f.geloescht.join(',') === 't2')
}
{
  let warf = null
  try { await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: DREI, trocken: false, fetchImpl: fakeCf(TABELLE).impl }) } catch (e) { warf = String(e.message) }
  pruef('ohne Repository-Angabe laeuft gar nichts', /kein Repository/.test(warf || ''), warf)
}
{
  let warf = null
  try { await bauAusloeserAbschalten({ konto: '', token: '', skripte: DREI, repo: REPO, fetchImpl: fakeCf(TABELLE).impl }) } catch (e) { warf = String(e.message) }
  pruef('ohne Zugangsdaten laeuft gar nichts', /Konto-ID und Token fehlen/.test(warf || ''))
}
{
  const f = fakeCf(TABELLE)
  const b = await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: ['ohne-ausloeser'], repo: REPO, trocken: false, fetchImpl: f.impl })
  pruef('ein Worker ohne Ausloeser ist kein Fehler', !b[0].fehler && b[0].gefunden.length === 0 && f.geloescht.length === 0)
  pruef('Bericht sagt "nichts zu tun"', /kein Bau-Ausloeser/.test(berichtText(b, false)))
}

console.log('\n— Fehler bleiben Fehler (keine stillen No-ops) —')
{
  const f = fakeCf(TABELLE, { fehlerBei: { 'aban-a': 500 } })
  const b = await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: DREI, repo: REPO, trocken: false, fetchImpl: f.impl })
  pruef('unlesbarer Worker wird gemeldet, nicht verschwiegen', b[1].fehler && /CF_API/.test(b[1].fehler))
  pruef('die anderen zwei laufen trotzdem durch', f.geloescht.join(',') === 't1,t3')
  pruef('Bericht nennt den Fehler', /nicht lesbar/.test(berichtText(b, false)))
}
{
  const f = fakeCf(TABELLE, { loeschFehler: ['t2'] })
  const b = await bauAusloeserAbschalten({ konto: 'k', token: 'x', skripte: DREI, repo: REPO, trocken: false, fetchImpl: f.impl })
  pruef('ein abgelehntes Loeschen wird nicht als Erfolg gezaehlt', b[1].geloescht.length === 0 && /Loeschen fehlgeschlagen/.test(b[1].uebersprungen[0].grund))
  pruef('die anderen sind trotzdem weg', f.geloescht.join(',') === 't1,t3')
}

console.log('\n' + (fehl ? '❌ ' : '✅ ') + ok + ' ok, ' + fehl + ' fehlgeschlagen\n')
process.exit(fehl ? 1 : 0)
