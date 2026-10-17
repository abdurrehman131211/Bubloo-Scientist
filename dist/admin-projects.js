'use strict';
let studioProjects=[],projectImages=[],projectDirty=false,projectUploading=false,projectGeneration=0;
const projectStatuses={planned:'Planned',in_progress:'In progress',completed:'Completed'};
function resetProjects(){projectGeneration++;studioProjects=[];projectImages=[];projectDirty=false;projectUploading=false;$('#project-editor').reset();$('#project-editor').elements.project_id.value='';$('#project-image-list').replaceChildren();$('#studio-project-list').replaceChildren();$('#project-count-nav').textContent='0';$('#save-project').disabled=false;$('#project-images').disabled=false;$('#project-preview').close();$('#project-preview-body').replaceChildren();$('#project-preview-title').textContent='';$('#project-preview-summary').textContent=''}
async function loadProjects(){try{studioProjects=await api('/rest/v1/projects?select=*&order=updated_at.desc');renderProjects()}catch(error){$('#studio-project-list').replaceChildren(empty('Projects could not be loaded','Use Refresh to try again.'));notify(error.message,true)}}
function projectCanReplace(){if(projectUploading){notify('Wait for your project pictures to finish uploading.',true);return false}return !projectDirty||confirm('Discard unsaved project changes?')}
function newProject(){if(!projectCanReplace())return;$('#project-editor').reset();$('#project-editor').elements.project_id.value='';projectImages=[];projectDirty=false;$('#project-editor-heading').textContent='Create a project';renderProjectImages();$('#project-editor').elements.project_title.focus()}
function openProject(project){if(!projectCanReplace())return;const f=$('#project-editor');for(const key of ['title','category','summary','details','status','repo_url','demo_url'])f.elements['project_'+key].value=project[key]||'';f.elements.project_id.value=project.id;f.elements.project_published.checked=project.published;projectImages=(project.images||[]).map(image=>({...image}));projectDirty=false;$('#project-editor-heading').textContent='Edit project';renderProjectImages();f.scrollIntoView({block:'start',behavior:'auto'})}
function renderProjects(){
 $('#project-count-nav').textContent=studioProjects.length;
 const query=$('#project-search').value.toLowerCase().trim(),filter=$('#project-filter').value;
 const matching=studioProjects.filter(p=>(p.title+' '+p.category).toLowerCase().includes(query)&&(filter==='all'||(filter==='published'?p.published:!p.published)));
 $('#studio-project-list').replaceChildren(...matching.map(project=>{
  const row=text('article','','article-row'),info=text('div','');info.append(text('h3',project.title),text('p',project.category+' · '+projectStatuses[project.status]+' · '+date(project.updated_at)));
  const actions=text('div','','row-actions'),edit=text('button','Edit','btn quiet small'),remove=text('button','Delete','btn danger small');edit.type=remove.type='button';edit.setAttribute('aria-label','Edit '+project.title);remove.setAttribute('aria-label','Delete '+project.title);edit.onclick=()=>openProject(project);
  remove.onclick=async()=>{if(projectUploading){notify('Wait for your pictures to finish uploading.',true);return}if(!confirm('Permanently delete "'+project.title+'"?'))return;remove.disabled=true;try{const result=await api('/rest/v1/projects?id=eq.'+encodeURIComponent(project.id),{method:'DELETE',headers:{Prefer:'return=representation'}});if(!result?.length)throw Error('Project was not deleted. Check your access.');if($('#project-editor').elements.project_id.value===project.id){projectDirty=false;newProject()}await loadProjects();notify('Project deleted.')}catch(error){notify(error.message,true);remove.disabled=false}};
  actions.append(edit,remove);row.append(info,badge(project.published),actions);return row;
 }));
 if(!matching.length)$('#studio-project-list').append(empty(studioProjects.length?'No matching projects':'Your next idea starts here',studioProjects.length?'Try another search or status filter.':'Create a project below. Drafts stay private until you publish.'));
}
function renderProjectImages(){
 $('#project-image-list').replaceChildren(...projectImages.map((image,index)=>{
  const box=text('div','','image-edit'),img=document.createElement('img');img.src=window.StudioMedia.url('project-images',image.path);img.alt=image.alt||'';
  const fields=text('div','','image-fields'),altLabel=text('label','Alt text'),alt=document.createElement('input'),captionLabel=text('label','Caption'),caption=document.createElement('input');
  alt.value=image.alt||'';alt.maxLength=300;alt.oninput=()=>{image.alt=alt.value;projectDirty=true};altLabel.append(alt);caption.value=image.caption||'';caption.maxLength=500;caption.oninput=()=>{image.caption=caption.value;projectDirty=true};captionLabel.append(caption);
  const actions=text('div','','image-actions'),cover=text('button',index?'Make cover':'Cover picture','btn quiet small'),insert=text('button','Insert in details','btn quiet small'),remove=text('button','Remove','btn danger small');for(const b of [cover,insert,remove])b.type='button';cover.disabled=!index||projectUploading;remove.disabled=projectUploading;
  cover.onclick=()=>{projectImages.splice(index,1);projectImages.unshift(image);projectDirty=true;renderProjectImages()};
  insert.onclick=()=>{const body=$('#project-editor').elements.project_details;body.setRangeText('\n\n[[image:'+image.id+']]\n\n',body.selectionStart,body.selectionEnd,'end');projectDirty=true;body.focus()};
  remove.onclick=()=>{projectImages.splice(index,1);const body=$('#project-editor').elements.project_details;body.value=body.value.split('[[image:'+image.id+']]').join('');projectDirty=true;renderProjectImages()};
  actions.append(cover,insert,remove);fields.append(text('p','Picture '+(index+1)),altLabel,captionLabel,actions);box.append(img,fields);return box;
 }));
}
$('#project-images').onchange=async event=>{
 const input=event.currentTarget,files=[...input.files];if(!files.length)return;if(projectImages.length+files.length>12){notify('Use up to 12 project pictures.',true);input.value='';return}
 const generation=projectGeneration;projectUploading=true;input.disabled=true;$('#save-project').disabled=true;renderProjectImages();notify('Uploading project pictures…');
 try{for(const file of files){const image=await uploadImage(file,'project-images');if(generation!==projectGeneration)return;projectImages.push(image);projectDirty=true}notify('Pictures uploaded. Save your project to keep the changes.')}
 catch(error){if(generation===projectGeneration)notify(error.message,true)}finally{if(generation===projectGeneration){projectUploading=false;input.disabled=false;input.value='';$('#save-project').disabled=false;renderProjectImages()}}
};
$('#new-project').onclick=newProject;$('#project-search').oninput=renderProjects;$('#project-filter').onchange=renderProjects;$('#refresh-projects').onclick=loadProjects;
$('#project-editor').oninput=()=>projectDirty=true;
$('#preview-project').onclick=()=>{const f=$('#project-editor');$('#project-preview-title').textContent=f.elements.project_title.value||'Your project';$('#project-preview-summary').textContent=f.elements.project_summary.value;window.StudioMedia.render($('#project-preview-body'),f.elements.project_details.value,projectImages,'project-images');$('#project-preview').showModal()};
$('#close-project-preview').onclick=()=>$('#project-preview').close();
$('#project-editor').onsubmit=async event=>{
 event.preventDefault();if(projectUploading){notify('Wait for your pictures to finish uploading.',true);return}
 const form=event.currentTarget,id=form.elements.project_id.value,data={images:projectImages.map(image=>({...image})),published:form.elements.project_published.checked};
 for(const key of ['title','category','summary','details','status','repo_url','demo_url'])data[key]=form.elements['project_'+key].value.trim();
 if(['title','category','summary','details'].some(key=>!data[key])){notify('Complete the project title, category, summary and details.',true);return}
 for(const key of ['repo_url','demo_url']){if(!data[key])data[key]=null;else{try{if(!['http:','https:'].includes(new URL(data[key]).protocol))throw Error()}catch{notify('Project links must start with https:// or http://.',true);return}}}
 const button=$('#save-project'),generation=projectGeneration;busy(button,true,'Saving project…');
 try{const saved=await api('/rest/v1/projects'+(id?'?id=eq.'+encodeURIComponent(id):''),{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});if(generation!==projectGeneration)return;if(!saved?.length)throw Error('Project could not be saved. Check your admin access.');form.elements.project_id.value=saved[0].id;projectDirty=false;$('#project-editor-heading').textContent='Edit project';await loadProjects();notify(data.published?'Project published on the website.':'Project saved as a private draft.')}
 catch(error){if(generation===projectGeneration)notify(error.message,true)}finally{if(generation===projectGeneration)busy(button,false,'Save project')}
};
