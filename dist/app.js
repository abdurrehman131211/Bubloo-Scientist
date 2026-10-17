"use strict";
const cfg=window.SITE_CONFIG;
const $=s=>document.querySelector(s);
const seed=[
 {id:"chemistry",title:"What is Chemistry?",category:"Chemistry",excerpt:"Exploring a fascination with chemistry, science and the world around us."},
 {id:"coding",title:"Creating new with coding",category:"Technology",excerpt:"A journey into Python programming and creating something new."},
 {id:"living",title:"Characteristics of living things",category:"Biology",excerpt:"Discover the seven characteristics that help us understand living things."},
 {id:"books",title:"The Boy Who Spoke Dog",category:"Book reviews",excerpt:"An adventurous read that brings fantasy and discovery together."}];
let articles=seed,topic="All";
const topics=["All","Physics","Chemistry","Biology","Technology","Book reviews"];
function node(tag,text,className){const e=document.createElement(tag);if(text)e.textContent=text;if(className)e.className=className;return e}
function render(){
 $("#filters").replaceChildren(...topics.map(t=>{const b=node("button",t);b.type="button";b.setAttribute("aria-pressed",String(topic===t));b.onclick=()=>{topic=t;render()};return b}));
 const list=articles.filter(a=>(topic==="All"||a.category===topic)&&(a.title+" "+a.excerpt).toLowerCase().includes($("#search").value.toLowerCase()));
 $("#articles").replaceChildren(...list.map((a,i)=>{const b=node("button",null,"article");b.type="button";const art=node("div",["H₂O","{ }","DNA","Aa"][i%4],"article-art");art.setAttribute("aria-hidden","true");if(a.images?.length){const url=window.StudioMedia.url("article-images",a.images[0].path);if(url){const img=document.createElement("img");img.src=url;img.alt="";img.loading="lazy";art.replaceChildren(img)}}const c=node("div",null,"article-copy");c.append(node("p",a.category,"eyebrow"),node("h3",a.title),node("p",a.excerpt),node("span","Explore story ↗"));b.append(art,c);b.onclick=()=>{$("#reader-category").textContent=a.category;$("#reader-title").textContent=a.title;window.StudioMedia.render($("#reader-body"),a.body||a.excerpt,a.images||[]);if(a.source_url||!a.body){if(a.content_kind==="summary")$("#reader-body").prepend(node("p","EDITORIAL SUMMARY · Read the complete original article using the link below.","eyebrow"));const link=node("a","Read the full story on the original website ↗");link.href=a.source_url||"https://www.bublooscientist.com/";$("#reader-body").append(link)}$("#reader").showModal()};return b}));
 if(!list.length)$("#articles").append(node("p","No stories match your search. Try another topic."));
}
$("#topics")?.replaceChildren(...topics.slice(1,5).map((t,i)=>{const a=node("a",null,"topic");a.href="#stories";a.append(node("small","0"+(i+1)),node("span",["↗","H₂O","⌘","</>"][i],"symbol"),node("h3",t),node("p",["Understand the forces shaping our world.","Discover the science of matter.","Explore life in all its variety.","See what is possible with new ideas."][i]));a.onclick=()=>{topic=t;render()};return a}));
$("#team-list")?.replaceChildren(...[
 ["Abdur Rehman Siddiqui","CEO","+923378324258"],
 ["Ayaan Hassan Khan","Web Developer",null],
 ["Sadaat Furqan","Marketer","+923316936931"],
 ["Muhammad Mustafa Khan","Lead Designer","+923460222290"],
 ["Muhammad Huzaifa Khan","Web Designer","+923102526567"],
 ["Saim Ahmed","Social Media Manager","+923700297696"],
 ["Daniyal Faraz","AI Bot Manager","N/A"]
].map(([name,role,phone])=>{
 const d=node("div");
 d.append(node("span",name.split(" ").map(w=>w[0]).slice(0,2).join(""),"avatar"),node("h3",name),node("p",role));
 if(phone){
  const contact=node("div",null,"team-contact");
  contact.append(node("span","Phone","team-phone-label"));
  if(phone==="N/A")contact.append(node("span","N/A","team-phone-unavailable"));
  else {const link=node("a",phone,"team-phone");link.href="tel:"+phone;link.setAttribute("aria-label","Call "+name+" at "+phone);contact.append(link)}
  d.append(contact);
 }
 return d;
}));
$("#search").oninput=render;
$("#close-reader").onclick=()=>$("#reader").close();
render();
if(cfg.supabaseUrl&&cfg.publishableKey){
 fetch(cfg.supabaseUrl+"/rest/v1/articles?select=id,title,category,excerpt,body,source_url,content_kind,images&published=eq.true&order=created_at.desc",{headers:{apikey:cfg.publishableKey}}).then(async r=>{if(!r.ok)throw Error("Content unavailable");const live=await r.json();if(live.length){articles=live;$("#data-status").textContent=""}else{$("#data-status").textContent="Full articles are being migrated. Showing preview excerpts from the original website."}render()}).catch(()=>{$("#data-status").textContent="Live articles are unavailable. Showing preview excerpts from the original website."});
}else $("#data-status").textContent="Preview excerpts from the original website. Full articles will appear after content migration.";
if($("#contact-form")) $("#contact-form").onsubmit=async e=>{e.preventDefault();const status=$("#contact-status");if(!cfg.supabaseUrl||!cfg.publishableKey){status.textContent="The message form is not connected yet. Please use WhatsApp.";return}const button=e.currentTarget.querySelector("button");button.disabled=true;status.textContent="Sending…";try{const values=Object.fromEntries(new FormData(e.currentTarget));const r=await fetch(cfg.supabaseUrl+"/functions/v1/contact",{method:"POST",headers:{apikey:cfg.publishableKey,Authorization:"Bearer "+cfg.contactToken,"Content-Type":"application/json"},body:JSON.stringify(values)});const data=await r.json();status.textContent=data.message||"Unable to send. Please try WhatsApp.";if(r.ok)$("#contact-form").reset()}catch{status.textContent="Unable to send. Please try WhatsApp."}finally{button.disabled=false}};
