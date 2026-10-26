import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
SRC="/tmp/claude-0/-home-user-aban-news-landing/4b3d580f-be07-56cf-9e7e-eb1e2c56b229/scratchpad/hoodie-anfrage/vorlage-kunde.png"
im=Image.open(SRC).convert('RGB'); a=np.asarray(im).astype(np.float32)
H,W,_=a.shape
blocks=[(236,228,332,303),(258,304,306,324),(990,228,1086,303),(1018,304,1056,324),(474,212,698,398),(1230,212,1458,398)]
m=np.zeros((H,W),bool)
for x0,y0,x1,y1 in blocks: m[y0:y1,x0:x1]=True
m=ndi.binary_dilation(m,iterations=5)
mx=a.max(axis=2)
valid=(~m)&(mx<58)
w=valid.astype(np.float32)
out=a.copy()
n=ndi.gaussian_filter(w,22)
f=np.stack([ndi.gaussian_filter(a[...,c]*w,22)/np.maximum(n,1e-4) for c in range(3)],-1)
rng=np.random.default_rng(3)
f=f+rng.normal(0,1.6,(H,W))[...,None]
soft=ndi.gaussian_filter(m.astype(np.float32),2)[...,None]
out=a*(1-soft)+f*soft
res=Image.fromarray(np.clip(out,0,255).astype(np.uint8)); res.save('maskiert3.png')
for k,b in {'h1':(0,95,430,640),'h2':(380,95,800,640),'h3':(765,95,1185,640),'h4':(1115,95,1536,640)}.items(): res.crop(b).save(k+'p.png')
