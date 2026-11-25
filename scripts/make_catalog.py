#!/usr/bin/env python3
"""Builds the catalog from items.json (stickers, sounds, frames) and from the files in img/av (avatars).
Run from the repo root after adding or changing anything:  python3 scripts/make_catalog.py
Writes app/src/main/assets/www/catalog.js (used by the app) and catalog.json (copy it into the bmf-lobby repo root for the server prices)."""
import json,os,re,sys
W='app/src/main/assets/www/'
it=json.load(open('items.json',encoding='utf8'))
err=[]
for kind,pref,ext in (('stickers','s',None),('sounds','a',None),('frames','k',None)):
    for i,x in enumerate(it[kind],1):
        if not re.fullmatch(pref+r'\d{1,3}',x['id']): err.append('bad id '+x['id'])
        if kind=='frames' and x['id']!='k%d'%i: err.append('frame ids must be k1..kN in order, got '+x['id'])
        if kind!='frames' and not os.path.exists(W+'fx/'+x['file']): err.append('missing file fx/'+x['file'])
        if not isinstance(x['price'],int) or x['price']<1: err.append('bad price '+x['id'])
for i,x in enumerate(it.get('fonts',[]),1):
    if x['id']!='f%d'%i: err.append('font ids must be f1..fN in order, got '+x['id'])
    if not os.path.exists(W+'fonts/'+x['file']): err.append('missing file fonts/'+x['file'])
    if x.get('lang') not in ('ar','en'): err.append('font lang must be ar or en: '+x['id'])
av={'m':[],'w':[],'f':[]}
for f in sorted(os.listdir(W+'img/av'),key=lambda n:(n[0],int(re.sub(r'\D','',n) or 0))):
    m=re.fullmatch(r'([mwf])(\d+)\.webp',f)
    if m: av[m.group(1)].append(f[:-5])
if err: sys.exit('\n'.join(err))
cat={'stickers':it['stickers'],'sounds':it['sounds'],'frames':it['frames'],'avatars':av,'rules':it.get('rules',{}),'wordIcons':it.get('word_icons',{}),'posters':it.get('posters',{}),'photos':it.get('photos',{}),'fonts':[{k:x[k] for k in ('id','file','lang','credit')} for x in it.get('fonts',[])]}
open(W+'catalog.js','w',encoding='utf8').write('var CATALOG='+json.dumps(cat,ensure_ascii=False)+';\n')
out={k:[dict({'id':x['id'],'price':x['price']},**({'adult':True} if x.get('adult') else {})) for x in cat[k]] for k in ('stickers','sounds','frames')};out['rules']=cat['rules']
json.dump(out,open('catalog.json','w'),indent=1)
print('ok',{k:len(v) for k,v in cat.items() if k!='avatars'},{k:len(v) for k,v in av.items()})
