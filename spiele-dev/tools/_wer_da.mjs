// Wer steht an den Konflikt-Punkten? Modellnamen + Masse ausgeben.
import { spielOeffnen, aufraeumen, REPO } from './th-lib.mjs'
import { copyFileSync } from 'node:fs'
import { join } from 'node:path'
const tmp='_wd_tmp.html'
copyFileSync(join(REPO,'traumhaus.html'),join(REPO,tmp))
const { browser, page } = await spielOeffnen(tmp,{ warten: 55000 })
const r=await page.evaluate(()=>{
  const punkte=[[77,121]]
  const THREE=window.THREE, out=[]
  ;(window._gebaeude||[]).forEach(g=>{
    punkte.forEach(p=>{
      const d=Math.hypot(g.position.x-p[0],g.position.z-p[1])
      if(d<6){
        const bb=new THREE.Box3().setFromObject(g),s=new THREE.Vector3();bb.getSize(s)
        out.push({punkt:p.join(","),datei:g.userData.datei||"?",x:Math.round(g.position.x),z:Math.round(g.position.z),
          breite:+s.x.toFixed(1),tiefe:+s.z.toFixed(1)})
      }})})
  return out
})
console.log(JSON.stringify(r,null,1))
await browser.close();aufraeumen(tmp)
