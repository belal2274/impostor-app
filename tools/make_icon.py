from PIL import Image,ImageDraw,ImageFilter,ImageChops,ImageFont
import math
S=3;W=512*S
def L():return Image.new('RGBA',(W,W),(0,0,0,0))
def vgrad(c1,c2,y0=0,y1=W):
    g=Image.linear_gradient('L').resize((W,W))  # black top -> white bottom
    return Image.composite(Image.new('RGBA',(W,W),c2),Image.new('RGBA',(W,W),c1),g)
def hgrad(c1,c2):
    g=Image.linear_gradient('L').resize((W,W)).rotate(90)  # white left->black right? check
    g=ImageChops.invert(g) if False else g
    return Image.composite(Image.new('RGBA',(W,W),c1),Image.new('RGBA',(W,W),c2),g)
def radial(c_in,c_out,cx,cy,r):
    im=Image.new('RGBA',(W,W));px=Image.new('L',(W,W))
    m=Image.radial_gradient('L').resize((int(2*r*W),int(2*r*W)))
    full=Image.new('L',(W,W),255);full.paste(m,(int(cx*W-r*W),int(cy*W-r*W)))
    return Image.composite(Image.new('RGBA',(W,W),c_out),Image.new('RGBA',(W,W),c_in),full)
def shape(fn):
    m=Image.new('L',(W,W),0);fn(ImageDraw.Draw(m));return m
def paint(base,mask,fill,blur=0):
    if blur:mask=mask.filter(ImageFilter.GaussianBlur(blur*S))
    if isinstance(fill,tuple):fill=Image.new('RGBA',(W,W),fill)
    layer=L();layer.paste(fill,(0,0),mask);base.alpha_composite(layer)
def clipped(base,mask,fill,clipmask,blur=0):
    if blur:mask=mask.filter(ImageFilter.GaussianBlur(blur*S))
    m=ImageChops.multiply(mask,clipmask);paint(base,m,fill)
