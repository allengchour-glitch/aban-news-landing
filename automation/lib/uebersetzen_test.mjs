/** Test fuer nachDeutsch — gefaelschter fetch, kein Netz.
 *  Lauf: /opt/node22/bin/node automation/lib/uebersetzen_test.mjs   */
import { nachDeutsch, gleicheGrossschreibung } from './uebersetzen.mjs';
let fehler = 0;
const pruef = (n, ok, extra='') => { if(!ok){ fehler++; console.log(`FAIL ${n} ${extra}`); } else console.log(`ok   ${n}`); };
const EIN = ['Very good quality','产品很好','Bien emballé'];
const DE  = ['Sehr gute Qualität','Produkt top','Gut verpackt'];
const ant = (status, body) => ({ status, ok: status>=200&&status<300, text: async () => typeof body==='string'?body:JSON.stringify(body) });
const gem = (arr) => ({ candidates:[{ content:{ parts:[{ text: JSON.stringify(arr) }] } }] });
const grq = (arr) => ({ choices:[{ message:{ content: '```json\n'+JSON.stringify(arr)+'\n```' } }] });

// 1. Gemini geht → Gemini-Weg, Groq wird nicht gefragt
{ let groqGefragt=false;
  const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'q', fetch: async (u) => {
    if(String(u).includes('groq')){ groqGefragt=true; return ant(200, grq(DE)); } return ant(200, gem(DE)); } });
  pruef('Gemini liefert', r.weg==='gemini' && JSON.stringify(r.texte)===JSON.stringify(DE), JSON.stringify(r));
  pruef('Groq nicht gefragt, wenn Gemini geht', groqGefragt===false); }

// 2. Gemini 402 (der echte Fall) → Groq uebernimmt
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'q', fetch: async (u) =>
    String(u).includes('groq') ? ant(200, grq(DE)) : ant(402, { error:{ message:'Your prepayment credits are depleted' } }) });
  pruef('Gemini 402 → Groq', r.weg==='groq' && JSON.stringify(r.texte)===JSON.stringify(DE), JSON.stringify(r)); }

// 3. Groq-Modell 404 → naechstes Modell
{ let n=0;
  const r = await nachDeutsch(EIN, { geminiKey:'', groqKey:'q', fetch: async () => (++n===1 ? ant(404,{error:{message:'does not exist'}}) : ant(200, grq(DE))) });
  pruef('404 beim 1. Modell → 2. Modell', r.weg==='groq' && n===2, JSON.stringify(r)); }

// 4. GEGENPROBE: beides kaputt → ORIGINALE zurueck, nichts erfunden
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'q', fetch: async () => ant(500,'kaputt') });
  pruef('alles kaputt → Originale', r.weg==='original' && JSON.stringify(r.texte)===JSON.stringify(EIN), JSON.stringify(r));
  pruef('alles kaputt → Grund genannt', !!r.grund && /500/.test(r.grund), String(r.grund)); }

// 5. GEGENPROBE: falsche Anzahl Antworten wird VERWORFEN (sonst landen Texte am falschen Produkt)
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem(['nur eins'])) });
  pruef('falsche Anzahl → Originale', r.weg==='original' && JSON.stringify(r.texte)===JSON.stringify(EIN), JSON.stringify(r)); }

// 6. Leere Einzelantwort faellt auf das Original zurueck, der Rest bleibt uebersetzt
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem(['Sehr gut','','Gut verpackt'])) });
  pruef('leerer Eintrag → Original an der Stelle', r.texte[1]===EIN[1] && r.texte[0]==='Sehr gut', JSON.stringify(r.texte)); }

// 7. Kein Schluessel → Originale, keine Netzanfrage
{ let gefragt=false;
  const r = await nachDeutsch(EIN, { geminiKey:'', groqKey:'', fetch: async () => { gefragt=true; return ant(200, gem(DE)); } });
  pruef('ohne Schluessel → Originale, kein Netz', r.weg==='original' && !gefragt); }

// 8. Leere Eingabe
{ const r = await nachDeutsch([], { geminiKey:'g', groqKey:'q', fetch: async () => ant(200, gem([])) });
  pruef('leere Eingabe', r.weg==='original' && r.texte.length===0); }


