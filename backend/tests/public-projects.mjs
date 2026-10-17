import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
class Node{constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.hidden=true;this.textContent='';this.attributes={}}append(...n){this.children.push(...n)}replaceChildren(...n){this.children=n}setAttribute(k,v){this.attributes[k]=v}scrollIntoView(){}}
const source=fs.readFileSync('dist/projects.js','utf8');
const project={id:'00000000-0000-4000-8000-000000000071',title:'<script>literal text</script>',category:'Physics',summary:'Build a sensor',details:'Methods and results',status:'in_progress',images:[],repo_url:'javascript:alert(1)',demo_url:'https://example.com/demo'};
async function run({rows=[project],home=false,fail=false,id=null}={}){
 const nodes=new Map(['project-list','project-status','project-detail','project-title','project-summary','project-meta','project-body','project-links'].map(id=>['#'+id,new Node('div')]));if(home)nodes.get('#project-list').dataset.limit='3';
 const urls=[];let rendered;
 const context={window:{SITE_CONFIG:{supabaseUrl:'https://test.invalid',publishableKey:'public'},StudioMedia:{url:()=>'',render:(node,body,images,bucket)=>{rendered={body,images,bucket}}}},URL,URLSearchParams,location:{search:id?'?project='+id:''},document:{querySelector:q=>nodes.get(q),createElement:tag=>new Node(tag)},fetch:async url=>{urls.push(url);return{ok:!fail,json:async()=>rows}},console};
 vm.runInNewContext(source,context);await new Promise(setImmediate);return{nodes,urls,rendered};
}
let result=await run({home:true});assert.equal(result.nodes.get('#project-list').children.length,1);assert.ok(result.urls[0].includes('published=eq.true'));assert.ok(result.urls[0].includes('limit=3'));const copy=result.nodes.get('#project-list').children[0].children[1];assert.equal(copy.children[2].children[0].textContent,project.title);
result=await run({rows:[]});assert.match(result.nodes.get('#project-status').textContent,/Published projects will appear/);
result=await run({fail:true});assert.match(result.nodes.get('#project-status').textContent,/unavailable/);
result=await run({id:project.id});assert.equal(result.nodes.get('#project-detail').hidden,false);assert.equal(result.rendered.bucket,'project-images');assert.equal(result.rendered.body,project.details);assert.equal(result.nodes.get('#project-links').children.length,1);assert.equal(result.nodes.get('#project-links').children[0].href,project.demo_url);assert.ok(result.urls[1].includes('published=eq.true&id=eq.'));
result=await run({id:'bad'});assert.match(result.nodes.get('#project-status').textContent,/invalid/);
result=await run({id:project.id,rows:[]});assert.match(result.nodes.get('#project-status').textContent,/not been published/);
console.log('Public projects: published queries, homepage limit, text safety, empty/error states, details, safe links and invalid/unpublished links passed.');
