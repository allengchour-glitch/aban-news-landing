#!/usr/bin/env node
/* LuxeStyle — gemini_ad_copy.mjs
 * Lässt Gemini die Copy für ein Werbevideo schreiben (Hook + Voiceover + 3 On-Screen-Schritte),
 * zweisprachig (DE+EN), premium & anti-Floskel. Gibt EIN JSON-Objekt nach stdout aus, das der
 * Werbevideo-Workflow weiterverarbeitet. Robust: ohne GEMINI_API_KEY oder bei Fehler kommen
 * sinnvolle Fallback-Texte (gleiche Felder) — nie ein Hard-Fail.
 *
 * Nutzung:   node automation/gemini_ad_copy.mjs <concept>   (concept: print | fashion)
 * ENV:       GEMINI_API_KEY (optional) · GEMINI_MODEL (Default gemini-2.5-flash)
 *
 * Ausgabe-Schema (immer gültiges JSON):
 *   { "hook_de","hook_en","vo_de","vo_en","steps_de":[3],"steps_en":[3] }
 * Hinweis: vo_* sind fürs TTS — URL als „luxestyle punkt c h" ausgeschrieben (klingt natürlich).
 */
const CONCEPT = (process.argv[2] || 'print').toLowerCase();
const KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const BASE = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';

// --- Fallbacks (entsprechen den bisher hart codierten Texten in werbevideo.yml) -----------
const FALLBACK = {
  print: {
    hook_de: 'Dein Design. Dein Teil.',
    hook_en: 'Your design. Your piece.',
    vo_de: 'Dein Design, dein Teil. Bei LuxeStyle gestaltest du dein eigenes T-Shirt, Hoodie, Tasche oder Tasse, mit deinem Spruch, Motiv oder Logo. Waehle dein Produkt, lade dein Design hoch, fertig. On-demand gedruckt, kein Lager, keine Mindestmenge. Jetzt selbst gestalten, auf luxestyle punkt c h.',
    vo_en: 'Your design, your piece. At LuxeStyle you create your own t-shirt, hoodie, bag or mug, with your slogan, artwork or logo. Pick your product, upload your design, done. Printed on demand, no inventory, no minimum. Start designing, at luxestyle dot c h.',
    steps_de: ['1 · Produkt wählen', '2 · Design hochladen', '3 · gedruckt & geliefert'],
    steps_en: ['1 · Pick your product', '2 · Upload your design', '3 · printed & shipped'],
  },
  fashion: {
    hook_de: 'Designer-Look. Fairer Preis.',
    hook_en: 'Designer looks. Fair prices.',
    vo_de: 'Das ist LuxeStyle, dein Schweizer Online-Shop. Premium-Mode, Designer-Looks zu fairen Preisen. Kleider, Taschen und Accessoires fuer deinen Sommer. Gratis Versand ab fuenfundsechzig Franken. Jetzt shoppen, auf luxestyle punkt c h.',
    vo_en: 'This is LuxeStyle, your Swiss online shop. Premium fashion, designer looks at fair prices. Dresses, bags and accessories for your summer. Free shipping over sixty-five francs. Shop now, at luxestyle dot c h.',
    steps_de: ['Schweizer Shop', 'Gratis-Versand ab CHF 50', '-10% mit WELCOME10'],
    steps_en: ['Swiss shop', 'Free shipping over CHF 50', '-10% with WELCOME10'],
  },
};
const fb = FALLBACK[CONCEPT] || FALLBACK.print;

function out(obj) { process.stdout.write(JSON.stringify(obj)); process.exit(0); }

if (!KEY) { process.stderr.write('Kein GEMINI_API_KEY → Fallback-Copy.\n'); out(fb); }

