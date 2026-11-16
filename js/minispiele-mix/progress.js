/* Lokaler Fortschritt ohne Speicherzugriffe. Im Browser nach core.js laden. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.MixProgress=factory(root.MixRules);})(typeof window!=='undefined'?window:this,function(R){
  'use strict';
  var badgeIds=['first','explorer','marathon','close'];
  function empty(){return {v:1,xp:0,matches:0,rounds:0,played:[],badges:[],claimed:[]};}
  function count(value){return Number.isSafeInteger(value)&&value>=0?value:0;}
  function validId(value){return typeof value==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(value);}
  function unique(values,valid){return Array.isArray(values)?values.filter(function(value,i){return valid(value)&&values.indexOf(value)===i;}):[];}
  function restore(raw){
    try{
      var p=typeof raw==='string'?JSON.parse(raw):raw;
      if(!p||p.v!==1||Array.isArray(p))return empty();
      return {v:1,xp:count(p.xp),matches:count(p.matches),rounds:count(p.rounds),
        played:unique(p.played,function(slug){return R.games.indexOf(slug)>=0;}),
        badges:unique(p.badges,function(id){return badgeIds.indexOf(id)>=0;}),
        // Bei doppelten IDs zählt die letzte Position als jüngste Beanspruchung.
        claimed:unique(Array.isArray(p.claimed)?p.claimed.slice().reverse():[],validId).reverse().slice(-100)};
    }catch(_){return empty();}
  }
  function level(profile){
    var xp=restore(profile).xp,into=xp%100;
    return {level:Math.floor(xp/100)+1,xp:xp,into:into,next:100,ratio:into/100};
  }
  function unlocked(profile){var n=level(profile).level;return n>=5?[0,1,2,3,4,5]:n>=3?[0,1,2,3,4]:[0,1,2,3];}
  function award(profile,run){
    var p=restore(profile),s=R.restore(run),result={profile:p,xp:0,newBadges:[],awarded:false};
    if(!s||s.phase!=='finished'||p.claimed.indexOf(s.id)>=0)return result;
    var played=s.deck.filter(function(_,i){return s.history[i]!==null;});
    if(!played.length)return result;
    var full=played.length===s.deck.length,points=R.score(s),xp=played.length*20+(full?40:0);
    p.xp=Math.min(Number.MAX_SAFE_INTEGER,p.xp+xp);
    p.matches=Math.min(Number.MAX_SAFE_INTEGER,p.matches+1);
    p.rounds=Math.min(Number.MAX_SAFE_INTEGER,p.rounds+played.length);
    p.played=unique(p.played.concat(played),function(){return true;});
    p.claimed=p.claimed.concat(s.id).slice(-100);
    var earned={first:full,explorer:p.played.length>=10,marathon:full&&s.deck.length===7,close:Math.abs(points[0]-points[1])<=1};
    result.newBadges=badgeIds.filter(function(id){return earned[id]&&p.badges.indexOf(id)<0;});
    p.badges=p.badges.concat(result.newBadges);
    result.xp=xp;result.awarded=true;return result;
  }
  return {empty:empty,restore:restore,level:level,award:award,unlocked:unlocked};
});
