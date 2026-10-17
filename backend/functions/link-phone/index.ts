const cors={'Access-Control-Allow-Origin':'https://bubloo-scientist.vercel.app','Access-Control-Allow-Headers':'authorization, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS','Vary':'Origin'};
const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}});
Deno.serve(async(req:Request)=>{
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(req.method!=='POST')return reply(405,'Use POST.');
 const authorization=req.headers.get('Authorization')||'';
 if(!/^Bearer \S+$/i.test(authorization))return reply(401,'Sign in first.');
 const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
 const headers={apikey:key,Authorization:authorization,'Content-Type':'application/json'};
 try{
  const identity=await fetch(url+'/auth/v1/user',{headers});if(!identity.ok)return reply(401,'Sign in again.');
  const user=await identity.json();
  // The JWT was validated by Auth above. Check MFA before using its signed AAL.
  let claims;try{const encoded=authorization.slice(7).split('.')[1].replace(/-/g,'+').replace(/_/g,'/');claims=JSON.parse(atob(encoded))}catch{return reply(401,'Invalid session.');}
  if(claims.sub!==user.id||claims.aal!=='aal2')return reply(403,'Verify your WhatsApp security code first.');
  const access=await fetch(url+'/rest/v1/rpc/editor_access',{method:'POST',headers,body:'{}'});
  if(!access.ok||await access.json()!==true)return reply(403,'Administrator access is required.');
  const raw=await req.text();if(raw.length>2048)return reply(413,'Request too large.');
  let data;try{data=JSON.parse(raw)}catch{return reply(400,'Invalid request.');}
  const factor=user.factors?.find((item:{id:string;factor_type:string;status:string})=>item.id===data.factor_id&&item.factor_type==='phone'&&item.status==='verified');
  if(!factor||typeof factor.phone!=='string'||!/^\+?[1-9]\d{7,14}$/.test(factor.phone))return reply(403,'A verified phone factor is required.');
  const phone=factor.phone.replace(/^\+/,'');
  const service={apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json'};
  // Only this authenticated user is updated; never accept user ID or phone from the request.
  const linked=await fetch(url+'/auth/v1/admin/users/'+encodeURIComponent(user.id),{method:'PUT',headers:service,body:JSON.stringify({phone,phone_confirm:true})});
  if(!linked.ok)return reply(409,'This phone could not be linked. It may already belong to another account.');
  return reply(200,'Verified phone sign-in and WhatsApp security are enabled.');
 }catch{return reply(503,'Phone linking is temporarily unavailable. Try again.');}
});
