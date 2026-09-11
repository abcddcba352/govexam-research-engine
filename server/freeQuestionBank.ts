import type { EvidenceFact, BankQuestion } from '../src/freeEngine.ts';
import type { ExamRecord, BlueprintQuestionSlot, MockQuestion } from '../src/types.ts';
import { normalize, validDate } from '../src/currentAffairs.ts';
import { hashText, supportsExcerpt, type EvidenceItem } from './evidencePool.ts';
import { questionVisualIssues,renderQuestionDiagram } from '../src/questionDiagrams.ts';

export function validateFact(input:EvidenceFact,pool:EvidenceItem[],exam:ExamRecord,cutoff:string):string[] {
  const errors:string[]=[];
  if(![...exam.syllabus_topics,...exam.pattern.sections].includes(input.topic)) errors.push('Choose a registered syllabus topic.');
  if(!input.claim?.trim() || !input.answer?.trim() || !input.reviewer?.trim()) errors.push('Claim, supported answer and reviewer are required.');
  if(!Array.isArray(input.source_ids)||!input.source_ids.length||input.source_ids.length>3) return [...errors,'Select one to three retrieved sources.'];
  const selected=input.source_ids.map(id=>pool.find(e=>e.source_id===id));
  selected.forEach((s,i)=>{
    if(!s || s.content_hash!==input.source_hashes?.[i]) {errors.push('Source snapshot changed or is unavailable.');return;}
    if(!supportsExcerpt(s.text,input.excerpts?.[i]) || !normalize(input.excerpts?.[i]||'').includes(normalize(input.answer||''))) errors.push('Each excerpt must occur in its source and explicitly contain the answer.');
    if(s.kind!==input.kind) errors.push('Source kind does not match the fact.');
    if(s.kind==='CURRENT' && (!validDate(s.publication_date)||!validDate(input.event_date)||input.event_date>cutoff||input.event_date>s.publication_date)) errors.push('Verify publication and completed event dates before using this fact.');
  });
  const secondary=selected.some(s=>s && /telanganatoday\.com|newindianexpress\.com/.test(s.source_family));
  if(secondary && new Set(selected.filter(Boolean).map(s=>s!.source_family)).size<2) errors.push('Regional reporting needs a second independent source for this claim.');
  if(new Set(selected.filter(Boolean).map(s=>hashText(normalize(s!.text)))).size<input.source_ids.length) errors.push('Copied reports cannot count as independent corroboration.');
  return [...new Set(errors)];
}
export function questionIssues(q:Pick<MockQuestion,'question_text'|'options'|'correct_option_index'|'explanation'>):string[] {
  const errors:string[]=[];
  if(typeof q.question_text!=='string'||q.question_text.length<20) errors.push('Question stem is missing or too short.');
  if(!Array.isArray(q.options)||q.options.length!==4||q.options.some(x=>typeof x!=='string'||!x.trim())||new Set(q.options.map(x=>typeof x==='string'?normalize(x):'')).size!==4) errors.push('Four distinct nonempty options are required.');
  if(!Number.isInteger(q.correct_option_index)||q.correct_option_index<0||q.correct_option_index>3) errors.push('A valid answer index is required.');
  if(typeof q.explanation!=='string'||q.explanation.length<30) errors.push('A complete explanation is required.');
  return errors;
}
export function nearDuplicate(a:MockQuestion,b:MockQuestion):boolean {
  if(normalize(a.question_text)===normalize(b.question_text)) return true;
  const tokens=(s:string)=>new Set(normalize(s).split(' ').filter(t=>t.length>2));
  const x=tokens(a.question_text),y=tokens(b.question_text);
  const overlap=[...x].filter(t=>y.has(t)).length;
  return overlap/Math.max(1,new Set([...x,...y]).size)>0.82;
}
export function selectBank(slots:(Pick<BlueprintQuestionSlot,'slot_id'|'topic'|'subject'|'difficulty'|'answerable_fact_family'>&Partial<Pick<BlueprintQuestionSlot,'core_concept_target'|'visual_requirement'|'visual_type'>>)[],bank:BankQuestion[],used:Set<string>) {
  const chosen:BankQuestion[]=[];const families=new Set<string>();const missing:string[]=[];
  // Restrictive slots first avoids consuming the sole candidate for another slot.
  const candidates=(s:typeof slots[number])=>bank.filter(q=>q.status==='READY'&&!questionVisualIssues(q.question,s.visual_requirement,s.visual_type).length&&!used.has(q.id)&&normalize(q.topic)===normalize(s.topic)&&normalize(q.subject)===normalize(s.subject)&&q.difficulty===(s.difficulty==='DIFFICULT'?'HARD':s.difficulty==='MODERATE'?'MEDIUM':'EASY')&&(!s.core_concept_target||normalize(q.question.core_concept_target||'')===normalize(s.core_concept_target))&&(!s.answerable_fact_family||q.question.answerable_fact_family===s.answerable_fact_family));
  const result=new Map<string,BankQuestion>();
  for(const slot of [...slots].sort((a,b)=>candidates(a).length-candidates(b).length)) {
    const q=candidates(slot).find(q=>!families.has(q.fact_family)&&!chosen.some(x=>x.id===q.id||((!x.template_id||!q.template_id)&&nearDuplicate(x.question,q.question))));
    if(!q){missing.push(slot.slot_id);continue;}
    chosen.push(q);families.add(q.fact_family);result.set(slot.slot_id,q);
  }
  return {selected:slots.flatMap(s=>result.has(s.slot_id)?[result.get(s.slot_id)!]:[]),missing};
}

