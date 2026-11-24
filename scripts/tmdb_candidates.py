import json,re,os,urllib.request,urllib.parse
K=open(os.environ.get('TMDB_KEY_FILE','/home/sandbox/.vault/tmdb-api-key-ee8880/password')).read().strip()
s=open('/tmp/imp/app/src/main/assets/www/index.html',encoding='utf8').read()
k=s.find('[',s.find("var CATS="));d=0
for n in range(k,len(s)):
    if s[n]=='[':d+=1
    elif s[n]==']':
        d-=1
        if d==0:break
cats=json.loads(s[k:n+1])
words=[re.sub(r'^\S+\s+','',x) if not re.search(r'[\u0600-\u06FFA-Za-z]',x.split()[0]) and len(x.split())>1 else x for x in cats[2][2]]
def get(q):
    u='https://api.themoviedb.org/3/search/movie?'+urllib.parse.urlencode({'api_key':K,'language':'ar','query':q})
    return json.load(urllib.request.urlopen(u,timeout=20)).get('results',[])
out={}
for w in words:
    try:r=get(w)
    except Exception as e:r=[];print('ERR',w,e)
    out[w]=[{'id':x['id'],'title':x['title'],'orig':x.get('original_title'),'date':x.get('release_date'),'lang':x.get('original_language'),'poster':x.get('poster_path'),'pop':round(x.get('popularity',0),1)} for x in r[:5]]
json.dump(out,open('cand.json','w'),ensure_ascii=False,indent=1)
print(len(words))
