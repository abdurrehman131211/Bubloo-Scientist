"use strict";
const cfg=window.SITE_CONFIG,$=selector=>document.querySelector(selector);
const OWNER_EMAIL="bublooscientist2023@gmail.com";
let token="",articles=[],messages=[],authMode="signin",dirty=false;
const views={
 overview:["Your ideas, ready to share.","A little overview of what you’re creating."],
 articles:["Your curiosity journal.","Find, edit and organise the stories you share."],
 editor:["Make room for a new idea.","Write at your own pace. Publish when you’re ready."],
 messages:["A conversation starts here.","Questions, ideas and feedback from your readers."]
};
function notify(message="",error=false){const target=$("#workspace").hidden?$("#auth-status"):$("#status");target.textContent=message;target.classList.toggle("error",error)}
function text(tag,value,className){const node=document.createElement(tag);node.textContent=value;if(className)node.className=className;return node}
function empty(title,description){const box=text("div","","empty");box.append(text("h3",title),text("p",description));return box}
function date(value){if(!value)return "";const parsed=new Date(value);return Number.isNaN(parsed.getTime())?"":parsed.toLocaleDateString(undefined,{day:"numeric",month:"short",year:"numeric"})}
function busy(button,loading,label){button.disabled=loading;button.textContent=label}
async function api(path,options={}){
 const response=await fetch(cfg.supabaseUrl+path,{...options,headers:{apikey:cfg.publishableKey,...(token?{Authorization:"Bearer "+token}:{}),"Content-Type":"application/json",...options.headers}});
 const body=await response.text();let data=null;try{data=body?JSON.parse(body):null}catch{throw Error("We received an unexpected response. Please try again.")}
 if(!response.ok){
  if(response.status===401&&token){signOut();throw Error("Your session has expired. Please sign in again.")}
  if(data?.code==="email_not_confirmed")throw Error("Please verify your email before signing in.");
  if(response.status===429)throw Error("Too many attempts. Please wait a moment and try again.");
  if(path.startsWith("/auth/v1/token"))throw Error("We couldn’t sign you in. Check your email and password.");
  throw Error("This request could not be completed. Check your connection and try again.");
 }
 return data;
}
function showView(name){
 if(!views[name])return;
 document.querySelectorAll("[data-panel]").forEach(panel=>panel.hidden=panel.dataset.panel!==name);
 document.querySelectorAll("[data-view]").forEach(button=>{if(button.dataset.view===name)button.setAttribute("aria-current","page");else button.removeAttribute("aria-current")});
 $("#view-title").textContent=views[name][0];$("#view-description").textContent=views[name][1];
 $("#breadcrumb").textContent="/ "+(name==="editor"?"Write an article":name[0].toUpperCase()+name.slice(1));
 $("#new-article").hidden=name==="editor";
}
function badge(published){return text("span",published?"Published":"Draft","badge"+(published?" published":""))}
function updateWordCount(){const value=$("#editor").elements.body.value.trim();$("#word-count").textContent=(value?value.split(/\s+/u).length:0)+" words"}
function newArticle(){
 if(dirty&&!confirm("Start a new draft? Your unsaved changes will be discarded."))return;
 $("#editor").reset();$("#editor").elements.id.value="";$("#editor-heading").textContent="A new discovery";dirty=false;updateWordCount();showView("editor");$("#editor").elements.title.focus();notify();
}
function editArticle(article){
 if(dirty&&!confirm("Open this article? Your unsaved changes will be discarded."))return;
 const form=$("#editor");
 ["id","title","category","excerpt","body"].forEach(key=>form.elements[key].value=article[key]||"");
 form.elements.published.checked=article.published;form.elements.content_kind.value=article.content_kind||"original";form.elements.source_url.value=article.source_url||"";
 $("#editor-heading").textContent="Editing your story";dirty=false;updateWordCount();showView("editor");form.elements.title.focus();notify();
}
function renderArticles(){
 const query=$("#article-search").value.trim().toLowerCase(),filter=$("#article-filter").value;
 const matching=articles.filter(article=>(article.title+" "+article.category).toLowerCase().includes(query)&&(filter==="all"||(filter==="published"?article.published:!article.published)));
 $("#article-result-count").textContent=matching.length+" "+(matching.length===1?"article":"articles");
 $("#article-list").replaceChildren(...matching.map(article=>{
  const row=text("article","","article-row"),details=text("div","");details.append(text("h3",article.title),text("p",article.category+" · "+date(article.created_at)));
  const actions=text("div","","row-actions"),edit=text("button","Edit","btn quiet small"),remove=text("button","Delete","btn danger small");
  edit.type=remove.type="button";edit.setAttribute("aria-label","Edit "+article.title);remove.setAttribute("aria-label","Delete "+article.title);
  edit.onclick=()=>editArticle(article);
  remove.onclick=async()=>{if(!confirm('Permanently delete "'+article.title+'"? This cannot be undone.'))return;remove.disabled=true;try{await api("/rest/v1/articles?id=eq."+encodeURIComponent(article.id),{method:"DELETE",headers:{Prefer:"return=minimal"}});await load();notify("Article deleted.")}catch(error){notify(error.message,true);remove.disabled=false}};
  actions.append(edit,remove);row.append(details,badge(article.published),actions);return row;
 }));
 if(!matching.length)$("#article-list").append(empty(articles.length?"No matching stories":"Your first story starts here",articles.length?"Try another search or status filter.":"Choose New article to start writing."));
}
function render(){
 const published=articles.filter(article=>article.published).length;
 $("#stat-published").textContent=published;$("#stat-drafts").textContent=articles.length-published;$("#stat-messages").textContent=messages.length;
 $("#article-count-nav").textContent=articles.length;$("#message-count-nav").textContent=messages.length;
 $("#recent-articles").replaceChildren(...articles.slice(0,5).map(article=>{const row=text("div","","recent-row"),details=text("div","");details.append(text("h3",article.title),text("p",article.category+" · "+date(article.created_at)));const action=text("button","Edit","btn quiet small");action.type="button";action.setAttribute("aria-label","Edit "+article.title);action.onclick=()=>editArticle(article);row.append(details,action);return row}));
 if(!articles.length)$("#recent-articles").append(empty("No stories yet","Your first article will appear here."));
 renderArticles();
 $("#messages").replaceChildren(...messages.map(message=>{
  const card=text("article","","message-card"),heading=text("div","","message-heading"),sender=text("div","");
  const email=text("a",message.email);email.href="mailto:"+encodeURIComponent(message.email);sender.append(text("h3",message.name),email);
  const time=text("time",date(message.created_at));if(message.created_at)time.dateTime=message.created_at;heading.append(sender,time);card.append(heading,text("p",message.message,"message-body"));return card;
 }));
 if(!messages.length)$("#messages").append(empty("You’re all caught up","New contact-form messages will appear here."));
}
async function load(){
 const data=await Promise.all([api("/rest/v1/articles?select=*&order=created_at.desc"),api("/rest/v1/messages?select=*&order=created_at.desc")]);
 articles=data[0]||[];messages=data[1]||[];render();
}
function signOut(){
 token="";articles=[];messages=[];dirty=false;$("#workspace").hidden=true;$("#auth").hidden=false;$("#editor").reset();$("#login").elements.password.value="";$("#login").elements.confirm.value="";
 ["#article-list","#messages","#recent-articles"].forEach(selector=>$(selector).replaceChildren());$("#status").textContent="";updateWordCount();
}
function setAuthMode(mode){
 authMode=mode;const setup=mode==="setup";
 $("#signin-tab").setAttribute("aria-selected",String(!setup));$("#setup-tab").setAttribute("aria-selected",String(setup));
 $("#auth-title").textContent=setup?"Let’s set up your Studio.":"Ready to create?";
 $("#auth-description").textContent=setup?"Create your verified editor account.":"Sign in to manage your articles and messages.";
 $("#confirm-label").hidden=!setup;$("#login").elements.confirm.required=setup;$("#setup-help").hidden=!setup;
 $("#password").autocomplete=setup?"new-password":"current-password";$("#password").minLength=setup?12:1;
 $("#auth-submit").textContent=setup?"Create editor account":"Sign in to Studio →";$("#login").elements.confirm.value="";notify();
}
$("#signin-tab").onclick=()=>setAuthMode("signin");$("#setup-tab").onclick=()=>setAuthMode("setup");
document.querySelectorAll('[role="tab"]').forEach(tab=>tab.onkeydown=event=>{if(event.key==="ArrowLeft"||event.key==="ArrowRight"){event.preventDefault();const mode=authMode==="signin"?"setup":"signin";setAuthMode(mode);$(mode==="signin"?"#signin-tab":"#setup-tab").focus()}});
$("#toggle-password").onclick=()=>{const input=$("#password"),show=input.type==="password";input.type=show?"text":"password";$("#toggle-password").textContent=show?"Hide":"Show";$("#toggle-password").setAttribute("aria-pressed",String(show))};
$("#login").onsubmit=async event=>{
 event.preventDefault();if(!cfg?.supabaseUrl||!cfg?.publishableKey){notify("The editor service isn’t configured yet.",true);return}
 const form=event.currentTarget,email=form.elements.email.value.trim(),password=form.elements.password.value,setup=authMode==="setup";
 if(setup&&(email.toLowerCase()!==OWNER_EMAIL)){notify("Use "+OWNER_EMAIL+" to set up your editor account.",true);return}
 if(setup&&password!==form.elements.confirm.value){notify("Your passwords don’t match.",true);return}
 const button=$("#auth-submit");busy(button,true,setup?"Creating account…":"Signing in…");notify();
 try{
  if(setup){await api("/auth/v1/signup",{method:"POST",body:JSON.stringify({email,password})});form.elements.password.value="";setAuthMode("signin");notify("Check your inbox to verify your email, then return here and sign in. If you already have an account, sign in instead.");return}
  const session=await api("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});token=session.access_token;
  const allowed=await api("/rest/v1/rpc/editor_access",{method:"POST",body:"{}"});
  if(!allowed){signOut();throw Error("This account does not have editor access. Use your verified editor email.")}
  $("#auth").hidden=true;$("#workspace").hidden=false;form.elements.password.value="";showView("overview");notify("Loading your workspace…");
  await load();notify();
 }catch(error){if($("#workspace").hidden)token="";notify(error.message||"Unable to connect. Please try again.",true)}finally{busy(button,false,authMode==="setup"?"Create editor account":"Sign in to Studio →")}
};
async function logout(){try{await api("/auth/v1/logout",{method:"POST"})}catch{}finally{signOut();notify("You’ve signed out.")}}
$("#logout").onclick=logout;$("#mobile-logout").onclick=logout;
document.querySelectorAll("[data-view]").forEach(button=>button.onclick=()=>showView(button.dataset.view));
document.querySelectorAll("[data-go]").forEach(button=>button.onclick=()=>showView(button.dataset.go));
$("#new-article").onclick=newArticle;$("#start-writing").onclick=newArticle;$("#clear-editor").onclick=newArticle;
$("#article-search").oninput=renderArticles;$("#article-filter").onchange=renderArticles;
$("#refresh-messages").onclick=async()=>{const button=$("#refresh-messages");busy(button,true,"Refreshing…");try{await load();notify("Workspace refreshed.")}catch(error){notify(error.message,true)}finally{busy(button,false,"Refresh")}};
$("#editor").oninput=()=>{dirty=true;updateWordCount()};
$("#editor").onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,id=form.elements.id.value;
 const data={title:form.elements.title.value.trim(),category:form.elements.category.value.trim(),excerpt:form.elements.excerpt.value.trim(),body:form.elements.body.value.trim(),published:form.elements.published.checked,content_kind:form.elements.content_kind.value,source_url:form.elements.source_url.value.trim()||null};
 if(!data.title||!data.category||!data.excerpt||!data.body){notify("Please complete the title, category, introduction and article.",true);return}
 const button=$("#save-article");busy(button,true,"Saving…");
 try{
  const saved=await api("/rest/v1/articles"+(id?"?id=eq."+encodeURIComponent(id):""),{method:id?"PATCH":"POST",headers:{Prefer:"return=representation"},body:JSON.stringify(data)});
  if(!Array.isArray(saved)||!saved.length)throw Error("The article was not saved. Check your editor permissions.");
  form.elements.id.value=saved[0].id;dirty=false;$("#editor-heading").textContent="Editing your story";await load();notify(data.published?"Article saved and published.":"Draft saved. You can return to it from Articles.");
 }catch(error){notify(error.message,true)}finally{busy(button,false,"Save article")}
};
$("#preview-article").onclick=()=>{const form=$("#editor");$("#preview-category").textContent=form.elements.category.value||"ARTICLE PREVIEW";$("#preview-title").textContent=form.elements.title.value||"Your article title";$("#preview-excerpt").textContent=form.elements.excerpt.value;$("#preview-body").textContent=form.elements.body.value||"Your article text will appear here.";$("#article-preview").showModal()};
$("#close-preview").onclick=()=>$("#article-preview").close();
window.addEventListener("beforeunload",event=>{if(dirty){event.preventDefault();event.returnValue=""}});
setAuthMode("signin");updateWordCount();
