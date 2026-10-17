// DOM contract smoke test: exercises shipped scripts and handlers without a browser.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
class Element{
 constructor(){this.value='';this.hidden=false;this.dataset={};this.children=[];this.classList={toggle(){}};this.elements={};this.checked=false;this.textContent='';this.style={};this.files=[];}
 append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}prepend(...nodes){this.children.unshift(...nodes)}setAttribute(){}removeAttribute(){}focus(){}reset(){}showModal(){this.open=true}close(){this.open=false}scrollIntoView(){}querySelector(){return new Element()}
}
const html=fs.readFileSync('dist/admin.html','utf8'),elements=new Map();
for(const match of html.matchAll(/\bid="([^"]+)"/g)){assert.ok(!elements.has('#'+match[1]),'Duplicate ID '+match[1]);elements.set('#'+match[1],new Element())}
for(const match of html.matchAll(/<form\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/form>/g))for(const field of match[2].matchAll(/<(?:input|textarea|select)\b[^>]*\bname="([^"]+)"[^>]*>/g)){const id=/\bid="([^"]+)"/.exec(field[0]);elements.get('#'+match[1]).elements[field[1]]=id?elements.get('#'+id[1]):new Element()}
elements.get('#workspace').hidden=true;
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const profile={user_id:'00000000-0000-4000-8000-000000000086',display_name:'Test editor',phone:'+123',bio:'Test',avatar_path:''};
let writes=0,quizzes=[];const replies=path=>path.includes('grant_type=password')?{access_token:'token',refresh_token:'refresh',expires_in:3600,user:{id:profile.user_id,email:'editor@example.invalid'}}:path.endsWith('/studio_role')?'owner':path.includes('/studio_users')?{users:[],events:[]}:path.endsWith('/auth/v1/user')?{id:profile.user_id,email:'editor@example.invalid'}:path.includes('/studio_profiles')?[profile]:path.includes('/rest/v1/quizzes')?quizzes:[];
const document={querySelector:s=>{assert.ok(elements.has(s),'Missing selector '+s);return elements.get(s)},querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(){}};
const context={URL,URLSearchParams,TextEncoder,btoa,atob,window:{location:{href:'https://test.invalid/admin.html',origin:'https://test.invalid'},history:{replaceState(){}},SITE_CONFIG:{supabaseUrl:'https://test.invalid',publishableKey:'public'},addEventListener(){}},document,localStorage:storage(),sessionStorage:storage(),navigator:{},crypto:webcrypto,Date,JSON,Error,console,confirm:()=>true,fetch:async(url,options)=>{if(options?.method==='POST'&&url.includes('/rest/v1/quizzes')){quizzes=[{id:'quiz-test',created_at:'2026-10-17',updated_at:'2026-10-17',...JSON.parse(options.body)}]};if(options?.method==='POST'&&url.includes('/studio_profiles'))writes++;return {ok:true,status:200,text:async()=>JSON.stringify(replies(url)),json:async()=>replies(url)}}};
vm.createContext(context);for(const name of ['studio-session.js','studio-phone.js','studio-google.js','article-media.js','admin.js','admin-quizzes.js','studio-phone-ui.js','studio-settings.js'])vm.runInContext(fs.readFileSync('dist/'+name,'utf8'),context,{filename:name});
assert.equal(html.includes('setup-tab'),false);assert.equal(html.includes('/auth/v1/signup'),false);
const login=elements.get('#login');login.elements.email.value='editor@example.invalid';login.elements.password.value='password';login.elements.remember.checked=true;
await login.onsubmit({preventDefault(){},currentTarget:login});
assert.equal(elements.get('#workspace').hidden,false);assert.equal(elements.get('#profile-form').elements.display_name.value,'Test editor');
const form=elements.get('#profile-form');form.elements.display_name.value='Updated';await form.onsubmit({preventDefault(){},currentTarget:form});assert.equal(writes,1);
elements.get('#preview-article').onclick();assert.equal(elements.get('#article-preview').open,true);
// Uploaded image paths and captions cannot inject markup or external URLs.
const media=context.window.StudioMedia;assert.equal(media.url('article-images','javascript:alert(1)'), '');assert.equal(media.url('article-images','../../private'), '');
const container=new Element();media.render(container,'First\n\n[[image:00000000-0000-4000-8000-000000000087]]\nLast',[{id:'00000000-0000-4000-8000-000000000087',path:profile.user_id+'/00000000-0000-4000-8000-000000000087.png',alt:'<script>',caption:'<script>alert(1)</script>'}]);assert.equal(container.children.length,3);assert.equal(container.children[1].children[1].textContent,'<script>alert(1)</script>');
console.log('Shipped UI scripts: startup, login, profile load/save, preview, selector contracts and safe image rendering passed.');

const quizForm=elements.get('#quiz-editor');quizForm.elements.quiz_title.value='Admin-created quiz';quizForm.elements.quiz_description.value='Test introduction';quizForm.elements.quiz_published.checked=true;
vm.runInContext("quizQuestions[0].text='Question?';quizQuestions[0].choices=['A','B'];quizQuestions[0].answer=1;quizQuestions[0].explanation='Because B';",context);
await quizForm.onsubmit({preventDefault(){},currentTarget:quizForm});assert.equal(quizzes.length,1);assert.equal(quizzes[0].title,'Admin-created quiz');assert.equal(quizzes[0].questions[0].answer,1);assert.equal(quizzes[0].published,true);assert.equal(quizForm.elements.quiz_id.value,'quiz-test');
console.log('Studio quiz builder: initial question, title/description, answer selection, publish save and returned ID passed.');

// A phone/password session must stay out of the workspace until WhatsApp succeeds.
const originalFetch=context.fetch;let rejectCode=true;
const mfaToken=aal=>'header.'+Buffer.from(JSON.stringify({aal})).toString('base64url')+'.signature';
context.fetch=async(url,options)=>{
 let data,status=200;
 if(url.includes('grant_type=password'))data={access_token:mfaToken('aal1'),refresh_token:'first-factor-refresh',expires_in:3600};
 else if(url.endsWith('/auth/v1/user'))data={id:profile.user_id,email:'editor@example.invalid',phone:'923001234567',phone_confirmed_at:'confirmed',factors:[{id:'phone-factor',factor_type:'phone',status:'verified',phone:'+923001234567'}]};
 else if(url.endsWith('/challenge')){assert.equal(JSON.parse(options.body).channel,'whatsapp');data={id:'challenge'}}
 else if(url.endsWith('/verify')){status=rejectCode?400:200;data={access_token:mfaToken('aal2'),refresh_token:'verified-refresh',expires_in:3600}}
 else return originalFetch(url,options);
 return{ok:status===200,status,text:async()=>JSON.stringify(data),json:async()=>data};
};
vm.runInContext('signOut()',context);elements.get('#login-method').value='phone';login.elements.login_phone.value='+923001234567';login.elements.password.value='test-password';
const pendingLogin=login.onsubmit({preventDefault(){},currentTarget:login});await new Promise(setImmediate);
assert.equal(elements.get('#workspace').hidden,true);assert.equal(elements.get('#whatsapp-dialog').open,true);assert.equal(vm.runInContext('sessionStore.value===null',context),true);
elements.get('#whatsapp-code').value='123456';await elements.get('#whatsapp-form').onsubmit({preventDefault(){}});assert.equal(elements.get('#workspace').hidden,true);assert.match(elements.get('#whatsapp-status').textContent,/not accepted/);
rejectCode=false;await elements.get('#whatsapp-form').onsubmit({preventDefault(){}});await pendingLogin;
assert.equal(elements.get('#workspace').hidden,false);assert.equal(elements.get('#whatsapp-dialog').open,false);assert.equal(vm.runInContext('sessionStore.value.refresh_token',context),'verified-refresh');
console.log('Phone login UI: no workspace or persistence before WhatsApp, invalid-code retry, then verified session entry passed.');
