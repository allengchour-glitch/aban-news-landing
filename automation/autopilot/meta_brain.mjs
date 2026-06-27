#!/usr/bin/env node
/* 🧠🧠 meta_brain.mjs — Das Meta-Gehirn: verbindet die 2 Gehirne + verbessert sich selbst
 *
 * Liest beide „Gehirne" + die echten Ergebnisse und gibt EINE Selbstverbesserungs-Direktive aus:
 *   1) Wissens-Hirn   → automation/SECOND-BRAIN.md   (gelernte Trends/Hooks/Hashtags)
 *   2) Seiten/Shop-Hirn → automation/brain-state.json (Seiten-Health-Score) + autopilot/SHOP-PULSE.md
 *                         + autopilot/CONVERSION-RADAR.md (echte Bestellungen/Umsatz/Conversion-Lecks)
 * Es BENOTET sich selbst (Composite 0–100), vergleicht mit dem letzten Lauf (↑/↓ = Selbst-Verbesserung
 * sichtbar), leitet die 3 wichtigsten Maßnahmen ab und führt einen Evolutions-Log.
 *
 * Reines Node, kein API. No-op-safe. Output: automation/autopilot/META-BRAIN.md (+ optional Telegram).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const AP = path.join(ROOT, 'automation', 'autopilot');
const OUT = path.join(AP, 'META-BRAIN.md');
const read = p => { try { return fs.readFileSync(p, 'utf8'); } catch { return ''; } };
const clamp = n => Math.max(0, Math.min(100, Math.round(n)));

// --- Gehirn 1: Wissen ---
const brain = read(path.join(ROOT, 'automation', 'SECOND-BRAIN.md'));
const hashCount = (brain.match(/## [^\n]*Konsens-Hashtags[\s\S]*?(?=\n## |$)/)?.[0].match(/- #/g) || []).length;
const topTags = (brain.match(/## [^\n]*Konsens-Hashtags[^\n]*\n((?:- [^\n]*\n){1,5})/)?.[1] || '')
  .split('\n').map(l => (l.match(/#[A-Za-z0-9äöü]+/) || [''])[0]).filter(Boolean).join(' ');
const knowledgeScore = clamp(hashCount * 2);

// --- Gehirn 2: Seite/Shop ---
let siteScore = null;
try { const bs = JSON.parse(read(path.join(ROOT, 'automation', 'brain-state.json'))); siteScore = bs.score ?? bs.last?.score ?? null; } catch {}
const pulse = read(path.join(AP, 'SHOP-PULSE.md'));
const orders30 = parseInt((pulse.match(/Bestellungen:[^\n]*·\s*(\d+)\s*\(30T\)/) || [, '0'])[1], 10) || 0;
const rev30 = parseFloat((pulse.match(/Umsatz:[^\n]*·\s*([\d'.,]+)\s*\(30T\)/) || [, '0'])[1].replace(/[^\d.]/g, '')) || 0;
const radar = read(path.join(AP, 'CONVERSION-RADAR.md'));
const noReviews = parseInt((radar.match(/OHNE Reviews\/Sterne\*\*?\s*\|?\s*\*?\*?(\d+)/) || [, ''])[1] || '', 10);

// --- Ergebnis-Score (echte Käufe zählen am meisten; eigene Testkäufe nicht mitgemeint) ---
const resultScore = orders30 >= 5 ? 80 : orders30 >= 1 ? 45 : 10;
const siteS = siteScore == null ? 50 : siteScore;
const meta = clamp((knowledgeScore + siteS + resultScore) / 3);

// --- Selbst-Verbesserung: Grade-Verlauf aus altem META-BRAIN lesen ---
const prev = read(OUT);
const prevGrade = parseInt((prev.match(/<!--GRADE:(\d+)-->/) || [, ''])[1] || '', 10);
const trend = isNaN(prevGrade) ? '–' : (meta > prevGrade ? `↑ +${meta - prevGrade}` : meta < prevGrade ? `↓ ${meta - prevGrade}` : '→ ±0');
const today = new Date().toISOString().slice(0, 10);
let logPrev = (prev.match(/<!--LOG-->([\s\S]*?)<!--\/LOG-->/) || [, ''])[1].trim();
const logLine = `- ${today}: Meta ${meta}/100 (${trend}) · Wissen ${knowledgeScore} · Seite ${siteS} · Ergebnis ${resultScore} (${orders30} Best./30T)`;
const log = [logLine, ...logPrev.split('\n').filter(Boolean)].slice(0, 30).join('\n');

// --- Direktiven (datengetrieben, ehrlich) ---
const todo = [];
if (resultScore <= 10) todo.push('🎯 **Ergebnis = 0 echte Käufe** → einziger echter Hebel sind die 3 Klicks (TikTok-Pixel · Conversion-Kampagne 20 CHF/Tag · AGB-Domain) + Pinterest-Access. Bots/Content allein bringen KEINE Käufe — Traffic-QUALITÄT ist der Engpass.');
if (siteScore != null && siteScore < 100) todo.push(`🩹 Seiten-Hirn meldet Score ${siteScore} → offene Befunde aus Branch \`brain/auto\` prüfen/mergen.`);
if (knowledgeScore >= 20 && topTags) todo.push(`🧠 Wissens-Hirn reif → Top-Hooks/Hashtags in Reels/Captions nutzen: ${topTags}`);
if (!isNaN(noReviews) && noReviews > 50) todo.push(`⭐ ${noReviews} Produkte ohne Sterne → organische Reviews (Judge.me-Auto-Mails nach Käufen); kein Gratis-Bulk-Weg.`);
if (knowledgeScore < 20) todo.push('📈 Wissens-Hirn noch jung → Lerner weiter sammeln lassen (Daten vor Aktion).');

const md = `# 🧠🧠 META-BRAIN — Selbstverbessernde Steuerzentrale ${today}
<!--GRADE:${meta}-->

**Composite-Selbstnote: ${meta}/100  (${trend} ggü. letztem Lauf)**

| Gehirn | Score | Quelle |
|---|---|---|
| 🧠 Wissen (Trends/Hooks) | ${knowledgeScore}/100 | SECOND-BRAIN.md (${hashCount} Konsens-Hashtags) |
| 🩺 Seite/Shop | ${siteS}/100 | brain-state.json |
| 💰 Ergebnis (echte Käufe) | ${resultScore}/100 | Shop-Puls (${orders30} Best., ${rev30} CHF /30T) |

## 🎯 Die wichtigsten Maßnahmen (datengetrieben)
${todo.map((t, i) => `${i + 1}. ${t}`).join('\n') || '- (keine offenen Hinweise — System stabil)'}

## 🔝 Aktuell beste Hooks/Hashtags (aus dem Wissens-Hirn)
${topTags || '_noch zu wenig Daten_'}

## 🧬 Evolutions-Log (so verbessert sich das Meta-Brain selbst)
<!--LOG-->
${log}
<!--/LOG-->

> Verbindet beide Gehirne + echte Ergebnisse → eine Direktive. Selbst-Verbesserung = die Composite-Note steigt,
> wenn Wissen wächst, Seite gesund bleibt und (entscheidend) echte Käufe kommen. NUR Info/Steuerung — keine Posts/Imports.
`;
fs.writeFileSync(OUT, md);
console.log(`✅ META-BRAIN.md: Note ${meta}/100 (${trend}) · Wissen ${knowledgeScore} · Seite ${siteS} · Ergebnis ${resultScore}.`);
todo.forEach(t => console.log('   • ' + t.replace(/\*\*/g, '')));

const TT = process.env.TELEGRAM_BOT_TOKEN, CH = process.env.TELEGRAM_CHAT_ID;
if (TT && CH) {
  const msg = `🧠 Meta-Brain ${today}: Note ${meta}/100 (${trend})\nWissen ${knowledgeScore} · Seite ${siteS} · Ergebnis ${resultScore} (${orders30} Käufe/30T)\nTop: ${todo[0] ? todo[0].replace(/\*\*/g, '').slice(0, 160) : '—'}`;
  try { await fetch(`https://api.telegram.org/bot${TT}/sendMessage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chat_id: CH, text: msg, disable_web_page_preview: true }) }); console.log('✅ Telegram gesendet.'); } catch {}
}
