import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { QueueInputError, readSocialQueue, validateMetricoolRow, validateMetaRow, validateMediaUrl,
  parseNetworks, parseRunLimit, localDateInZone } from './lib/social_queue.mjs';

const NOW = Date.parse('2026-10-17T12:00:00Z');
const METRICOOL_COLS = ['id','publish_date','media_url','text','networks','status','scheduled_at','note'];
const META_COLS = ['id','scheduled_date','video_url','caption','platforms','status','posted_at','post_url'];
const metricool = { id:'one', publish_date:'2026-12-01T10:00:00', media_url:'https://cdn.example.com/master.mp4',
  text:'Produkt entdecken', networks:'instagram', status:'ready', scheduled_at:'', note:'' };
const meta = { id:'one', scheduled_date:'', video_url:'https://cdn.example.com/master.mp4',
  caption:'Produkt entdecken', platforms:'instagram', status:'ready', posted_at:'', post_url:'' };
const esc = value => /[",\r\n]/.test(String(value ?? '')) ? '"' + String(value).replaceAll('"','""') + '"' : String(value ?? '');
const csv = (header, records) => [header, ...records.map(record => header.map(key => record[key] ?? ''))]
  .map(row => row.map(esc).join(',')).join('\n') + '\n';

test('BOM, CRLF, eingebettete Zeilenumbrüche und escaped Quotes bleiben gültig', () => {
  const input='\uFEFFid,text,status\r\none,"Erste Zeile\r\nZweite ""Zeile""",ready\r\n';
  const parsed=readSocialQueue(input,['id','text','status']);
  assert.deepEqual(parsed.header,['id','text','status']);
  assert.equal(parsed.rows[1][1],'Erste Zeile\r\nZweite "Zeile"');
});

test('kaputte CSV-Struktur wird vor der Zeilenauswahl abgewiesen', async t => {
  const cases=[
    ['doppelte Header','id,text,text\none,A,B\n'],
    ['doppelte IDs','id,text,status\none,A,ready\n one ,B,hold\n'],
    ['fehlende ID','id,text,status\n,A,ready\n'],
    ['zu wenige Felder','id,text,status\none,A\n'],
    ['zu viele Felder','id,text,status\none,A,ready,extra\n'],
    ['offene Quotes','id,text,status\none,A,"ready\n'],
    ['Quote im unquotierten Feld','id,text,status\none,A"B,ready\n'],
    ['Zeichen nach Quote','id,text,status\none,"A"B,ready\n'],
    ['fehlende Pflichtspalte','id,text\none,A\n']
  ];
  for(const [name,input] of cases)await t.test(name,()=>assert.throws(()=>readSocialQueue(input,['id','text','status']),QueueInputError));
});

test('Netzwerke werden exakt, vollständig und ohne doppelte Zielkanäle validiert', () => {
  assert.deepEqual(parseNetworks('IG; Facebook threads',{mode:'meta'}),['instagram','facebook','threads']);
  assert.deepEqual(parseNetworks('Instagram tiktok youtube pinterest',{mode:'metricool'}),['instagram','tiktok','youtube','pinterest']);
  assert.deepEqual(parseNetworks('',{mode:'meta',allowEmpty:true}),['instagram','facebook','threads']);
  for(const value of ['notinstagram','instagramm','facebook tiktok','ig instagram','__proto__']) {
    assert.throws(()=>parseNetworks(value,{mode:'meta'}),QueueInputError);
  }
  assert.throws(()=>parseNetworks('instagram instagram',{mode:'metricool'}),QueueInputError);
  assert.throws(()=>parseNetworks('',{mode:'metricool'}),QueueInputError);
});

test('Medien benötigen HTTPS; ungültige, lokale und credentialhaltige Adressen scheitern', () => {
  assert.equal(validateMediaUrl('https://cdn.example.com/download?signature=abc'), 'https://cdn.example.com/download?signature=abc');
  for(const value of ['', 'not a url', 'file:///tmp/clip.mp4', 'http://cdn.example.com/clip.mp4',
    'https://user:super-secret@cdn.example.com/clip.mp4', 'https://localhost/clip.mp4',
    'https://127.1/clip.mp4', 'https://10.0.0.1/clip.mp4', 'https://[::1]/clip.mp4',
    'https://cdn.example.com/path with spaces.mp4', 'https://foo..example.com/clip.mp4']) {
    assert.throws(()=>validateMediaUrl(value),QueueInputError);
  }
});

test('Metricool validiert Kalender, lokale Zeit, Zeitzone und Vergangenheit', () => {
  const result=validateMetricoolRow(metricool,{now:NOW});
  assert.equal(result.publishInstant,Date.parse('2026-12-01T09:00:00Z'));
  for(const publish_date of ['', '2026-02-31T10:00:00', '2026-12-01T25:00:00', '2026-12-01T10:00:00Z',
    '2026-12-01T10:00:00+01:00', '2026-10-17T10:00:00']) {
    assert.throws(()=>validateMetricoolRow({...metricool,publish_date},{now:NOW}),QueueInputError);
  }
  assert.throws(()=>validateMetricoolRow(metricool,{now:NOW,timeZone:'Europe/Zurih'}),QueueInputError);
  assert.throws(()=>validateMetricoolRow({...metricool,text:''},{now:NOW}),/Beitragstext fehlt/);
  assert.throws(()=>validateMetricoolRow({...metricool,media_url:''},{now:NOW}),QueueInputError);
});

test('DST-Lücken und doppelte lokale Uhrzeiten werden eindeutig blockiert', () => {
  assert.throws(()=>validateMetricoolRow({...metricool,publish_date:'2027-03-28T02:30:00'},
    {now:NOW,timeZone:'Europe/Berlin'}),/existiert.*nicht/);
  assert.throws(()=>validateMetricoolRow({...metricool,publish_date:'2026-10-25T02:30:00'},
    {now:NOW,timeZone:'Europe/Berlin'}),/mehrdeutig/);
  assert.equal(validateMetricoolRow({...metricool,publish_date:'2026-10-25T03:30:00'},
    {now:NOW,timeZone:'Europe/Berlin'}).publishInstant,Date.parse('2026-10-25T02:30:00Z'));
});

test('Meta akzeptiert nur echte Datumstage; Schweizer Mitternacht richtet sich nach lokaler Zone', () => {
  assert.equal(validateMetaRow({...meta,scheduled_date:'2026-10-18'}).scheduledDate,'2026-10-18');
  for(const scheduled_date of ['0','2026-02-31','2026-99-99','2026-10-18T00:00:00']) {
    assert.throws(()=>validateMetaRow({...meta,scheduled_date}),QueueInputError);
  }
  const midnight=Date.parse('2026-10-17T22:30:00Z');
  assert.equal(localDateInZone('Europe/Zurich',midnight),'2026-10-18');
  assert.equal(localDateInZone('UTC',midnight),'2026-10-17');
  assert.throws(()=>validateMetaRow({...meta,platforms:'instagram threads'},{skipThreads:true}),/SKIP_THREADS pausiert/);
});

test('MAX_PER_RUN=0 pausiert; kaputte numerische Eingaben werden nicht umgedeutet', () => {
  assert.equal(parseRunLimit('0',50),0);
  assert.equal(parseRunLimit(undefined,50),50);
  for(const value of ['-1','1.5','1post','Infinity','9007199254740992'])assert.throws(()=>parseRunLimit(value,50),QueueInputError);
});

function fixture(t, kind, records = [kind === 'metricool' ? metricool : meta]) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'luxe-social-input-'));
  t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.mkdirSync(path.join(root,'automation/lib'),{recursive:true});
  fs.mkdirSync(path.join(root,'social'));
  const scriptName=kind === 'metricool' ? 'metricool-schedule.mjs' : 'video-autopost-meta.mjs';
  const script=path.join(root,'automation',scriptName);
  fs.copyFileSync(new URL(scriptName,import.meta.url),script);
  fs.copyFileSync(new URL('lib/social_queue.mjs',import.meta.url),path.join(root,'automation/lib/social_queue.mjs'));
  const queue=path.join(root,'social',kind === 'metricool' ? 'metricool_queue.csv' : 'video_queue.csv');
  fs.writeFileSync(queue,csv(kind === 'metricool' ? METRICOOL_COLS : META_COLS,records));
  return {root,script,queue};
}

