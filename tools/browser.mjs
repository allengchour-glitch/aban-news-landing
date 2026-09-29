/**
 * tools/browser.mjs — ein echter Browser AUS DER CLOUD-SESSION.
 *
 *   /opt/node22/bin/node tools/browser.mjs --selbsttest
 *   /opt/node22/bin/node tools/browser.mjs <url> [breite] [hoehe]   # Screenshot + sichtbarer Text
 *
 * 🔓 WARUM ES DAS GIBT (GEMESSEN 2026-09-27, widerlegt das Gedaechtnis):
 * `CLAUDE.md` sagt seit dem 12.06. in Grossbuchstaben "Cloud-Sessions haben KEINEN Browser"
 * und verweist Browser-Aufgaben an den PC des Users. Das stimmt nicht (mehr):
 *   - Chromium 141.0.7390.37 liegt unter /opt/pw-browsers/chromium-1194/chrome-linux/chrome
 *   - `playwright` liegt global in /opt/node22/lib/node_modules (NICHT im Projekt, darum
 *     scheitert ein blosses `import "playwright"`)
 *   - eine echte Produktseite laedt mit HTTP 200 und rendert
 *
 * ⚠️ DIE HUERDE, an der es ohne diese Datei scheitert: der Agent-Proxy bricht TLS auf, und
 * Chromium 141 bringt seinen EIGENEN Wurzelspeicher mit — der System-Trust und die
 * NSS-Datenbank unter ~/.pki/nssdb helfen ihm nicht. Ergebnis: ERR_CERT_AUTHORITY_INVALID.
 *
 * 🔑 UND DER WEG, DER NICHT GEWAEHLT WURDE: `ignoreHTTPSErrors` bzw.
 * `--ignore-certificate-errors` schaltet die Pruefung GANZ ab — dann ist jede Seite
 * vertrauenswuerdig, auch eine untergeschobene. Stattdessen wird ueber
 * `--ignore-certificate-errors-spki-list` GENAU den dokumentierten Anthropic-Proxy-CAs
 * vertraut, mit ihrem SPKI-Fingerabdruck. Alles andere wird weiterhin geprueft.
 * Die Fingerabdruecke stammen aus /root/.ccr/ca-bundle.crt:
 *   openssl x509 -in <ca> -pubkey -noout | openssl pkey -pubin -outform der \
 *     | openssl dgst -sha256 -binary | openssl enc -base64
 *
 * WOFUER ES TAUGT, WAS `curl` NICHT KANN: gerenderten Text statt Quelltext lesen (Preise aus
 * JS-Bausteinen), Screenshots in echter Handy-Breite, Cookie-Banner und Ueberlagerungen sehen,
 * Formulare bedienen. Wofuer es NICHT taugt: Instagram und andere Dienste, die eine
 * Anmeldung verlangen — dafuer bleibt der PC-Weg (`automation/local/ig-reel-lesen.mjs`).
 */

export const CHROME = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
export const PLAYWRIGHT = '/opt/node22/lib/node_modules/playwright/index.mjs';

/** SPKI-Fingerabdruecke der dokumentierten Anthropic-Proxy-CAs (kein Blankoscheck). */
export const PROXY_SPKI = [
  'PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0=', // CCR agent-proxy interception CA (production)
  'KnP1OnzHv/y42eRQmbGwoYTHcSJF448m6CU5mdngwKk=', // CCR Upstream Proxy CA (staging)
  'gBdItbWylHhTkoJDRwIiMuweY/qX4F0bJmLNs5wosUQ=', // sandbox-egress-gateway-production Egress Gateway CA
  '4FUmu5xjLNSCwT6mnoJy7LpsouczK4qrlGg3VquK6ZE=', // sandbox-egress-gateway-staging Egress Gateway CA
  'L+/CZomxifpzjiAVG11S0bTbaTopj+c49s0rBjjSC6A=', // sandbox-egress-production TLS Inspection CA
  '0KMCVL0z7YGtHqARRnTAzBN88j1iAyUWpWormDdohIY=', // sandbox-egress-staging TLS Inspection CA
];

/** Die Startargumente. Als reine Funktion, damit der Selbsttest sie ohne Browser pruefen kann. */
export function startArgumente(spki = PROXY_SPKI) {
  return ['--no-sandbox', `--ignore-certificate-errors-spki-list=${spki.join(',')}`];
}

