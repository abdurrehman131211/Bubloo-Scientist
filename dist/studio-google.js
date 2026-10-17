"use strict";
// Supabase verifies the Google identity. PKCE binds the callback to this browser.
window.StudioGoogle=class {
 constructor(config){this.config=config;this.key='bubloo.studio.google.pkce.v1';}
 async available(){
  const response=await fetch(this.config.supabaseUrl+'/auth/v1/settings',{headers:{apikey:this.config.publishableKey}});
  if(!response.ok)throw Error('Unable to check Google sign-in. Please try again.');
  return (await response.json()).external?.google===true;
 }
 hasCallback(){const url=new URL(window.location.href);return url.searchParams.has('code')||url.searchParams.has('error')||new URLSearchParams(url.hash.slice(1)).has('error');}
 async start(remember){
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const encode=values=>btoa(String.fromCharCode(...values)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  const verifier=encode(bytes),digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  sessionStorage.setItem(this.key,JSON.stringify({verifier,remember:!!remember,created:Date.now()}));
  const url=new URL(this.config.supabaseUrl+'/auth/v1/authorize');
  url.searchParams.set('provider','google');
  url.searchParams.set('redirect_to',new URL('/admin.html',window.location.origin).href);
  url.searchParams.set('code_challenge',encode(new Uint8Array(digest)));
  url.searchParams.set('code_challenge_method','s256');
  url.searchParams.set('scopes','email profile');
  url.searchParams.set('prompt','select_account');
  window.location.assign(url.href);
 }
 async finish(){
  const url=new URL(window.location.href),code=url.searchParams.get('code');
  const failed=url.searchParams.has('error')||new URLSearchParams(url.hash.slice(1)).has('error');
  // Remove authorization codes/errors before any further navigation or requests.
  for(const key of ['code','error','error_code','error_description'])url.searchParams.delete(key);
  url.hash='';window.history.replaceState(null,'',url.pathname+url.search);
  let pending;try{pending=JSON.parse(sessionStorage.getItem(this.key)||'null')}catch{}
  sessionStorage.removeItem(this.key);
  if(failed)throw Error('Google sign-in could not be completed. Use your approved admin email or sign in with your password.');
  if(!code||!pending||typeof pending.verifier!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(pending.verifier)||typeof pending.created!=='number'||Date.now()-pending.created>600000||pending.created>Date.now()+5000)throw Error('This Google sign-in attempt has expired. Please start again from this browser.');
  const response=await fetch(this.config.supabaseUrl+'/auth/v1/token?grant_type=pkce',{method:'POST',headers:{apikey:this.config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({auth_code:code,code_verifier:pending.verifier})});
  if(!response.ok)throw Error('Google sign-in could not be completed. Please try again.');
  const session=await response.json();
  if(!session.access_token||!session.refresh_token)throw Error('Google did not return a valid sign-in session. Please try again.');
  const headers={apikey:this.config.publishableKey,Authorization:'Bearer '+session.access_token,'Content-Type':'application/json'};
  try{
   // Never persist the returned tokens until the server confirms membership.
   const userResponse=await fetch(this.config.supabaseUrl+'/auth/v1/user',{headers});
   if(!userResponse.ok)throw Error('Your Google session could not be verified.');
   const user=await userResponse.json();
   if(!user.email_confirmed_at||!user.identities?.some(identity=>identity.provider==='google'&&identity.identity_data?.email_verified===true&&typeof identity.identity_data.email==='string'&&identity.identity_data.email.toLowerCase()===user.email?.toLowerCase()))throw Error('Choose the Google account with your approved admin email address.');
   const roleResponse=await fetch(this.config.supabaseUrl+'/rest/v1/rpc/studio_role',{method:'POST',headers,body:'{}'});
   if(!roleResponse.ok)throw Error('Unable to check your registration. Please try again.');
   const role=await roleResponse.json();
   if(!['owner','admin'].includes(role))throw Error('Not registered. This email is not registered as a Studio administrator. Ask the owner to add you.');
   session.user=user;return {session,remember:pending.remember===true};
  }catch(error){
   // Revoke this rejected session; never sign out other devices.
   try{await fetch(this.config.supabaseUrl+'/auth/v1/logout?scope=local',{method:'POST',headers})}catch{}
   throw error;
  }
 }
};
