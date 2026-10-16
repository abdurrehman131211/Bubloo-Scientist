import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
let handler,upstreamStatus=204,calls=0;
const source=fs.readFileSync(new URL("../functions/contact/index.ts",import.meta.url),"utf8")
 .replaceAll(":number","").replaceAll(":string","").replaceAll("req:Request","req");
vm.runInNewContext(source,{Request,Response,JSON,Deno:{env:{get:()=> "test-server-value"},serve:fn=>handler=fn},fetch:async()=>{calls++;return upstreamStatus===204?new Response(null,{status:204}):new Response(JSON.stringify({code:"P0001"}),{status:400})}});
const send=data=>handler(new Request("https://test.invalid",{method:"POST",body:JSON.stringify(data)}));
assert.equal((await handler(new Request("https://test.invalid",{method:"GET"}))).status,405);
assert.equal((await send({name:"",email:"invalid",message:"short"})).status,400);
assert.equal(calls,0);
assert.equal((await send({website:"spam.example"})).status,200);
assert.equal(calls,0);
assert.equal((await send({name:"Test",email:"test@example.invalid",message:"A valid test message."})).status,200);
assert.equal(calls,1);
upstreamStatus=400;
assert.equal((await send({name:"Test",email:"test@example.invalid",message:"Another valid message."})).status,429);
assert.equal((await handler(new Request("https://test.invalid",{method:"POST",body:"not json"}))).status,400);
console.log("Contact validation and upstream rate-limit tests passed.");