// 7. Mehrere Groq-Schluessel: ist der erste erschoepft (429), fragt der zweite; Gemini bleibt zuerst
{ const gefragt=[]; process.env.GROQ_API_KEY='k1'; process.env.GROQ_API_KEY2='k2'; process.env.GROQ_API_KEY3='';
  const r = await nachDeutsch(EIN, { geminiKey:'', fetch: async (u, o) => { const k=String(o?.headers?.Authorization||'').replace('Bearer ',''); gefragt.push(k);
    return k==='k1' ? ant(429, { error:{ message:'rate limit' } }) : ant(200, grq(DE)); } });
  pruef('1. Groq-Schluessel erschoepft → 2. Schluessel', r.weg==='groq' && JSON.stringify(r.texte)===JSON.stringify(DE), JSON.stringify(r));
  pruef('Reihenfolge: k1 (zwei Modelle) dann k2', gefragt.join(',')==='k1,k1,k2', gefragt.join(','));
  pruef('leerer dritter Schluessel wird nie gefragt', !gefragt.includes(''));
  // alle erschoepft → Originale, Grund nennt jeden Schluessel
  const r2 = await nachDeutsch(EIN, { geminiKey:'', fetch: async () => ant(429, { error:{ message:'rate limit' } }) });
  pruef('alle Schluessel erschoepft → Originale', r2.weg==='original' && JSON.stringify(r2.texte)===JSON.stringify(EIN), JSON.stringify(r2));
  // opt.groqKey gewinnt gegen die Umgebung (bestehendes Verhalten)
  const gefragt3=[]; await nachDeutsch(EIN, { geminiKey:'', groqKey:'nur', fetch: async (u, o) => { gefragt3.push(String(o?.headers?.Authorization)); return ant(200, grq(DE)); } });
  pruef('opt.groqKey ersetzt die Umgebungsschluessel', gefragt3.length===1 && gefragt3[0]==='Bearer nur', gefragt3.join('|'));
  delete process.env.GROQ_API_KEY; delete process.env.GROQ_API_KEY2; delete process.env.GROQ_API_KEY3; }

// 7b. Vierter Groq-Schluessel (27.10.2026: GROQ_API_KEY4 gesetzt): sind die ersten drei erschoepft, antwortet der vierte
{ const gefragt=[]; process.env.GROQ_API_KEY='k1'; process.env.GROQ_API_KEY2='k2'; process.env.GROQ_API_KEY3='k3'; process.env.GROQ_API_KEY4='k4';
  const r = await nachDeutsch(EIN, { geminiKey:'', fetch: async (u, o) => { const k=String(o?.headers?.Authorization||'').replace('Bearer ',''); gefragt.push(k);
    return k==='k4' ? ant(200, grq(DE)) : ant(429, { error:{ message:'rate limit' } }); } });
  pruef('drei Schluessel erschoepft → 4. Schluessel antwortet', r.weg==='groq' && JSON.stringify(r.texte)===JSON.stringify(DE), JSON.stringify(r));
  pruef('alle vier Schluessel werden der Reihe nach gefragt', gefragt.filter((k,i)=>i===0||k!==gefragt[i-1]).join(',')==='k1,k2,k3,k4', gefragt.join(','));
  delete process.env.GROQ_API_KEY; delete process.env.GROQ_API_KEY2; delete process.env.GROQ_API_KEY3; delete process.env.GROQ_API_KEY4; }

// 9. Grossschreibung des Originals bleibt erhalten (kleines Groq-Modell liefert «purpurrot»)
pruef('klein → gross: Purplish Red / purpurrot', gleicheGrossschreibung('Purplish Red','purpurrot')==='Purpurrot');
pruef('schon gross bleibt', gleicheGrossschreibung('Purplish Red','Purpurrot')==='Purpurrot');
pruef('Original klein bleibt klein (Masse, Einheiten)', gleicheGrossschreibung('15 pieces','15 stück')==='15 stück');
pruef('Ziffer vorn: erster BUCHSTABE wird gross', gleicheGrossschreibung('3 Layers','3 lagen')==='3 Lagen');
pruef('Umlaut: ärmellos', gleicheGrossschreibung('Sleeveless','ärmellos')==='Ärmellos');
pruef('leer/ohne Buchstaben unverändert', gleicheGrossschreibung('Red','')==='' && gleicheGrossschreibung('Red','123')==='123');

