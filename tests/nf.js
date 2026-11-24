const pp=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function mk(br,name,font){const ctx=await br.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
 pg.on('pageerror',e=>console.log('PAGEERR',name,e.message));
 await pg.goto('http://localhost:8001/');await pg.evaluate((n,f)=>{localStorage.setItem('ob','1');localStorage.setItem('adult','1');localStorage.setItem('pname',n);if(f)localStorage.setItem('pfont',f)},name,font);await pg.reload();await sleep(1200);return pg}
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
const A=await mk(br,'أحمد','f1'),B=await mk(br,'Belal','f9'),C=await mk(br,'سامي','');
await A.evaluate(()=>{document.querySelector('.hdr .chip').click()});await sleep(600);await A.evaluate(()=>window.scrollTo(0,400));await A.screenshot({path:'/downloads/nf_profile.png'});
// room of 3
const code='13321';
await A.goto('http://localhost:8001/#'+code);await B.goto('http://localhost:8001/#'+code);await C.goto('http://localhost:8001/#'+code);
await A.evaluate(c=>{localStorage.setItem('host.'+c,'1')},code);
for(const P of [A,B,C]){await P.reload()}
await sleep(4500);
console.log(await A.evaluate(()=>[...document.querySelectorAll('.nfw')].map(e=>e.className+':'+e.textContent).join(' ; ')));
await A.screenshot({path:'/downloads/nf_room.png'});
await br.close()})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
