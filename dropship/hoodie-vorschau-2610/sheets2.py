import json, numpy as np
from PIL import Image, ImageDraw, ImageFont
from scipy import ndimage as ndi
import importlib.util, sys
D='/tmp/vz/gem/'; O=D+'final/'
spec=importlib.util.spec_from_file_location('c2',D+'compose2.py')
# compose2 läuft beim Import; wir brauchen nur die Hilfsfunktionen → Quelltext bis «SPEC» laden
src=open(D+'compose2.py').read().split('# Bild, Ansicht')[0]
ns={}; exec(src,ns)
logo_rgba,paste,paste_text,shade,PXCM=ns['logo_rgba'],ns['paste'],ns['paste_text'],ns['shade'],ns['PXCM']
pos=json.load(open(O+'pos.json'))
B=lambda s:ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf',s)
R=lambda s:ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-Regular.otf',s)
SB=lambda s:ImageFont.truetype('/usr/share/fonts/opentype/inter/Inter-SemiBold.otf',s)
RED=(214,24,36); WHITE=(244,244,244); GREY=(176,176,182); BG=(14,14,16)

def detail(name,region,z,logo_key='logo',txt=None,txtname=None):
    """Ausschnitt des Fotos vergrössert; Logo und Name werden in der Vergrösserung NEU gesetzt (scharf aus der 4K-Datei)."""
    base=Image.open(D+name+'.png').convert('RGB'); x0,y0,x1,y1=region
    crop=base.crop(region).resize((round((x1-x0)*z),round((y1-y0)*z)),Image.LANCZOS)
    lx,ly,lw,lh=pos[name]['logo']; w=round(lw*z); la,lal=logo_rgba(w)
    px,py=round((lx-x0)*z),round((ly-y0)*z)
    sh=shade(crop,px+w//2,py+la.shape[0]//2,w,w)
    out=paste(crop,la,lal,px,py,sh)
    if txtname:
        m=pos[name]['text']; tx,ty,tw,th=m
        # Text in der Vergrösserung neu rendern
        from PIL import ImageFont as IF
        cap=12/10*PXCM*z; size=int(cap/0.727); f=IF.truetype('/usr/share/fonts/opentype/inter/Inter-ExtraBold.otf',size)
        tmp=Image.new('L',(int(size*len(txtname)*0.9)+20,int(size*1.4)),0); ImageDraw.Draw(tmp).text((10,0),txtname,font=f,fill=255); tmp=tmp.crop(tmp.getbbox())
        a=np.asarray(out).astype(np.float32); cxm=px+w//2; X=cxm-tmp.size[0]//2; Y=round((ty-y0)*z)
        al=np.asarray(tmp).astype(np.float32)[...,None]/255; reg=a[Y:Y+tmp.size[1],X:X+tmp.size[0]]
        a[Y:Y+tmp.size[1],X:X+tmp.size[0]]=reg*(1-al)+np.array((200,16,46),dtype=np.float32)*al
        out=Image.fromarray(a.clip(0,255).astype(np.uint8))
    return out

def detail_fix(name,cx,cy,ow,oh,z,txtname=None):
    x0=round(cx-ow/z/2); y0=round(cy-oh/z/2); x1=round(x0+ow/z); y1=round(y0+oh/z)
    im=detail(name,(x0,y0,x1,y1),z,txtname=txtname)
    return im.resize((ow,oh),Image.LANCZOS) if im.size!=(ow,oh) else im

def kopf(w,titel,unter):
    h=150; im=Image.new('RGB',(w,h),BG); d=ImageDraw.Draw(im)
    d.text((48,26),titel,font=B(50),fill=WHITE); d.text((48,96),unter,font=R(26),fill=GREY)
    t='ENTWURF · KEINE FREIGABE'; f=B(24); tw=d.textlength(t,font=f); x1=w-48; x0=x1-tw-48
    d.rectangle((x0,40,x1,96),outline=RED,width=4); d.text((x0+24,52),t,font=f,fill=RED)
    d.rectangle((0,h-5,w,h),fill=RED); return im
def label(w,name,seite):
    h=96; im=Image.new('RGB',(w,h),BG); d=ImageDraw.Draw(im); bw=320; x0=(w-bw)//2
    d.rectangle((x0,10,x0+bw,h-8),fill=(0,0,0)); d.polygon([(x0,10),(x0+78,10),(x0+44,h-8),(x0,h-8)],fill=RED)
    f1=B(36); f2=B(28); t1=d.textlength(name,font=f1); d.text((x0+bw/2+18-t1/2,12),name,font=f1,fill=RED)
    t2=d.textlength(seite,font=f2); d.text((x0+bw/2+18-t2/2,54),seite,font=f2,fill=WHITE); return im
def captioned(img,cap,width):
    s=width/img.size[0]; im=img.resize((width,round(img.size[1]*s)),Image.LANCZOS)
    c=Image.new('RGB',(width,im.size[1]+58),(0,0,0)); c.paste(im,(0,0)); d=ImageDraw.Draw(c)
    tw=d.textlength(cap,font=B(22)); d.text(((width-tw)/2,im.size[1]+15),cap,font=B(22),fill=WHITE); return c
def tabelle(w,titel,zeilen,notiz):
    h=60+len(zeilen)*40+40+len(notiz)*32+24; im=Image.new('RGB',(w,h),BG); d=ImageDraw.Draw(im)
    d.text((48,18),titel,font=B(30),fill=WHITE); y=70
    for l,r,fett in zeilen:
        f=B(26) if fett else R(26); d.text((48,y),l,font=f,fill=WHITE if fett else GREY); tw=d.textlength(r,font=f); d.text((760-tw,y),r,font=f,fill=WHITE if fett else GREY)
        if fett: d.line((48,y-6,760,y-6),fill=RED,width=2)
        y+=40
    y+=16
    for n in notiz: d.text((48,y),n,font=R(22),fill=GREY); y+=32
    return im

def sheet(variant,files,labels,details,titel,unter,tab):
    PW=720; panels=[Image.open(O+f+'_final.png').convert('RGB') for f in files]
    panels=[p.resize((PW,round(p.size[1]*PW/p.size[0])),Image.LANCZOS) for p in panels]
    W=PW*4+30; row=Image.new('RGB',(W,96+panels[0].size[1]),BG); x=0
    for p,(n,s) in zip(panels,labels): row.paste(label(PW,n,s),(x,0)); row.paste(p,(x,96)); x+=PW+10
    dw=(W-30*(len(details)-1)-96)//len(details); dets=[captioned(i,c,dw) for i,c in details]
    dh=max(d.size[1] for d in dets); drow=Image.new('RGB',(W,dh+30),BG); x=48
    for d in dets: drow.paste(d,(x,10)); x+=dw+30
    parts=[kopf(W,titel,unter),row,drow,tab]
    sh=Image.new('RGB',(W,sum(p.size[1] for p in parts)),BG); y=0
    for p in parts: sh.paste(p,(0,y)); y+=p.size[1]
    return sh

NOTIZ=['Foto-Vorschau: Hoodie-Fotos bildbearbeitet. Das Logo ist aus Ihrer Bildvorlage hochaufgelöst aufbereitet (KI-gestützt): bitte mit Ihrem Original vergleichen (Knotenwerk, Symbol unten, Helm) und Abweichungen melden.',
       'Grössen im Druck (Grösse L): Brustlogo ca. 9 cm breit, Name in Grossbuchstaben ca. 12 mm hoch, Rückenlogo ca. 24 cm breit. Gedruckt wird erst nach Ihrer schriftlichen Freigabe.']
W4=720*4+30
# ---- B ----
P=lambda n:pos[n]['logo']
def chest(n,txt,ow,oh,z): lx,t,w,h=P(n); return detail_fix(n,lx+w//2,t+100,ow,oh,z,txtname=txt)
def back(n,ow,oh,z): lx,t,w,h=P(n); return detail_fix(n,lx+w//2,t+h//2,ow,oh,z)
detB=[(chest('B1','ROBIN',918,640,1.8),'Brustlogo mit Name (Robin)'),(chest('B3','ALEX',918,640,1.8),'Brustlogo mit Name (Alex)'),(back('B2f',918,640,1.4),'Rückenlogo')]
tabB=tabelle(W4,'Variante B · Hoodie klassisch · Kosten für 2 Stück',[('2 × Hoodie Grösse L, je CHF 38.90','CHF 77.80',False),('Gestaltung und Druckdaten','CHF 60.00',False),('Versand Schweiz, A-Post','CHF 7.00',False),('Total','CHF 144.80',True)],
  ['Material: 50 % Baumwolle, 50 % Polyester, vorgeschrumpft, klassischer Schnitt, weiches Airjet-Garn; doppelt genähter Kragen, Schultern, Armausschnitte, Bündchen und Saum.','Direktdruck auf Brust und Rücken; die Muster Ihrer Vorlage gibt es bei dieser Variante nicht.']+NOTIZ)
sB=sheet('B',['B1','B2f','B3','B4'],[('ROBIN','VORNE'),('ROBIN','HINTEN'),('ALEX','VORNE'),('ALEX','HINTEN')],detB,'Variante B · klassisch · 2 Hoodies, Grösse L','Schwarzer Hoodie · Brust links: Logo mit Name (Robin / Alex) · Rücken: Logo gross · Vorschau für Tanja Keller',tabB)
sB.save(O+'druckvorschau-B-klassisch-hires.png')
# ---- A ----
detA=[(chest('A1','ROBIN',681,560,1.35),'Brustlogo mit Name (Robin)'),(chest('A3f','ALEX',681,560,1.35),'Brustlogo mit Name (Alex)'),(back('A2',681,560,1.05),'Rückenlogo'),
      (Image.open(D+'A1.png').convert('RGB').crop((1175,770,1856,1330)).resize((681,560)),'Ärmel mit Muster')]
tabA=tabelle(W4,'Variante A · Allover-Hoodie · Kosten für 2 Stück',[('2 × Allover-Hoodie Grösse L, je CHF 84.90','CHF 169.80',False),('Gestaltung und Druckdaten','CHF 120.00',False),('Versand Schweiz, A-Post','CHF 7.00',False),('Total','CHF 296.80',True)],
  ['Material: je nach Fertigungsstandort 96 % recycelter Polyester / 4 % Elastan (USA/Mexiko) bzw. 95 % / 5 % (Lettland); ca. 308 g/m², innen gebürstetes Fleece, doppellagige Kapuze.','Allover-Sublimationsdruck: Das Muster kann bis an die Nähte reichen. Die Vorschau zeigt das Muster Ihrer Vorlage (diagonale rote Pinselstriche, silbergraue Tannen); Details legen wir vor dem Druck mit Ihnen fest.']+NOTIZ)
sA=sheet('A',['A1','A2','A3f','A4f'],[('ROBIN','VORNE'),('ROBIN','HINTEN'),('ALEX','VORNE'),('ALEX','HINTEN')],detA,'Variante A · Allover · 2 Hoodies, Grösse L','Schwarz mit rot-silbernem Muster wie in Ihrer Vorlage · Logo und Name · Vorschau für Tanja Keller',tabA)
sA.save(O+'druckvorschau-A-allover-hires.png')
print(sB.size,sA.size)