/** Ein SPKI-Fingerabdruck ist base64 ueber SHA-256, also 44 Zeichen mit '=' am Ende. */
export function istFingerabdruck(s) {
  return typeof s === 'string' && /^[A-Za-z0-9+/]{43}=$/.test(s);
}

export async function starte() {
  const { chromium } = await import(PLAYWRIGHT);
  return chromium.launch({ executablePath: CHROME, args: startArgumente() });
}

/**
 * Eine Seite ansehen. Gibt Status, Titel, GERENDERTEN Text und den Screenshot-Pfad zurueck.
 * `erwartet`/`verboten` sind Zeichenketten, die im gerenderten Text stehen bzw. fehlen muessen —
 * so hat jeder Aufruf seine Gegenprobe dabei.
 */
export async function ansehen(url, { breite = 390, hoehe = 844, bild = null, erwartet = [], verboten = [] } = {}) {
  const browser = await starte();
  try {
    const seite = await browser.newPage({ viewport: { width: breite, height: hoehe } });
    const antwort = await seite.goto(url, { waitUntil: 'load', timeout: 90000 });
    const status = antwort ? antwort.status() : null;
    const titel = await seite.title();
    const text = await seite.evaluate(() => document.body.innerText);
    if (bild) await seite.screenshot({ path: bild, fullPage: false });
    return {
      status, titel, text, bild,
      gefunden: erwartet.filter((s) => text.includes(s)),
      fehlend: erwartet.filter((s) => !text.includes(s)),
      unerwuenscht: verboten.filter((s) => text.includes(s)),
    };
  } finally {
    await browser.close();
  }
}

function selbsttest() {
  let ok = 0; const fehler = [];
  const pruefe = (n, b) => { if (b) ok++; else fehler.push(n); };

  pruefe('Chromium-Pfad ist gesetzt', CHROME.endsWith('/chrome'));
  pruefe('Playwright liegt global, nicht im Projekt', PLAYWRIGHT.startsWith('/opt/node22/lib/node_modules/'));
  pruefe('mindestens die produktive Proxy-CA ist dabei',
    PROXY_SPKI.includes('PS48cX347wDVcRynzq+DFqswl2PLNE1sG6uQvxMCOS0='));
  pruefe('alle Eintraege sehen wie SHA-256-Fingerabdruecke aus', PROXY_SPKI.every(istFingerabdruck));
  pruefe('GEGENPROBE ein Unsinn-Wert wird NICHT als Fingerabdruck anerkannt',
    !istFingerabdruck('vertrau-mir-einfach'));
  pruefe('GEGENPROBE ein zu kurzer Fingerabdruck faellt durch', !istFingerabdruck('abc='));
  pruefe('keine doppelten Fingerabdruecke', new Set(PROXY_SPKI).size === PROXY_SPKI.length);

  const a = startArgumente();
  pruefe('die Sandbox wird abgeschaltet (Container laeuft als root)', a.includes('--no-sandbox'));
  pruefe('die Fingerabdruck-Liste wird uebergeben',
    a.some((x) => x.startsWith('--ignore-certificate-errors-spki-list=')));
  pruefe('🔑 die Pruefung wird NICHT pauschal abgeschaltet',
    !a.includes('--ignore-certificate-errors') && !a.some((x) => x === '--disable-web-security'));
  pruefe('GEGENPROBE eine leere Liste ergibt kein Vertrauen in irgendwas',
    startArgumente([])[1] === '--ignore-certificate-errors-spki-list=');
  pruefe('die Liste enthaelt genau die uebergebenen Werte',
    startArgumente(['AAA=']) [1] === '--ignore-certificate-errors-spki-list=AAA=');

  console.log(`${ok} Pruefungen bestanden, ${fehler.length} gescheitert`);
  for (const f of fehler) console.log('  ✗ ' + f);
  return fehler.length === 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = process.argv[2];
  if (!arg || arg === '--selbsttest') process.exit(selbsttest() ? 0 : 1);
  const bild = `/tmp/claude-0/seite-${Date.now()}.png`;
  const r = await ansehen(arg, {
    breite: Number(process.argv[3]) || 390,
    hoehe: Number(process.argv[4]) || 844,
    bild,
  });
  console.log(`HTTP ${r.status} · ${r.titel}`);
  console.log(`Screenshot: ${r.bild}`);
  console.log('--- sichtbarer Text (erste 1500 Zeichen) ---');
  console.log(r.text.slice(0, 1500));
}