const BRIEF = CONCEPT === 'print'
  ? 'Beworben wird der LuxeStyle-Print-on-Demand-Service: Kund:innen gestalten ihr eigenes T-Shirt, Hoodie, Jutebeutel oder Tasse mit eigenem Spruch/Motiv/Logo. On-demand gedruckt, kein Lager, keine Mindestmenge. Schweizer Shop luxestyle.ch.'
  : 'Beworben wird der LuxeStyle-Fashion-Shop (Schweiz): Premium-Mode, Kleider/Taschen/Accessoires, faire Preise, Gratis-Versand ab CHF 50, Code WELCOME10 = -10%. luxestyle.ch.';

const PROMPT = `Du bist ein preisgekrönter Werbetexter für kurze Social-Video-Ads (TikTok/Reels, 9:16, ~20 Sekunden).
${BRIEF}

Schreibe Werbe-Copy für EIN hochwertiges, „meisterwerk"-artiges Kurzvideo — zweisprachig Deutsch und Englisch.
Anforderungen:
- HOOK: max 5 Wörter, neugierig/begehrlich, KEIN Hype-Geschwurbel, kein Ausrufezeichen-Spam.
- VOICEOVER (vo): EIN fließender Sprechtext, hook-first, ~45–60 Wörter (passt in ~20 s), premium & klar,
  echte Du-Ansprache, am Ende ein ruhiger Call-to-Action. WICHTIG fürs Text-to-Speech: die Webadresse
  IMMER als "luxestyle punkt c h" (DE) bzw. "luxestyle dot c h" (EN) ausschreiben, NIE "luxestyle.ch".
  Keine erfundenen Fakten/Preise außer den oben genannten.
- STEPS: genau 3 sehr kurze On-Screen-Schritte (je max 4 Wörter), die den Ablauf zeigen
  (z. B. Produkt wählen → Design hochladen → fertig). Mit führender Ziffer "1 · ", "2 · ", "3 · ".

Antworte mit NICHTS außer einem einzigen JSON-Objekt (keine Code-Fences, kein Text drumherum) mit den Keys:
{"hook_de","hook_en","vo_de","vo_en","steps_de":["..","..",".."],"steps_en":["..","..",".."]}`;

async function gemini() {
  const url = `${BASE}/models/${MODEL}:generateContent?key=${encodeURIComponent(KEY)}`;
  const body = {
    contents: [{ role: 'user', parts: [{ text: PROMPT }] }],
    generationConfig: { temperature: 0.7, maxOutputTokens: 1200, responseMimeType: 'application/json' },
  };
  const ctrl = AbortSignal.timeout ? AbortSignal.timeout(45000) : undefined;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: ctrl });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + JSON.stringify(j).slice(0, 300));
  const txt = (j?.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('').trim();
  // robust: evtl. Code-Fences/Text drumherum entfernen, erstes { … letztes } nehmen
  const s = txt.indexOf('{'), e = txt.lastIndexOf('}');
  if (s < 0 || e < 0) throw new Error('Keine JSON-Struktur in der Antwort');
  return JSON.parse(txt.slice(s, e + 1));
}

function valid(o) {
  const need = ['hook_de', 'hook_en', 'vo_de', 'vo_en'];
  if (!o || need.some(k => typeof o[k] !== 'string' || !o[k].trim())) return false;
  for (const k of ['steps_de', 'steps_en']) if (!Array.isArray(o[k]) || o[k].length < 3) return false;
  return true;
}

(async () => {
  try {
    const o = await gemini();
    // fehlende Felder mit Fallback füllen, Steps auf 3 kürzen
    const merged = { ...fb, ...o };
    merged.steps_de = (Array.isArray(o.steps_de) ? o.steps_de : fb.steps_de).slice(0, 3);
    merged.steps_en = (Array.isArray(o.steps_en) ? o.steps_en : fb.steps_en).slice(0, 3);
    if (!valid(merged)) throw new Error('Antwort unvollständig');
    process.stderr.write('Gemini-Copy OK.\n');
    out(merged);
  } catch (err) {
    process.stderr.write('Gemini-Fehler → Fallback: ' + err.message + '\n');
    out(fb);
  }
})();
