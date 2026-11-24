const pp=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});
for(const [port,nm] of [[8001,'full'],[8002,'family']]){
const ctx=await br.createBrowserContext();const pg=await ctx.newPage();await pg.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
pg.on('pageerror',e=>console.log('PAGEERR',e.message));
await pg.goto('http://localhost:'+port+'/');await pg.evaluate(()=>{localStorage.setItem('ob','1');localStorage.setItem('adult','1');localStorage.setItem('pname','أحمد');localStorage.setItem('pts','4')});await pg.reload();await sleep(1000);
await pg.evaluate(()=>{const b=[...document.querySelectorAll('button')].find(b=>b.getAttribute('aria-label')==='settings'||/إعدادات/.test(b.textContent+b.title));if(b)b.click();else document.querySelectorAll('.ib')[document.querySelectorAll('.ib').length-1].click()});await sleep(500);
await pg.evaluate((n)=>{const i=document.querySelectorAll('input');i[0].value='user_'+n;i[1].value='secret1';[...document.querySelectorAll('button')].find(b=>b.textContent==='حساب جديد').click()},nm);await sleep(1200);
console.log(nm,'after signup pts',await pg.evaluate(()=>localStorage.getItem('pts')+' '+localStorage.getItem('acc_u')));
await pg.screenshot({path:'/downloads/acc_'+nm+'.png'});

console.log(nm,'after award x2 (expect 16)',await pg.evaluate(()=>localStorage.getItem('pts')+' q='+localStorage.getItem('pq')));
await pg.reload();await sleep(1500);console.log(nm,'reload pts',await pg.evaluate(()=>localStorage.getItem('pts')));
}
await br.close()})();
