#!/usr/bin/env node
/**
 * ig-dm-reply.mjs — Instagram-DM-Auto-Antwort (Messaging API).
 * Liest Konversationen, antwortet auf NEUE eingehende Nachrichten (letzte Nachricht vom Kunden,
 * <24h, noch nicht beantwortet) — herzlich, mit Themen-Erkennung. State: social/replied-dms.json.
 * DRY_RUN=1 (Default sinnvoll für Test): liest nur + meldet, OB der Token Messaging-Zugriff hat.
 *
 * ENV: IG_USER_ID + IG_ACCESS_TOKEN (oder FB_PAGE_ACCESS_TOKEN/META_ACCESS_TOKEN).
 * Scope nötig: instagram_manage_messages (+ pages_messaging). Fehlt er → API meldet es, No-op.
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const V = process.env.META_GRAPH_VERSION || 'v21.0';
const IG_ID = process.env.IG_USER_ID || '';
const TOK = process.env.FB_PAGE_ACCESS_TOKEN || process.env.IG_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN || '';
const DRY = process.env.DRY_RUN === '1';
const MAXR = Math.max(1, parseInt(process.env.MAX_REPLIES || '10',10)||10);
if (!IG_ID || !TOK) { console.log('Kein IG-Token → No-op.'); process.exit(0); }

const ROOT = path.dirname(path.dirname(fileURLToPath(new URL(import.meta.url))));
const STATE = path.join(ROOT,'social','replied-dms.json');
const loadState=()=>{try{return new Set(JSON.parse(fs.readFileSync(STATE,'utf8')))}catch{return new Set()}};
const saveState=s=>{try{fs.mkdirSync(path.dirname(STATE),{recursive:true});fs.writeFileSync(STATE,JSON.stringify([...s].slice(-2000)))}catch(e){console.error(e.message)}};

// Themen-Erkennung (Reihenfolge = Priorität). Ehrliche Angaben: gratis ab CHF 65, 30 Tage Rückgabe, weltweiter Versand 8–14 Tage.
const TOPIC=[
  ['retoure',/rückgabe|ruckgabe|retoure|umtausch|zurückschick|zuruckschick|garantie|reklamation|defekt|kaputt/i],
  ['bestellung',/bestellnummer|tracking|sendungs|wo ist mein|wo bleibt|status.*bestell|order|nicht erhalten|noch nicht.*ange/i],
  ['versand',/versand|liefer|wann.*komm|wie lange|paket|shipping|dauert/i],
  ['groesse',/grösse|groesse|size|passt|masse|maße|gross genug|fällt.*aus/i],
  ['design',/selbst.*gestalt|eigenes design|eigenes.*motiv|gestalten|bedruck|drucken|print|individuell/i],
  ['preis',/preis|kostet|wie teuer|chf|rabatt|code|gutschein|zahlung|twint|bezahl/i],
  ['verfueg',/verfügbar|verfugbar|lager|ausverkauft|wieder.*da|noch da|vorrätig|vorratig/i],
  ['danke',/danke|merci|vielen dank|mega|liebe.*es|❤|🤍|😍/i],
];
const REPLIES={
  retoure:'Kein Stress 🤍 Du hast 30 Tage Rückgaberecht. Schreib uns einfach deine Bestellnummer, wir helfen dir sofort weiter ✨',
  bestellung:'Hey! 📦 Gib uns kurz deine Bestellnummer durch, dann checken wir den Status. Versand weltweit dauert i. d. R. 8–14 Tage 🤍',
  versand:'Hey! 🤍 Versand weltweit, gratis ab CHF 65 (Schweiz) — Lieferzeit meist 8–14 Tage. Alle Infos auf luxestyle.ch ✨',
  groesse:'Hi! 👗 Die genaue Grössentabelle (in cm) steht direkt beim Produkt auf luxestyle.ch — sag uns sonst gern, welches Teil, wir helfen beim Finden! 🤍',
  design:'So cool, dass dich «Selbst gestalten» interessiert 🎨 Auf luxestyle.ch machst du dein eigenes Design auf Shirt, Hoodie, Täsche oder Tasse — ohne Mindestmenge ✨',
  preis:'Hey! 💛 Mit Code WELCOME10 gibt’s –10% auf alles auf luxestyle.ch. Bezahlen bequem per Karte, TWINT & mehr ✨',
  verfueg:'Hi! 🤍 Aktuelle Verfügbarkeit, Farben & Grössen siehst du live auf luxestyle.ch — sag uns gern, welches Teil dich interessiert ✨',
  danke:'Merci dir vielmal 🤍 Das freut uns riesig! Schau gern wieder vorbei — mit Code WELCOME10 gibt’s –10% auf luxestyle.ch ✨',
  welcome:'Hey! 🤍 Danke für deine Nachricht! Wie können wir dir helfen? Alle Looks findest du auf luxestyle.ch ✨ (–10% mit Code WELCOME10)'};
const replyFor=t=>{for(const[k,re]of TOPIC)if(re.test(t))return REPLIES[k];return REPLIES.welcome;};

const g=async u=>{const r=await fetch(u);const j=await r.json().catch(()=>({}));return{ok:r.ok,status:r.status,j};};
const gpost=async(u,b)=>{const r=await fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});const j=await r.json().catch(()=>({}));return{ok:r.ok,status:r.status,j};};

(async()=>{
  // 1) Konversationen holen (testet zugleich den Scope)
  const url=`https://graph.facebook.com/${V}/${IG_ID}/conversations?platform=instagram&fields=id,updated_time,messages.limit(5){from,message,created_time}&limit=25&access_token=${encodeURIComponent(TOK)}`;
  const conv=await g(url);
  if(conv.j.error){
    const e=conv.j.error;
    console.log('❌ DM-Zugriff NICHT möglich:', e.code, e.message);
    console.log('→ Token braucht Scope **instagram_manage_messages** (Token neu ausstellen + als Secret setzen).');
    process.exit(0);
  }
  const convs=conv.j.data||[];
  console.log(`✅ DM-Zugriff OK — ${convs.length} Konversation(en) gefunden.`);
  const replied=loadState();
  const now=Date.now(); let done=0;
  for(const c of convs){
    if(done>=MAXR)break;
    const msgs=(c.messages?.data||[]).slice().sort((a,b)=>new Date(b.created_time)-new Date(a.created_time));
    const last=msgs[0]; if(!last)continue;
    const fromUs=String(last.from?.id)===String(IG_ID);
    const ageH=(now-new Date(last.created_time).getTime())/3.6e6;
    const key=c.id+'|'+last.created_time;
    const inbound=!fromUs;
    console.log(`• Konv ${c.id.slice(-6)} | letzte: ${fromUs?'WIR':'KUNDE'} | ${ageH.toFixed(1)}h | "${(last.message||'').slice(0,40)}"`);
    if(!inbound||ageH>24||replied.has(key))continue;       // nur frische Kunden-Nachricht <24h, 1×
    const senderId=last.from?.id; const msg=replyFor(last.message||'');
    if(DRY){console.log(`   DRY ⇒ würde antworten: "${msg}"`);replied.add(key);done++;continue;}
    const r=await gpost(`https://graph.facebook.com/${V}/${IG_ID}/messages?access_token=${encodeURIComponent(TOK)}`,
      {recipient:{id:senderId},message:{text:msg}});
    if(r.ok){console.log(`   ✓ geantwortet`);replied.add(key);done++;}
    else console.error('   ✗',r.status,JSON.stringify(r.j.error||r.j).slice(0,140));
    await new Promise(s=>setTimeout(s,1500));
  }
  if(!DRY)saveState(replied);
  console.log(`Fertig: ${done} DM-Antwort(en)${DRY?' (DRY)':''}.`);
})();
