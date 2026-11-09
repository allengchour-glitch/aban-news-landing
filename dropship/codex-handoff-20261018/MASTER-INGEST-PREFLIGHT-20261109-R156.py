#!/usr/bin/env python3
import argparse, hashlib, json, os, subprocess, sys
from pathlib import Path

MASTER_ID = 'luxe_sternenprojektor_master_20261018'
PRODUCT_ID = 'gid://shopify/Product/15521256604033'
MUSIC_SHA256 = 'a7674ecadb21fca447267be25c7e9cc44f35d2a1583ec0953d4185c7a3b16688'
VARIANTS = {
 'A': ('gid://shopify/ProductVariant/68122445283719','CJSN139239101AZ'),
 'B': ('gid://shopify/ProductVariant/68122445316487','CJSN139239102BY'),
 'C': ('gid://shopify/ProductVariant/68122445349255','CJSN139239103CX'),
 'D': ('gid://shopify/ProductVariant/68122445382023','CJSN139239104DW'),
 'E': ('gid://shopify/ProductVariant/68122445414791','CJSN139239105EV'),
 'F': ('gid://shopify/ProductVariant/68122445447559','CJSN139239106FU'),
 'G': ('gid://shopify/ProductVariant/68122445480327','CJSN139239107GT'),
}
CLIPS = {'identity':6.0,'operation':9.0,'projection':10.0,'detail':7.0,'hero':8.0}
GRANTS = ('commercialEdit','shop','socialOrganic','socialPaid','metricoolUpload')
FINAL_GATES = ('imageQuality','productIdentity','audio','textReadability','platformCrops','ownerApproval')

