(() => {
 'use strict';
 const cfg=window.SITE_CONFIG,list=document.querySelector('#project-list'),status=document.querySelector('#project-status');
 if(!list||!status)return;
 const labels={planned:'Planned',in_progress:'In progress',completed:'Completed'};
 const el=(tag,value,cls)=>{const n=document.createElement(tag);if(value)n.textContent=value;if(cls)n.className=cls;return n};
 const safeLink=value=>{try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)?u.href:null}catch{return null}};
 async function request(query){const response=await fetch(cfg.supabaseUrl+'/rest/v1/projects?'+query,{headers:{apikey:cfg.publishableKey}});if(!response.ok)throw Error('Projects are unavailable right now. Please try again shortly.');return response.json()}
 async function detail(id){
  const target=document.querySelector('#project-detail');if(!target)return;
  status.textContent='Loading project…';
  try{const rows=await request('select=*&published=eq.true&id=eq.'+encodeURIComponent(id));const project=rows[0];if(!project){status.textContent='This project is unavailable or has not been published.';return}
   document.querySelector('#project-title').textContent=project.title;document.querySelector('#project-summary').textContent=project.summary;document.querySelector('#project-meta').textContent=project.category+' · '+labels[project.status];
   window.StudioMedia.render(document.querySelector('#project-body'),project.details,project.images,'project-images');
   const links=document.querySelector('#project-links');links.replaceChildren();
   for(const [key,label] of [['demo_url','Visit project'],['repo_url','View source code']]){const href=safeLink(project[key]);if(href){const a=el('a',label+' ↗','button');a.href=href;a.target='_blank';a.rel='noopener noreferrer';links.append(a)}}
   target.hidden=false;status.textContent='';document.title=project.title+' — Bubloo Scientist';target.scrollIntoView({block:'start',behavior:'auto'});
  }catch(error){status.textContent=error.message}
 }
 async function load(){
  status.textContent='Loading projects…';
  try{const home=list.dataset.limit==='3';const rows=await request('select=id,title,category,summary,status,images,updated_at&published=eq.true&order=updated_at.desc'+(home?'&limit=3':''));
   list.replaceChildren(...rows.map(project=>{
    const card=el('article','','project-card'),href='/projects/?project='+encodeURIComponent(project.id),visual=el('a','','project-cover');visual.href=href;visual.tabIndex=-1;visual.setAttribute('aria-hidden','true');
    const url=project.images?.length&&window.StudioMedia.url('project-images',project.images[0].path);
    if(url){const image=el('img');image.src=url;image.alt='';image.loading='lazy';visual.append(image)}else visual.append(el('span','{ }','project-symbol'));
    const copy=el('div','','project-copy'),heading=el('h3'),link=el('a',project.title);link.href=href;heading.append(link);
    copy.append(el('p',project.category,'eyebrow'),el('span',labels[project.status]||'Project','project-state'),heading,el('p',project.summary,'project-summary'));
    const more=el('a','Explore project →','project-more');more.href=href;more.setAttribute('aria-label','Explore '+project.title);copy.append(more);card.append(visual,copy);return card;
   }));
   status.textContent=rows.length?'':'Our next discoveries are taking shape. Published projects will appear here.';
   const id=new URLSearchParams(location.search).get('project');if(!home&&id){if(/^[a-f0-9-]{36}$/i.test(id))await detail(id);else status.textContent='This project link is invalid.'}
  }catch(error){status.textContent=error.message}
 }
 load();
})();
