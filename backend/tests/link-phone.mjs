import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
let handler,calls=[],valid=true,allowed=true,verified=true,linkOK=true;
const jwt=(aal='aal2',sub='member')=>'header.'+Buffer.from(JSON.stringify({aal,sub})).toString('base64url')+'.signature';
const source=fs.readFileSync('backend/functions/link-phone/index.ts','utf8').replace(/:number|:string|req:Request/g,m=>m==='req:Request'?'req':'').replace(/item:\{[^}]+\}/g,'item').replace(/get\('([^']+)'\)!/g,"get('$1')");
vm.runInNewContext(source,{Request,Response,JSON,atob,encodeURIComponent,Deno:{serve:fn=>handler=fn,env:{get:()=> 'server-only-test-key'}},fetch:async(url,options)=>{
 calls.push({url,options});let status=200,data={};
 if(url.endsWith('/auth/v1/user')){status=valid?200:401;data={id:'member',factors:[{id:'factor',factor_type:'phone',status:verified?'verified':'unverified',phone:'+923001234567'}]}}
 else if(url.endsWith('/editor_access'))data=allowed;
 else if(url.includes('/admin/users/'))status=linkOK?200:409;
 return new Response(JSON.stringify(data),{status});
}});
const send=(token=jwt(),body={factor_id:'factor'})=>handler(new Request('https://test.invalid',{method:'POST',headers:token?{Authorization:'Bearer '+token}:{},body:JSON.stringify(body)}));
assert.equal((await send('')).status,401);assert.equal(calls.length,0);
valid=false;assert.equal((await send()).status,401);valid=true;
calls=[];assert.equal((await send(jwt('aal1'))).status,403);assert.equal(calls.length,1);
assert.equal((await send(jwt('aal2','other'))).status,403);
allowed=false;assert.equal((await send()).status,403);allowed=true;
verified=false;assert.equal((await send()).status,403);verified=true;
assert.equal((await send(jwt(),{factor_id:'not-my-factor'})).status,403);
calls=[];assert.equal((await send(jwt(),{factor_id:'factor',user_id:'attacker',phone:'+15555555555'})).status,200);const update=calls.find(c=>c.options.method==='PUT');assert.ok(update.url.endsWith('/admin/users/member'));assert.deepEqual(JSON.parse(update.options.body),{phone:'923001234567',phone_confirm:true});
linkOK=false;assert.equal((await send()).status,409);
console.log('Phone linking: Auth validation, signed MFA/sub, member access, owned verified factor, request-tampering protection and duplicate phone denial passed.');

