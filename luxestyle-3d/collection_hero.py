import sys
from PIL import Image, ImageDraw, ImageFont
# 2x2 Collection-Hero auf weiss mit Titel
files=[("out/shop/cat_grau_a.jpg","Grau-Tabby"),
       ("out/shop/cat_ingwer_a.jpg","Ingwer"),
       ("out/shop/cat_tuxedo_a.jpg","Tuxedo"),
       ("out/shop/cat_liegend_a.jpg","Anhänger")]
cell=620; pad=26; top=120
W=cell*2+pad*3; H=top+cell*2+pad*3
c=Image.new("RGB",(W,H),(255,255,255)); d=ImageDraw.Draw(c)
def font(sz,bold=True):
    p="/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf"%("-Bold" if bold else "")
    try: return ImageFont.truetype(p,sz)
    except: return ImageFont.load_default()
t="Handgemachte Katzen-Figuren"
d.text((pad,38),t,fill=(28,32,42),font=font(54))
for i,(fn,lab) in enumerate(files):
    r,cc=divmod(i,2); x=pad+cc*(cell+pad); y=top+pad+r*(cell+pad)
    im=Image.open(fn).convert("RGB").resize((cell,cell)); c.paste(im,(x,y))
    d.text((x+14,y+cell-46),lab,fill=(60,64,72),font=font(30))
c.save("out/shop/collection_hero.jpg",quality=92); print("OK collection", c.size)
