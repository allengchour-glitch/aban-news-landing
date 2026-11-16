/* CPU-Test: echtes three.js für Vektoren/Geometrie, kein Browser/WebGL/Netz. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'neon-survivor.html'),'utf8');
const scripts=[...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];
for(const [index,match] of scripts.entries()){
  if(!/src=|application\/ld\+json/.test(match[1]))new vm.Script(match[2],{filename:`inline-${index}.js`});
}
function element(tag='div'){
  const classes=new Set(),listeners={};
  const e={tagName:tag.toUpperCase(),style:{},dataset:{},children:[],value:'',textContent:'',disabled:false,
    classList:{add(...names){names.forEach(n=>classes.add(n));},remove(...names){names.forEach(n=>classes.delete(n));},contains(n){return classes.has(n);},toggle(n,on){on=on===undefined?!classes.has(n):on;on?classes.add(n):classes.delete(n);}},
    appendChild(child){this.children.push(child);child.parentNode=this;return child;},
    insertBefore(child){return this.appendChild(child);},remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(c=>c!==this);},
    addEventListener(type,fn){(listeners[type]||=([])).push(fn);},setAttribute(k,v){this[k]=v;},getAttribute(k){return this[k];},
    querySelector(selector){return this.children.find(c=>c.className===selector.slice(1))||element();},querySelectorAll(){return [];},closest(){return null;},
    getBoundingClientRect(){return {left:0,top:0,width:1000,height:700};},focus(){},getContext(){
      return new Proxy({measureText(t){return {width:String(t).length*9};},createRadialGradient(){return {addColorStop(){}};},createLinearGradient(){return {addColorStop(){}};}},{get(o,k){return k in o?o[k]:()=>{};}});
    }};
  Object.defineProperty(e,'innerHTML',{get(){return this._html||'';},set(v){this._html=v;this.children=[];}});
  return e;
}
function storage(){const values=new Map();return {getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function createGame({station=false,networkRenderFixture=false}={}){
  const elements=new Map(),body=element('body'),messages=[],raf=[],timers=new Map();let now=0,timerId=0;
  for(const match of html.matchAll(/<([\w-]+)\b[^>]*\bid="([^"]+)"[^>]*>/g)){
    const e=element(match[1]);e.id=match[2];const cls=match[0].match(/class="([^"]*)"/);if(cls){e.className=cls[1];e.classList.add(...cls[1].split(/\s+/));}body.appendChild(e);elements.set(e.id,e);
  }
  for(let i=0;i<3;i++)elements.get('cbPips').appendChild(element('i'));
  const document={body,hidden:false,createElement:element,createElementNS:(_,tag)=>element(tag),getElementById:id=>elements.get(id)||null,querySelectorAll:()=>[],addEventListener(){}};
  class Audio {constructor(){this.volume=0;this.currentTime=0;this.paused=true;}play(){this.paused=false;return Promise.resolve();}pause(){this.paused=true;}addEventListener(){}}
  const math=Object.create(Math);let seed=123;math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const sandbox={console,document,Math:math,navigator:{maxTouchPoints:0},innerWidth:1000,innerHeight:700,devicePixelRatio:1,
    location:{search:'?station=1',pathname:'/neon-survivor.html',replace(){}},localStorage:storage(),sessionStorage:storage(),performance:{now:()=>now},Audio,
    addEventListener(){},requestAnimationFrame:fn=>raf.push(fn),setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,delay});return timerId;},clearTimeout:id=>timers.delete(id),setInterval:()=>0,clearInterval(){},URLSearchParams,
    matchMedia:()=>({matches:false}),fetch(){throw new Error('Netz im VM-Test verboten');}};
  sandbox.window=sandbox;sandbox.self=sandbox;sandbox.parent=station?{postMessage:m=>messages.push(m)}:sandbox;
  const context=vm.createContext(sandbox);
  function run(source){return vm.runInContext(source,context,{timeout:10000});}
  run(fs.readFileSync(path.join(root,'js/vendor/three.min.js'),'utf8'));
  sandbox.THREE.WebGLRenderer=class {constructor(){this.domElement=element('canvas');this.capabilities={isWebGL2:false,getMaxAnisotropy:()=>1};this.info={render:{calls:0,triangles:0}};}getContext(){return {getExtension:()=>null};}setPixelRatio(){}setSize(){}setRenderTarget(){}render(){this.info.render.calls++;}clear(){}getRenderTarget(){return null;}};
  sandbox.THREE.TextureLoader=class {load(){return new sandbox.THREE.Texture();}};
  for(const file of ['reactor.js','reactor-view.js'])run(fs.readFileSync(path.join(root,'js/arena-nexus',file),'utf8'));
  let main=scripts.find(m=>m[2].includes('function buildSnap()'))[2];
  if(networkRenderFixture)main=require('./network-render-fixture.cjs').injectNetworkRenderFixture(main);
  const end=main.lastIndexOf('})();');
  run(main.slice(0,end)+'window.__arenaVM=function(source){return eval(source);};\n'+main.slice(end));
  function evaluate(source){return sandbox.__arenaVM(source);}
  function step(seconds){for(let i=0;i<Math.ceil(seconds/0.05);i++){now+=50;const callbacks=raf.splice(0);if(!callbacks.length)throw Error('Kein Frame geplant');for(const fn of callbacks)fn(now);}}
  return {window:sandbox,context,evaluate,step,elements,messages,timers,
    json:source=>JSON.parse(JSON.stringify(evaluate(source))),
    start(role=null){sandbox.__testRole=role;evaluate('coopMode=window.__testRole;start()');},
    send(message){sandbox.__testMessage=JSON.parse(JSON.stringify(message));evaluate('netMsg(window.__testMessage)');},
    snapshot(){return JSON.parse(JSON.stringify(evaluate('buildSnap()')));}};
}
module.exports={createGame,html,root};
