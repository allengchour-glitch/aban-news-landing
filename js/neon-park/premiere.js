/* Park-Regie: reine Simulation, auch ohne Grafik und Netzwerk prüfbar. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.ParkPremiere = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  var DEFS = [
    {name:"Kettenflieger", targets:[0.34,0.66,0.46], labels:["Sanft anlaufen","Flughöhe erreichen","Ruhig auslaufen"], tolerance:0.1,
      rule:"Motor regeln: − weniger Gas · + mehr Gas. Wind gleicht ihr nach.", minus:"Gas −", plus:"Gas +"},
    {name:"Teetassen", targets:[-0.3,0.3,0], labels:["Nach links drehen","Nach rechts drehen","In der Mitte ausbalancieren"], tolerance:0.12,
      rule:"Lenkimpulse geben und gegenlenken: Die Tassen drehen nach!", minus:"Links ↶", plus:"Rechts ↷"},
    {name:"Piratenschiff", targets:[0.3,0.53,0.74], labels:["Kleine Welle","Seegang","Große Welle"], tolerance:0.12,
      rule:"+ gibt Schub nur im Tal. − bremst den Schwung jederzeit.", minus:"Bremsen", plus:"Schub"},
    {name:"Achterbahn", targets:[0.7,0.38,0.16], labels:["Auf die Strecke","Kurve langsam nehmen","Sanft in den Bahnhof"], tolerance:0.1,
      rule:"Antrieb und Bremse dosieren. In Kurve und Bahnhof langsamer!", minus:"Bremse", plus:"Antrieb"}
  ];
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function create(){return {version:1,rev:0,time:0,phase:"rehearsal",finale:0,rides:DEFS.map(function(){
    return {status:"waiting",stage:0,hold:0,value:0,setting:0.28,velocity:0,position:0.12,elapsed:0,good:0,inputs:0,misses:0,stars:0};
  })};}
  function target(i,r){return DEFS[i].targets[Math.min(2,r.stage)];}
  function action(s,i,kind){
    if(kind==="open"){
      if(s.phase!=="ready")return false;
      s.phase="show";s.finale=0;s.rev++;return true;
    }
    if(!Number.isInteger(i)||!s.rides[i]||s.phase!=="rehearsal")return false;
    var r=s.rides[i];
    if(kind==="start"){
      if(r.status!=="waiting")return false;
      r.status="running";r.value=i===2?0.12:0;s.rev++;return true;
    }
    if(r.status!=="running"||(kind!=="minus"&&kind!=="plus"))return false;
    var axis=kind==="plus"?1:-1;
    r.inputs++;
    if(i===0)r.setting=clamp(r.setting+axis*0.14,0,1);
    if(i===1)r.velocity=clamp(r.velocity+axis*0.23,-0.7,0.7);
    if(i===2){
      if(axis<0){r.velocity*=0.74;r.position*=0.93;}
      else if(Math.abs(r.position)<0.2)r.velocity=clamp(r.velocity+(r.velocity<0?-1:1)*0.24,-1.8,1.8);
      else r.misses++;
    }
    if(i===3)r.value=clamp(r.value+axis*0.14,0,1);
    s.rev++;return true;
  }
  function step(s,dt){
    if(!Number.isFinite(dt)||dt<=0||s.phase==="done")return;
    dt=Math.min(dt,0.05);s.time+=dt;s.rev++;
    if(s.phase==="show"){
      s.finale+=dt;if(s.finale>=10){s.finale=10;s.phase="done";}return;
    }
    s.rides.forEach(function(r,i){
      if(r.status!=="running")return;
      r.elapsed+=dt;
      if(i===0)r.value=clamp(r.value+(r.setting-r.value+Math.sin(r.elapsed*1.7)*0.065)*dt,0,1);
      if(i===1){
        r.velocity+=(Math.sin(r.elapsed*1.2)*0.07-r.velocity*1.5)*dt;
        r.value=clamp(r.value+r.velocity*dt,-1,1);
        if(Math.abs(r.value)===1)r.velocity*=-0.4;
      }
      if(i===2){
        r.velocity+=(-3.24*r.position-0.08*r.velocity)*dt;
        r.position+=r.velocity*dt;
        r.value=Math.sqrt(r.position*r.position+r.velocity*r.velocity/3.24);
      }
      if(i===3)r.value=clamp(r.value+(0.12-r.value*0.1)*dt,0,1);
      if(Math.abs(r.value-target(i,r))<=DEFS[i].tolerance){r.hold+=dt;r.good+=dt;}
      else r.hold=Math.max(0,r.hold-dt*0.65);
      if(r.hold>=2.2){
        r.hold=0;r.stage++;
        if(r.stage===3){r.status="passed";r.stars=r.good/r.elapsed>0.57?3:r.good/r.elapsed>0.3?2:1;}
      }
    });
    if(s.rides.every(function(r){return r.status==="passed";}))s.phase="ready";
  }
  function score(s){return s.rides.reduce(function(n,r){return n+(r.status==="passed"?100+r.stars*25:0);},0)+(s.phase==="done"?100:0);}
  /* Nur vollständige, endliche Host-Zustände übernehmen; alte Pakete ignorieren. */
  function snapshot(s,d){
    if(!d||d.version!==1||!Number.isInteger(d.rev)||d.rev<s.rev||!Array.isArray(d.rides)||d.rides.length!==4)return null;
    if(["rehearsal","ready","show","done"].indexOf(d.phase)<0)return null;
    if(!Number.isFinite(d.time)||d.time<0||!Number.isFinite(d.finale)||d.finale<0||d.finale>10)return null;
    var fields=["stage","hold","value","setting","velocity","position","elapsed","good","inputs","misses","stars"];
    if(d.rides.some(function(r){return !r||["waiting","running","passed"].indexOf(r.status)<0||fields.some(function(k){return !Number.isFinite(r[k]);})||!Number.isInteger(r.stage)||r.stage<0||r.stage>3||r.stars<0||r.stars>3||Math.abs(r.value)>3||Math.abs(r.position)>3;}))return null;
    return JSON.parse(JSON.stringify(d));
  }
  return {defs:DEFS,create:create,action:action,step:step,target:target,score:score,snapshot:snapshot};
});
