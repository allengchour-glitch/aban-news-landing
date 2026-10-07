// fb_text.mjs — Facebook-Text aus der Instagram-Caption (07.10.2026).
//
// ANLASS (Betreiber 07.10. «fb zu wenig follower»): GEMESSEN Seite «LuxeStyle CH» 7 Follower; 60 Posts in 10 Tagen,
// 0 Reaktionen/Kommentare/Shares. Reels erreichen seit dem 06.10. 206–232 Aufrufe (vorher 0–3) — die Reichweite ist da,
// aber aus 659 Aufrufen wurde kein einziger Follower. Seit dem Meta-Datenzugang-Ende (05.10.) plante metricool_tiktok_post
// IG+FB als EINEN Post mit EINEM Text: Facebook bekam «(Link in Bio)» (auf FB sinnlos — der Link im Text ist klickbar)
// und keinen einzigen Grund zu folgen.
//
// fbText(): wie in meta_reel_post.mjs (dort seit 28.09.) — «(Link in Bio)» raus, Shop-Link klickbar mit UTM.
// mitFolgen(): eine Folge-Zeile vor die Hashtags (FB zeigt neben jedem Reel «Folgen»; ohne Aufforderung tippt niemand).
const FB_UTM = 'utm_source=facebook&utm_medium=social&utm_campaign=autopilot';

export function fbLink(shopUrl, inhalt) {
  const basis = /^https:\/\/(www\.)?luxestyle\.ch\//i.test(shopUrl || '') ? shopUrl : 'https://luxestyle.ch/';
  return `${basis}${basis.includes('?') ? '&' : '?'}${FB_UTM}${inhalt ? `&utm_content=${inhalt}` : ''}`;
}

export function fbText(caption, shopUrl, inhalt) {
  const link = fbLink(shopUrl, inhalt);
  const BIO = /\s*[–—·|-]?\s*\(?\s*link\s+in\s+(?:der\s+)?bio\b(?:\s*\))?/gi;
  const DOM = /(?<![@#\w.\/-])(?:https?:\/\/)?(?:www\.)?luxestyle\.ch(?:\/[^\s)]*)?/i;
  const zeilen = String(caption || '').split('\n');
  let i = zeilen.findIndex(z => /link\s+in\s+(?:der\s+)?bio/i.test(z));
  if (i < 0) i = zeilen.findIndex(z => DOM.test(z) && !/^\s*#/.test(z));
  if (i < 0) {
    const h = zeilen.findIndex(z => /^\s*#\S/.test(z));
    if (h < 0) zeilen.push(`👉 ${link}`); else zeilen.splice(h, 0, `👉 ${link}`, '');
    return zeilen.join('\n');
  }
  const z = zeilen[i].replace(BIO, '');
  zeilen[i] = (DOM.test(z) ? z.replace(DOM, link) : z.trim() ? `${z.trimEnd()} 👉 ${link}` : `👉 ${link}`).trimEnd();
  return zeilen.join('\n');
}

export const FOLGE_ZEILE = '➕ Folge LuxeStyle CH – jeden Tag ein neues Fundstück aus der Schweiz 🇨🇭';

export function mitFolgen(text) {
  if (/folge\s+luxestyle/i.test(text)) return text;
  const zeilen = String(text || '').split('\n');
  const h = zeilen.findIndex(z => /^\s*#\S/.test(z));
  if (h < 0) return `${text.trimEnd()}\n\n${FOLGE_ZEILE}`;
  zeilen.splice(h, 0, FOLGE_ZEILE, '');
  return zeilen.join('\n').replace(/\n{3,}/g, '\n\n');
}

// node automation/lib/fb_text.mjs --test
if (process.argv.includes('--test')) {
  const ig = 'Wusstest du das schon? 👀\n«Handwärmer»\n\nCHF 25.90 · Gratis Versand ab CHF 50\n🔗 luxestyle.ch/products/handwaermer (Link in Bio)\n\n#luxestyle #schweiz';
  const fb = mitFolgen(fbText(ig, 'https://luxestyle.ch/products/handwaermer', 'reel'));
  const t = [
    [!/link in bio/i.test(fb), '«(Link in Bio)» ist weg'],
    [/https:\/\/luxestyle\.ch\/products\/handwaermer\?utm_source=facebook/.test(fb), 'klickbarer Produktlink mit UTM'],
    [fb.indexOf(FOLGE_ZEILE) > -1 && fb.indexOf(FOLGE_ZEILE) < fb.indexOf('#luxestyle'), 'Folge-Zeile vor den Hashtags'],
    [mitFolgen(fb) === fb, 'Folge-Zeile nicht doppelt'],
    [ig.includes('(Link in Bio)'), 'Instagram-Text unverändert'],
  ];
  for (const [ok, n] of t) console.log((ok ? '✓ ' : '✗ ') + n);
  console.log(`${t.filter(x => x[0]).length}/${t.length}`);
  if (process.argv.includes('--zeigen')) console.log('\n' + fb);
  process.exit(t.every(x => x[0]) ? 0 : 1);
}
