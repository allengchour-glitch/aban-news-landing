// reel_titel.mjs — Titelzeilen der Reels (14.10.2026). EINE Quelle für den Reel-Motor (cj_video_reel_engine.mjs) und
// automation/reel/reel_neu_rendern.py. Vorher kopierte reel_neu_rendern die Funktionen per Regex aus dem Motor; seit zeilen()
// am 13.10. PRAEP braucht, scheiterte jede Preis-/Tor-Reparatur mit «ReferenceError: PRAEP is not defined» (14.10. 00:10).
// Hier NUR reine Funktionen ohne Datei-/Netz-Zugriff.
export const PRAEP = /^(mit|für|fuer|fürs|aus|zum|zur|zu|in|im|ins|ohne|und|&|\+|von|vom|gegen|bei|beim|als|auf|an|am|ans|unter|über|ueber|nach|je|pro|per|inkl\.?|inklusive|oder|\/|–|—|-)$/i;

export function kurzTitel(title) {
  let t = title.replace(/\s*[·•|]\s*.*$/, '').replace(/\s+[–—-]\s+.*$/, '').replace(/:.*$/, '').trim();
  if (t.length < 12) t = title.trim();
  return t;
}

// 13.10.2026 (R9 Schritt 3, GEMESSEN): ein Einzelwort über 26 Zeichen liess Zeile 1 leer und kürzte Zeile 2 mit «…»
// (Log: «Titel:  / Multifunktions-Haarklammern-…»; die Jury nennt «abgeschnitten» 11-mal). Jetzt: Umbruch an der Wortgrenze,
// ein überlanges Wort am Bindestrich getrennt, Zeile 1 nie leer, nie «…» — passt der Rest nicht, endet Zeile 2 am letzten
// ganzen Wort.
export function zeilen(title) {
  const t = kurzTitel(title); const rest = title.slice(title.indexOf(t) + t.length).replace(/^\s*[·•|:–—-]\s*/, '').trim();
  const teile = [];                                                   // {s, neu}: neu = beginnt ein neues Wort
  for (const x of t.split(/\s+/).filter(Boolean)) {
    if (x.length <= 26 || !x.includes('-')) { teile.push({ s: x, neu: true }); continue; }
    const st = x.split('-'); st.forEach((p, i) => teile.push({ s: p + (i < st.length - 1 ? '-' : ''), neu: i === 0 }));
  }
  const dazu = (z, tl) => z ? z + (tl.neu ? ' ' : '') + tl.s : tl.s;
  let a = '', b = '', i = 0;
  for (; i < teile.length; i++) { const n = dazu(a, teile[i]); if (n.length <= 26 || !a) a = n; else break; }   // Zeile 1 nie leer
  let bTeile = [];
  for (; i < teile.length; i++) { const n = dazu(b, teile[i]); if (n.length <= 30) { b = n; bTeile.push(teile[i]); } else { bTeile.push(null); break; } }
  if (bTeile.includes(null)) {                                        // Rest passt nicht: am letzten GANZEN Wort enden
    bTeile = bTeile.filter(Boolean);
    let k = bTeile.length; while (k > 0 && /-$/.test(bTeile[k - 1].s)) k--;
    bTeile = bTeile.slice(0, k); b = bTeile.reduce((z, tl) => dazu(z, tl), '');
  }
  if (!b && rest && rest.length <= 30) b = rest;
  // Zeilenende ohne Satzzeichen und ohne hängende Präposition («Brusttasche mit»); der Trennstrich am Wortbruch bleibt
  const sauber = z => { let x = z.replace(/[\s,;:–—]+$/, '').replace(/\s+-$/, '').trim(); let w = x.split(' ');
    while (w.length > 1 && PRAEP.test(w[w.length - 1])) w.pop(); return w.join(' ').replace(/[\s,;:–—]+$/, ''); };
  // hängt an Zeile 1 eine Präposition («Heizjacke mit»), wandert sie an den Anfang von Zeile 2, wenn dort Platz ist
  const wa = a.trim().split(' ');
  // 13.10.2026 (R3-Kontaktbogen Samtkleid): passte «mit» + Zeile 2 nicht in 30 Zeichen, fiel die Präposition weg
  // («Samtkleid / Glockenärmeln und Stickerei»). Jetzt kürzt Zeile 2 am Wortende, bis die Präposition mitpasst
  // («Samtkleid / mit Glockenärmeln»); geht es auch so nicht, bleibt es beim alten Weg.
  // Ende nur auf einem Nomen (Grossbuchstabe, kein «-»-Bruchstück): sonst «aus Nylon mit wasserdichtem». «und/oder» wandern nicht.
  const nomenEnde = w => { const x = String(w || '').replace(/,$/, ''); return /^[A-ZÄÖÜ]/.test(x) && !/-$/.test(x) && !PRAEP.test(x); };
  if (b && wa.length > 1 && PRAEP.test(wa[wa.length - 1]) && (wa[wa.length - 1] + ' ' + b).length <= 30) { b = wa.pop() + ' ' + b; a = wa.join(' '); }
  else if (b && wa.length > 1 && PRAEP.test(wa[wa.length - 1]) && !/^(und|oder|&|\+|\/|–|—|-)$/i.test(wa[wa.length - 1])) {
    const p = wa[wa.length - 1]; let bw = b.split(' ');
    while (bw.length > 1 && (`${p} ${bw.join(' ')}`.length > 30 || !nomenEnde(bw[bw.length - 1]))) bw.pop();
    const neu = `${p} ${bw.join(' ')}`.replace(/,$/, '');
    if (neu.length <= 30 && nomenEnde(bw[bw.length - 1])) { wa.pop(); b = neu; a = wa.join(' '); }
  }
  a = sauber(a); b = sauber(b);
  if (!b && /-$/.test(a)) a = a.replace(/-[^-\s]*-$/, '').replace(/-$/, '');      // nichts folgt → kein hängender Trennstrich
  return [a, b];
}
