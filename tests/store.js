const pp=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const U='http://localhost:8001/';
async function mk(br,name,pts){const ctx=await br.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 pg.on('pageerror',e=>console.log('PAGEERR',name,e.message));pg.nm=name;
 await pg.goto(U);const su=await pg.evaluate(async(p)=>{const u='t'+Math.random().toString(36).slice(2,9);const r=await fetch('http://localhost:8090/acc',{method:'POST',body:JSON.stringify({t:'signup',u,p:'secret12',init:p})});const j=await r.json();return {u,tok:j.tok}},pts);await pg.evaluate((n,p)=>{localStorage.setItem('ob','1');localStorage.setItem('adult','1');localStorage.setItem('pname',n);localStorage.setItem('pts',p)},name,pts);await pg.evaluate(su=>{localStorage.setItem('acc_u',su.u);localStorage.setItem('acc_t',su.tok)},su);await pg.reload();await sleep(1200);return pg}
const clickT=(pg,t,sel='button')=>pg.evaluate((t,sel)=>{const b=[...document.querySelectorAll(sel)].find(b=>b.textContent.trim().startsWith(t));if(!b)throw new Error('no btn '+t+' :: '+document.body.innerText.slice(0,200));b.click()},t,sel);
const txt=pg=>pg.evaluate(()=>document.getElementById('app').innerText.replace(/\n+/g,' | ').slice(0,300));
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const A=await mk(br,'أحمد',25),B=await mk(br,'بيلا',0);
 // store
 await A.evaluate(()=>document.querySelectorAll('.hdr .ib')[1].click());await sleep(400);console.log('store:',await txt(A));
 await A.screenshot({path:'/downloads/store1.png'});
 await A.evaluate(()=>document.querySelectorAll('#app button')[2].click());await sleep(300);await clickT(A,'اشتري');await sleep(500);
 console.log('after buy1:',await txt(A),'items',await A.evaluate(()=>localStorage.items+' pts '+localStorage.pts));
 // buy sound a1 (5)
 await A.evaluate(()=>{const bs=[...document.querySelectorAll('#app .sw button.btn')];bs[0].click()});await sleep(300);await clickT(A,'اشتري');await sleep(500);
 console.log('items',await A.evaluate(()=>localStorage.items+' pts '+localStorage.pts));
 // cannot afford: B
 await B.evaluate(()=>document.querySelectorAll('.hdr .ib')[1].click());await sleep(300);await B.evaluate(()=>document.querySelectorAll('#app button')[2].click());await sleep(300);await clickT(B,'اشتري');await sleep(500);console.log('B poor:',await txt(B).slice?.call?0:0, await B.evaluate(()=>document.querySelector('.err').textContent));
 await A.evaluate(()=>document.querySelectorAll('#app button')[0].click());await B.evaluate(()=>document.querySelectorAll('#app button')[0].click());await sleep(300);
 // room: 2 players
 await A.evaluate(()=>{document.querySelectorAll('.cat')[1].click()});await sleep(300);
 await A.evaluate(()=>{document.querySelectorAll('.stp')[0].querySelectorAll('button')[1].click()});
 await clickT(A,'اعمل الروم');await sleep(1200);const code=await A.evaluate(()=>location.hash.slice(1));
 await B.evaluate(c=>{const i=document.querySelector('input[type=text]');i.value=c;[...document.querySelectorAll('button')].find(b=>b.textContent==='دخول').click()},code);
 await sleep(3500);await clickT(A,'استعداد');await clickT(B,'استعداد');await sleep(6500);
 for(const p of [A,B])await p.evaluate(()=>{const r=document.querySelector('.reveal');if(r)r.click()});await sleep(7000);
 console.log('A round:',await txt(A));
 // A opens picker and sends s2
 await A.evaluate(()=>{[...document.querySelectorAll('.vbar button')][0].click()});await sleep(400);await A.screenshot({path:'/downloads/store_picker.png'});
 await A.evaluate(()=>{document.querySelector('.modal .panel button img').parentElement.click()});await sleep(2500);
 console.log('B fx layer:',await B.evaluate(()=>{const l=document.getElementById('fxl');return l?l.innerHTML.slice(0,200):'none'}));
 await B.screenshot({path:'/downloads/store_B.png'});
 // cooldown: immediate second send from A
 await A.evaluate(()=>{[...document.querySelectorAll('.vbar button')][0].click()});await sleep(300);
 await A.evaluate(()=>{[...document.querySelectorAll('.modal .panel button')].find(b=>b.textContent.includes('🔊')).click()});await sleep(2500);
 console.log('after sound B:',await B.evaluate(()=>{const l=document.getElementById('fxl');return l?l.innerText:'none'}));
 // B not owning tries direct fx
 console.log('B items',await B.evaluate(()=>localStorage.items));
 await br.close()})()
