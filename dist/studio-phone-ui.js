"use strict";
const phoneAuth=new window.StudioPhoneAuth(cfg);
let whatsAppPending=null,phoneReady=false;
async function finishStudioSignIn(data,remember,options={}){
 try{
  let checked=await phoneAuth.inspect(data,options);
  if(checked.needsChallenge){sessionStore.clear();token='';data=await whatsAppCode(data,checked.factor,'signin');checked=await phoneAuth.inspect(data,options);}
  data.user=checked.user;sessionStore.save(data,remember);token=data.access_token;currentUser=checked.user;
  await load();$('#auth').hidden=true;$('#workspace').hidden=false;$('#login').elements.password.value='';showView('overview');notify();
 }catch(error){await phoneAuth.revoke(data);signOut();throw error;}
}
function resetPhoneSecurity(){
 const pending=whatsAppPending;whatsAppPending=null;
 if($('#whatsapp-dialog').open)$('#whatsapp-dialog').close();
 $('#whatsapp-code').value='';$('#whatsapp-status').textContent='';
 if(pending)pending.reject(Error('Verification cancelled.'));
}
async function whatsAppCode(session,factor,purpose){
 if(whatsAppPending)throw Error('Finish the current verification first.');
 const challenge=await phoneAuth.challenge(session,factor.id);
 $('#whatsapp-code').value='';$('#whatsapp-status').textContent='';$('#whatsapp-destination').textContent='Enter the code sent to WhatsApp '+phoneAuth.mask(factor.phone)+'.';
 $('#whatsapp-dialog').showModal();$('#whatsapp-code').focus();
 return new Promise((resolve,reject)=>{whatsAppPending={session,factor,challengeId:challenge.id,purpose,resolve,reject,verifying:false,nextSend:Date.now()+60000};});
}
$('#whatsapp-form').onsubmit=async event=>{
 event.preventDefault();const pending=whatsAppPending;if(!pending||pending.verifying)return;
 pending.verifying=true;busy($('#verify-whatsapp'),true,'Verifying…');
 try{
  const session=await phoneAuth.verify(pending.session,pending.factor.id,pending.challengeId,$('#whatsapp-code').value.trim());
  whatsAppPending=null;$('#whatsapp-code').value='';$('#whatsapp-dialog').close();pending.resolve(session);
 }catch(error){$('#whatsapp-status').textContent=error.message}
 finally{pending.verifying=false;busy($('#verify-whatsapp'),false,'Verify code')}
};
$('#resend-whatsapp').onclick=async()=>{
 const pending=whatsAppPending;if(!pending||pending.verifying)return;
 const wait=Math.ceil((pending.nextSend-Date.now())/1000);if(wait>0){$('#whatsapp-status').textContent='Wait '+wait+' seconds before requesting another code.';return}
 pending.verifying=true;$('#resend-whatsapp').disabled=true;
 try{const challenge=await phoneAuth.challenge(pending.session,pending.factor.id);pending.challengeId=challenge.id;pending.nextSend=Date.now()+60000;$('#whatsapp-status').textContent='A new code was sent.'}catch(error){$('#whatsapp-status').textContent=error.message}
 finally{pending.verifying=false;$('#resend-whatsapp').disabled=false}
};
function cancelWhatsApp(){const pending=whatsAppPending;if(!pending||pending.verifying)return;whatsAppPending=null;$('#whatsapp-dialog').close();$('#whatsapp-code').value='';pending.reject(Error('Verification cancelled.'));}
$('#cancel-whatsapp').onclick=cancelWhatsApp;
$('#whatsapp-dialog').oncancel=event=>{event.preventDefault();cancelWhatsApp()};
$('#login-method').onchange=()=>{
 const phone=$('#login-method').value==='phone';$('#email-login-label').hidden=phone;$('#phone-login-label').hidden=!phone;$('#login').elements.email.required=!phone;$('#login').elements.login_phone.required=phone;
 $('#auth-description').textContent=phone?'Sign in with your verified phone and password, then enter the WhatsApp code.':'Sign in to manage your articles and messages.';
};
function renderPhoneSecurity(){
 if(!currentUser)return;
 const factors=(currentUser.factors||[]).filter(f=>f.factor_type==='phone'&&f.status==='verified');
 const linked=factors.some(f=>phoneAuth.canonical(f.phone)===phoneAuth.canonical(currentUser.phone))&&!!currentUser.phone_confirmed_at;
 $('#phone-security-status').textContent=linked?'Verified sign-in number: +'+phoneAuth.canonical(currentUser.phone)+'. WhatsApp verification is required for new sign-ins.':factors.length?'WhatsApp verification is enabled. Verify below to finish linking a phone sign-in number.':'Your contact number is not a sign-in number until verified here.';
 $('#phone-security-number').value=currentUser.phone?'+'+phoneAuth.canonical(currentUser.phone):(profile.phone||'');
 $('#enable-whatsapp').disabled=!phoneReady;
}
async function checkPhoneAvailability(){
 try{phoneReady=await phoneAuth.available()}catch{phoneReady=false}
 $('#phone-signin-help').textContent=phoneReady?'Use a number you have verified in Profile.':'Phone sign-in is not available yet. Use email or Google.';
 $('#phone-method-option').disabled=!phoneReady;$('#enable-whatsapp').disabled=!phoneReady;
 $('#phone-setup-availability').textContent=phoneReady?'Verify your WhatsApp number to enable secure phone sign-in.':'WhatsApp verification is not configured yet. Email and Google sign-in remain available.';
}
$('#phone-security-form').onsubmit=async event=>{
 event.preventDefault();const button=$('#enable-whatsapp');let factor,wasNew=false,verified=false;
 busy(button,true,'Preparing verification…');
 try{
  if(!await phoneAuth.available())throw Error('WhatsApp verification is not configured yet. Contact the site owner.');
  const phone=phoneAuth.normalize($('#phone-security-number').value),session={...sessionStore.value,access_token:await sessionStore.access()};
  const user=await phoneAuth.request('/auth/v1/user',session);
  factor=(user.factors||[]).find(f=>f.factor_type==='phone'&&phoneAuth.canonical(f.phone)===phoneAuth.canonical(phone));
  if(!factor){factor=await phoneAuth.enroll(session,phone);factor.phone=phone;wasNew=true;}
  const upgraded=await whatsAppCode(session,factor,'enroll');verified=true;
  sessionStore.save(upgraded,sessionStore.persistent);token=upgraded.access_token;
  const linked=await api('/functions/v1/link-phone',{method:'POST',body:JSON.stringify({factor_id:factor.id})});
  await saveProfile({phone});await loadProfile();notify(linked.message);
 }catch(error){if(wasNew&&!verified&&factor)await phoneAuth.removeUnverified(sessionStore.value,factor.id);if(verified){try{await loadProfile()}catch{}}notify(error.message,true)}
 finally{busy(button,false,'Verify & enable WhatsApp');button.disabled=!phoneReady}
};

checkPhoneAvailability();
