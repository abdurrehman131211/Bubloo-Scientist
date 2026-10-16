"use strict";
// A remembered browser session stores tokens, never the password.
window.StudioSession=class {
 constructor(config){this.config=config;this.key='bubloo.studio.session.v1';this.value=null;this.pending=null;this.persistent=true;this.generation=0;}
 read(){try{return JSON.parse(localStorage.getItem(this.key)||sessionStorage.getItem(this.key)||'null')}catch{return null}}
 save(data,remember=this.persistent){
  this.persistent=remember;
  this.value={access_token:data.access_token,refresh_token:data.refresh_token,expires_at:data.expires_at||Math.floor(Date.now()/1000)+(data.expires_in||3600),user:data.user};
  try{localStorage.removeItem(this.key);sessionStorage.removeItem(this.key);(remember?localStorage:sessionStorage).setItem(this.key,JSON.stringify(this.value))}catch{}
 }
 clear(){this.generation++;this.value=null;try{localStorage.removeItem(this.key);sessionStorage.removeItem(this.key)}catch{}}
 restore(){this.value=this.read();try{this.persistent=!!localStorage.getItem(this.key)}catch{}return this.value;}
 async access(force=false){
  if(!this.value)return '';
  if(!force&&this.value.expires_at>Date.now()/1000+60)return this.value.access_token;
  if(this.pending)return this.pending;
  const generation=this.generation;
  const refresh=async()=>{
   const latest=this.read();if(!latest){this.value=null;return '';}
   if(latest.refresh_token!==this.value?.refresh_token&&latest.expires_at>Date.now()/1000+60){this.value=latest;return latest.access_token;}
   const response=await fetch(this.config.supabaseUrl+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{apikey:this.config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:latest.refresh_token})});
   if(!response.ok){if(response.status===400||response.status===401)this.clear();throw Error(response.status>=500?'Sign-in service is temporarily unavailable. Please try again.':'Your session has expired. Please sign in again.');}
   const data=await response.json();if(this.generation!==generation)return '';
   this.save(data);return this.value.access_token;
  };
  this.pending=(navigator.locks?navigator.locks.request(this.key,refresh):refresh()).finally(()=>this.pending=null);
  return this.pending;
 }
};
