import { spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
const tmp='_wd_tmp.html'
copyFileSync(join(REPO,'traumhaus.html'),join(REPO,tmp))
const { browser, page } = await spielOeffnen(tmp,{ warten: 55000 })
const r=await page.evaluate(()=>{
  const punkte=[[-26,95],[-21,105],[-46,110],[-28,93]]
  const THREE=window.THREE, out=[]
  ;(window._gebaeude||[]).forEach(g=>{
    punkte.forEach(p=>{
      if(Math.hypot(g.position.x-p[0],g.position.z-p[1])<3){
        const bb=new THREE.Box3().setFromObject(g)
        out.push({p:p.join(","),datei:g.userData.datei||"?",
          xVon:+bb.min.x.toFixed(1),xBis:+bb.max.x.toFixed(1),zVon:+bb.min.z.toFixed(1),zBis:+bb.max.z.toFixed(1)})
      }})})
  return out
})
console.log(JSON.stringify(r,null,0))
await browser.close();aufraeumen(tmp)
