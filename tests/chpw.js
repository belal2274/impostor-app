const call=async o=>{const r=await fetch('http://localhost:8090/acc',{method:'POST',body:JSON.stringify(o)});return r.status+' '+(await r.text()).slice(0,300)};
(async()=>{const su=await call({t:'signup',u:'tester1',p:'oldpass1',init:0});console.log('signup',su);const tok=JSON.parse(su.slice(4)).tok;
console.log('wrong old',await call({t:'chpw',u:'tester1',tok,p:'bad',n:'newpass1'}));
console.log('short new',await call({t:'chpw',u:'tester1',tok,p:'oldpass1',n:'x'}));
console.log('bad tok',await call({t:'chpw',u:'tester1',tok:'zz',p:'oldpass1',n:'newpass1'}));
console.log('ok',await call({t:'chpw',u:'tester1',tok,p:'oldpass1',n:'newpass1'}));
console.log('old login',await call({t:'login',u:'tester1',p:'oldpass1'}));
console.log('new login',(await call({t:'login',u:'tester1',p:'newpass1'})).slice(0,10));})();
