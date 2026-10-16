"use strict";
const questions=[
 {text:"Which state of matter keeps a fixed shape?",choices:["Solid","Liquid","Gas"],answer:0,why:"A solid keeps its own shape. Liquids and gases take the shape of their container."},
 {text:"Which life process releases energy from nutrients?",choices:["Excretion","Respiration","Reproduction"],answer:1,why:"Respiration releases energy from nutrients in living cells."},
 {text:"A pure substance containing only one type of atom is an…",choices:["Element","Mixture","Compound"],answer:0,why:"An element contains only one type of atom."},
 {text:"In a chemical reaction, atoms are…",choices:["Destroyed","Rearranged","Always turned into light"],answer:1,why:"Chemical reactions rearrange atoms to form new substances."}
];
const form=document.querySelector("#quiz");
questions.forEach((q,i)=>{const field=document.createElement("fieldset"),legend=document.createElement("legend");legend.textContent=(i+1)+". "+q.text;field.append(legend);q.choices.forEach((choice,j)=>{const label=document.createElement("label"),radio=document.createElement("input");radio.type="radio";radio.name="q"+i;radio.value=j;radio.required=true;label.append(radio,document.createTextNode(" "+choice));field.append(label)});form.append(field)});
const submit=document.createElement("button");submit.className="button";submit.textContent="Check my answers";form.append(submit);
form.onsubmit=e=>{e.preventDefault();const data=new FormData(form);let score=0;const result=document.querySelector("#quiz-result");result.replaceChildren();questions.forEach((q,i)=>{const correct=Number(data.get("q"+i))===q.answer;if(correct)score++;const p=document.createElement("p");p.textContent=(correct?"Correct. ":"Review this one. ")+q.why;result.append(p)});const heading=document.createElement("h2");heading.textContent="You scored "+score+" / "+questions.length;result.prepend(heading);result.scrollIntoView({block:"center"})};
