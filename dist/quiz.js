(()=>{
 'use strict';
 const list=document.querySelector('#published-quizzes');if(!list)return;
 const cfg=window.SITE_CONFIG,status=document.querySelector('#quiz-status'),form=document.querySelector('#quiz'),result=document.querySelector('#quiz-result'),detail=document.querySelector('#quiz-detail');
 let active=null,request=0;
 const node=(tag,value,className)=>{const el=document.createElement(tag);if(value!==undefined)el.textContent=value;if(className)el.className=className;return el};
 async function rpc(name,data={}){
  if(!cfg?.supabaseUrl||!cfg?.publishableKey)throw Error('Quizzes are temporarily unavailable. Please try again later.');
  const response=await fetch(cfg.supabaseUrl+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:cfg.publishableKey,'Content-Type':'application/json'},body:JSON.stringify(data)});
  if(!response.ok)throw Error(name==='grade_published_quiz'?'This quiz changed or is no longer available. Reload the page to start again.':'Quizzes are temporarily unavailable. Please try again later.');
  return response.json();
 }
 async function openQuiz(id){
  const current=++request;status.textContent='Loading your quiz…';detail.hidden=true;result.replaceChildren();
  try{
   const quiz=await rpc('get_published_quiz',{p_id:id});if(current!==request)return;
   if(!quiz)throw Error('This quiz is no longer available. Choose another quiz.');active=quiz;
   document.querySelector('#quiz-title').textContent=quiz.title;document.querySelector('#quiz-description').textContent=quiz.description;
   form.replaceChildren(...quiz.questions.map((q,i)=>{
    const field=node('fieldset',undefined,'public-quiz-question');field.append(node('legend',(i+1)+'. '+q.text));
    q.choices.forEach((choice,j)=>{const label=node('label',undefined,'public-quiz-choice'),radio=document.createElement('input');radio.type='radio';radio.name='q'+i;radio.value=String(j);radio.required=true;label.append(radio,node('span',choice));field.append(label)});return field;
   }));
   const submit=node('button','Check my answers','button');submit.type='submit';form.append(submit);detail.hidden=false;status.textContent='';detail.scrollIntoView({block:'start',behavior:'smooth'});
  }catch(error){if(current===request)status.textContent=error.message}
 }
 if(form)form.onsubmit=async event=>{
  event.preventDefault();if(!active)return;const quiz=active,current=request,values=new FormData(form),answers=quiz.questions.map((_q,i)=>values.has('q'+i)?Number(values.get('q'+i)):-1);
  if(answers.some(a=>a<0)){status.textContent='Please answer every question.';return}
  const button=form.querySelector('button');button.disabled=true;status.textContent='Checking your answers…';
  try{
   const graded=await rpc('grade_published_quiz',{p_id:quiz.id,p_version:quiz.version,p_answers:answers});if(current!==request)return;
   result.replaceChildren(node('h3','You scored '+graded.score+' / '+graded.total));
   graded.review.forEach((review,i)=>{const box=node('div',undefined,'quiz-review '+(review.correct?'correct':'incorrect'));box.append(node('h4',(i+1)+'. '+(review.correct?'Correct':'Review this answer')),node('p','Correct answer: '+quiz.questions[i].choices[review.answer]));if(review.explanation)box.append(node('p',review.explanation));result.append(box)});
   const again=node('button','Try again','button');again.type='button';again.onclick=()=>{form.reset();form.querySelectorAll('input').forEach(input=>input.disabled=false);button.disabled=false;result.replaceChildren();form.scrollIntoView({block:'start',behavior:'smooth'})};result.append(again);
   form.querySelectorAll('input').forEach(input=>input.disabled=true);status.textContent='';result.scrollIntoView({block:'start',behavior:'smooth'});
  }catch(error){if(current===request){status.textContent=error.message;button.disabled=false}}
 };
 async function load(){
  status.textContent='Loading quizzes…';
  try{
   const quizzes=await rpc('list_published_quizzes');
   list.replaceChildren(...quizzes.map(quiz=>{
    const card=node('article',undefined,'quiz-card');card.append(node('p',quiz.question_count+' questions','eyebrow'),node('h3',quiz.title),node('p',quiz.description));
    const start=node(form?'button':'a','Start quiz','button');if(form){start.type='button';start.onclick=()=>openQuiz(quiz.id)}else start.href='/quiz-and-survey/?quiz='+encodeURIComponent(quiz.id);card.append(start);return card;
   }));
   status.textContent=quizzes.length?'':'No quizzes are published yet. Check back soon.';
   if(form){const selected=new URL(window.location.href).searchParams.get('quiz');if(selected&&quizzes.some(q=>q.id===selected))await openQuiz(selected);else if(selected)status.textContent='This quiz is no longer available. Choose a published quiz below.'}
  }catch(error){status.textContent=error.message}
 }
 load();
})();
