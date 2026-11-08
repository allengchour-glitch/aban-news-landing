// Suchfortschritt enthält nur den Abfragekontext und den undurchsichtigen Shopify-Cursor.
import fs from 'node:fs';
export function scanLesen(file, kontext) {
  if (!file || !fs.existsSync(file)) return null;
  let data;
  try { data=JSON.parse(fs.readFileSync(file,'utf8')); }
  catch { throw new Error('CJ_REVIEW_SCAN: Suchstand unlesbar; vor Fortsetzung prüfen'); }
  if (data.version!==1 || typeof data.kontext!=='string' ||
      !(data.cursor===null || typeof data.cursor==='string' && data.cursor.length>0 && data.cursor.length<=4096)) {
    throw new Error('CJ_REVIEW_SCAN: Suchstand ungültig; vor Fortsetzung prüfen');
  }
  return data.kontext===kontext ? data.cursor : null;
}
export function scanSpeichern(file, kontext, cursor) {
  if (!file) return;
  if (!(cursor===null || typeof cursor==='string' && cursor.length>0 && cursor.length<=4096)) {
    throw new Error('CJ_REVIEW_SCAN: Fortsetzungscursor fehlt oder ist ungültig');
  }
  fs.writeFileSync(file+'.tmp',JSON.stringify({version:1,kontext,cursor})+'\n',{mode:0o600});
  fs.renameSync(file+'.tmp',file);
}
