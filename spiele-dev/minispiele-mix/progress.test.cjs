const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const R=require('../../js/minispiele-mix/core.js');
const P=require('../../js/minispiele-mix/progress.js');

function random(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function finish(run,history){
  for(const winner of history){assert(R.start(run));assert(R.finish(run,winner));assert(R.next(run));}
  return run;
}
function match(history=[1,2,0],options={}){return finish(R.create(history.length,['Ada','Lin'],random(42),options),history);}
function legacy(){return {v:1,deck:['drei-gewinnt','vier-gewinnt','memory'],names:['Ada','Lin'],history:[],phase:'ready'};}
function freeze(value){Object.freeze(value);for(const child of Object.values(value))if(child&&typeof child==='object')freeze(child);return value;}

test('Alle zwanzig Disziplinen haben die vorgegebene Kategorie',()=>{
  const expected={
    kopf:['drei-gewinnt','vier-gewinnt','memory','schere-stein-papier','mathe-duell','hoch-tief','simon','quiz-buzzer'],
    tempo:['reaktions-duell','tap-duell','farb-klick','maulwurf','punkte-jagd'],
    geschick:['pong','tauziehen','elfmeter','schlange-duell','ballon-pump','auto-rennen','stapel-turm']
  };
  assert.deepEqual(Object.keys(R.groups).sort(),R.games.slice().sort());
  for(const [group,slugs] of Object.entries(expected))for(const slug of slugs)assert.equal(R.groups[slug],group);
});

test('Neue 3/5/7-Decks mischen alle Kategorien in die ersten drei Runden ohne Wiederholung',()=>{
  const played=new Set(),orders=new Set();
  for(const size of [3,5,7])for(let seed=1;seed<=150;seed++){
    const run=R.create(size,undefined,random(seed));
    assert.equal(run.deck.length,size);
    assert.equal(new Set(run.deck).size,size);
    assert.deepEqual(run.deck.slice(0,3).map(slug=>R.groups[slug]).sort(),['geschick','kopf','tempo']);
    run.deck.forEach(slug=>played.add(slug));
    orders.add(run.deck.slice(0,3).map(slug=>R.groups[slug]).join(','));
  }
  assert.equal(played.size,20);
  assert.equal(orders.size,6);
  assert.deepEqual(R.create(7,[],random(12)).deck,R.create(7,[],random(12)).deck);
});

test('Grenzwerte und NaN aus der Zufallsquelle beschädigen kein Deck',()=>{
  for(const value of [0,1,-1,Infinity,-Infinity,NaN,undefined,'0.5']){
    const run=R.create(7,[],()=>value);
    assert(R.restore(run));assert.equal(new Set(run.deck).size,7);
    assert.equal(new Set(run.deck.slice(0,3).map(slug=>R.groups[slug])).size,3);
  }
});

test('create behält v1 und übernimmt optionale IDs und unabhängige Avatar-Paare',()=>{
  const avatars=[4,5],names=[' Ada ','Lin'];
  const run=R.create(3,names,random(5),{avatars,id:'test-match_1'});
  assert.equal(run.v,1);assert.equal(run.id,'test-match_1');
  assert.deepEqual(run.avatars,[4,5]);assert.deepEqual(run.names,['Ada','Lin']);
  avatars[0]=1;names[0]='neu';assert.deepEqual(run.avatars,[4,5]);assert.equal(run.names[0],'Ada');
  assert.deepEqual(R.create(3).avatars,[0,1]);
  assert.equal(R.create(3,[],undefined,{id:'a'}).id,'a');
  assert.equal(R.create(3,[],undefined,{id:'x'.repeat(100)}).id.length,100);
});

test('ID und Avatare bleiben über alle Phasen und Reloads erhalten',()=>{
  let run=R.create(3,['Ada','Lin'],()=>0,{avatars:[2,3]});
  const id=run.id;
  assert.notEqual(R.create(3,run.names,()=>0).id,id);
  for(const winner of [1,0,2]){
    R.start(run);run=R.restore(JSON.stringify(run));assert.equal(run.phase,'ready');
    R.start(run);R.finish(run,winner);run=R.restore(JSON.stringify(run));assert.equal(run.phase,'result');
    R.next(run);run=R.restore(JSON.stringify(run));assert.equal(run.id,id);assert.deepEqual(run.avatars,[2,3]);
  }
  assert.equal(run.phase,'finished');
});

test('Ungültige IDs und Avatare werden beim Erstellen und Wiederherstellen abgewiesen',()=>{
  const run=R.create(3);
  for(const id of ['',null,NaN,Infinity,1,true,{},[],' ','a b','../x','x'.repeat(101),'x\n']){
    assert.throws(()=>R.create(3,[],undefined,{id}));assert.equal(R.restore({...run,id}),null);
  }
  for(const avatars of [null,NaN,{},[],[0],[0,1,2],[-1,0],[0,6],[1.2,2],['0',1],[NaN,1],[Infinity,1],[false,1],Array(2)]){
    assert.throws(()=>R.create(3,[],undefined,{avatars}));assert.equal(R.restore({...run,avatars}),null);
  }
  for(const options of [null,[],true,'x'])assert.throws(()=>R.create(3,[],undefined,options));
});

test('Alte v1-Partien erhalten deterministische IDs und Standardavatare ohne neue Mischung',()=>{
  const old=freeze(legacy()),run=R.restore(old);
  assert.equal(run.v,1);assert.match(run.id,/^legacy-/);assert.deepEqual(run.deck,old.deck);
  assert.deepEqual(run.avatars,[0,1]);assert.equal(R.restore(JSON.stringify(old)).id,run.id);
  assert.equal(R.restore({...old,history:[1],phase:'playing'}).id,run.id);
  assert.equal(R.restore({...old,history:[1,2,0],phase:'finished'}).id,run.id);
  assert.notEqual(R.restore({...old,names:['Andere','Lin']}).id,run.id);
  assert.notEqual(R.restore({...old,deck:old.deck.slice().reverse()}).id,run.id);
  assert.deepEqual(R.restore(JSON.stringify(run)),run);
});

test('Revanche bewahrt Namen, Avatare und Disziplinreihenfolge mit neuer ID und leerer History',()=>{
  for(const history of [[],[null],[1,2,0]]){
    const run=freeze(finish(R.create(3,['Ada','Lin'],random(7),{avatars:[5,4]}),history));
    const again=R.rematch(run,()=>0),second=R.rematch(run,()=>0);
    assert.notEqual(again.id,run.id);assert.notEqual(again.id,second.id);
    assert.equal(again.phase,'ready');assert.deepEqual(again.history,[]);assert.equal(again.v,1);
    for(const key of ['names','avatars','deck']){assert.deepEqual(again[key],run[key]);assert.notEqual(again[key],run[key]);}
    assert.deepEqual(R.score(again),[0,0]);assert(R.restore(again));
  }
  assert.deepEqual(R.rematch(legacy()).deck,legacy().deck);
  for(const raw of [null,{},'{'])assert.throws(()=>R.rematch(raw));
});

test('Lückenhafte Arrays und NaN sind keine gültigen Runden',()=>{
  const run=R.create(3);
  for(const patch of [{history:[NaN]},{history:Array(1)},{deck:['pong',,'memory']},{history:[undefined]}])assert.equal(R.restore({...run,...patch}),null);
});

test('CommonJS und Browser-UMD bieten dieselbe reine Fortschritts-API',()=>{
  const context=vm.createContext({window:{}});
  for(const filename of ['core.js','progress.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../../js/minispiele-mix',filename),'utf8'),context);
  const api=context.window.MixProgress;
  assert.deepEqual(Object.keys(api).sort(),['award','empty','level','restore','unlocked']);
  const raw=JSON.stringify(match([1,2,0],{id:'umd'}));
  assert.deepEqual(JSON.parse(JSON.stringify(api.award(api.empty(),raw))),P.award(P.empty(),raw));
});

