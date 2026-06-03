import sys
from PIL import Image,ImageFilter,ImageDraw
raw=Image.open(sys.argv[1]).convert("RGBA"); out=sys.argv[2]
W,H=raw.size
bbox=raw.split()[3].getbbox()
fx0,fy0,fx1,fy1=bbox; fw=fx1-fx0; fcx=(fx0+fx1)//2
canvas=Image.new("RGBA",(W,H),(255,255,255,255))
# weicher Kontaktschatten als Ellipse unter der Figur
sh=Image.new("L",(W,H),0); d=ImageDraw.Draw(sh)
ew=int(fw*0.72); eh=int(fw*0.16); ey=int(fy1-eh*0.4)
d.ellipse([fcx-ew//2,ey-eh//2,fcx+ew//2,ey+eh//2],fill=120)
sh=sh.filter(ImageFilter.GaussianBlur(fw*0.05))
shadow_rgba=Image.merge("RGBA",(Image.new("L",(W,H),60),)*3+(sh,))
canvas=Image.alpha_composite(canvas,shadow_rgba)
canvas=Image.alpha_composite(canvas,raw)
canvas.convert("RGB").save(out,quality=95)
print("composed",out)
