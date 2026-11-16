// Vergleicht die Liquid-Ausgabe Vorstand gegen neu fuer alle zugeordneten Sammlungen (LiquidJS, Harness render.mjs).
// Erwartung: ausser s01-Seiten unterscheidet sich nur die Schimmer-Keyframe-Zeile und das Skript (aus(), Listener).
import path from 'node:path'; import fs from 'node:fs';
const B = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
process.env.THEME_DIR = path.join(B, 'pruef1611b', 'theme_vor'); const alt = await import(path.join(B, 'harness', 'render.mjs') + '?vor');
process.env.THEME_DIR = path.join(B, 'theme'); const neu = await import(path.join(B, 'harness', 'render.mjs') + '?neu');
const H = ['schmuck', 'sub-armbaender', 'gliederarmbaender', 'zirkonia-strassarmbaender', 'sub-beleuchtung', 'nachtlichter-ambiente', 'wohnen-dekoration', 'weihnachten-2026', 'damen-reisetaschen', 'herren-reisetaschen', 'sub-reise', 'geschirr-tisch', 'kaffee-tee-trinken', 'damen-mode', 'premium-geschenke', 'kueche-kochen'];
const zeilen = (s) => s.split('\n');
let fehl = 0; const prot = [];
for (const h of H) {
  for (const opt of [{}, { ausverkauft: true }]) {
    const a = await alt.rendern(h, opt), n = await neu.rendern(h, opt);
    const za = zeilen(a.vor + '\n§§\n' + a.nach), zn = zeilen(n.vor + '\n§§\n' + n.nach);
    const nurA = za.filter((z) => !zn.includes(z)), nurN = zn.filter((z) => !za.includes(z));
    const clip = (n.nach.match(/data-lx-kb="(s\d\d)"/) || [, '-'])[1];
    const erlaubtN = (z) => /^@keyframes lxkb-schein\{50%\{opacity:1\}to\{opacity:0\}\}$/.test(z) || /^function aus\(\)/.test(z) || /^if\(clip&&w\.matchMedia\)/.test(z) || (clip === 's01' && /^\.lx-kk\{--lxkb-w:clamp\(320px,30vw,360px\)\}$/.test(z)) || (clip === 's01' && /^<template class="lx-kb-vorlage">/.test(z));
    const erlaubtA = (z) => /^@keyframes lxkb-schein\{to\{opacity:1\}\}$/.test(z) || /^function aus\(\)/.test(z) || /^if\(clip&&w\.matchMedia\)/.test(z) || (clip === 's01' && /^<template class="lx-kb-vorlage">/.test(z));
    const ok = nurN.every(erlaubtN) && nurA.every(erlaubtA) && (clip !== 's01' || nurN.some((z) => /360px\)\}$/.test(z)));
    const s01pos = clip === 's01' ? (n.nach.match(/--lxkb-pos:([^;]+);/) || [])[1] : null;
    prot.push(`${ok ? 'OK    ' : 'FEHLER'} ${h}${opt.ausverkauft ? ' (ausverkauft)' : ''} Clip ${clip}: ${nurA.length} Zeilen nur alt, ${nurN.length} nur neu${s01pos ? ', s01-Ausschnitt ' + s01pos : ''}` + (ok ? '' : '\n  ALT: ' + JSON.stringify(nurA.map((z) => z.slice(0, 120))) + '\n  NEU: ' + JSON.stringify(nurN.map((z) => z.slice(0, 120)))));
    if (!ok) fehl++;
    if (opt.ausverkauft && /360px/.test(n.vor)) { prot.push(`FEHLER ${h} ausverkauft: 360px-Regel trotz fail closed`); fehl++; }
  }
}
console.log(prot.join('\n')); console.log(`\n${prot.length - fehl} OK, ${fehl} FEHLER`); process.exit(fehl ? 1 : 0);