// ── Funde der Prüfung vom 28.10.2026 ──────────────────────────────────────────────────────────────
// Namespace-Import: gegen das ORIGINAL (ohne wirktDeutsch/fehlt) wird jede Prüfung einzeln rot, statt dass das Skript am Import stirbt.
import * as ue from './uebersetzen.mjs';
const sicher = (fn) => { try { return fn(); } catch (e) { return `FEHLER: ${e.message}`; } };

// Fund 10: der Typ der Antwort wird geprüft. Ein Objekt wurde zu «[object Object]», eine Zahl zu «5» — und ging live.
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem([{ text:'Sehr gut' }, { text:'Top' }, { text:'Gut' }])) });
  pruef('F10 Objekte statt Texte → verworfen, Originale', r.weg==='original' && JSON.stringify(r.texte)===JSON.stringify(EIN), JSON.stringify(r));
  pruef('F10 kein «[object Object]» im Ergebnis', !r.texte.some(t => /object/i.test(t)), JSON.stringify(r.texte)); }
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem(['Sehr gut', 5, 'Gut verpackt'])) });
  pruef('F10 Zahl im Array → ganze Antwort verworfen', r.weg==='original' && r.texte[1]===EIN[1], JSON.stringify(r)); }
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem(['Sehr gut', null, 'Gut verpackt'])) });
  pruef('F10 null im Array → ganze Antwort verworfen', r.weg==='original', JSON.stringify(r)); }
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem(['Sehr gut', ['x'], 'Gut verpackt'])) });
  pruef('F10 verschachteltes Array → verworfen', r.weg==='original', JSON.stringify(r)); }
// Rückfall: Gemini liefert Unbrauchbares, Groq liefert Texte → Groq gilt
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'q', fetch: async (u) => String(u).includes('groq') ? ant(200, grq(DE)) : ant(200, gem([1, 2, 3])) });
  pruef('F10 Gemini-Zahlen → Rückfall auf Groq', r.weg==='groq' && JSON.stringify(r.texte)===JSON.stringify(DE), JSON.stringify(r)); }
// Groq: das erste Modell liefert Objekte, das zweite Texte → zweites Modell
{ let n=0;
  const r = await nachDeutsch(EIN, { geminiKey:'', groqKey:'q', fetch: async () => (++n===1 ? ant(200, grq([{a:1},{a:2},{a:3}])) : ant(200, grq(DE))) });
  pruef('F10 Groq-Modell 1 liefert Objekte → Modell 2', r.weg==='groq' && n===2 && JSON.stringify(r.texte)===JSON.stringify(DE), `${n} ${JSON.stringify(r)}`); }
// Gegenprobe: lauter Texte gelten unverändert
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem(DE)) });
  pruef('F10 Gegenprobe: lauter Texte → angenommen', r.weg==='gemini' && JSON.stringify(r.texte)===JSON.stringify(DE)); }

// Fund 2/10: `fehlt` nennt die Stellen ohne Übersetzung
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'', fetch: async () => ant(200, gem(['Sehr gut','  ','Gut verpackt'])) });
  pruef('fehlt: leerer Eintrag steht in fehlt, Rest übersetzt', JSON.stringify(r.fehlt)==='[1]' && r.texte[0]==='Sehr gut' && r.texte[1]===EIN[1], JSON.stringify(r)); }
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'q', fetch: async () => ant(200, grq(DE)) });
  pruef('fehlt: voll übersetzt → leer', r.weg==='groq' && JSON.stringify(r.fehlt)==='[]', JSON.stringify(r)); }
{ const r = await nachDeutsch(EIN, { geminiKey:'g', groqKey:'q', fetch: async () => ant(500, 'kaputt') });
  pruef('fehlt: Totalausfall → alle Stellen', r.weg==='original' && JSON.stringify(r.fehlt)==='[0,1,2]', JSON.stringify(r)); }
{ const r = await nachDeutsch(EIN, { geminiKey:'', groqKey:'', fetch: async () => ant(200, gem(DE)) });
  pruef('fehlt: ohne Schlüssel → alle Stellen', JSON.stringify(r.fehlt)==='[0,1,2]', JSON.stringify(r)); }
{ const r = await nachDeutsch([], { geminiKey:'g', groqKey:'q', fetch: async () => ant(200, gem([])) });
  pruef('fehlt: leere Eingabe → leer', JSON.stringify(r.fehlt)==='[]', JSON.stringify(r)); }

