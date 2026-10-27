/** Test fuer nachDeutsch — gefaelschter fetch, kein Netz.
 *  Lauf: /opt/node22/bin/node automation/lib/uebersetzen_test.mjs   */
import { nachDeutsch } from './uebersetzen.mjs';
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

console.log(fehler ? `\n${fehler} FEHLER` : '\nalle Tests gruen');
process.exit(fehler?1:0);
