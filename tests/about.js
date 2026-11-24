const pp=require('puppeteer-core');const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{const br=await pp.launch({executablePath:'/usr/bin/google-chrome',args:['--no-sandbox']});const P=await br.newPage();await P.setViewport({width:390,height:844,isMobile:true,hasTouch:true});
await P.goto('http://localhost:8001/');await sleep(1500);
await P.evaluate(()=>{localStorage.setItem('ob','1');localStorage.setItem('adult','1');localStorage.setItem('acc_u','tester');localStorage.setItem('acc_t','x')});await P.reload();await sleep(1500);console.log(await P.evaluate(()=>[...document.querySelectorAll('button')].map(b=>b.getAttribute('aria-label')||b.textContent.slice(0,10)).join('|')));await P.evaluate(()=>{(function(){var l=[...document.querySelectorAll('.hdr .ib')];l[l.length-1].click()})()});await sleep(500);
await P.evaluate(()=>window.scrollTo(0,99999));await P.screenshot({path:'/downloads/set1.png'});
await P.evaluate(()=>{[...document.querySelectorAll('button')].find(b=>b.textContent.includes('عن التطبيق')).click()});await sleep(400);await P.screenshot({path:'/downloads/set2.png'});
await br.close()})().catch(e=>{console.error('ERR',e.message);process.exit(1)});