function run(f, env = {}, now = NOW) {
  const preload=path.join(f.root,'fake.mjs');
  fs.writeFileSync(preload,`import fs from 'node:fs';
    const RealDate=Date;
    globalThis.Date=class extends RealDate{constructor(...args){super(...(args.length?args:[${now}]));}static now(){return ${now};}};
    console.log=(...args)=>fs.writeSync(1,args.join(' ')+'\\n');
    console.error=(...args)=>fs.writeSync(2,args.join(' ')+'\\n');
    globalThis.fetch=async()=>{fs.writeFileSync('unexpected-network','bad');throw new Error('NETWORK MUST NEVER RUN');};`);
  return spawnSync(process.execPath,['--import',preload,f.script],{
    cwd:f.root,encoding:'utf8',timeout:10000,env:{PATH:process.env.PATH,...env}
  });
}

const LIVE={DRY_RUN:'0',APPROVE_PUBLISH:'1',METRICOOL_USER_TOKEN:'fake',METRICOOL_USER_ID:'1',
  METRICOOL_BLOG_ID:'2',IG_USER_ID:'ig',IG_ACCESS_TOKEN:'fake'};

test('beide Poster stoppen bei fehlendem Medium, falschem Kanal und kaputtem Datum vor jedem API-Aufruf', async t => {
  for(const kind of ['metricool','meta']) {
    const source=kind==='metricool'?metricool:meta;
    const invalid=[
      {...source,[kind==='metricool'?'media_url':'video_url']:''},
      {...source,[kind==='metricool'?'networks':'platforms']:'notinstagram'},
      {...source,[kind==='metricool'?'publish_date':'scheduled_date']:'2026-02-31'},
      {...source,[kind==='metricool'?'text':'caption']:''}
    ];
    for(const [i,record] of invalid.entries())await t.test(`${kind}-${i}`,t=>{
      const f=fixture(t,kind,[record]);
      const before=fs.readFileSync(f.queue,'utf8');
      const result=run(f,LIVE);
      assert.equal(result.status,1,result.stdout+result.stderr);
      assert.match(result.stderr,/Social-Queue/);
      assert.equal(fs.existsSync(path.join(f.root,'unexpected-network')),false);
      assert.equal(fs.readFileSync(f.queue,'utf8'),before);
    });
  }
});

