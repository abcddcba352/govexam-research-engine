import React,{useState} from 'react';
import { renderQuestionDiagram,type QuestionDiagram } from '../questionDiagrams.ts';
import { QuestionGrayscaleVisual } from './QuestionGrayscaleVisual.tsx';

const examples:{name:string;spec:QuestionDiagram}[]=[
  {name:'Inclined manometer',spec:{kind:'INCLINED_MANOMETER',length:20,angle:30,unit:'cm'}},
  {name:'Plant cell',spec:{kind:'BIOLOGY_CELL',cell_type:'PLANT',markers:[{label:'A',structure:'NUCLEUS'},{label:'B',structure:'VACUOLE'},{label:'C',structure:'CHLOROPLAST'}]}},
  {name:'Supported beam',spec:{kind:'SIMPLY_SUPPORTED_BEAM',span:8,point_load:12,load_position:3,length_unit:'m',force_unit:'kN'}},
  {name:'Fraction bar',spec:{kind:'FRACTION_BAR',numerator:3,denominator:8}},
  {name:'Historical timeline',spec:{kind:'TIMELINE',title:'Illustrative reform sequence',events:[{year:1829,label:'Reform A'},{year:1856,label:'Reform B'},{year:1872,label:'Reform C'}]}},
  {name:'Right triangle',spec:{kind:'RIGHT_TRIANGLE',vertices:['A','B','C'],base:8,height:6,unit:'cm'}},
  {name:'Circle and tangent',spec:{kind:'CIRCLE_TANGENT',radius:5,distance:13,unit:'cm'}},
  {name:'Bar chart',spec:{kind:'BAR_CHART',title:'Illustrative book counts',categories:['Library A','Library B','Library C'],values:[20,35,25],unit:'books'}},
  {name:'Line chart',spec:{kind:'LINE_CHART',title:'Illustrative monthly counts',categories:['Jan','Feb','Mar'],values:[20,35,25],unit:'items'}},
  {name:'Venn diagram',spec:{kind:'VENN_2',sets:['Set A','Set B'],region:'INTERSECTION'}},
  {name:'Coordinate plot',spec:{kind:'COORDINATE_PLOT',x_range:[-5,5],y_range:[-5,5],points:[{label:'A',x:1,y:2},{label:'B',x:4,y:-1}],segments:[['A','B']]}},
  {name:'Free-body diagram',spec:{kind:'FREE_BODY_DIAGRAM',body_label:'Block',unit:'N',forces:[{label:'Pull',magnitude:30,angle:0},{label:'Normal',magnitude:50,angle:90},{label:'Weight',magnitude:50,angle:270}]}},
  {name:'Series circuit',spec:{kind:'ELECTRIC_CIRCUIT',layout:'SERIES',source_label:'Cell',resistors:['R1','R2'],switch_state:'CLOSED'}},
  {name:'Convex-lens rays',spec:{kind:'CONVEX_LENS_RAY',focal_length:10,object_distance:30,unit:'cm'}},
  {name:'Transverse wave',spec:{kind:'TRANSVERSE_WAVE',amplitude:2,wavelength:4,cycles:2,unit:'cm'}},
  {name:'Universal schematic',spec:{kind:'TECHNICAL_SCENE',domain:'PHYSICS',title:'Lever schematic',scale:'NOT_TO_SCALE',primitives:[{kind:'LINE',from:[100,185],to:[500,185]},{kind:'POLYLINE',points:[[280,250],[320,250],[300,185]],closed:true,fill:'LIGHT'},{kind:'ARROW',from:[150,90],to:[150,180]},{kind:'ARROW',from:[450,180],to:[450,90]},{kind:'TEXT',x:150,y:75,text:'Effort'},{kind:'TEXT',x:450,y:75,text:'Load'},{kind:'TEXT',x:300,y:275,text:'Fulcrum'}]}},
];
export function DiagramExamples(){
  const [chosen,setChosen]=useState(0);
  return <details className="rounded-lg border border-neutral-300 bg-white p-4"><summary className="cursor-pointer font-semibold">Grayscale question figures</summary><p className="my-3 text-sm text-slate-600">Exact templates cover charts, maths, mechanics, circuits, optics, waves, biology and timelines. A constrained scene builder covers other qualitative schematics. Every figure is drawn from stated question data; unsupported quantitative figures remain blocked for review.</p><label className="text-sm">Preview figure<select aria-label="Preview grayscale figure" className="ml-3 rounded border p-2" value={chosen} onChange={e=>setChosen(Number(e.target.value))}>{examples.map((e,i)=><option key={e.name} value={i}>{e.name}</option>)}</select></label><QuestionGrayscaleVisual visual={renderQuestionDiagram(examples[chosen].spec)}/><p className="text-xs text-slate-600">These previews use illustrative data and are not mock questions. Generated figures require review; calculated answers stay in the explanation.</p></details>;
}