export const TEMPLATE_TOPICS=[
  {id:'percentage',matches:/percent|percentage|arithmetic|numerical|quantitative/i,subject:'math'},
  {id:'simple-interest',matches:/simple interest|interest/i,subject:'math'},
  {id:'linear-equation',matches:/linear equation|algebra|mental ability|reasoning/i,subject:'math'},
  {id:'right-triangle',matches:/right[ -]angled triangle|right triangle|pythagoras|geometry/i,subject:'math'},
  {id:'bar-chart',matches:/bar chart|bar graph|data interpretation/i,subject:'math'},
] as const;
export function templateQuestion(topic:string,seed:number):{question:MockQuestion;template_id:string;fact_family:string}|undefined {
  const template=TEMPLATE_TOPICS.find(t=>t.matches.test(topic));if(!template)return;
  const n=Math.abs(seed%900)+1;
  let stem:string,answer:number,explanation:string,visual:MockQuestion['visual_specification'];
  if(template.id==='percentage') {
    const base=(n+10)*20,rate=5*(1+n%15);answer=base*rate/100;
    stem=`A library has ${base} books. If ${rate}% are reference books, how many reference books does it have?`;
    explanation=`Percent means per hundred. The number of reference books is ${base} × ${rate} / 100 = ${answer}.`;
  } else if(template.id==='simple-interest') {
    const principal=(n+10)*100,rate=2+n%9,years=1+n%5;answer=principal*rate*years/100;
    stem=`Find the simple interest in rupees on a principal of ₹${principal} at ${rate}% per year for ${years} years.`;
    explanation=`Simple interest = principal × annual rate × years / 100 = ${principal} × ${rate} × ${years} / 100 = ₹${answer}.`;
  } else if(template.id==='right-triangle') {
    const scale=1+n%8,height=3*scale,base=4*scale;answer=5*scale;
    stem=`Triangle ABC is right-angled at B. AB = ${height} cm and BC = ${base} cm. Find the length of AC in cm using the given figure.`;
    explanation=`Pythagoras gives AC squared = AB squared + BC squared = ${height*height} + ${base*base} = ${answer*answer}. The positive square root is ${answer} cm.`;
    visual=renderQuestionDiagram({kind:'RIGHT_TRIANGLE',vertices:['A','B','C'],height,base,unit:'cm'},stem);
  } else if(template.id==='bar-chart') {
    const a=10+n,b=a+5+n%12;answer=b-a;
    stem=`The bar chart shows Library A with ${a} books and Library B with ${b} books. How many more books does Library B have than Library A?`;
    explanation=`Compare the two given counts by subtraction. Library B has ${b} books and Library A has ${a} books, so the difference is ${b} - ${a} = ${answer} books.`;
    visual=renderQuestionDiagram({kind:'BAR_CHART',title:'Library books',categories:['Library A','Library B'],values:[a,b],unit:'books'},stem);
  } else {
    const a=2+n%9,x=3+n%30,b=2+n%17,c=a*x+b;answer=x;
    stem=`Solve the linear equation ${a}x + ${b} = ${c}. What is the value of x?`;
    explanation=`Subtract ${b} from both sides and divide by ${a}: x = (${c} − ${b}) / ${a} = ${x}. Substituting gives ${a} × ${x} + ${b} = ${c}.`;
  }
  const options=[answer,answer+1,answer+5,answer+10].map(String);
  const pos=n%4;[options[0],options[pos]]=[options[pos],options[0]];
  const question:MockQuestion={question_id:'',mock_id:'',question_number:0,section_name:'Mathematics',question_text:stem,options,correct_option_index:pos,explanation,topic,difficulty:'EASY',canonical_hash:hashText(normalize(stem)),source_reference:`Reviewed mathematical rule: ${template.id}; calculated by code.`,visual_specification:visual};
  return {question,template_id:template.id,fact_family:template.id+':'+question.canonical_hash};
}
