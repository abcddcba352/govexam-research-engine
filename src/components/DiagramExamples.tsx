import React,{useState} from 'react';
import { renderQuestionDiagram,type QuestionDiagram } from '../questionDiagrams.ts';
import { QuestionGrayscaleVisual } from './QuestionGrayscaleVisual.tsx';

const examples:{name:string;spec:QuestionDiagram}[]=[
  {name:'Inclined manometer',spec:{kind:'INCLINED_MANOMETER',length:20,angle:30,unit:'cm'}},
  {name:'Right triangle',spec:{kind:'RIGHT_TRIANGLE',vertices:['A','B','C'],base:8,height:6,unit:'cm'}},
  {name:'Circle and tangent',spec:{kind:'CIRCLE_TANGENT',radius:5,distance:13,unit:'cm'}},
  {name:'Bar chart',spec:{kind:'BAR_CHART',title:'Illustrative book counts',categories:['Library A','Library B','Library C'],values:[20,35,25],unit:'books'}},
  {name:'Line chart',spec:{kind:'LINE_CHART',title:'Illustrative monthly counts',categories:['Jan','Feb','Mar'],values:[20,35,25],unit:'items'}},
  {name:'Venn diagram',spec:{kind:'VENN_2',sets:['Set A','Set B'],region:'INTERSECTION'}},
];
export function DiagramExamples(){
  const [chosen,setChosen]=useState(0);
  return <details className="rounded-lg border border-neutral-300 bg-white p-4"><summary className="cursor-pointer font-semibold">Grayscale question figures</summary><p className="my-3 text-sm text-slate-600">Figures are drawn from the question's given data, with black lines, gray shading and print-safe labels. These previews use illustrative data; they are not mock questions. Unsupported figures remain blocked for review.</p><label className="text-sm">Preview figure<select aria-label="Preview grayscale figure" className="ml-3 rounded border p-2" value={chosen} onChange={e=>setChosen(Number(e.target.value))}>{examples.map((e,i)=><option key={e.name} value={i}>{e.name}</option>)}</select></label><QuestionGrayscaleVisual visual={renderQuestionDiagram(examples[chosen].spec)}/><p className="text-xs text-slate-600">Generated questions require a separate figure review. Computed answers are kept in the explanation, not added to the figure.</p></details>;
}
