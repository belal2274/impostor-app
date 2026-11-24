import json,re,os,urllib.request
from PIL import Image
import io
d=json.load(open('cand.json'))
def norm(t):return re.sub(r'[\u200e\u200f\u064b-\u065f\s]','',t).replace('ى','ي').replace('أ','ا').replace('إ','ا').replace('ة','ه')
sel={};flag={}
for w,c in d.items():
    ex=[x for x in c if norm(x['title'])==norm(w) and x['poster']]
    if not ex: flag[w]='no exact match' if c else 'no hits';continue
    ex.sort(key=lambda x:-x['pop']);sel[w]=ex[0]
    if len(ex)>1: flag[w]='multiple exact'
os.makedirs('img',exist_ok=True)
for w,x in sel.items():
    f='img/%d.jpg'%x['id']
    if os.path.exists(f):continue
    b=urllib.request.urlopen('https://image.tmdb.org/t/p/w342'+x['poster'],timeout=30).read()
    im=Image.open(io.BytesIO(b)).convert('RGB');im=im.resize((300,round(300*im.height/im.width)));im.save(f,'JPEG',quality=72,optimize=True)
json.dump({'sel':sel,'flag':flag},open('sel.json','w'),ensure_ascii=False,indent=1)
print(len(sel),len(flag),sum(os.path.getsize('img/'+f) for f in os.listdir('img'))//1024,'KB')
print({w:f for w,f in flag.items()})