test('gesamte Eingabe wird vor dem ersten Request geprüft, auch hinter MAX_PER_RUN', async t => {
  for(const kind of ['metricool','meta'])await t.test(kind,t=>{
    const source=kind==='metricool'?metricool:meta;
    const f=fixture(t,kind,[source,{...source,id:'two',[kind==='metricool'?'networks':'platforms']:'unknown'}]);
    const before=fs.readFileSync(f.queue,'utf8');
    const result=run(f,{...LIVE,MAX_PER_RUN:'1'});
    assert.equal(result.status,1);
    assert.equal(fs.existsSync(path.join(f.root,'unexpected-network')),false);
    assert.equal(fs.readFileSync(f.queue,'utf8'),before);
  });
});

test('alte gehaltene Inhalte bleiben unangetastet; gültiger Dry-Run braucht kein Netzwerk', async t => {
  for(const kind of ['metricool','meta'])await t.test(kind,t=>{
    const source=kind==='metricool'?metricool:meta;
    const held={...source,id:'held',status:'hold',[kind==='metricool'?'publish_date':'scheduled_date']:'legacy',
      [kind==='metricool'?'media_url':'video_url']:'old-relative-path',[kind==='metricool'?'networks':'platforms']:'old-network'};
    const f=fixture(t,kind,[source,held]);
    const before=fs.readFileSync(f.queue,'utf8');
    const result=run(f);
    assert.equal(result.status,0,result.stdout+result.stderr);
    assert.match(result.stdout,/DRY/);
    assert.equal(fs.readFileSync(f.queue,'utf8'),before);
    assert.equal(fs.existsSync(path.join(f.root,'unexpected-network')),false);
  });
});

test('MAX0 bleibt in beiden Publishern ein vollständiger No-op', async t => {
  for(const kind of ['metricool','meta'])await t.test(kind,t=>{
    const f=fixture(t,kind);
    fs.writeFileSync(f.queue,'intentionally malformed,"');
    const result=run(f,{...LIVE,MAX_PER_RUN:'0'});
    assert.equal(result.status,0,result.stdout+result.stderr);
    assert.match(result.stdout,/pausiert/);
    assert.equal(fs.readFileSync(f.queue,'utf8'),'intentionally malformed,"');
    assert.equal(fs.existsSync(f.queue+'.lock'),false);
    assert.equal(fs.existsSync(path.join(f.root,'unexpected-network')),false);
  });
});

test('Meta prüft heute in Europe/Zurich statt UTC', t => {
  const f=fixture(t,'meta',[{...meta,scheduled_date:'2026-10-18'}]);
  const result=run(f,{},Date.parse('2026-10-17T22:30:00Z'));
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/fällig: 1/);
  assert.match(result.stdout,/DRY/);
});

test('explizit angefordertes pausiertes Threads wird vor anderen Kanälen gemeldet', t => {
  const f=fixture(t,'meta',[{...meta,platforms:'instagram threads'}]);
  const result=run(f,{...LIVE,SKIP_THREADS:'1'});
  assert.equal(result.status,1);
  assert.match(result.stderr,/SKIP_THREADS pausiert/);
  assert.equal(fs.existsSync(path.join(f.root,'unexpected-network')),false);
});

test('Dry-Run meldet alte Metricool-Zeitpunkte und reflektiert keine Medien-Zugangsdaten', t => {
  const f=fixture(t,'metricool',[{...metricool,publish_date:'2026-10-16T12:00:00'}]);
  const old=run(f);
  assert.equal(old.status,1);
  assert.match(old.stderr,/Vergangenheit/);
  fs.writeFileSync(f.queue,csv(METRICOOL_COLS,[{...metricool,media_url:'https://user:super-secret@cdn.example.com/clip.mp4'}]));
  const credentials=run(f);
  assert.equal(credentials.status,1);
  assert.doesNotMatch(credentials.stdout+credentials.stderr,/super-secret/);
});
