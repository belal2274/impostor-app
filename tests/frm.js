const pp=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const U='http://localhost:8001/';
async function mk(br,name,items,fr,photoav){const ctx=await br.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 pg.on('pageerror',e=>console.log('PAGEERR',name,e.message));pg.nm=name;
 await pg.goto(U);await pg.evaluate((n,i,f,a)=>{localStorage.setItem('ob','1');localStorage.setItem('adult','1');localStorage.setItem('pname',n);localStorage.setItem('pts','800');localStorage.setItem('items',i);if(f)localStorage.setItem('pfr',f);localStorage.setItem('pav',a)},name,items,fr,photoav);await pg.reload();await sleep(1200);return pg}
const clickT=(pg,t,sel='button')=>pg.evaluate((t,sel)=>{const b=[...document.querySelectorAll(sel)].find(b=>b.textContent.trim().startsWith(t));if(!b)throw new Error('no btn '+t);b.click()},t,sel);
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const all=Array.from({length:22},(_,i)=>'k'+(i+1)).join(',');
 const A=await mk(br,'أحمد',all,'k20','m5'),B=await mk(br,'بيلا','k19','k19','w9'),C=await mk(br,'سامي','k22','k22','f3');
 await A.evaluate(()=>document.querySelectorAll('.hdr .ib')[1].click());await sleep(500);await A.evaluate(()=>window.scrollTo(0,1900));await sleep(300);await A.screenshot({path:'/tmp/f_store.png'});await A.evaluate(()=>window.scrollTo(0,0));
 await A.evaluate(()=>document.querySelectorAll('#app button')[0].click());await sleep(300);
 await A.evaluate(()=>document.querySelector('.chip').onclick());await sleep(500);await A.evaluate(()=>window.scrollTo(0,700));await sleep(300);await A.screenshot({path:'/tmp/f_prof.png'});
 await A.evaluate(()=>[...document.querySelectorAll('button')].find(x=>x.textContent=='حفظ').click());await sleep(400);
 await A.evaluate(()=>{document.querySelectorAll('.cat')[1].click()});await sleep(300);await clickT(A,'اعمل الروم');await sleep(1200);const code=await A.evaluate(()=>location.hash.slice(1));
 for(const p of [B,C])await p.evaluate(c=>{const i=document.querySelector('input[type=text]');i.value=c;[...document.querySelectorAll('button')].find(b=>b.textContent==='دخول').click()},code);
 await sleep(3500);await A.screenshot({path:'/tmp/f_lobby.png'});await B.screenshot({path:'/tmp/f_lobbyB.png'});
 for(const p of [A,B,C])await clickT(p,'استعداد');await sleep(6500);
 for(const p of [A,B,C])await p.evaluate(()=>{const r=document.querySelector('.reveal');if(r)r.click()});await sleep(2500);
 await B.screenshot({path:'/tmp/f_round.png'});await br.close()})()
