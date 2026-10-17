"use strict";
function renderArticleBody(container,body,images){window.StudioMedia.render(container,body,images)}
async function uploadImage(file,bucket){
 const types={'image/jpeg':'jpg','image/png':'png','image/webp':'webp',...(bucket==='article-images'?{'image/gif':'gif'}:{})};
 if(!types[file.type]||file.size>(bucket==='article-images'?5:2)*1024*1024)throw Error('Choose a supported image within the size limit.');
 token=await sessionStore.access();if(!currentUser?.id)throw Error('Sign in to upload a picture.');
 const id=crypto.randomUUID(),path=currentUser.id+'/'+id+'.'+types[file.type];
 const response=await fetch(cfg.supabaseUrl+'/storage/v1/object/'+bucket+'/'+path,{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+token,'Content-Type':file.type,'x-upsert':'false'},body:file});
 if(!response.ok)throw Error('Picture upload failed. Check your access and connection.');return {id,path,alt:'',caption:''};
}
function renderImages(){
 $('#image-list').replaceChildren(...articleImages.map((image,index)=>{
  const box=text('div','','image-edit'),url=window.StudioMedia.url('article-images',image.path),img=document.createElement('img');img.src=url;img.alt=image.alt||'';
  const fields=text('div','','image-fields'),altLabel=text('label','Alt text'),alt=document.createElement('input'),captionLabel=text('label','Caption'),caption=document.createElement('input');
  alt.value=image.alt||'';alt.maxLength=300;alt.placeholder='Describe the picture for screen readers';alt.oninput=()=>{image.alt=alt.value;dirty=true};altLabel.append(alt);
  caption.value=image.caption||'';caption.maxLength=500;caption.oninput=()=>{image.caption=caption.value;dirty=true};captionLabel.append(caption);
  const actions=text('div','','image-actions'),insert=text('button','Insert in article','btn quiet small'),cover=text('button',index?'Make cover':'Cover picture','btn quiet small'),remove=text('button','Remove','btn danger small');
  for(const button of [insert,cover,remove])button.type='button';cover.disabled=index===0;
  insert.onclick=()=>{const body=$('#editor').elements.body,pos=body.selectionStart;body.setRangeText('\n\n[[image:'+image.id+']]\n\n',pos,body.selectionEnd,'end');dirty=true;updateWordCount();body.focus()};
  cover.onclick=()=>{articleImages.splice(index,1);articleImages.unshift(image);dirty=true;renderImages()};
  remove.onclick=()=>{articleImages.splice(index,1);const body=$('#editor').elements.body;body.value=body.value.split('[[image:'+image.id+']]').join('');dirty=true;renderImages();updateWordCount()};
  actions.append(insert,cover,remove);fields.append(text('p','Picture '+(index+1)),altLabel,captionLabel,actions);box.append(img,fields);return box;
 }));
}
$('#article-images').onchange=async event=>{
 const input=event.currentTarget,files=[...input.files];if(articleImages.length+files.length>12){notify('An article can have up to 12 pictures.',true);input.value='';return}
 uploading++;input.disabled=true;$('#save-article').disabled=true;notify('Uploading pictures…');
 try{for(const file of files){articleImages.push(await uploadImage(file,'article-images'));dirty=true;renderImages()}notify('Pictures uploaded. Save the article to keep your changes.')}
 catch(error){notify(error.message,true)}finally{uploading--;input.disabled=false;input.value='';$('#save-article').disabled=false}
};
function renderProfile(){
 const form=$('#profile-form');for(const field of ['display_name','phone','bio'])form.elements[field].value=profile[field]||'';
 const initials=(profile.display_name||currentUser?.email||'BS').split(/[\s@]+/).slice(0,2).map(word=>word[0]).join('').toUpperCase();
 for(const selector of ['#account-avatar','#profile-photo']){
  const target=$(selector),url=window.StudioMedia.url('studio-avatars',profile.avatar_path);target.replaceChildren();
  if(url){const img=document.createElement('img');img.src=url;img.alt='Your profile picture';target.append(img)}else target.textContent=initials;
 }
 $('#current-email').textContent='Current email: '+currentUser.email+(currentUser.new_email?' · Pending change: '+currentUser.new_email:'');
}
async function loadProfile(){
 currentUser=await api('/auth/v1/user');const rows=await api('/rest/v1/studio_profiles?user_id=eq.'+encodeURIComponent(currentUser.id)+'&select=*');profile=rows[0]||{};renderProfile();
}
async function saveProfile(values){
 const rows=await api('/rest/v1/studio_profiles?on_conflict=user_id',{method:'POST',headers:{Prefer:'resolution=merge-duplicates,return=representation'},body:JSON.stringify({user_id:currentUser.id,display_name:profile.display_name||'',phone:profile.phone||'',bio:profile.bio||'',avatar_path:profile.avatar_path||'',...values})});
 if(!rows?.length)throw Error('Profile could not be saved.');profile=rows[0];renderProfile();
}
$('#profile-form').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,button=$('#save-profile');busy(button,true,'Saving…');
 try{await saveProfile(Object.fromEntries(['display_name','phone','bio'].map(key=>[key,form.elements[key].value.trim()])));notify('Profile saved.')}catch(error){notify(error.message,true)}finally{busy(button,false,'Save profile')}
};
$('#avatar-upload').onchange=async event=>{
 const input=event.currentTarget,file=input.files[0];if(!file)return;input.disabled=true;$('#save-profile').disabled=true;
 try{const image=await uploadImage(file,'studio-avatars');const form=$('#profile-form');await saveProfile({avatar_path:image.path,...Object.fromEntries(['display_name','phone','bio'].map(key=>[key,form.elements[key].value.trim()]))});notify('Profile picture updated.')}
 catch(error){notify(error.message,true)}finally{input.value='';input.disabled=false;$('#save-profile').disabled=false}
};
$('#remove-avatar').onclick=async()=>{try{await saveProfile({avatar_path:''});notify('Profile picture removed.')}catch(error){notify(error.message,true)}};
$('#email-form').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,button=form.querySelector('button');busy(button,true,'Requesting…');
 try{currentUser=await api('/auth/v1/user',{method:'PUT',body:JSON.stringify({email:form.elements.email.value.trim()})});renderProfile();form.reset();notify('Email change requested. Follow the confirmation links in your current and new inboxes.')}
 catch(error){notify('Email change could not be requested. '+error.message,true)}finally{busy(button,false,'Request email change')}
};
$('#password-form').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget;if(form.elements.password.value!==form.elements.confirmation.value){notify('Your passwords do not match.',true);return}
 const button=form.querySelector('button');busy(button,true,'Updating…');
 try{await api('/auth/v1/user',{method:'PUT',body:JSON.stringify({password:form.elements.password.value})});form.reset();notify('Password updated. Use your new password next time you sign in.')}
 catch(error){notify(error.message,true)}finally{busy(button,false,'Change password')}
};
$('#logout-all').onclick=async()=>{
 if(!confirm('Sign out on all devices? You will need to sign in again.'))return;
 try{await api('/auth/v1/logout?scope=global',{method:'POST'});signOut();notify('Signed out. Existing access tokens on other devices expire within their normal lifetime.')}
 catch(error){notify(error.message,true)}
};
async function restoreSession(){
 if(!sessionStore.restore())return;busy($('#auth-submit'),true,'Restoring your session…');
 try{token=await sessionStore.access();if(!token)return;await load();$('#auth').hidden=true;$('#workspace').hidden=false;showView('overview');notify()}
 catch(error){notify(error.message,true)}finally{busy($('#auth-submit'),false,'Sign in to Studio')}
}
window.addEventListener('storage',event=>{if(event.key!==sessionStore.key)return;if(!event.newValue){if(!localStorage.getItem(sessionStore.key)){signOut();notify('You signed out in another tab.')}}else sessionStore.restore()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&sessionStore.value)sessionStore.access().then(value=>token=value).catch(error=>{if(!sessionStore.value)signOut();notify(error.message,true)})});
initializeStudioSignIn();

