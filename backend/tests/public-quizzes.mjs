import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
class Element{
 constructor(tag='div'){this.tag=tag;this.children=[];this.hidden=false;this.textContent='';this.checked=false;this.value='';this.disabled=false;}
 append(...nodes){this.children.push(...nodes)}replaceChildren(...nodes){this.children=nodes}scrollIntoView(){}
 all(){return this.children.flatMap(c=>[c,...(c.all?.()||[])])}
 querySelector(selector){return this.all().find(c=>c.tag===selector)||null}
 querySelectorAll(selector){return this.all().filter(c=>c.tag===selector)}reset(){this.querySelectorAll('input').forEach(c=>c.checked=false)}
}
const source=fs.readFileSync('dist/quiz.js','utf8');
const quiz={id:'quiz-1',title:'Published quiz',description:'From the Studio',version:2,questions:[{text:'Choose B',choices:['A','B']}]};
async function environment({page=true,empty=false,fail=false}={}){
 const els=new Map(['published-quizzes','quiz-status',...(page?['quiz','quiz-result','quiz-detail','quiz-title','quiz-description']:[])].map(id=>['#'+id,new Element(id==='quiz'?'form':'div')]));
 const calls=[];const context={window:{SITE_CONFIG:{supabaseUrl:'https://test.invalid',publishableKey:'public'},location:{href:'https://site.invalid/quiz-and-survey/'}},URL,JSON,Error,Number,encodeURIComponent,
 document:{querySelector:s=>els.get(s)||null,createElement:tag=>new Element(tag)},
 FormData:class{constructor(form){this.values=new Map(form.querySelectorAll('input').filter(i=>i.checked).map(i=>[i.name,i.value]))}has(k){return this.values.has(k)}get(k){return this.values.get(k)}},
 fetch:async(url,options)=>{calls.push({url,body:JSON.parse(options.body)});return{ok:!fail,json:async()=>url.endsWith('list_published_quizzes')?(empty?[]:[{id:quiz.id,title:quiz.title,description:quiz.description,question_count:1}]):url.endsWith('get_published_quiz')?quiz:{score:1,total:1,review:[{correct:true,answer:1,explanation:'B is correct.'}]}}}};
 vm.runInNewContext(source,context);await new Promise(setImmediate);return{els,calls};
}
let env=await environment({page:false});let card=env.els.get('#published-quizzes').children[0];assert.equal(card.children.at(-1).href,'/quiz-and-survey/?quiz=quiz-1');assert.equal(env.calls.length,1);
env=await environment({empty:true});assert.equal(env.els.get('#published-quizzes').children.length,0);assert.match(env.els.get('#quiz-status').textContent,/No quizzes are published/);
env=await environment({fail:true});assert.match(env.els.get('#quiz-status').textContent,/temporarily unavailable/);assert.equal(env.els.get('#published-quizzes').children.length,0);
env=await environment();card=env.els.get('#published-quizzes').children[0];await card.children.at(-1).onclick();
const form=env.els.get('#quiz');assert.equal(env.els.get('#quiz-title').textContent,'Published quiz');assert.equal(form.querySelectorAll('input').length,2);assert.equal(env.els.get('#quiz-detail').hidden,false);
await form.onsubmit({preventDefault(){}});assert.match(env.els.get('#quiz-status').textContent,/answer every question/);
form.querySelectorAll('input')[1].checked=true;await form.onsubmit({preventDefault(){}});const graded=env.calls.find(c=>c.url.endsWith('grade_published_quiz'));assert.deepEqual(graded.body,{p_id:'quiz-1',p_version:2,p_answers:[1]});assert.equal(env.els.get('#quiz-result').children[0].textContent,'You scored 1 / 1');assert.ok(form.querySelectorAll('input').every(i=>i.disabled));
env.els.get('#quiz-result').children.at(-1).onclick();assert.equal(env.els.get('#quiz-result').children.length,0);assert.ok(form.querySelectorAll('input').every(i=>!i.disabled&&!i.checked));
console.log('Public quizzes: live list, home links, empty/error states, questions, required answers, server grading, version, score/review and retry passed.');