def E(d,x,y,rx,ry):d.ellipse([(x-rx)*S,(y-ry)*S,(x+rx)*S,(y+ry)*S],fill=255)
def RR(d,x0,y0,x1,y1,r):d.rounded_rectangle([x0*S,y0*S,x1*S,y1*S],radius=r*S,fill=255)
def rot(mask,ang,cx,cy):return mask.rotate(ang,center=(cx*S,cy*S),resample=Image.BICUBIC)
FONT=ImageFont.truetype('/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',84*S)
def draw(dark,pal='gold',layer='all'):
    G=pal=='green'
    if dark:base=radial((120,50,200,255),(14,8,40,255),0.5,0.42,0.75)
    elif G:base=radial((150,245,180,255),(14,120,100,255),0.5,0.40,0.80)
    else:base=radial((255,214,90,255),(235,90,40,255),0.5,0.40,0.80)
    # rays
    ray=shape(lambda d:[d.polygon([(256*S,200*S),((256+700*math.cos(math.radians(a)))*S,(200+700*math.sin(math.radians(a)))*S),((256+700*math.cos(math.radians(a+7)))*S,(200+700*math.sin(math.radians(a+7)))*S)],fill=255) for a in range(0,360,24)])
    paint(base,ray,(255,255,255,26 if not dark else 18),blur=2)
    if layer=='fg':base=L()
    # ---- body (hoodie)
    body=shape(lambda d:d.pieslice([30*S,335*S,482*S,800*S],180,360,fill=255))
    hoodg=(vgrad((50,130,110,255),(16,56,56,255)) if G else vgrad((86,60,150,255),(30,20,70,255))) if not dark else vgrad((120,80,190,255),(40,24,90,255))
    paint(base,body,hoodg)
    # rim light right
    rim=shape(lambda d:d.arc([30*S,335*S,482*S,800*S],292,352,fill=255,width=12*S))
    rim=ImageChops.multiply(rim,body)
    paint(base,rim,((190,255,210,190) if G else (255,200,120,170)) if not dark else (190,140,255,200),blur=2)
    # hood
    hood=shape(lambda d:(E(d,256,225,128,150),RR(d,128,215,384,360,60)))
    paint(base,hood,(vgrad((44,112,96,255),(20,66,62,255)) if G else vgrad((70,48,130,255),(36,24,84,255))) if not dark else vgrad((110,74,180,255),(48,30,100,255)))
    # inner hood shadow
    inner=shape(lambda d:E(d,256,232,100,122))
    paint(base,inner,(14,8,34,255))
    # face skin (visible right part) clip to inner
    skin=shape(lambda d:E(d,262,238,84,108))
    paint(base,skin,radial((255,214,176,255),(205,140,108,255),0.55,0.46,0.22))
    # shadow cast by mask on face
    # right eye (sly) and brow, smirk
    eye=shape(lambda d:E(d,312,222,23,15)); paint(base,eye,(255,255,255,255))
    iris=shape(lambda d:E(d,306,223,10,10)); paint(base,iris,(60,36,20,255))
    pup=shape(lambda d:E(d,305,223,5,5)); paint(base,pup,(0,0,0,255))
    hl=shape(lambda d:E(d,302,219,3,3)); paint(base,hl,(255,255,255,255))
    lid=shape(lambda d:d.polygon([(286*S,214*S),(338*S,205*S),(336*S,213*S),(290*S,222*S)],fill=255)); paint(base,lid,(180,112,84,255),blur=0.8)
    brow=shape(lambda d:d.line([(288*S,200*S),(344*S,184*S)],fill=255,width=9*S)); paint(base,brow,(52,30,22,255),blur=0.8)
    sm=shape(lambda d:(d.arc([268*S,262*S,354*S,306*S],10,150,fill=255,width=7*S)));paint(base,sm,(120,50,46,255),blur=0.6)
    # drop shadow of mask
    sh=rot(shape(lambda d:E(d,236,262,98,118)),-10,236,262);paint(base,sh,(10,5,30,150),blur=12)
    # ---- mask (tilted)
    def maskshape(d):E(d,230,250,92,112)
    mk=rot(shape(maskshape),-10,230,250)
    left=rot(shape(lambda d:(d.pieslice([(230-92)*S,(250-112)*S,(230+92)*S,(250+112)*S],90,270,fill=255))),-10,230,250)
    right=ImageChops.subtract(mk,left)
    paint(base,left,hgrad((60,190,140,255),(20,110,96,255)) if G else hgrad((130,70,230,255),(70,30,150,255)))
    paint(base,right,vgrad((255,246,226,255),(240,206,160,255)))
    # edge trim
    trim=ImageChops.subtract(mk,mk.filter(ImageFilter.MinFilter(2*S*2+1)))
    paint(base,trim,(255,200,60,255))
    # gloss
    gl=rot(shape(lambda d:E(d,196,190,24,64)),-10,230,250);paint(base,ImageChops.multiply(gl,mk),(255,255,255,70),blur=4)
    # eyes holes
    def hole(x,y):return rot(shape(lambda d:(d.polygon([((x-30)*S,(y+4)*S),((x-4)*S,(y-16)*S),((x+30)*S,(y-12)*S),((x+22)*S,(y+14)*S),((x-8)*S,(y+16)*S)],fill=255))),-10,230,250)
    for x,y,col in ((190,222,(255,255,255,255)),(272,214,(26,14,50,255))):
        h=hole(x,y);paint(base,h,(20,10,40,255) if x<230 else (30,16,56,255))
        # glowing eye inside left hole
    gl2=rot(shape(lambda d:E(d,194,222,7,7)),-10,230,250);paint(base,gl2,(255,230,120,255),blur=1)
    gl3=rot(shape(lambda d:E(d,276,214,6,6)),-10,230,250);paint(base,gl3,(255,230,120,255),blur=1)
    # nose line + smile
    nz=rot(shape(lambda d:d.line([(230*S,244*S),(222*S,288*S)],fill=255,width=4*S)),-10,230,250);paint(base,nz,(60,30,110,160))
    sm2=rot(shape(lambda d:d.arc([176*S,262*S,284*S,322*S],12,168,fill=255,width=7*S)),-10,230,250);paint(base,sm2,(50,24,90,255))
    mid=rot(shape(lambda d:d.line([(230*S,138*S),(230*S,362*S)],fill=255,width=4*S)),-10,230,250);paint(base,ImageChops.multiply(mid,mk),(60,30,110,230))
    # blush
    for x in (170,296):
        b=rot(shape(lambda d:E(d,x,276,16,9)),-10,230,250);paint(base,ImageChops.multiply(b,mk),(255,110,140,110),blur=3)
    # ---- hand holding mask bottom-left
    for i,(x,y,r,ang) in enumerate([(150,330,15,-20),(172,346,15,-8),(194,352,15,0)]):
        f=shape(lambda d:RR(d,x-r,y-62,x+r,y+14,r));f=rot(f,ang,x,y)
        paint(base,f,vgrad((255,210,170,255),(214,150,118,255)))
        ol=ImageChops.subtract(f,f.filter(ImageFilter.MinFilter(2*S+1)));paint(base,ol,(150,90,70,255),blur=0.3)
    palm=shape(lambda d:RR(d,120,350,220,420,34));paint(base,palm,vgrad((246,196,156,255),(200,138,108,255)))
    th=rot(shape(lambda d:RR(d,205,306,233,360,14)),30,219,330);paint(base,th,vgrad((255,214,176,255),(214,150,118,255)))
    # sleeve cuff
    cuff=shape(lambda d:RR(d,108,402,232,470,22));paint(base,cuff,vgrad((70,170,140,255),(30,100,86,255)) if G else vgrad((120,84,190,255),(60,40,120,255)))
    return base
