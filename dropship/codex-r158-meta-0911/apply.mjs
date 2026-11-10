// Codex R158 (09.11.2026): `snippets/meta-tags.liquid` der Vorschau 213619179911 ins MAIN-Theme übernehmen, NUR diese eine Datei.
// Warum nicht die Vorschau veröffentlichen: MAIN hat sich seit der Kopie geändert (templates/product.json, 09.11. 23:19 UTC);
// ein Veröffentlichen der Vorschau hätte diese Änderung zurückgesetzt. Die Vorschau unterscheidet sich von MAIN (Stand der Kopie)
// nur in dieser Datei (Codex: 537 von 537 Dateien verglichen; hier am 09.11. nachgemessen: genau zwei Dateien weichen heute ab,
// meta-tags.liquid und product.json, Letztere nur wegen der späteren MAIN-Änderung).
//
//   node apply.mjs                 Trockenlauf (Vorgabe): liest, prüft, zeigt den Unterschied
//   LIVE=1 node apply.mjs          schreibt, sichert vorher, liest zurück
//   ZURUECK=1 LIVE=1 node apply.mjs  stellt den Stand vor dem Einspielen wieder her
// Exit: 0 gut · 1 technisch · 2 Vorbedingung verletzt (nichts geschrieben) · 3 Schreib- oder Rücklesefehler
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HIER = dirname(fileURLToPath(import.meta.url))
const SHOP = process.env.SHOPIFY_SHOP || 'au3j0y-hq.myshopify.com'
const API = '2025-01'
const MAIN_ID = '213013037447'
const VORSCHAU_ID = '213619179911'
const DATEI = 'snippets/meta-tags.liquid'
const MD5_MAIN_VOR = 'c7e3f66093cbdb59f29210b62ebd1447'   // Stand von MAIN, den Codex kopiert hat (R158)
const MD5_SOLL = '5272479d3e09c18aa461e78f465c7c0b'      // Stand der Vorschau (R158)
const LIVE = process.env.LIVE === '1'
const ZURUECK = process.env.ZURUECK === '1'
const SICHERUNG = join(HIER, 'sicherung', 'meta-tags.liquid.vor')
const md5 = (s) => createHash('md5').update(s, 'utf8').digest('hex')
const pause = (ms) => new Promise((r) => setTimeout(r, ms))

async function token() {
  const id = process.env.SHOPIFY_CLIENT_ID, secret = process.env.SHOPIFY_CLIENT_SECRET
  if (!id || !secret) throw new Error('SHOPIFY_CLIENT_ID/SHOPIFY_CLIENT_SECRET fehlen')
  const r = await fetch(`https://${SHOP}/admin/oauth/access_token`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }) })
  const j = await r.json()
  if (!j.access_token) throw new Error('kein Token: ' + JSON.stringify(j).slice(0, 120))
  return j.access_token
}
let TOKEN
async function gql(query, variables = {}) {
  const r = await fetch(`https://${SHOP}/admin/api/${API}/graphql.json`, { method: 'POST', headers: { 'X-Shopify-Access-Token': TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) })
  const j = await r.json()
  if (j.errors) throw new Error('GraphQL: ' + JSON.stringify(j.errors).slice(0, 300))
  return j.data
}
async function lies(id) {
  const d = await gql(`query($id:ID!,$f:[String!]!){ theme(id:$id){ id name role files(filenames:$f){ nodes{ filename checksumMd5 body{ ... on OnlineStoreThemeFileBodyText{ content } } } } } }`, { id: `gid://shopify/OnlineStoreTheme/${id}`, f: [DATEI] })
  const t = d.theme
  if (!t) throw new Error('Theme nicht gefunden: ' + id)
  const f = t.files.nodes[0]
  if (!f || !f.body) throw new Error('Datei fehlt im Theme ' + id)
  return { name: t.name, role: t.role, content: f.body.content, md5Shopify: f.checksumMd5, md5Lokal: md5(f.body.content) }
}

