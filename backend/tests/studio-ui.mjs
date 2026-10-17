// DOM contract smoke test: exercises shipped scripts and handlers without a browser.
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';import {webcrypto} from 'node:crypto';
class Element{
 constructor(){this.value='';this.hidden=false;this.dataset={};this.children=[];this.classList={toggle(){}};this.elements={};this.checked=false;this.textContent='';this.style={};this.files=[];}
 append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}prepend(...nodes){this.children.unshift(...nodes)}setAttribute(){}removeAttribute(){}focus(){}reset(){}showModal(){this.open=true}close(){this.open=false}querySelector(){return new Element()}
}
const html=fs.readFileSync('dist/admin.html','utf8'),elements=new Map();
for(const match of html.matchAll(/\bid="([^"]+)"/g)){assert.ok(!elements.has('#'+match[1]),'Duplicate ID '+match[1]);elements.set('#'+match[1],new Element())}
for(const match of html.matchAll(/<form\s+id="([^"]+)"[^>]*>([\s\S]*?)<\/form>/g))for(const field of match[2].matchAll(/<(?:input|textarea|select)\b[^>]*\bname="([^"]+)"[^>]*>/g)){const id=/\bid="([^"]+)"/.exec(field[0]);elements.get('#'+match[1]).elements[field[1]]=id?elements.get('#'+id[1]):new Element()}
elements.get('#workspace').hidden=true;
const storage=()=>{const m=new Map();return{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)}};
const profile={user_id:'00000000-0000-4000-8000-000000000086',display_name:'Test editor',phone:'+123',bio:'Test',avatar_path:''};
let writes=0;const replies=path=>path.includes('grant_type=password')?{access_token:'token',refresh_token:'refresh',expires_in:3600,user:{id:profile.user_id,email:'editor@example.invalid'}}:path.endsWith('/studio_role')?'owner':path.includes('/studio_users')?{users:[],events:[]}:path.endsWith('/auth/v1/user')?{id:profile.user_id,email:'editor@example.invalid'}:path.includes('/studio_profiles')?[profile]:[];
const document={querySelector:s=>{assert.ok(elements.has(s),'Missing selector '+s);return elements.get(s)},querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(){}};
const context={URL,URLSearchParams,TextEncoder,btoa,window:{location:{href:'https://test.invalid/admin.html',origin:'https://test.invalid'},history:{replaceState(){}},SITE_CONFIG:{supabaseUrl:'https://test.invalid',publishableKey:'public'},addEventListener(){}},document,localStorage:storage(),sessionStorage:storage(),navigator:{},crypto:webcrypto,Date,JSON,Error,console,confirm:()=>true,fetch:async(url,options)=>{if(options?.method==='POST'&&url.includes('/studio_profiles'))writes++;return {ok:true,status:200,text:async()=>JSON.stringify(replies(url)),json:async()=>replies(url)}}};
vm.createContext(context);for(const name of ['studio-session.js','studio-google.js','article-media.js','admin.js','studio-settings.js'])vm.runInContext(fs.readFileSync('dist/'+name,'utf8'),context,{filename:name});
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
