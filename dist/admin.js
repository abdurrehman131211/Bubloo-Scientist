"use strict";
const cfg=window.SITE_CONFIG,$=s=>document.querySelector(s);
let token=""; // Access token stays in memory; sign-in required after reload.
const status=message=>$("#status").textContent=message;
async function api(path,options={}){
 const response=await fetch(cfg.supabaseUrl+path,{...options,headers:{apikey:cfg.publishableKey,...(token?{Authorization:"Bearer "+token}:{}),"Content-Type":"application/json",...options.headers}});
 if(!response.ok){if(response.status===401)signOut();throw Error("Request failed. Check your connection and editor permissions.")}
 const body=await response.text();
 return body?JSON.parse(body):null;
}
function element(tag,text){const e=document.createElement(tag);e.textContent=text;return e}
async function load(){
 const [articles,messages]=await Promise.all([api("/rest/v1/articles?select=*&order=created_at.desc"),api("/rest/v1/messages?select=*&order=created_at.desc")]);
 $("#article-list").replaceChildren(...articles.map(a=>{const row=element("article","");row.append(element("h3",a.title),element("p",a.published?"Published":"Draft"));const edit=element("button","Edit");edit.onclick=()=>{const f=$("#editor");["id","title","category","excerpt","body"].forEach(k=>f.elements[k].value=a[k]);f.elements.published.checked=a.published;f.scrollIntoView()};const remove=element("button","Delete");remove.onclick=async()=>{if(!confirm("Delete this article permanently?"))return;try{await api("/rest/v1/articles?id=eq."+encodeURIComponent(a.id),{method:"DELETE",headers:{Prefer:"return=minimal"}});await load()}catch(e){status(e.message)}};row.append(edit,remove);return row}));
 $("#messages").replaceChildren(...messages.map(m=>{const row=element("article","");row.append(element("h3",m.name),element("p",m.email),element("p",m.message));return row}));
}
function signOut(){token="";$("#workspace").hidden=true;$("#login").hidden=false;$("#article-list").replaceChildren();$("#messages").replaceChildren();$("#editor").reset()}
$("#login").onsubmit=async e=>{e.preventDefault();if(!cfg.supabaseUrl||!cfg.publishableKey){status("Supabase has not been connected yet.");return}try{const data=Object.fromEntries(new FormData(e.currentTarget));const session=await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify(data)});token=session.access_token;const user=await api("/auth/v1/user");if(user.app_metadata?.role!=="admin"){signOut();status("This account does not have editor access.");return}$("#login").reset();$("#login").hidden=true;$("#workspace").hidden=false;status("Signed in.");await load()}catch(e){signOut();status(e.message)}};
$("#logout").onclick=async()=>{try{await api("/auth/v1/logout",{method:"POST"})}finally{signOut();status("Signed out.")}};
$("#editor").onsubmit=async e=>{e.preventDefault();const f=e.currentTarget;const data=Object.fromEntries(new FormData(f));const id=data.id;delete data.id;data.published=f.elements.published.checked;try{await api("/rest/v1/articles"+(id?"?id=eq."+encodeURIComponent(id):""),{method:id?"PATCH":"POST",headers:{Prefer:"return=minimal"},body:JSON.stringify(data)});status("Article saved.");f.reset();await load()}catch(e){status(e.message)}};