async function main() {
  TOKEN = await token()
  const main_ = await lies(MAIN_ID)
  const vor = await lies(VORSCHAU_ID)
  console.log(`MAIN ${MAIN_ID} «${main_.name}» Rolle ${main_.role}; ${DATEI} md5 ${main_.md5Shopify} (lokal ${main_.md5Lokal}), ${main_.content.length} Zeichen`)
  console.log(`Vorschau ${VORSCHAU_ID} «${vor.name}» Rolle ${vor.role}; ${DATEI} md5 ${vor.md5Shopify} (lokal ${vor.md5Lokal})`)
  if (main_.role !== 'MAIN') { console.error('ABBRUCH: das Theme ist nicht MAIN'); process.exit(2) }
  if (vor.role !== 'UNPUBLISHED') { console.error('ABBRUCH: die Vorschau ist nicht mehr UNPUBLISHED'); process.exit(2) }
  if (main_.md5Shopify !== main_.md5Lokal || vor.md5Shopify !== vor.md5Lokal) { console.error('ABBRUCH: Prüfsumme der gelesenen Datei passt nicht zum Inhalt (Lesefehler)'); process.exit(2) }

  if (ZURUECK) {
    if (!existsSync(SICHERUNG)) { console.error('ABBRUCH: keine Sicherung vorhanden'); process.exit(2) }
    const alt = readFileSync(SICHERUNG, 'utf8')
    if (md5(alt) !== MD5_MAIN_VOR) { console.error('ABBRUCH: die Sicherung hat nicht den erwarteten Stand'); process.exit(2) }
    if (main_.md5Lokal !== MD5_SOLL) { console.error(`ABBRUCH: MAIN steht nicht auf dem eingespielten Stand (${main_.md5Lokal}); fremd verändert, nichts zurückgenommen`); process.exit(2) }
    console.log(LIVE ? 'ZURÜCK: schreibe den Stand vor dem Einspielen' : 'Trockenlauf Rücknahme: würde den Stand vor dem Einspielen zurückschreiben')
    if (!LIVE) return
    await schreibe(alt, MD5_MAIN_VOR)
    return
  }

  if (vor.md5Lokal !== MD5_SOLL) { console.error(`ABBRUCH: die Vorschau-Datei hat nicht mehr den geprüften Stand (${vor.md5Lokal}, erwartet ${MD5_SOLL})`); process.exit(2) }
  if (main_.md5Lokal === MD5_SOLL) { console.log('MAIN steht schon auf dem Soll-Stand: nichts zu tun'); return }
  if (main_.md5Lokal !== MD5_MAIN_VOR) { console.error(`ABBRUCH: MAIN ${DATEI} hat sich seit der Kopie verändert (${main_.md5Lokal}); die Übernahme würde fremde Änderungen überschreiben`); process.exit(2) }

  const a = main_.content.split('\n'), b = vor.content.split('\n')
  let n = 0
  const maxl = Math.max(a.length, b.length)
  for (let i = 0, j = 0; i < a.length || j < b.length;) {
    if (a[i] === b[j]) { i++; j++; continue }
    n++
    if (n <= 12) console.log(`  Zeile MAIN ${i + 1} / Vorschau ${j + 1}: «${(a[i] ?? '').trim().slice(0, 110)}» → «${(b[j] ?? '').trim().slice(0, 110)}»`)
    i++; j++
  }
  console.log(`Unterschiede (grob, zeilenweise): ${n}; Zeilen MAIN ${a.length}, Vorschau ${b.length} (max ${maxl})`)
  if (!LIVE) { console.log('Trockenlauf: nichts geschrieben'); return }

  mkdirSync(dirname(SICHERUNG), { recursive: true })
  if (!existsSync(SICHERUNG)) writeFileSync(SICHERUNG, main_.content)
  await schreibe(vor.content, MD5_SOLL)
}

async function schreibe(content, md5Soll) {
  // Vorbedingung direkt vor dem Schreiben noch einmal lesen (Lese-Schreib-Fenster klein halten)
  const jetzt = await lies(MAIN_ID)
  const erwartet = md5Soll === MD5_SOLL ? MD5_MAIN_VOR : MD5_SOLL
  if (jetzt.md5Lokal !== erwartet) { console.error(`ABBRUCH: MAIN hat sich zwischen Lesen und Schreiben verändert (${jetzt.md5Lokal})`); process.exit(2) }
  const d = await gql(`mutation($id:ID!,$files:[OnlineStoreThemeFilesUpsertFileInput!]!){ themeFilesUpsert(themeId:$id, files:$files){ upsertedThemeFiles{ filename } userErrors{ field message code } } }`, { id: `gid://shopify/OnlineStoreTheme/${MAIN_ID}`, files: [{ filename: DATEI, body: { type: 'TEXT', value: content } }] })
  const r = d.themeFilesUpsert
  if (r.userErrors && r.userErrors.length) { console.error('userErrors: ' + JSON.stringify(r.userErrors)); process.exit(3) }
  console.log('geschrieben: ' + JSON.stringify(r.upsertedThemeFiles))
  for (let i = 1; i <= 8; i++) {
    await pause(4000)
    const nach = await lies(MAIN_ID)
    console.log(`Rücklesen ${i}: md5 ${nach.md5Lokal}`)
    if (nach.md5Lokal === md5Soll) { console.log('GLEICH dem Soll'); return }
  }
  console.error('Rücklesen weicht ab')
  process.exit(3)
}

main().catch((e) => { console.error(e.message); process.exit(1) })
