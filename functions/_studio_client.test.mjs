// Echte Studio-Laufzeit mit kleinem DOM und virtueller Zeit; ausschliesslich Demoantworten.
// Optional: node functions/_studio_client.test.mjs /privater/pfad/zur/alten/ki-studio.js
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(process.argv[2] || new URL('../js/ki-studio.js',import.meta.url),'utf8');
let ok=0,fehler=0;
function check(name,bedingung){if(bedingung)ok++;else{fehler++;console.log('FEHLER: '+name);}}
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(r=>setImmediate(r));};
const warten=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
const output={answer:'Demoantwort aus dem Test',text:'Demoantwort aus dem Test',aiRewrite:'Demoantwort aus dem Test',kiCheck:'Demoantwort aus dem Test'};
const markt={fetched_at:'2026-11-21T10:00:00Z',assets:[{name:'Demo',symbol:'DEMO',change_24h:1}]};
const antwort=(data=output,status=200)=>({ok:status>=200&&status<300,status,json:async()=>data});
const tools=[['chat','toolChat','outChat','/api/chat'],['generate','toolGen','outGen','/api/generate'],['hype','toolHype','outHype','/api/hype-check'],['aeo','toolAeo','outAeo','/api/ki-erwaehnung'],['translate','toolTranslate','outTr','/api/generate'],['prompt','toolPrompt','outPr','/api/generate'],['brief','toolBrief','outBrief','/api/generate']];
function harness(lang='de',fetcher=()=>antwort()){
  const nodes=new Map(),events={},timers=new Map(),calls=[],writes=[],clickErrors=[];let next=0,now=0;
  function element(id=''){
    const n={id,value:'Demo-Eingabe unverändert',hidden:false,disabled:false,style:{},attrs:{},children:[],events:{},className:'',_text:'',
      setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k]??null;},
      addEventListener(k,fn){this.events[k]=fn;},querySelector(){return {style:{}};},appendChild(x){this.children.push(x);},focus(){}};
    Object.defineProperty(n,'textContent',{get(){return this._text;},set(v){this._text=v;this.children=[];}});return n;
  }
  const get=id=>{if(!nodes.has(id))nodes.set(id,element(id));return nodes.get(id);};
  tools.forEach(([,id])=>get(id));get('proKey').value='demo-pro-schluessel';
  const context={window:{ABAN_PAY:{}},document:{documentElement:{lang},getElementById:get,
    querySelectorAll:()=>tools.map(([,id])=>get(id)),createElement:()=>element(),
    addEventListener:(k,fn)=>{(events[k]??=[]).push(fn);}},
    localStorage:{getItem:()=> 'demo-pro-schluessel',setItem:(...a)=>writes.push(a)},
    navigator:{clipboard:{writeText:async()=>{}}},AbortController,Promise,JSON,Error,Array,
    setTimeout:(fn,ms)=>{timers.set(++next,{fn,due:now+ms,ms});return next;},clearTimeout:id=>timers.delete(id),
    fetch:(url,opts={})=>{
      if(url==='/api/pro-validate')return Promise.resolve(antwort({valid:true,tier:'monthly'}));
      calls.push({url,opts});return Promise.resolve(fetcher(url,opts));
    }};
  vm.runInNewContext(source,context);
  function click(tool){const btn=get('button-'+tool);btn.attrs['data-tool']=tool;if(!btn.textContent)btn.textContent='Demo starten';
    const target={closest:selector=>selector==='.run'?btn:null};
    for(const fn of events.click||[])try{fn({target});}catch(e){clickErrors.push(String(e));}return btn;}
  return {get,calls,writes,timers,clickErrors,click,setFetch:fn=>{fetcher=fn;},advance:async ms=>{now+=ms;for(const [id,t]of [...timers])if(t.due<=now){timers.delete(id);t.fn();}await flush();}};
}
const fristtext=(lang,text)=>lang==='de'?/keine bestätigte Antwort/i.test(text)&&/bereits/i.test(text)&&/(keine automatische Wiederholung|nicht automatisch)/i.test(text):/no confirmed response/i.test(text)&&/already/i.test(text)&&/(nothing is retried automatically|not automatically)/i.test(text);