// Fund 2: wirktDeutsch ist VORSICHTIG — im Zweifel «nein»
const deu = (t) => sicher(() => ue.wirktDeutsch(t));
pruef('wirktDeutsch: deutscher Satz', deu('Sehr gute Qualität und schnell geliefert, ich bin zufrieden') === true);
pruef('wirktDeutsch: deutscher Satz 2', deu('Das Produkt ist sehr schön und die Qualität passt') === true);
pruef('wirktDeutsch: Englisch → nein', deu('Great quality, fast delivery, will buy again') === false);
pruef('wirktDeutsch: Chinesisch → nein', deu('质量很好，物流很快，推荐购买') === false);
pruef('wirktDeutsch: Japanisch → nein', deu('ありがとう') === false);
pruef('wirktDeutsch: Koreanisch → nein', deu('좋아요 아주') === false);
pruef('wirktDeutsch: Französisch → nein', deu('Bien emballé et rapide') === false);
pruef('wirktDeutsch: ein einzelnes deutsches Wort reicht nicht', deu('Danke') === false);
pruef('wirktDeutsch: leer/undefined → nein', deu('') === false && deu(undefined) === false && deu(null) === false);
pruef('wirktDeutsch: Mischtext mit mehr Englisch → nein', deu('Sehr gut, aber the quality is great and nice') === false);
pruef('wirktDeutsch: deutsch mit einem chinesischen Zeichen → nein', deu('Sehr gut und schnell 好') === false);
pruef('wirktDeutsch: Gross-/Kleinschreibung egal', deu('SEHR GUT UND SCHNELL') === true);
// Randstellen (Prüfung 2): Gleichstand, Kana/Hangul als Schriftart-Sperre (nicht nur das Han-Zeichen), Hangul neben deutschen Wörtern
pruef('wirktDeutsch: Gleichstand deutsch/englisch (2:2) → nein', deu('Sehr gut, very good') === false);
pruef('wirktDeutsch: Gleichstand 4:4 → nein', deu('Sehr gut und schnell, very good and fast') === false);
pruef('wirktDeutsch: deutsch mit Kana → nein', deu('Sehr gut und schnell ありがとう') === false);
pruef('wirktDeutsch: deutsch mit Hangul → nein', deu('Sehr gut und schnell 좋아요') === false);
pruef('wirktDeutsch: deutsch mit Katakana → nein', deu('Sehr gut und schnell ありがとうカタカナ') === false);
pruef('wirktDeutsch: mehr Deutsch als Englisch (4:2) → ja', deu('Sehr gut und schnell, very good') === true);

// ════════════════════════════════════════════════════════════════════════════════════════════════
// ZUSAMMENFASSUNG (Stand 28.10.2026)
//   Fund 10 (Typ der Antwort): 8 Prüfungen «F10 …» — Objekt (2), Zahl, null, verschachtelt, Rückfall Gemini→Groq, Groq-Modell 1→2, Gegenprobe.
//   Fund 2 (fehlt/wirktDeutsch): 5 Prüfungen «fehlt: …» und 12 Prüfungen «wirktDeutsch: …» (deutsch, Englisch, CJK, Mischtext, Einzelwort).
//   Prüfung 2 (K4): 6 weitere «wirktDeutsch: …» (Gleichstand 2:2 und 4:4, Kana, Hangul, Katakana, klare Mehrheit).
//   Alle 23 bisherigen Prüfungen bleiben unverändert; leere Einzelantwort bleibt wie bisher «Original an der Stelle» (Prüfung 6),
//   nur Nicht-Texte verwerfen die ganze Antwort.
//   GEMESSEN gegen das Original (mit dieser Testdatei): 48 Prüfungen, 24 ROT (7 «F10», 5 «fehlt», 12 «wirktDeutsch»), 24 grün (23 alte + F10-Gegenprobe).
//   Mutationsprobe: /tmp/cm/cjrev_mut/mutprobe.mjs (M8 = Typprüfung entfernt) wird hier erkannt.
// ════════════════════════════════════════════════════════════════════════════════════════════════

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler?1:0);