test('empty liefert jedes Mal ein unabhängiges Profil mit genau den vereinbarten Feldern',()=>{
  const first=P.empty(),second=P.empty();
  assert.deepEqual(first,{v:1,xp:0,matches:0,rounds:0,played:[],badges:[],claimed:[]});
  assert.notEqual(first,second);
  for(const key of ['played','badges','claimed'])assert.notEqual(first[key],second[key]);
});

test('Defekte oder alte Profilformate werden sicher zu einem leeren v1-Profil',()=>{
  for(const raw of [undefined,null,false,42,[],{},'{','null','{}',{v:2},{v:'1'}])assert.deepEqual(P.restore(raw),P.empty());
  assert.deepEqual(P.restore({v:1}),P.empty());
  for(const bad of [NaN,Infinity,-Infinity,-1,1.5,'100',true,null,{},Number.MAX_SAFE_INTEGER+1]){
    const profile=P.restore({...P.empty(),xp:bad,matches:bad,rounds:bad});
    assert.equal(profile.xp,0);assert.equal(profile.matches,0);assert.equal(profile.rounds,0);
    assert.deepEqual(P.level(profile),{level:1,xp:0,into:0,next:100,ratio:0});
  }
});

test('restore filtert unbekannte Listenwerte, behält gültige Daten und kopiert unabhängig',()=>{
  const raw=freeze({v:1,xp:120,matches:2,rounds:5,played:['pong','pong','memory','evil',NaN],badges:['first','evil','first','close'],claimed:['one','two','one',null,'',NaN,'bad id']});
  const restored=P.restore(raw);
  assert.deepEqual(restored,{v:1,xp:120,matches:2,rounds:5,played:['pong','memory'],badges:['first','close'],claimed:['two','one']});
  assert.deepEqual(P.restore(JSON.stringify(restored)),restored);
  restored.played.push('simon');assert.equal(raw.played.length,5);
  assert.deepEqual(P.restore({...P.empty(),played:null,badges:{},claimed:'one'}),P.empty());
});