async function initializeStudioSignIn(){
 const google=new window.StudioGoogle(cfg),button=$('#google-signin'),help=$('#google-signin-help');
 const enabledMessage='Use the Google email already approved for your Studio account.';
 const unavailableMessage='Google sign-in is not available yet. Use your email and password.';
 button.disabled=true;
 button.onclick=async()=>{
  button.disabled=true;$('#auth-submit').disabled=true;notify('Connecting to Google…');
  try{
   if(!await google.available())throw Error(unavailableMessage);
   await google.start($('#login').elements.remember.checked);
  }catch(error){notify(error.message,true);button.disabled=false;$('#auth-submit').disabled=false}
 };
 if(google.hasCallback()){
  busy($('#auth-submit'),true,'Checking your Google account…');
  try{
   const result=await google.finish();sessionStore.save(result.session,result.remember);token=result.session.access_token;currentUser=result.session.user;
   $('#login').elements.remember.checked=result.remember;
   await load();$('#auth').hidden=true;$('#workspace').hidden=false;showView('overview');notify();
  }catch(error){signOut();notify(error.message,true)}finally{busy($('#auth-submit'),false,'Sign in to Studio')}
 }else await restoreSession();
 try{const enabled=await google.available();button.disabled=!enabled;help.textContent=enabled?enabledMessage:unavailableMessage}
 catch{button.disabled=false;help.textContent=enabledMessage}
}
