"use strict";
window.StudioPhoneAuth=class {
 constructor(config){this.config=config;}
 normalize(value){const phone=String(value).trim().replace(/[\s()-]/g,'');if(!/^\+[1-9]\d{7,14}$/.test(phone))throw Error('Use an international phone number, for example +923001234567.');return phone;}
 canonical(value){return String(value||'').replace(/^\+/,'');}
 mask(value){const phone=String(value||'');return '•••• '+phone.slice(-4);}
 aal(session){try{return JSON.parse(atob(session.access_token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/'))).aal}catch{return 'aal1'}}
 async request(path,session,options={}){
  const response=await fetch(this.config.supabaseUrl+path,{...options,headers:{apikey:this.config.publishableKey,'Content-Type':'application/json',...(session?.access_token?{Authorization:'Bearer '+session.access_token}:{}),...options.headers}});
  const raw=await response.text();let data;try{data=raw?JSON.parse(raw):null}catch{throw Error('The sign-in service returned an unexpected response.');}
  if(!response.ok){
   if(response.status===429)throw Error('Too many attempts. Wait a moment before trying again.');
   if(path.includes('grant_type=password'))throw Error('Unable to sign in. Check your phone number and password.');
   if(path.endsWith('/verify'))throw Error('The verification code was not accepted. Check the code or request a new one.');
   if(path.includes('/factors'))throw Error('WhatsApp verification is unavailable. The owner must enable Phone MFA and configure WhatsApp delivery.');
   throw Error('Unable to complete this request. Please try again.');
  }
  return data;
 }
 async available(){const settings=await this.request('/auth/v1/settings');return settings.external?.phone===true&&['twilio','twilio_verify'].includes(settings.sms_provider);}
 async password(phone,password){return this.request('/auth/v1/token?grant_type=password',null,{method:'POST',body:JSON.stringify({phone:this.normalize(phone),password})});}
 async inspect(session,{phoneLogin=false}={}){
  // Server validation precedes reading the signed AAL; UI checks are backed by RLS.
  const user=await this.request('/auth/v1/user',session);
  const role=await this.request('/rest/v1/rpc/studio_role',session,{method:'POST',body:'{}'});
  if(!['owner','admin'].includes(role))throw Error('Not registered. This account is not a Studio administrator.');
  const factors=(user.factors||[]).filter(f=>f.factor_type==='phone'&&f.status==='verified');
  const matching=factors.find(f=>this.canonical(f.phone)===this.canonical(user.phone));
  if(phoneLogin&&(!user.phone_confirmed_at||!matching))throw Error('Phone sign-in is not set up. Sign in with email or Google, then verify your number in Profile.');
  return {user,factor:matching||factors[0],needsChallenge:factors.length>0&&this.aal(session)!=='aal2'};
 }
 async enroll(session,phone){return this.request('/auth/v1/factors',session,{method:'POST',body:JSON.stringify({factor_type:'phone',friendly_name:'Studio WhatsApp',phone:this.normalize(phone)})});}
 async challenge(session,factorId){const data=await this.request('/auth/v1/factors/'+encodeURIComponent(factorId)+'/challenge',session,{method:'POST',body:JSON.stringify({channel:'whatsapp'})});if(!data?.id)throw Error('Unable to start verification. Please try again.');return data;}
 async verify(session,factorId,challengeId,code){if(!/^\d{6,8}$/.test(code))throw Error('Enter the verification code from WhatsApp.');const data=await this.request('/auth/v1/factors/'+encodeURIComponent(factorId)+'/verify',session,{method:'POST',body:JSON.stringify({challenge_id:challengeId,code})});if(!data?.access_token||!data.refresh_token||this.aal(data)!=='aal2')throw Error('Security verification could not be completed. Please sign in again.');return data;}
 async revoke(session){try{await this.request('/auth/v1/logout?scope=local',session,{method:'POST'})}catch{}}
 async removeUnverified(session,id){try{await this.request('/auth/v1/factors/'+encodeURIComponent(id),session,{method:'DELETE'})}catch{}}
};