test('Level haben 100 XP; Avatar 4 öffnet ab Level 3 und Avatar 5 ab Level 5',()=>{
  for(const [xp,n,into,avatars] of [[0,1,0,4],[99,1,99,4],[100,2,0,4],[199,2,99,4],[200,3,0,5],[399,4,99,5],[400,5,0,6],[1107,12,7,6]]){
    const profile=freeze({...P.empty(),xp});
    assert.deepEqual(P.level(profile),{level:n,xp,into,next:100,ratio:into/100});
    assert.deepEqual(P.unlocked(profile),Array.from({length:avatars},(_,i)=>i));
  }
});

test('Vollständige 3/5/7-Matches geben 20 XP je Runde plus 40 XP Abschlussbonus',()=>{
  for(const size of [3,5,7]){
    const run=match(Array(size).fill(1)),reward=P.award(P.empty(),run);
    assert.equal(reward.awarded,true);assert.equal(reward.xp,size*20+40);assert.equal(reward.profile.xp,reward.xp);
    assert.equal(reward.profile.matches,1);assert.equal(reward.profile.rounds,size);
    assert.deepEqual(reward.profile.played,run.deck);assert.deepEqual(reward.profile.claimed,[run.id]);
    assert.deepEqual(reward.newBadges,size===7?['first','marathon']:['first']);
  }
});

test('Abbrüche zählen weder als Disziplin noch als Runde; Remis bleibt gewertet',()=>{
  const run=match([1,null,0]),reward=P.award(P.empty(),run);
  assert.equal(reward.awarded,true);assert.equal(reward.xp,40);assert.equal(reward.profile.rounds,2);assert.equal(reward.profile.matches,1);
  assert.deepEqual(reward.profile.played,[run.deck[0],run.deck[2]]);assert.deepEqual(reward.newBadges,[]);
});

test('Komplett übersprungene Matches bringen keine XP, Zähler, Badges oder Beanspruchung',()=>{
  for(const size of [3,5,7]){
    const run=match(Array(size).fill(null)),profile=freeze(P.empty());
    assert.deepEqual(P.award(profile,run),{profile:P.empty(),xp:0,newBadges:[],awarded:false});
  }
});

test('Vor finished entstehen auch nach der letzten gewerteten Runde keine Belohnungen',()=>{
  const run=R.create(3);
  const none=()=>assert.deepEqual(P.award(P.empty(),run),{profile:P.empty(),xp:0,newBadges:[],awarded:false});
  none();R.start(run);none();R.finish(run,1);none();R.next(run);none();
  R.start(run);R.finish(run,2);R.next(run);R.start(run);R.finish(run,0);none();
  R.next(run);assert.equal(P.award(P.empty(),run).xp,100);
});

test('Korrupte Runs und Metadaten können keinen Fortschritt auslösen',()=>{
  const run=match();
  for(const bad of [null,'{',{}, {...run,id:NaN},{...run,avatars:[0,NaN]},{...run,history:[1,2]},{...run,history:[1,2,NaN]},{...run,deck:['evil','pong','memory']}]){
    assert.deepEqual(P.award(P.empty(),bad),{profile:P.empty(),xp:0,newBadges:[],awarded:false});
  }
});

test('Doppelte Rewards bleiben auch nach Run- und Profil-Reload ausgeschlossen',()=>{
  const run=match(),first=P.award(P.empty(),run);
  const profile=freeze(P.restore(JSON.stringify(first.profile))),restored=R.restore(JSON.stringify(run));
  for(const duplicate of [run,restored,{...restored,names:['Neu','Name'],history:[1,1,1]}]){
    const result=P.award(profile,duplicate);
    assert.equal(result.awarded,false);assert.equal(result.xp,0);assert.deepEqual(result.newBadges,[]);assert.deepEqual(result.profile,profile);
  }
});

test('Legacy-Matches werden ohne gespeicherte neue ID nach Reload nur einmal belohnt',()=>{
  const old={...legacy(),history:[1,2,0],phase:'finished'},first=P.award(P.empty(),old);
  assert.equal(first.xp,100);
  const duplicate=P.award(P.restore(JSON.stringify(first.profile)),JSON.stringify(old));
  assert.equal(duplicate.awarded,false);assert.deepEqual(duplicate.profile,first.profile);
});

