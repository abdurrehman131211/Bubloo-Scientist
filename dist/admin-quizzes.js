"use strict";
let studioQuizzes=[],quizQuestions=[],quizDirty=false;
function quizQuestion(){return {text:'',choices:['','','',''],answer:0,explanation:''}}
function resetQuizzes(){studioQuizzes=[];quizQuestions=[];quizDirty=false;$('#quiz-editor').reset();$('#quiz-editor').elements.quiz_id.value='';$('#quiz-questions').replaceChildren();$('#studio-quiz-list').replaceChildren()}
async function loadQuizzes(){studioQuizzes=await api('/rest/v1/quizzes?select=*&order=created_at.desc');renderQuizzes();if(!quizQuestions.length){quizQuestions=[quizQuestion()];renderQuizQuestions()}}
function renderQuizzes(){
 $('#quiz-count-nav').textContent=studioQuizzes.length;
 $('#studio-quiz-list').replaceChildren(...studioQuizzes.map(quiz=>{
  const row=text('article','','quiz-admin-row'),info=text('div','');info.append(text('h3',quiz.title),text('p',quiz.questions.length+' questions · '+date(quiz.updated_at)));
  const actions=text('div','','row-actions'),edit=text('button','Edit','btn quiet small'),remove=text('button','Delete','btn danger small');edit.type=remove.type='button';
  edit.onclick=()=>openQuiz(quiz);
  remove.onclick=async()=>{if(!confirm('Delete "'+quiz.title+'"? This cannot be undone.'))return;remove.disabled=true;try{await api('/rest/v1/quizzes?id=eq.'+quiz.id,{method:'DELETE'});if($('#quiz-editor').elements.quiz_id.value===quiz.id)newStudioQuiz(true);await loadQuizzes();notify('Quiz deleted.')}catch(error){notify(error.message,true);remove.disabled=false}};
  actions.append(edit,remove);row.append(info,badge(quiz.published),actions);return row;
 }));
 if(!studioQuizzes.length)$('#studio-quiz-list').append(empty('Your first quiz starts here','Create questions below, then publish when you are ready.'));
}
function newStudioQuiz(force=false){if(!force&&quizDirty&&!confirm('Discard unsaved quiz changes?'))return;$('#quiz-editor').reset();$('#quiz-editor').elements.quiz_id.value='';quizQuestions=[quizQuestion()];quizDirty=false;$('#quiz-editor-heading').textContent='Create a quiz';renderQuizQuestions()}
function openQuiz(quiz){if(quizDirty&&!confirm('Discard unsaved quiz changes?'))return;const form=$('#quiz-editor');form.elements.quiz_id.value=quiz.id;form.elements.quiz_title.value=quiz.title;form.elements.quiz_description.value=quiz.description;form.elements.quiz_published.checked=quiz.published;quizQuestions=JSON.parse(JSON.stringify(quiz.questions));quizDirty=false;$('#quiz-editor-heading').textContent='Edit quiz';renderQuizQuestions();form.scrollIntoView({block:'start',behavior:'smooth'})}
function renderQuizQuestions(){
 $('#quiz-questions').replaceChildren(...quizQuestions.map((q,index)=>{
  const field=text('fieldset','','quiz-builder-question'),legend=text('legend','Question '+(index+1));field.append(legend);
  const prompt=text('label','Question'),input=document.createElement('textarea');input.value=q.text;input.maxLength=2000;input.required=true;input.oninput=()=>{q.text=input.value;quizDirty=true};prompt.append(input);field.append(prompt);
  field.append(text('p','Select the correct answer, then fill in each choice.','helper'));
  q.choices.forEach((choice,j)=>{
   const row=text('div','','quiz-choice-row'),correctLabel=text('label','','quiz-correct-choice'),radio=document.createElement('input');radio.type='radio';radio.name='correct_'+index;radio.checked=q.answer===j;radio.required=true;radio.setAttribute('aria-label','Mark choice '+(j+1)+' correct for question '+(index+1));radio.onchange=()=>{q.answer=j;quizDirty=true};correctLabel.append(radio);
   const option=document.createElement('input');option.value=choice;option.required=true;option.maxLength=300;option.setAttribute('aria-label','Choice '+(j+1)+' for question '+(index+1));option.oninput=()=>{q.choices[j]=option.value;quizDirty=true};
   const remove=text('button','Remove','btn quiet small');remove.type='button';remove.disabled=q.choices.length<=2;remove.onclick=()=>{q.choices.splice(j,1);q.answer=q.answer===j?0:q.answer>j?q.answer-1:q.answer;quizDirty=true;renderQuizQuestions()};row.append(correctLabel,option,remove);field.append(row);
  });
  const add=text('button','+ Add choice','btn quiet small');add.type='button';add.disabled=q.choices.length>=6;add.onclick=()=>{q.choices.push('');quizDirty=true;renderQuizQuestions()};field.append(add);
  const explanation=text('label','Answer explanation (optional)'),why=document.createElement('textarea');why.value=q.explanation||'';why.maxLength=2000;why.oninput=()=>{q.explanation=why.value;quizDirty=true};explanation.append(why);field.append(explanation);
  const actions=text('div','','quiz-builder-actions');for(const [label,action,disabled] of [['Move up',()=>{[quizQuestions[index-1],quizQuestions[index]]=[q,quizQuestions[index-1]]},index===0],['Move down',()=>{[quizQuestions[index],quizQuestions[index+1]]=[quizQuestions[index+1],q]},index===quizQuestions.length-1],['Remove question',()=>quizQuestions.splice(index,1),quizQuestions.length===1]]){const b=text('button',label,'btn quiet small');b.type='button';b.disabled=disabled;b.onclick=()=>{action();quizDirty=true;renderQuizQuestions()};actions.append(b)}field.append(actions);return field;
 }));
 $('#add-quiz-question').disabled=quizQuestions.length>=30;
 $('#quiz-question-count').textContent=quizQuestions.length+' / 30 questions';
}
$('#new-quiz').onclick=()=>newStudioQuiz();
$('#add-quiz-question').onclick=()=>{if(quizQuestions.length>=30)return;quizQuestions.push(quizQuestion());quizDirty=true;renderQuizQuestions()};
$('#quiz-editor').oninput=()=>quizDirty=true;
$('#quiz-editor').onsubmit=async event=>{
 event.preventDefault();const form=event.currentTarget,id=form.elements.quiz_id.value;
 const questions=quizQuestions.map(q=>({...q,text:q.text.trim(),choices:q.choices.map(c=>c.trim()),explanation:(q.explanation||'').trim()}));
 const data={title:form.elements.quiz_title.value.trim(),description:form.elements.quiz_description.value.trim(),published:form.elements.quiz_published.checked,questions};
 if(!data.title||!questions.length||questions.some(q=>!q.text||q.choices.some(c=>!c))){notify('Complete the quiz title, questions and every answer choice.',true);return}
 const button=$('#save-quiz');busy(button,true,'Saving quiz…');
 try{const saved=await api('/rest/v1/quizzes'+(id?'?id=eq.'+id:''),{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:JSON.stringify(data)});if(!saved?.length)throw Error('Quiz could not be saved. Check your admin access.');form.elements.quiz_id.value=saved[0].id;quizDirty=false;$('#quiz-editor-heading').textContent='Edit quiz';await loadQuizzes();notify(data.published?'Quiz published. It is now available on the website.':'Quiz saved as a private draft.')}
 catch(error){notify(error.message,true)}finally{busy(button,false,'Save quiz')}
};
