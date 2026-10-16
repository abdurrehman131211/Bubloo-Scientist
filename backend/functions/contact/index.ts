const cors = {
 "Access-Control-Allow-Origin":"*",
 "Access-Control-Allow-Headers":"authorization, apikey, content-type, x-client-info",
 "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const reply=(status:number,message:string)=>new Response(JSON.stringify({message}),{status,headers:{...cors,"Content-Type":"application/json"}});
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response(null,{status:204,headers:cors});
 if(req.method!=="POST")return reply(405,"Method not allowed.");
 if(Number(req.headers.get("content-length")||0)>16000)return reply(413,"Message is too large.");
 try{
  const raw=await req.text();
  if(raw.length>16000)return reply(413,"Message is too large.");
  const data=JSON.parse(raw);
  if(data.website)return reply(200,"Thank you. Your message has been sent.");
  const name=typeof data.name==="string"?data.name.trim():"";
  const email=typeof data.email==="string"?data.email.trim():"";
  const message=typeof data.message==="string"?data.message.trim():"";
  if(!name||name.length>100||email.length>254||!/^\S+@\S+\.\S+$/.test(email)||message.length<10||message.length>4000)return reply(400,"Please check your name, email and message.");
  const url=Deno.env.get("SUPABASE_URL"),key=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!url||!key)return reply(503,"Message service is unavailable. Please use WhatsApp.");
  const result=await fetch(url+"/rest/v1/rpc/accept_contact",{method:"POST",headers:{"Content-Type":"application/json",apikey:key,Authorization:"Bearer "+key},body:JSON.stringify({p_name:name,p_email:email,p_message:message})});
  if(!result.ok){const error=await result.json().catch(()=>({}));return reply(error.code==="P0001"?429:503,error.code==="P0001"?"Too many messages. Please try later or use WhatsApp.":"Unable to send. Please use WhatsApp.");}
  return reply(200,"Thank you. Your message has been sent.");
 }catch{return reply(400,"Unable to process this message. Please check the form.");}
});