def sha(path):
 h=hashlib.sha256()
 with open(path,'rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()

def probe(path):
 cmd=['ffprobe','-v','error','-show_entries','format=duration:stream=index,codec_type,codec_name,width,height,r_frame_rate,avg_frame_rate,nb_frames,pix_fmt,channels','-of','json',path]
 return json.loads(subprocess.check_output(cmd,text=True))

def fps_value(s):
 if not s: return 0.0
 if '/' in str(s):
  a,b=str(s).split('/',1); return float(a)/float(b) if float(b) else 0.0
 return float(s)

def check_file(obj,label,errors,real):
 p=obj.get('path'); expected=obj.get('sha256')
 if not p: errors.append(f'{label}.path fehlt'); return None
 if not expected or len(expected)!=64: errors.append(f'{label}.sha256 fehlt/ungueltig')
 if not real: return None
 if not Path(p).is_file(): errors.append(f'{label}.path fehlt real: {p}'); return None
 actual=sha(p)
 if expected != actual: errors.append(f'{label}.sha256 stimmt nicht')
 return p

def validate(m, real=True):
 e=[]
 if m.get('masterId')!=MASTER_ID: e.append('masterId falsch')
 p=m.get('product',{})
 if p.get('productId')!=PRODUCT_ID: e.append('productId falsch')
 label=p.get('selectionLabel'); pair=VARIANTS.get(label)
 if not pair: e.append('Auswahl muss aktuell A-G sein')
 elif (p.get('variantId'),p.get('sku'))!=pair: e.append('Varianten-ID/SKU passen nicht zur Auswahl')
 token=p.get('unitToken')
 if not token or len(token)<12: e.append('unitToken fehlt/zu kurz')
 if not p.get('cjVid'): e.append('CJ-VID fehlt')
 img=p.get('referenceImage',{})
 check_file(img,'product.referenceImage',e,real)
 clips=m.get('clips',{})
 clip_hashes=[]
 for name,min_s in CLIPS.items():
  c=clips.get(name,{})
  path=check_file(c,f'clips.{name}',e,real)
  if c.get('unitToken')!=token: e.append(f'clips.{name}.unitToken abweichend')
  if c.get('width',0)<1080 or c.get('height',0)<1920: e.append(f'clips.{name} nicht nativ mindestens 1080x1920')
  if abs(float(c.get('fps',0))-30.0)>0.01: e.append(f'clips.{name} nicht echte 30fps')
  if float(c.get('durationSeconds',0))<min_s: e.append(f'clips.{name} kuerzer als {min_s}s')
  if c.get('sha256'): clip_hashes.append(c['sha256'])
  if real and path:
   try:
    q=probe(path); vs=next((x for x in q.get('streams',[]) if x.get('codec_type')=='video'),None)
    dur=float(q.get('format',{}).get('duration') or 0)
    if not vs: e.append(f'clips.{name} ohne Videostream')
    else:
     if int(vs.get('width') or 0)!=int(c.get('width') or 0) or int(vs.get('height') or 0)!=int(c.get('height') or 0): e.append(f'clips.{name} Metadaten stimmen nicht mit ffprobe')
     if abs(fps_value(vs.get('avg_frame_rate') or vs.get('r_frame_rate'))-float(c.get('fps') or 0))>.01: e.append(f'clips.{name} fps stimmen nicht mit ffprobe')
     if abs(dur-float(c.get('durationSeconds') or 0))>.08: e.append(f'clips.{name} Dauer stimmt nicht mit ffprobe')
   except Exception as ex: e.append(f'clips.{name} ffprobe fehlgeschlagen: {type(ex).__name__}')
 r=m.get('rights',{})
 check_file(r,'rights.artifact',e,real)
 if r.get('unitToken')!=token: e.append('rights.unitToken abweichend')
 for g in GRANTS:
  if r.get('grants',{}).get(g) is not True: e.append(f'Recht {g} fehlt')
 if not r.get('signedBy') or not r.get('signedAt'): e.append('Rechtezeichnung fehlt')
 required=set(clip_hashes+[img.get('sha256')])-{None,''}
 bound=set(r.get('boundSha256',[]))
 if not required.issubset(bound): e.append('Rechtebeleg bindet nicht alle Clip-/Bildhashes')
 mu=m.get('music',{})
 check_file(mu,'music.file',e,real)
 if mu.get('sha256')!=MUSIC_SHA256: e.append('Pflichtmusik-Hash falsch')
 check_file(mu.get('rightsArtifact',{}),'music.rightsArtifact',e,real)
 for g in ('commercialUseApproved','listeningApproved','mixApproved'):
  if mu.get(g) is not True: e.append(f'Musikgate {g} fehlt')
 if m.get('voiceover') is not False: e.append('Voiceover muss false sein')
 out=m.get('output',{})
 outpath=check_file(out,'output',e,real)
 for k,v in {'width':1080,'height':1920,'fps':30,'frames':540,'durationSeconds':18.0,'videoCodec':'h264','pixelFormat':'yuv420p','audioCodec':'aac','audioChannels':2}.items():
  ov=out.get(k)
  if isinstance(v,float):
   if abs(float(ov or 0)-v)>.01: e.append(f'output.{k} falsch')
  elif ov!=v: e.append(f'output.{k} falsch')
 if out.get('unitToken')!=token: e.append('output.unitToken abweichend')
 if real and outpath:
  try:
   q=probe(outpath); streams=q.get('streams',[]); vs=next((x for x in streams if x.get('codec_type')=='video'),None); a=next((x for x in streams if x.get('codec_type')=='audio'),None)
   if not vs or not a: e.append('output braucht genau Video und Audio')
   if len(streams)!=2: e.append('output braucht genau zwei Streams')
   if vs:
    measured_frames=int(vs.get('nb_frames') or 0)
    if measured_frames!=540: e.append('output ffprobe Frames ungleich540')
   if a and int(a.get('channels') or 0)!=2: e.append('output Audio nicht Stereo')
  except Exception as ex: e.append(f'output ffprobe fehlgeschlagen: {type(ex).__name__}')
 qa=m.get('finalQa',{})
 for g in FINAL_GATES:
  if qa.get(g) is not True: e.append(f'Final-QA {g} fehlt')
 status='PASS_RELEASE_READY' if not e and real else ('PASS_METADATA_ONLY_NOT_RELEASEABLE' if not e else 'FAIL_BLOCKED')
 return {'status':status,'releaseReady':status=='PASS_RELEASE_READY','mode':'release' if real else 'metadata-only','errorCount':len(e),'errors':e}

def main():
 ap=argparse.ArgumentParser(); ap.add_argument('manifest'); ap.add_argument('--mode',choices=['release','metadata'],default='release'); ap.add_argument('--json-out'); a=ap.parse_args()
 m=json.load(open(a.manifest)); result=validate(m,a.mode=='release')
 s=json.dumps(result,ensure_ascii=False,indent=2)
 if a.json_out: Path(a.json_out).write_text(s+'\n')
 print(s); return 0 if result['status'].startswith('PASS') else 2
if __name__=='__main__': sys.exit(main())
