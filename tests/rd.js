const pp=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const U='http://localhost:8001/';
async function mk(br,name){const ctx=await br.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 pg.on('pageerror',e=>console.log('PAGEERR',name,e.message));pg.nm=name;
 await pg.goto(U);await pg.evaluate(n=>{localStorage.setItem('ob','1');localStorage.setItem('adult','1');localStorage.setItem('pname',n)},name);await pg.reload();await sleep(1200);return pg}
const clickT=(pg,t,sel='button')=>pg.evaluate((t,sel)=>{const b=[...document.querySelectorAll(sel)].find(b=>b.textContent.trim().startsWith(t));if(!b)throw new Error('no btn '+t+' :: '+document.body.innerText.slice(0,200));b.click()},t,sel);
const txt=pg=>pg.evaluate(()=>document.getElementById('app').innerText.replace(/\n+/g,' | ').slice(0,420));
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
 const P=[await mk(br,'أحمد'),await mk(br,'بيلا'),await mk(br,'سامي')];const [A,B,C]=P;
 await A.evaluate(()=>{document.querySelectorAll('.cat')[1].click()});await sleep(300);
 // rounds stepper: second .stp, minus button = index 1
 await A.evaluate(()=>{document.querySelectorAll('.stp')[1].querySelectorAll('button')[1].click()});
 console.log('rounds shown',await A.evaluate(()=>document.querySelectorAll('.stp b')[1].textContent));
 await clickT(A,'اعمل الروم');await sleep(1200);const code=await A.evaluate(()=>location.hash.slice(1));
 for(const p of [B,C]){await p.evaluate(c=>{const i=document.querySelector('input[type=text]');i.value=c;[...document.querySelectorAll('button')].find(b=>b.textContent==='دخول').click()},code)}
 await sleep(3500);
 console.log('ready phase A:',await txt(A));
 await clickT(A,'استعداد');await clickT(B,'استعداد');await sleep(1500);console.log('after 2 ready A:',await txt(A));
 await clickT(C,'استعداد');const t0=Date.now();await sleep(900);console.log('countdown',await txt(A),'|',await txt(C));
 await sleep(3200);console.log('role phase',Date.now()-t0,await txt(B));
 for(const p of P)await p.evaluate(()=>document.querySelector('.reveal').click());
 await sleep(2800);
 const isImp=await Promise.all(P.map(p=>p.evaluate(()=>!!document.querySelector('.res.imp'))));console.log('imp flags',isImp.join());
 console.log('talk',await txt(A));await A.screenshot({path:'/downloads/p_talk.png'});
 const ii=isImp.indexOf(true);
 async function vote(p,name){await p.evaluate(n=>{[...document.querySelectorAll('.panel button')].find(b=>b.textContent.replace('✓ ','')===n).click()},name)}
 const names=['أحمد','بيلا','سامي'];
 // round1: all non-imps vote the imposter; imp votes someone else
 for(let i=0;i<3;i++){const tgt=i===ii?names[(ii+1)%3]:names[ii];await vote(P[i],tgt);await sleep(300)}
 await sleep(3000);
 console.log('R1 result A:',await txt(A));await A.screenshot({path:'/downloads/p_result.png'});
 console.log('pts',await Promise.all(P.map(p=>p.evaluate(()=>localStorage.getItem('pts')))).then(x=>x.join()));
 // next round by leader (A)
 console.log('B waits:',await txt(B).then(t=>t.slice(-90)));
 await clickT(A,'الجولة الجاية');await sleep(400);await A.evaluate(()=>{[...document.querySelectorAll('.modal button')].find(b=>b.textContent.includes('نفس القسم')).click()});await sleep(4500);
 console.log('R2 hash',(await Promise.all(P.map(p=>p.evaluate(()=>location.hash)))).join(' '));
 for(const p of P)await clickT(p,'استعداد');await sleep(5000);
 for(const p of P)await p.evaluate(()=>document.querySelector('.reveal').click());await sleep(2800);
 const isImp2=await Promise.all(P.map(p=>p.evaluate(()=>!!document.querySelector('.res.imp'))));const j=isImp2.indexOf(true);console.log('imp2',j);
 // round2: everyone votes wrong: non-imps vote the other non-imp
 for(let i=0;i<3;i++){let tgt;if(i===j)tgt=names[(j+1)%3];else{tgt=names.find((n,k)=>k!==j&&k!==i)}await vote(P[i],tgt);await sleep(300)}
 await sleep(3000);console.log('R2 result:',await txt(A));
 console.log('pts',await Promise.all(P.map(p=>p.evaluate(()=>localStorage.getItem('pts')))).then(x=>x.join()));
 await A.screenshot({path:'/downloads/p_final.png'});
 await br.close();process.exit(0)})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
