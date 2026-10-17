// No dependencies or client-visible privileged keys. Never log request bodies.
const cors = {'Access-Control-Allow-Origin':'https://bubloo-scientist.vercel.app','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply(405,'Use POST.');
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer \S+$/i.test(authorization))return reply(401,'Sign in first.');
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const callerHeaders={apikey:key,Authorization:authorization,'Content-Type':'application/json'};
 try{
  const user=await fetch(url+'/auth/v1/user',{headers:callerHeaders});
  if(!user.ok)return reply(401,'Your session has expired.');
  const access=await fetch(url+'/rest/v1/rpc/studio_role',{method:'POST',headers:callerHeaders,body:'{}'});
  if(!access.ok||await access.json()!=='owner')return reply(403,'Only the owner can create administrators.');
  const security=await fetch(url+'/rest/v1/rpc/editor_access',{method:'POST',headers:callerHeaders,body:'{}'});
  if(!security.ok||await security.json()!==true)return reply(403,'Complete your WhatsApp verification before managing administrators.');
  if(Number(req.headers.get('content-length')||0)>4096)return reply(413,'Request too large.');
  const raw=await req.text();if(raw.length>4096)return reply(413,'Request too large.');
  let input;try{input=JSON.parse(raw)}catch{return reply(400,'Invalid request.');}
  const email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  const password=typeof input.password==='string'?input.password:'';
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||password.length<12||password.length>128)return reply(400,'Enter a valid email and a password of 12–128 characters.');
  const serviceHeaders={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
  const id=crypto.randomUUID();
  const reserve=await fetch(url+'/rest/v1/rpc/prepare_studio_account',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_id:id,p_email:email})});
  if(!reserve.ok)return reply(503,'Account service unavailable. Please try again.');
  const result=await fetch(url+'/auth/v1/admin/users',{method:'POST',headers:serviceHeaders,body:JSON.stringify({id,email,password,email_confirm:true,app_metadata:{studio_provisioned:true}})});
  const created=await result.json();
  // Existing accounts are never reset or taken over by this operation.
  if(!result.ok){
   await fetch(url+'/rest/v1/rpc/cancel_studio_account',{method:'POST',headers:serviceHeaders,body:JSON.stringify({p_id:id})});
   return reply(409,'Account could not be created. If it already exists, use Add existing account instead.');
  }
  const grant=await fetch(url+'/rest/v1/rpc/manage_studio_admin',{method:'POST',headers:callerHeaders,body:JSON.stringify({p_email:email,p_action:'grant'})});
  if(!grant.ok){
   await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(created.id),{method:'DELETE',headers:serviceHeaders});
   return reply(403,'Account creation was cancelled because access could not be granted.');
  }
  return reply(201,'Administrator created. Share the credentials privately and ask them to change their password in Profile.');
 }catch{return reply(503,'Account service unavailable. Please try again.');}
});