def mask(im,kind):
    im=im.resize((512,512),Image.LANCZOS);m=Image.new('L',(512,512),0);ImageDraw.Draw(m).rounded_rectangle([0,0,511,511],radius=110 if kind=='sq' else 256,fill=255)
    o=Image.new('RGBA',(512,512),(0,0,0,0));o.paste(im,(0,0),m);return o
import sys
out={}
for pal in ('gold','green'):
    full=draw(False,pal,'all');bg=draw(False,pal,'bg');fg=draw(False,pal,'fg')
    out[pal]=(full,bg,fg)
    full.resize((1024,1024),Image.LANCZOS).convert('RGB').save(f'icon_{pal}.png')
    bg.resize((432,432),Image.LANCZOS).convert('RGB').save(f'bg_{pal}.png')
    # foreground: scale into safe zone (about 70%) and center, anchor at bottom so the body fills
    f=fg.resize((432,432),Image.LANCZOS);c=Image.new('RGBA',(432,432),(0,0,0,0));sc=f.resize((int(432*0.78),int(432*0.78)),Image.LANCZOS);c.paste(sc,((432-sc.width)//2,int(432*0.14)),sc);c.save(f'fg_{pal}.png')
sheet=Image.new('RGB',(1000,420),(30,38,70))
for k,pal in enumerate(('gold','green')):
    m=mask(out[pal][0],'sq').resize((340,340));sheet.paste(m,(60+k*460,20),m)
    # adaptive preview: bg + fg composited circle
    comp=Image.open(f'bg_{pal}.png').convert('RGBA');comp.alpha_composite(Image.open(f'fg_{pal}.png'));cm=Image.new('L',(432,432),0);ImageDraw.Draw(cm).ellipse([0,0,431,431],fill=255)
    sm=Image.new('RGBA',(432,432),(0,0,0,0));sm.paste(comp,(0,0),cm);sm=sm.resize((72,72),Image.LANCZOS);sheet.paste(sm,(60+k*460+134,350),sm)
sheet.save('/downloads/icon_final.jpg',quality=93)