test('Beanspruchungen speichern exakt die letzten 100 verschiedenen IDs',()=>{
  let profile=P.empty();const run=match();
  for(let i=0;i<101;i++)profile=P.award(profile,{...run,id:'match-'+i}).profile;
  const ids=Array.from({length:100},(_,i)=>'match-'+(i+1));
  assert.deepEqual(profile.claimed,ids);assert.equal(profile.matches,101);
  assert.deepEqual(P.restore({...profile,claimed:['alt',...ids]}).claimed,ids);
  assert.equal(P.award(profile,{...run,id:'match-1'}).awarded,false);
  assert.equal(P.award(profile,{...run,id:'match-100'}).awarded,false);
  assert.equal(P.award(profile,{...run,id:'match-0'}).awarded,true);
});

test('first wird erst beim ersten vollständig unübersprungenen Match vergeben',()=>{
  const partial=P.award(P.empty(),match([1,null,2]));
  assert(!partial.profile.badges.includes('first'));
  const first=P.award(partial.profile,match([1,1,1]));assert.deepEqual(first.newBadges,['first']);
  assert.deepEqual(P.award(first.profile,match([2,2,2])).newBadges,[]);
});

test('explorer benötigt zehn unterschiedliche tatsächlich gewertete Disziplinen',()=>{
  const a=R.games.slice(0,7),b=R.games.slice(7,10);
  let profile=P.award(P.empty(),{...match(Array(7).fill(1)),deck:a}).profile;
  profile=P.award(profile,{...match([1,1,1]),deck:a.slice(0,3)}).profile;
  assert.equal(profile.played.length,7);assert(!profile.badges.includes('explorer'));
  profile=P.award(profile,{...match([0,0,null]),deck:b}).profile;
  assert.equal(profile.played.length,9);assert(!profile.badges.includes('explorer'));
  const tenth=P.award(profile,{...match([null,null,0]),deck:b});
  assert.equal(tenth.profile.played.length,10);assert.deepEqual(tenth.newBadges,['explorer']);
});

test('marathon verlangt genau sieben Runden ohne Abbruch',()=>{
  assert(!P.award(P.empty(),match(Array(5).fill(1))).newBadges.includes('marathon'));
  assert(!P.award(P.empty(),match([1,1,1,1,1,1,null])).newBadges.includes('marathon'));
  assert(P.award(P.empty(),match(Array(7).fill(0))).newBadges.includes('marathon'));
});

test('close nutzt die Gesamtpunkte und verlangt mindestens eine gewertete Runde',()=>{
  for(const history of [[1,2,0],[0,0,0],[1,2,null],[0,null,null]])assert(P.award(P.empty(),match(history)).newBadges.includes('close'));
  for(const history of [[1,1,2],[1,null,null],[null,null,null]])assert(!P.award(P.empty(),match(history)).newBadges.includes('close'));
});

test('Fortschrittsfunktionen und Restore verändern weder Profil noch Run oder verschachtelte Listen',()=>{
  const profile=freeze({...P.empty(),xp:120,matches:1,rounds:3,played:['pong'],badges:['first'],claimed:['frueher']});
  const run=freeze(match()),before=JSON.stringify({profile,run});
  const reward=P.award(profile,run);P.level(profile);P.unlocked(profile);P.restore(profile);R.restore(run);
  assert.equal(JSON.stringify({profile,run}),before);
  for(const key of ['played','badges','claimed'])assert.notEqual(reward.profile[key],profile[key]);
  reward.newBadges.push('test');assert(!reward.profile.badges.includes('test'));
  reward.profile.played.push('simon');assert.deepEqual(profile.played,['pong']);
  const duplicate=P.award(freeze(P.award(profile,run).profile),run);
  duplicate.profile.claimed.push('weitere');assert.equal(profile.claimed.length,1);
});

test('Große gespeicherte Zähler bleiben nach Belohnung endliche sichere Ganzzahlen',()=>{
  const max=Number.MAX_SAFE_INTEGER,profile={...P.empty(),xp:max,matches:max,rounds:max};
  const reward=P.award(profile,match());
  for(const key of ['xp','matches','rounds'])assert.equal(reward.profile[key],max);
  assert.deepEqual(P.restore(reward.profile),reward.profile);assert(Number.isFinite(P.level(reward.profile).ratio));
});

test('Eine Revanche ist ein neues belohnbares Match und vergibt vorhandene Badges nicht doppelt',()=>{
  const run=match(),first=P.award(P.empty(),run),again=finish(R.rematch(run,random(3)),[1,2,0]);
  const reward=P.award(first.profile,again);
  assert.equal(reward.awarded,true);assert.equal(reward.xp,100);assert.equal(reward.profile.xp,200);
  assert.equal(reward.profile.matches,2);assert.equal(reward.profile.rounds,6);assert.deepEqual(reward.newBadges,[]);
  assert.deepEqual(reward.profile.claimed,[run.id,again.id]);
});
