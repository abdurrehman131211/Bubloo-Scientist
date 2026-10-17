import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const jwt=aal=>'header.'+Buffer.from(JSON.stringify({aal})).toString('base64url')+'.signature';
let calls=[],role='admin',factor=true,confirmed=true,aal='aal1',badCode=false;
const session={access_token:jwt('aal1'),refresh_token:'test-refresh'};
const context={window:{},atob,JSON,Error,Date,encodeURIComponent,fetch:async(url,options={})=>{
 calls.push({url,options});let status=200,data={};
 if(url.endsWith('/settings'))data={external:{phone:true},sms_provider:'twilio'};
 else if(url.endsWith('/user'))data={id:'user',phone:'923001234567',phone_confirmed_at:confirmed?'confirmed':null,factors:factor?[{id:'phone-factor',factor_type:'phone',status:'verified',phone:'+923001234567'}]:[]};
 else if(url.endsWith('/studio_role'))data=role;
 else if(url.endsWith('/challenge'))data={id:'challenge-id'};
 else if(url.endsWith('/verify')){status=badCode?400:200;data={access_token:jwt(aal),refresh_token:'upgraded-refresh'}}
 return {ok:status===200,status,text:async()=>JSON.stringify(data)};
}};
vm.runInNewContext(fs.readFileSync('dist/studio-phone.js','utf8'),context);const auth=new context.window.StudioPhoneAuth({supabaseUrl:'https://test.invalid',publishableKey:'public'});
assert.equal(auth.normalize('+92 (300) 123-4567'),'+923001234567');assert.throws(()=>auth.normalize('03001234567'),/international/);assert.equal(await auth.available(),true);
await auth.password('+923001234567','test-password');assert.equal(JSON.parse(calls.at(-1).options.body).phone,'+923001234567');
assert.equal((await auth.inspect(session,{phoneLogin:true})).needsChallenge,true);
confirmed=false;await assert.rejects(()=>auth.inspect(session,{phoneLogin:true}),/not set up/);confirmed=true;
factor=false;assert.equal((await auth.inspect(session)).needsChallenge,false);await assert.rejects(()=>auth.inspect(session,{phoneLogin:true}),/not set up/);factor=true;
role=null;await assert.rejects(()=>auth.inspect(session),/Not registered/);role='owner';
await auth.challenge(session,'phone-factor');assert.equal(JSON.parse(calls.at(-1).options.body).channel,'whatsapp');
await assert.rejects(()=>auth.verify(session,'phone-factor','challenge-id','12'),/verification code/);
await assert.rejects(()=>auth.verify(session,'phone-factor','challenge-id','123456'),/could not be completed/);
aal='aal2';assert.equal(auth.aal(await auth.verify(session,'phone-factor','challenge-id','123456')),'aal2');
badCode=true;await assert.rejects(()=>auth.verify(session,'phone-factor','challenge-id','123456'),/not accepted/);
await auth.revoke(session);assert.ok(calls.at(-1).url.endsWith('/logout?scope=local'));
console.log('Phone authentication: international format, provider readiness, verified phone/factor, membership, WhatsApp channel, code errors and AAL2 upgrade passed.');
