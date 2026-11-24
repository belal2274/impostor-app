const post=async(c,b)=>{const r=await fetch('http://localhost:8090/r/'+c,{method:'POST',body:JSON.stringify(b)});return [r.status,await r.text()]};
(async()=>{
for(const [code,rounds,dur,exp] of [['12111',3,300,[3,300]],['12112',0,0,[1,60]],['12113',99,5000,[20,3600]],['12114',undefined,undefined,[3,180]],['12115','x','y',[3,180]]]){
 await post(code,{t:'j',c:'a',host:true,rounds,dur,n:'A'});await post(code,{t:'j',c:'b',n:'B'});
 const [s,t]=await post(code,{t:'state',c:'a'});const j=JSON.parse(t);console.log(code,j.rounds===exp[0]&&j.dur===exp[1]?'PASS':'FAIL',j.rounds,j.dur)}
})();