for(const lang of ['de','en']){
  for(const [tool,,out,endpoint]of tools){
    const pending=warten();const h=harness(lang,(url)=>url==='/data/markets.json'?antwort(markt):pending.promise);await flush();
    const beforeWrites=JSON.stringify(h.writes),beforeInput=h.get('proKey').value,beforeDraft=h.get('genZiel').value;
    const btn=h.click(tool);await flush();h.click(tool);await flush();
    check(lang+'/'+tool+': genau eine Werkzeuganfrage trotz zweitem Ereignis',h.calls.filter(c=>c.url===endpoint).length===1);
    check(lang+'/'+tool+': Arbeitsknopf während Anfrage gesperrt',btn.disabled);
    check(lang+'/'+tool+': Werkzeug meldet laufende Arbeit barrierearm',h.get(tools.find(t=>t[0]===tool)[1]).getAttribute('aria-busy')==='true');
    const call=h.calls.find(c=>c.url===endpoint);
    check(lang+'/'+tool+': Sprache und Testschlüssel übermittelt',call&&JSON.parse(call.opts.body).lang===lang&&call.opts.headers['X-Pro-Key']==='demo-pro-schluessel');
    await h.advance(45000);
    check(lang+'/'+tool+': Frist beendet und erklärt, kein Status-Kopierknopf',!btn.disabled&&fristtext(lang,h.get(out).textContent)&&h.get(out).children.length===0);
    check(lang+'/'+tool+': abgebrochen, kein Retry, Timer entfernt',call?.opts.signal?.aborted===true&&h.calls.filter(c=>c.url===endpoint).length===1&&h.timers.size===0);
    check(lang+'/'+tool+': Eingaben und Lizenzspeicher unverändert',h.get('proKey').value===beforeInput&&h.get('genZiel').value===beforeDraft&&JSON.stringify(h.writes)===beforeWrites);
    check(lang+'/'+tool+': Status wird vorgelesen und beschäftigt zurückgesetzt',h.get(out).getAttribute('role')==='status'&&h.get(out).getAttribute('aria-live')==='polite'&&h.get(tools.find(t=>t[0]===tool)[1]).getAttribute('aria-busy')==='false');
    const message=h.get(out).textContent;pending.resolve(antwort());await flush();
    check(lang+'/'+tool+': verspätete Antwort ignoriert',h.get(out).textContent===message);
    h.setFetch(url=>antwort(url==='/data/markets.json'?markt:output));h.click(tool);await flush();
    check(lang+'/'+tool+': ausdrücklich manuell nach Erholung erfolgreich',h.get(out).textContent===output.text&&!btn.disabled&&h.timers.size===0&&h.calls.filter(c=>c.url===endpoint).length===2);
  }
  for(const phase of ['inhalt','markt-transport','markt-inhalt']){
    const pending=warten(),isMarkt=phase.startsWith('markt'),tool=isMarkt?'brief':'generate',out=isMarkt?'outBrief':'outGen';
    const h=harness(lang,(url)=>phase==='markt-transport'?pending.promise:{ok:true,status:200,json:()=>pending.promise});await flush();
    const btn=h.click(tool);await flush();await h.advance(45000);
    check(lang+'/'+phase+': gemeinsame Frist umfasst Antwortinhalt/Markt',!btn.disabled&&fristtext(lang,h.get(out).textContent)&&h.timers.size===0);
    check(lang+'/'+phase+': erstes Signal abgebrochen',h.calls[0]?.opts.signal?.aborted===true);
    const message=h.get(out).textContent;
    pending.resolve(phase==='markt-transport'?antwort(markt):isMarkt?markt:output);await flush();
    check(lang+'/'+phase+': späte Antwort startet keinen Modell-POST und ändert nichts',h.get(out).textContent===message&&h.calls.length===1);
    h.setFetch(url=>antwort(url==='/data/markets.json'?markt:output));h.click(tool);await flush();
    check(lang+'/'+phase+': manuell wieder bedienbar',h.get(out).textContent===output.text&&!btn.disabled&&h.timers.size===0);
  }
  {
    const pending=warten(),h=harness(lang,()=>pending.promise);await flush();const btn=h.click('generate');await flush();await h.advance(33000);
    check(lang+': legitime 33-Sekunden-Antwort nicht vorzeitig beendet',btn.disabled&&h.get('outGen').textContent===(lang==='de'?'Arbeite …':'Working …'));
    pending.resolve(antwort());await flush();check(lang+': legitime Antwort und Timerbereinigung',h.get('outGen').textContent===output.text&&!btn.disabled&&h.timers.size===0);
  }
  {
    const market=warten(),model=warten(),h=harness(lang,url=>url==='/data/markets.json'?market.promise:model.promise);await flush();const btn=h.click('brief');await flush();
    await h.advance(25000);market.resolve(antwort(markt));await flush();
    check(lang+': Marktdaten und Modell teilen dasselbe Abbruchsignal',h.calls.length===2&&h.calls[0].opts.signal===h.calls[1].opts.signal);
    await h.advance(20000);
    check(lang+': 25s Markt plus 20s Modell enden gemeinsam nach 45s',!btn.disabled&&fristtext(lang,h.get('outBrief').textContent)&&h.timers.size===0);
    const text=h.get('outBrief').textContent;model.resolve(antwort());await flush();
    check(lang+': spätes Ergebnis der gesamten Kette bleibt ohne Anzeige oder Retry',h.get('outBrief').textContent===text&&h.calls.length===2);
  }
  for(const status of [401,429,503]){
    const h=harness(lang,()=>antwort({error:status===429?'rate_limited':status===503?'ai_off':'unauthorized'},status));await flush();const btn=h.click('generate');await flush();
    const text=h.get('outGen').textContent;
    check(lang+'/HTTP'+status+': verständlicher Fehler, kein Entwurf/Retry und Timer entfernt',!btn.disabled&&text&&text!==output.text&&h.get('outGen').children.length===0&&h.calls.length===1&&h.timers.size===0);
    h.setFetch(()=>antwort());h.click('generate');await flush();check(lang+'/HTTP'+status+': manuell wieder nutzbar',h.get('outGen').textContent===output.text&&!btn.disabled&&h.calls.length===2);
  }
  {
    const h=harness(lang,()=>{throw new Error('Synthetischer synchroner Transportfehler');});await flush();const btn=h.click('generate');await flush();
    check(lang+': synchroner Fetch-Fehler endet ohne gesperrten Knopf',!btn.disabled&&h.clickErrors.length===0&&h.timers.size===0&&h.get('outGen').textContent!==output.text);
    h.setFetch(()=>antwort());h.click('generate');await flush();check(lang+': nach synchronem Fehler manuell erholt',h.get('outGen').textContent===output.text&&!btn.disabled);
  }
}
console.log(`${ok} ok, ${fehler} Fehler`);process.exitCode=fehler?1:0;
