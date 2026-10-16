import assert from 'node:assert/strict';
import fs from 'node:fs';
import {webcrypto} from 'node:crypto';
import vm from 'node:vm';
let handler,role='owner',valid=true,created=true,granted=true,calls=[];
const source=fs.readFileSync('backend/functions/create-admin/index.ts','utf8').replace(/:number|:string|req:Request/g,m=>m==='req:Request'?'req':'').replace(/get\('([^']+)'\)!/g,"get('$1')");
vm.runInNewContext(source,{crypto:webcrypto,Response,Request,JSON,Number,encodeURIComponent,Deno:{serve:fn=>handler=fn,env:{get:()=> 'test-server-value'}},fetch:async(url,options)=>{
 calls.push({url,options});let data={},status=200;
 if(url.endsWith('/auth/v1/user'))status=valid?200:401;
 else if(url.endsWith('/rpc/studio_role'))data=role;
 else if(url.endsWith('/auth/v1/admin/users')){status=created?200:422;data={id:'created-user'}}
 else if(url.endsWith('/rpc/manage_studio_admin'))status=granted?204:403;
 return new Response(status===204?null:JSON.stringify(data),{status});
}});
const send=(body,auth=true)=>handler(new Request('https://test.invalid',{method:'POST',headers:auth?{Authorization:'Bearer user-jwt'}:{},body:JSON.stringify(body)}));
const input={email:'new@example.invalid',password:'A-long-random-test-password'};
assert.equal((await send(input,false)).status,401);assert.equal(calls.length,0);
valid=false;assert.equal((await send(input)).status,401);valid=true;
role='admin';calls=[];assert.equal((await send(input)).status,403);assert.equal(calls.length,2);role='owner';
assert.equal((await send({...input,password:'short'})).status,400);
calls=[];assert.equal((await send(input)).status,201);const create=calls.find(x=>x.url.endsWith('/auth/v1/admin/users'));assert.ok(calls.find(x=>x.url.endsWith('/rpc/prepare_studio_account')));assert.match(JSON.parse(create.options.body).id,/^[a-f0-9-]{36}$/);
created=false;calls=[];assert.equal((await send(input)).status,409);assert.equal(calls.some(x=>x.url.endsWith('/rpc/manage_studio_admin')),false);created=true;
granted=false;calls=[];assert.equal((await send(input)).status,403);assert.ok(calls.some(x=>x.options.method==='DELETE'&&x.url.endsWith('/created-user')));
console.log('Account provisioning authorization, validation, server reservation, existing-account protection and cleanup tests passed.');
