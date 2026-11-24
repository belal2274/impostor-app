const pp=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const U='http://localhost:8001/';
async function mk(br,name){const ctx=await br.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 pg.on('pageerror',e=>console.log('PAGEERR',name,e.message));pg.nm=name;
 await pg.goto(U);await pg.evaluate(n=>{localStorage.setItem('ob','1');localStorage.setItem('adult','1');localStorage.setItem('pname',n)},name);await pg.reload();await sleep(1200);return pg}
const clickT=(pg,t,sel='button')=>pg.evaluate((t,sel)=>{const b=[...document.querySelectorAll(sel)].find(b=>b.textContent.trim().startsWith(t));if(!b)throw new Error('no btn '+t+' :: '+document.body.innerText.slice(0,200));b.click()},t,sel);
const txt=pg=>pg.evaluate(()=>document.getElementById('app').innerText.replace(/\n+/g,' | ').slice(0,300));
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox','--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const P=[await mk(br,'أحمد'),await mk(br,'بيلا'),await mk(br,'سامي')];const [A,B,C]=P;
 for(const p of P)await (await p.browserContext()).overridePermissions('http://localhost:8001',['microphone']);
 await A.evaluate(()=>{document.querySelectorAll('.cat')[1].click()});await sleep(300);
 await clickT(A,'🎙️');await sleep(200);
 await A.screenshot({path:'/downloads/vm_modal.png'});
 await clickT(A,'اعمل الروم');await sleep(1200);const code=await A.evaluate(()=>location.hash.slice(1));
 for(const p of [B,C]){await p.evaluate(c=>{const i=document.querySelector('input[type=text]');i.value=c;[...document.querySelectorAll('button')].find(b=>b.textContent==='دخول').click()},code)}
 await sleep(3500);
 for(const p of P)await clickT(p,'استعداد');await sleep(4200);
 console.log('role',await txt(B));await B.screenshot({path:'/downloads/vm_role.png'});
 await sleep(10000);
 const st=async()=>Promise.all(P.map(p=>p.evaluate(()=>{var t=document.getElementById('app').innerText;return t.includes('مفتوح (إنت')?'OPEN':t.includes('بتاعتك مقفول')?'closed':'?'})));
 console.log('talk A',await txt(A));console.log('mics',JSON.stringify(await st()));
 for(const p of P)console.log(p.nm,(await txt(p)).slice(0,130));
 await A.screenshot({path:'/downloads/vm_talk.png'});
 // asker = whoever sees "دورك"
 const ai=(await Promise.all(P.map(p=>txt(p)))).findIndex(t=>t.includes('دورك'));console.log('asker idx',ai);
 const AS=P[ai];await AS.evaluate(()=>{[...document.querySelectorAll('.panel button')].find(b=>b.className.includes('ghost')&&!b.textContent.includes('خلص')).click()});await sleep(500);
 await clickT(AS,'خلصت، سيب');await sleep(1500);
 console.log('after ask',JSON.stringify(await st()));for(const p of P)console.log(p.nm,(await txt(p)).slice(0,110));
 await br.close()})();
