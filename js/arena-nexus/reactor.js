/* Reaktor-Regeln ohne DOM/GPU; dieselbe Logik läuft in den Zustandstests. */
(function(root){
  "use strict";
  var MAX_HP=300, REPAIR_HP=60, REPAIR_COST=12;
  function create(){return {hp:MAX_HP,maxhp:MAX_HP,outcome:null,reason:null,repairs:0,stationSent:false};}
  function authority(role){return role!=="client";}
  function damage(r,amount,role){
    if(!authority(role)||r.outcome||!Number.isFinite(amount)||amount<=0)return 0;
    var loss=Math.min(r.hp,amount);r.hp=Math.max(0,r.hp-loss);return loss;
  }
  function repair(r,state,role,running){
    if(!authority(role)||!running||r.outcome||r.hp<=0||r.hp>=r.maxhp||state.buildPhase!=="build"||state.scrap<REPAIR_COST)return false;
    state.scrap-=REPAIR_COST;r.hp=Math.min(r.maxhp,r.hp+REPAIR_HP);r.repairs++;return true;
  }
  function finish(r,outcome,reason,role){
    if(!authority(role)||r.outcome)return false;
    if(outcome==="win"&&(r.hp<=0||reason!=="nexus"))return false;
    if(outcome==="loss"&&((reason!=="reactor"&&reason!=="crew")||(reason==="reactor"&&r.hp>0)))return false;
    if(outcome!=="win"&&outcome!=="loss")return false;
    r.outcome=outcome;r.reason=reason;return true;
  }
  function pack(r){return [Math.ceil(r.hp),r.maxhp,r.outcome,r.reason,r.repairs];}
  function read(r,data){
    if(!Array.isArray(data)||data.length<5||!Number.isFinite(data[0])||data[1]!==MAX_HP||data[0]<0||data[0]>MAX_HP||
      ![null,"win","loss"].includes(data[2])||![null,"nexus","reactor","crew"].includes(data[3])||
      !Number.isInteger(data[4])||data[4]<0)return false;
    if(data[2]==="win"&&(data[0]<=0||data[3]!=="nexus"))return false;
    if(data[2]===null&&data[3]!==null)return false;
    if(data[2]==="loss"&&((data[3]!=="crew"&&data[3]!=="reactor")||(data[3]==="reactor"&&data[0]>0)))return false;
    r.hp=data[0];r.maxhp=data[1];r.outcome=data[2];r.reason=data[3];r.repairs=data[4];return true;
  }
  function claimStation(r){if(!r.outcome||r.stationSent)return false;r.stationSent=true;return true;}
  function frameOK(m){
    function vector(a,n){return Array.isArray(a)&&a.length>=n&&a.slice(0,n).every(Number.isFinite);}
    return !!m&&typeof m.rid==="string"&&Number.isInteger(m.seq)&&m.seq>0&&vector(m.p1,3)&&vector(m.p2,2)&&
      [m.t,m.h1,m.m1,m.h2,m.m2,m.d1,m.d2,m.lv,m.xp,m.xn,m.k2,m.wv,m.sc,m.bt,m.ph].every(Number.isFinite)&&
      (m.bp==="build"||m.bp==="combat")&&Array.isArray(m.en)&&m.en.every(function(a){return vector(a,5)&&Number.isInteger(a[0])&&a[0]>=0&&a[0]<1024;})&&
      Array.isArray(m.eb)&&m.eb.every(function(a){return vector(a,2);})&&Array.isArray(m.st)&&m.st.length<=12&&m.st.every(function(a){
        return Array.isArray(a)&&["wall","spike","tower","pylon","slow","heal","shield"].includes(a[0])&&a.slice(1,6).length===5&&a.slice(1,6).every(Number.isFinite)&&a[3]>0&&a[4]>0&&a[3]<=a[4]&&Number.isInteger(a[5])&&(a[0]==="tower"?a[5]>=1&&a[5]<=3:a[5]===0);
      })&&(!m.cb||(vector(m.cb,5)&&Number.isInteger(m.cb[0])&&m.cb[0]>=0&&m.cb[0]<=2&&m.cb[4]>0));
  }
  // Angreifer verfolgen das feste Ziel. Nur physische Barrikaden halten sie auf.
  function target(enemy,r){return enemy.raider&&r.hp>0?{x:0,z:0,reactor:true}:null;}
  var api={MAX_HP:MAX_HP,REPAIR_HP:REPAIR_HP,REPAIR_COST:REPAIR_COST,create:create,damage:damage,repair:repair,finish:finish,pack:pack,read:read,claimStation:claimStation,frameOK:frameOK,target:target};
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
  else root.ArenaReactor=api;
})(typeof window!=="undefined"?window:globalThis);
