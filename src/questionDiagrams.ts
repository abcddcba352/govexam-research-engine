import type { VisualSpecification } from './types.ts';

export type ScenePrimitive =
  | {kind:'LINE'|'ARROW';from:[number,number];to:[number,number];style?:'SOLID'|'DASHED'}
  | {kind:'RECT';x:number;y:number;width:number;height:number;fill?:'NONE'|'LIGHT'|'HATCH'}
  | {kind:'CIRCLE';cx:number;cy:number;r:number;fill?:'NONE'|'LIGHT'|'HATCH'}
  | {kind:'ELLIPSE';cx:number;cy:number;rx:number;ry:number;fill?:'NONE'|'LIGHT'|'HATCH'}
  | {kind:'POLYLINE';points:Array<[number,number]>;closed?:boolean;fill?:'NONE'|'LIGHT'|'HATCH'}
  | {kind:'TEXT';x:number;y:number;text:string;size?:number};

/** Data only: never accept model-authored SVG, scripts or external image URLs. */
export type QuestionDiagram =
  | {kind:'BAR_CHART'|'LINE_CHART';title:string;categories:string[];values:number[];unit:string}
  | {kind:'RIGHT_TRIANGLE';vertices:[string,string,string];base:number;height:number;unit:string}
  | {kind:'CIRCLE_TANGENT';radius:number;distance:number;unit:string}
  | {kind:'VENN_2';sets:[string,string];region:'INTERSECTION'|'UNION'|'A_ONLY'|'B_ONLY'}
  | {kind:'INCLINED_MANOMETER';length:number;angle:number;unit:string}
  | {kind:'BIOLOGY_CELL';cell_type:'PLANT'|'ANIMAL';markers:Array<{label:string;structure:'NUCLEUS'|'CELL_WALL'|'CELL_MEMBRANE'|'VACUOLE'|'CHLOROPLAST'|'MITOCHONDRION'}>}
  | {kind:'SIMPLY_SUPPORTED_BEAM';span:number;point_load:number;load_position:number;length_unit:string;force_unit:string}
  | {kind:'FRACTION_BAR';numerator:number;denominator:number}
  | {kind:'TIMELINE';title:string;events:Array<{year:number;label:string}>}
  | {kind:'COORDINATE_PLOT';x_range:[number,number];y_range:[number,number];points:Array<{label:string;x:number;y:number}>;segments:Array<[string,string]>}
  | {kind:'FREE_BODY_DIAGRAM';body_label:string;unit:string;forces:Array<{label:string;magnitude:number;angle:number}>}
  | {kind:'ELECTRIC_CIRCUIT';layout:'SERIES'|'PARALLEL';source_label:string;resistors:string[];switch_state:'OPEN'|'CLOSED'}
  | {kind:'CONVEX_LENS_RAY';focal_length:number;object_distance:number;unit:string}
  | {kind:'TRANSVERSE_WAVE';amplitude:number;wavelength:number;cycles:number;unit:string}
  | {kind:'TECHNICAL_SCENE';domain:'MATHS'|'PHYSICS'|'BIOLOGY'|'SOCIAL';title:string;scale:'NOT_TO_SCALE';primitives:ScenePrimitive[]};

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const label=(value:unknown,max=36):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[<>\x00-\x1f]/.test(value);
const number=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e6;
const finite=(value:unknown,min=-1e6,max=1e6):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max;
const point=(value:unknown):value is [number,number]=>Array.isArray(value)&&value.length===2&&finite(value[0],0,600)&&finite(value[1],0,360);
const fill=(value:unknown)=>value===undefined||['NONE','LIGHT','HATCH'].includes(String(value));
const primitive=(value:any):value is ScenePrimitive=>{
  if(!value||typeof value!=='object')return false;
  if(value.kind==='LINE'||value.kind==='ARROW')return point(value.from)&&point(value.to)&&(value.style===undefined||['SOLID','DASHED'].includes(value.style));
  if(value.kind==='RECT')return finite(value.x,0,600)&&finite(value.y,0,360)&&finite(value.width,1,600)&&finite(value.height,1,360)&&value.x+value.width<=600&&value.y+value.height<=360&&fill(value.fill);
  if(value.kind==='CIRCLE')return finite(value.cx,0,600)&&finite(value.cy,0,360)&&finite(value.r,1,180)&&value.cx-value.r>=0&&value.cx+value.r<=600&&value.cy-value.r>=0&&value.cy+value.r<=360&&fill(value.fill);
  if(value.kind==='ELLIPSE')return finite(value.cx,0,600)&&finite(value.cy,0,360)&&finite(value.rx,1,300)&&finite(value.ry,1,180)&&value.cx-value.rx>=0&&value.cx+value.rx<=600&&value.cy-value.ry>=0&&value.cy+value.ry<=360&&fill(value.fill);
  if(value.kind==='POLYLINE')return Array.isArray(value.points)&&value.points.length>=2&&value.points.length<=20&&value.points.every(point)&&fill(value.fill);
  return value.kind==='TEXT'&&finite(value.x,0,600)&&finite(value.y,0,360)&&label(value.text,32)&&(value.size===undefined||finite(value.size,10,24));
};
const text=(x:number,y:number,value:string,size=16,anchor='middle')=>`<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}">${escape(value)}</text>`;
const line=(x:number,y:number,x2:number,y2:number,extra='')=>`<line x1="${x}" y1="${y}" x2="${x2}" y2="${y2}" ${extra}/>`;
const normalize=(s:string)=>s.toLowerCase().replace(/\s+/g,' ').trim();

export function diagramIssues(spec:unknown,stem?:string):string[] {
  if(!spec||typeof spec!=='object')return ['A structured diagram specification is required.'];
  const s=spec as any;let valid=false;let values:number[]=[];let labels:string[]=[];
  switch(s.kind) {
    case 'BAR_CHART':case 'LINE_CHART':
      valid=label(s.title,64)&&label(s.unit,24)&&Array.isArray(s.categories)&&s.categories.length>=2&&s.categories.length<=6&&s.categories.every((x:unknown)=>label(x,16))&&new Set(s.categories).size===s.categories.length&&Array.isArray(s.values)&&s.values.length===s.categories.length&&s.values.every(number);
      values=s.values;labels=s.categories;break;
    case 'RIGHT_TRIANGLE':
      valid=Array.isArray(s.vertices)&&s.vertices.length===3&&s.vertices.every((x:unknown)=>typeof x==='string'&&/^[A-Z]$/.test(x))&&new Set(s.vertices).size===3&&number(s.base)&&s.base>0&&number(s.height)&&s.height>0&&s.base/s.height>=0.2&&s.base/s.height<=5&&label(s.unit,12);
      values=[s.base,s.height];break;
    case 'CIRCLE_TANGENT':
      valid=number(s.radius)&&s.radius>0&&number(s.distance)&&s.distance>s.radius&&s.distance/s.radius<=8&&label(s.unit,12);
      values=[s.radius,s.distance];break;
    case 'VENN_2':
      valid=Array.isArray(s.sets)&&s.sets.length===2&&s.sets.every((x:unknown)=>label(x,16))&&s.sets[0]!==s.sets[1]&&['INTERSECTION','UNION','A_ONLY','B_ONLY'].includes(s.region);
      labels=s.sets;break;
    case 'INCLINED_MANOMETER':
      valid=number(s.length)&&s.length>0&&number(s.angle)&&s.angle>=10&&s.angle<=60&&label(s.unit,12);
      values=[s.length,s.angle];break;
    case 'BIOLOGY_CELL': {
      const allowed=s.cell_type==='PLANT'?['NUCLEUS','CELL_WALL','CELL_MEMBRANE','VACUOLE','CHLOROPLAST','MITOCHONDRION']:['NUCLEUS','CELL_MEMBRANE','VACUOLE','MITOCHONDRION'];
      valid=['PLANT','ANIMAL'].includes(s.cell_type)&&Array.isArray(s.markers)&&s.markers.length>=1&&s.markers.length<=4&&s.markers.every((m:any)=>m&&typeof m==='object'&&/^[A-D]$/.test(m.label)&&allowed.includes(m.structure))&&new Set(s.markers.map((m:any)=>m.label)).size===s.markers.length&&new Set(s.markers.map((m:any)=>m.structure)).size===s.markers.length;
      labels=valid?s.markers.map((m:any)=>m.label):[];break;
    }
    case 'SIMPLY_SUPPORTED_BEAM':
      valid=number(s.span)&&s.span>0&&number(s.point_load)&&s.point_load>0&&number(s.load_position)&&s.load_position>=0&&s.load_position<=s.span&&label(s.length_unit,12)&&label(s.force_unit,12);
      values=[s.span,s.point_load,s.load_position];break;
    case 'FRACTION_BAR':
      valid=Number.isInteger(s.numerator)&&Number.isInteger(s.denominator)&&s.numerator>0&&s.denominator>=2&&s.denominator<=12&&s.numerator<s.denominator;
      values=[s.numerator,s.denominator];break;
    case 'TIMELINE':
      valid=label(s.title,64)&&Array.isArray(s.events)&&s.events.length>=2&&s.events.length<=5&&s.events.every((e:any)=>e&&Number.isInteger(e.year)&&e.year>=-4000&&e.year<=3000&&label(e.label,24))&&new Set(s.events.map((e:any)=>e.year)).size===s.events.length&&s.events.every((e:any,i:number,a:any[])=>i===0||e.year>a[i-1].year);
      values=valid?s.events.map((e:any)=>Math.abs(e.year)):[];labels=valid?s.events.map((e:any)=>e.label):[];break;
    case 'COORDINATE_PLOT': {
      const ranges=Array.isArray(s.x_range)&&s.x_range.length===2&&Array.isArray(s.y_range)&&s.y_range.length===2&&s.x_range.every((v:any)=>finite(v,-100,100))&&s.y_range.every((v:any)=>finite(v,-100,100))&&s.x_range[0]<0&&s.x_range[1]>0&&s.y_range[0]<0&&s.y_range[1]>0;
      const pointsOk=Array.isArray(s.points)&&s.points.length>=1&&s.points.length<=10&&s.points.every((p:any)=>p&&label(p.label,8)&&finite(p.x,s.x_range?.[0],s.x_range?.[1])&&finite(p.y,s.y_range?.[0],s.y_range?.[1]))&&new Set(s.points?.map((p:any)=>p.label)).size===s.points?.length;
      const names=new Set((s.points||[]).map((p:any)=>p.label));
      valid=ranges&&pointsOk&&Array.isArray(s.segments)&&s.segments.length<=15&&s.segments.every((e:any)=>Array.isArray(e)&&e.length===2&&e[0]!==e[1]&&names.has(e[0])&&names.has(e[1]));
      values=valid?s.points.flatMap((p:any)=>[Math.abs(p.x),Math.abs(p.y)]):[];labels=valid?s.points.map((p:any)=>p.label):[];break;
    }
    case 'FREE_BODY_DIAGRAM':
      valid=label(s.body_label,20)&&label(s.unit,12)&&Array.isArray(s.forces)&&s.forces.length>=1&&s.forces.length<=6&&s.forces.every((f:any)=>f&&label(f.label,16)&&number(f.magnitude)&&f.magnitude>0&&finite(f.angle,0,359))&&new Set(s.forces.map((f:any)=>f.label)).size===s.forces.length;
      values=valid?s.forces.flatMap((f:any)=>[f.magnitude,f.angle]):[];labels=valid?[s.body_label,...s.forces.map((f:any)=>f.label)]:[];break;
    case 'ELECTRIC_CIRCUIT':
      valid=['SERIES','PARALLEL'].includes(s.layout)&&label(s.source_label,16)&&Array.isArray(s.resistors)&&s.resistors.length>=1&&s.resistors.length<=4&&s.resistors.every((r:any)=>label(r,12))&&new Set(s.resistors).size===s.resistors.length&&['OPEN','CLOSED'].includes(s.switch_state);
      labels=valid?[s.source_label,...s.resistors]:[];break;
    case 'CONVEX_LENS_RAY':
      valid=number(s.focal_length)&&s.focal_length>0&&number(s.object_distance)&&s.object_distance>=s.focal_length*1.25&&s.object_distance<=s.focal_length*6&&label(s.unit,12);
      values=[s.focal_length,s.object_distance];break;
    case 'TRANSVERSE_WAVE':
      valid=number(s.amplitude)&&s.amplitude>0&&number(s.wavelength)&&s.wavelength>0&&Number.isInteger(s.cycles)&&s.cycles>=1&&s.cycles<=4&&label(s.unit,12);
      values=[s.amplitude,s.wavelength,s.cycles];break;
    case 'TECHNICAL_SCENE':
      valid=['MATHS','PHYSICS','BIOLOGY','SOCIAL'].includes(s.domain)&&label(s.title,64)&&s.scale==='NOT_TO_SCALE'&&Array.isArray(s.primitives)&&s.primitives.length>=1&&s.primitives.length<=40&&s.primitives.every(primitive);
      labels=valid?[s.title,...s.primitives.filter((p:any)=>p.kind==='TEXT').map((p:any)=>p.text)]:[];break;
  }
  if(!valid)return ['Diagram type or data is unsupported, incomplete or outside readable bounds.'];
  if(stem!==undefined) {
    const numbers=(stem.replace(/(?<=\d),(?=\d{3}\b)/g,'').match(/\d+(?:\.\d+)?/g)||[]).map(Number);
    if(values.some(v=>!numbers.includes(v)))return ['Every figure value must be stated in the question; inferred or sample values are not allowed.'];
    if(labels.some(v=>!normalize(stem).includes(normalize(v))))return ['Figure categories must be named in the question.'];
    if(s.unit&&!normalize(stem).includes(normalize(s.unit)))return ['The figure unit must be stated in the question.'];
    if(s.kind==='RIGHT_TRIANGLE'&&(!/right[ -]angled|right triangle|right angle/i.test(stem)||!new RegExp(`(?:at|∠)\\s*${s.vertices[1]}\\b`,'i').test(stem)||!normalize(stem).includes(normalize(s.vertices.join('')))))return ['State the triangle vertices and the right-angle vertex in the question.'];
    if(s.kind==='CIRCLE_TANGENT'&&!/tangent/i.test(stem))return ['A tangent relationship must be stated in the question.'];
    if(s.kind==='INCLINED_MANOMETER'&&!/manometer/i.test(stem))return ['An inclined manometer must be specified in the question.'];
    if(s.kind==='BIOLOGY_CELL'&&!new RegExp(`${s.cell_type}\\s+cell`,'i').test(stem))return [`The question must identify the ${String(s.cell_type).toLowerCase()} cell.`];
    if(s.kind==='SIMPLY_SUPPORTED_BEAM'&&(!/simply supported beam/i.test(stem)||!normalize(stem).includes(normalize(s.length_unit))||!normalize(stem).includes(normalize(s.force_unit))))return ['State the simply supported beam, load and both units in the question.'];
    if(s.kind==='FRACTION_BAR'&&!/fraction|shaded|equal parts/i.test(stem))return ['The question must state that the figure is a fraction model or equal-part bar.'];
    if(s.kind==='TIMELINE'&&!/timeline|chronolog|sequence/i.test(stem))return ['The question must identify the chronological timeline.'];
    if(s.kind==='COORDINATE_PLOT'&&!/coordinate|cartesian|graph/i.test(stem))return ['The question must identify the coordinate graph.'];
    if(s.kind==='FREE_BODY_DIAGRAM'&&(!/free[ -]body|force diagram/i.test(stem)||!normalize(stem).includes(normalize(s.unit))))return ['State the free-body diagram and force unit in the question.'];
    if(s.kind==='ELECTRIC_CIRCUIT'&&(!/circuit/i.test(stem)||!normalize(stem).includes(s.layout.toLowerCase())||!normalize(stem).includes(s.switch_state.toLowerCase())))return ['State the circuit layout and switch state in the question.'];
    if(s.kind==='CONVEX_LENS_RAY'&&(!/convex lens/i.test(stem)||!normalize(stem).includes(normalize(s.unit))))return ['State the convex lens and distance unit in the question.'];
    if(s.kind==='TRANSVERSE_WAVE'&&(!/transverse wave|wave diagram/i.test(stem)||!normalize(stem).includes(normalize(s.unit))))return ['State the transverse wave and unit in the question.'];
    if(s.kind==='TECHNICAL_SCENE'&&!/diagram|figure|schematic/i.test(stem))return ['A general technical scene must be identified as a diagram, figure or schematic.'];
  }
  return [];
}

export function renderQuestionDiagram(spec:QuestionDiagram,stem?:string):VisualSpecification {
  const issues=diagramIssues(spec,stem);if(issues.length)throw Error(issues.join(' '));
  let body='',alt='',type:VisualSpecification['visual_type']='GEOMETRY';
  const definitions='<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="#666" stroke-width="2"/></pattern><pattern id="manometerHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="#666" stroke-width="1.4"/></pattern><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="#111"/></marker></defs>';
  if(spec.kind==='BAR_CHART'||spec.kind==='LINE_CHART') {
    type=spec.kind;const max=Math.max(1,...spec.values),step=400/spec.values.length;
    body=text(300,28,spec.title,18)+text(55,52,spec.unit,13,'start');
    for(let i=0;i<=4;i++){const y=280-i*50;body+=line(85,y,530,y,'stroke="#999" stroke-width="1" stroke-dasharray="4 4"')+text(76,y+5,String(Number((max*i/4).toPrecision(4))),13,'end');}
    body+=line(85,70,85,280)+line(85,280,530,280);
    const points=spec.values.map((v,i)=>[105+step*(i+0.5),280-v/max*200]);
    if(spec.kind==='LINE_CHART')body+=`<polyline points="${points.map(p=>p.join(',')).join(' ')}" fill="none"/>`;
    points.forEach(([x,y],i)=>{body+=spec.kind==='BAR_CHART'?`<rect x="${x-20}" y="${y}" width="40" height="${280-y}" fill="${i%2?'url(#hatch)':'#ccc'}"/>`:`<circle cx="${x}" cy="${y}" r="4" fill="#111"/>`;body+=text(x,y-10,String(spec.values[i]),14)+text(x,306,spec.categories[i],13);});
    alt=`${spec.kind==='BAR_CHART'?'Bar':'Line'} chart: ${spec.title}. ${spec.categories.map((c,i)=>`${c}: ${spec.values[i]} ${spec.unit}`).join('; ')}.`;
  } else if(spec.kind==='RIGHT_TRIANGLE') {
    const scale=Math.min(340/spec.base,205/spec.height),x=155,y=285,right=x+spec.base*scale,top=y-spec.height*scale;
    body=`<path d="M${x} ${top}V${y}H${right}Z" fill="none"/><path d="M${x} ${y-16}h16v16" fill="none"/>`+text(x,top-12,spec.vertices[0])+text(x-18,y+12,spec.vertices[1])+text(right+16,y+8,spec.vertices[2])+text(x-20,(top+y)/2,`${spec.height} ${spec.unit}`,15,'end')+text((x+right)/2,y+30,`${spec.base} ${spec.unit}`);
    alt=`Triangle ${spec.vertices.join('')}, right angle at ${spec.vertices[1]}; ${spec.vertices[0]}${spec.vertices[1]} = ${spec.height} ${spec.unit}, ${spec.vertices[1]}${spec.vertices[2]} = ${spec.base} ${spec.unit}.`;
  } else if(spec.kind==='CIRCLE_TANGENT') {
    const r=95,d=spec.distance/spec.radius*r,scale=Math.min(1,350/d),R=r*scale,D=d*scale,cx=155,cy=200,tx=cx+R*R/D,ty=cy-Math.sqrt(R*R-(R*R/D)**2),px=cx+D;
    const ux=(cx-tx)/R,uy=(cy-ty)/R,l=Math.hypot(px-tx,cy-ty),vx=(px-tx)/l,vy=(cy-ty)/l;
    body=`<circle cx="${cx}" cy="${cy}" r="${R}" fill="none"/>`+line(cx,cy,tx,ty,'stroke-dasharray="5 4"')+line(px,cy,tx,ty)+line(cx,cy,px,cy)+`<path d="M${tx+ux*13} ${ty+uy*13}l${vx*13} ${vy*13}l${-ux*13} ${-uy*13}" fill="none"/>`+text(cx-16,cy+18,'O')+text(px+12,cy+18,'P')+text(tx,ty-14,'T')+text((cx+tx)/2-18,(cy+ty)/2,`${spec.radius} ${spec.unit}`,14,'end')+text((cx+px)/2,cy+28,`${spec.distance} ${spec.unit}`);
    alt=`Circle with centre O, radius OT ${spec.radius} ${spec.unit}; OP ${spec.distance} ${spec.unit}; PT tangent at T.`;
  } else if(spec.kind==='VENN_2') {
    type='VENN';const a='<circle cx="245" cy="180" r="90"',b='<circle cx="355" cy="180" r="90"';
    body=`<defs><clipPath id="a">${a}/></clipPath><mask id="not-b"><rect width="600" height="360" fill="white"/>${b} fill="black"/></mask><mask id="not-a"><rect width="600" height="360" fill="white"/>${a} fill="black"/></mask></defs><rect x="80" y="50" width="440" height="260" fill="none"/>`;
    if(spec.region==='INTERSECTION')body+=`${b} fill="url(#hatch)" stroke="none" clip-path="url(#a)"/>`;
    if(spec.region==='UNION')body+=`${a} fill="url(#hatch)" stroke="none"/>${b} fill="url(#hatch)" stroke="none"/>`;
    if(spec.region==='A_ONLY')body+=`${a} fill="url(#hatch)" stroke="none" mask="url(#not-b)"/>`;
    if(spec.region==='B_ONLY')body+=`${b} fill="url(#hatch)" stroke="none" mask="url(#not-a)"/>`;
    body+=`${a} fill="none"/>${b} fill="none"/>`+text(200,82,spec.sets[0])+text(400,82,spec.sets[1]);
    // Do not spell out the shaded-region answer in a candidate caption or alt text.
    alt=`Venn diagram with sets ${spec.sets.join(' and ')} and a hatched region.`;
  } else if(spec.kind==='BIOLOGY_CELL') {
    type='SCIENCE_DIAGRAM';
    const plant=spec.cell_type==='PLANT';
    const targets:Record<string,[number,number]>=plant?{
      NUCLEUS:[205,185],CELL_WALL:[105,105],CELL_MEMBRANE:[120,125],VACUOLE:[330,180],CHLOROPLAST:[175,103],MITOCHONDRION:[365,267],
    }:{NUCLEUS:[250,180],CELL_MEMBRANE:[93,180],VACUOLE:[350,125],MITOCHONDRION:[365,222]};
    const markerPositions:[[number,number],[number,number],[number,number],[number,number]]=[[55,78],[545,88],[55,294],[545,294]];
    body=text(300,30,`${plant?'Plant':'Animal'} cell`,20)+
      (plant?
        `<rect x="100" y="55" width="360" height="250" rx="18" fill="#f7f7f7" stroke-width="5"/><rect x="114" y="69" width="332" height="222" rx="14" fill="#fff"/>`:
        `<ellipse cx="280" cy="180" rx="190" ry="125" fill="#f7f7f7" stroke-width="4"/>`)+
      `<circle cx="${plant?205:250}" cy="180" r="42" fill="#ddd"/><circle cx="${plant?205:250}" cy="180" r="13" fill="#888"/>`+
      (plant?`<rect x="265" y="102" width="135" height="155" rx="36" fill="#eee"/>`:`<circle cx="350" cy="125" r="21" fill="#eee"/><circle cx="315" cy="245" r="14" fill="#eee"/>`)+
      (plant?[[175,103],[390,95],[165,258]].map(([x,y])=>`<g><ellipse cx="${x}" cy="${y}" rx="25" ry="11" fill="#ccc"/><path d="M${x-14} ${y-4}h28M${x-14} ${y+4}h28" fill="none" stroke-width="1"/></g>`).join(''):'')+
      [[365,267],[355,215]].map(([x,y],i)=>plant&&i?'' : `<g><ellipse cx="${x}" cy="${y}" rx="28" ry="14" fill="#ddd"/><path d="M${x-17} ${y}q8 -10 17 0t17 0" fill="none" stroke-width="1.5"/></g>`).join('');
    spec.markers.forEach((marker,i)=>{const [lx,ly]=markerPositions[i],[tx,ty]=targets[marker.structure];body+=line(lx+(lx<300?16:-16),ly,tx,ty,'stroke="#333" stroke-width="1.5" marker-end="url(#arrow)"')+`<circle cx="${lx}" cy="${ly}" r="16" fill="#fff" stroke="#111"/>`+text(lx,ly+5,marker.label,15);});
    alt=`${plant?'Plant':'Animal'} cell schematic with structures marked ${spec.markers.map(m=>m.label).join(', ')}.`;
  } else if(spec.kind==='SIMPLY_SUPPORTED_BEAM') {
    type='SCIENCE_DIAGRAM';
    const left=80,right=520,y=160,loadX=left+(right-left)*(spec.load_position/spec.span);
    body=text(300,30,'Simply supported beam',20)+
      line(left,y,right,y,'stroke="#111" stroke-width="8"')+
      `<path d="M${left} ${y+2}l-28 48h56Z" fill="#ddd"/><path d="M${right} ${y+2}l-28 48h56Z" fill="#ddd"/>`+
      `<circle cx="${right-13}" cy="${y+218-160}" r="7" fill="#fff"/><circle cx="${right+13}" cy="${y+218-160}" r="7" fill="#fff"/>`+
      line(38,226,548,226,'stroke="#555" stroke-width="2"')+
      line(loadX,62,loadX,y-10,'stroke="#111" stroke-width="3" marker-end="url(#arrow)"')+
      text(loadX,50,`${spec.point_load} ${spec.force_unit}`,16)+
      line(left,268,right,268,'stroke="#111" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"')+
      line(left,235,left,278,'stroke="#555" stroke-width="1"')+line(right,235,right,278,'stroke="#555" stroke-width="1"')+
      text(300,292,`${spec.span} ${spec.length_unit}`,16)+
      line(left,320,loadX,320,'stroke="#555" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"')+
      line(loadX,235,loadX,329,'stroke="#777" stroke-width="1" stroke-dasharray="5 4"')+
      text((left+loadX)/2,344,`${spec.load_position} ${spec.length_unit}`,15);
    alt=`Simply supported beam of span ${spec.span} ${spec.length_unit}, carrying a ${spec.point_load} ${spec.force_unit} point load ${spec.load_position} ${spec.length_unit} from the left support.`;
  } else if(spec.kind==='FRACTION_BAR') {
    const x=70,y=125,width=460,height=110,part=width/spec.denominator;
    body=text(300,48,'Equal-part fraction bar',20)+`<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="#fff" stroke-width="3"/>`;
    for(let i=0;i<spec.denominator;i++)body+=`<rect x="${x+i*part}" y="${y}" width="${part}" height="${height}" fill="${i<spec.numerator?'url(#hatch)':'#fff'}"/>`+(i?line(x+i*part,y,x+i*part,y+height,'stroke="#111" stroke-width="2"'):'');
    body+=text(300,278,`${spec.denominator} equal parts`,16);
    alt=`Fraction bar divided into ${spec.denominator} equal parts, with ${spec.numerator} parts hatched.`;
  } else if(spec.kind==='TIMELINE') {
    type='OTHER';
    const start=70,end=530,y=180,step=(end-start)/(spec.events.length-1);
    body=text(300,30,spec.title,20)+text(300,338,'Chronological order; intervals not to scale',13)+line(start,y,end,y,'stroke="#111" stroke-width="3" marker-end="url(#arrow)"');
    spec.events.forEach((event,i)=>{const x=start+i*step,above=i%2===0,labelY=above?88:278,yearY=above?135:230;body+=line(x,y-12,x,y+12,'stroke="#111" stroke-width="3"')+line(x,above?y-12:y+12,x,above?labelY+16:labelY-22,'stroke="#777" stroke-width="1"')+text(x,yearY,String(event.year),15)+text(x,labelY,event.label,13);});
    alt=`Timeline titled ${spec.title}: ${spec.events.map(e=>`${e.year}, ${e.label}`).join('; ')}.`;
  } else if(spec.kind==='COORDINATE_PLOT') {
    const [xmin,xmax]=spec.x_range,[ymin,ymax]=spec.y_range,left=70,right=545,top=45,bottom=315;
    const px=(x:number)=>left+(x-xmin)/(xmax-xmin)*(right-left),py=(y:number)=>bottom-(y-ymin)/(ymax-ymin)*(bottom-top);
    const xAxis=py(0),yAxis=px(0),lookup=new Map(spec.points.map(p=>[p.label,p]));
    for(let i=0;i<=10;i++){const x=left+i*(right-left)/10,y=top+i*(bottom-top)/10;body+=line(x,top,x,bottom,'stroke="#ddd" stroke-width="1"')+line(left,y,right,y,'stroke="#ddd" stroke-width="1"');}
    body+=line(left,xAxis,right,xAxis,'stroke="#111" stroke-width="2" marker-end="url(#arrow)"')+line(yAxis,bottom,yAxis,top,'stroke="#111" stroke-width="2" marker-end="url(#arrow)"')+text(right-5,xAxis-9,'x',14,'end')+text(yAxis+10,top+12,'y',14,'start');
    spec.segments.forEach(([a,b])=>{const p=lookup.get(a)!,q=lookup.get(b)!;body+=line(px(p.x),py(p.y),px(q.x),py(q.y),'stroke="#111" stroke-width="2"');});
    spec.points.forEach(p=>{const x=px(p.x),y=py(p.y);body+=`<circle cx="${x}" cy="${y}" r="5" fill="#111"/>`+text(x+10,y-9,`${p.label} (${p.x}, ${p.y})`,13,'start');});
    alt=`Coordinate plot with ${spec.points.map(p=>`${p.label} at ${p.x}, ${p.y}`).join('; ')}.`;
  } else if(spec.kind==='FREE_BODY_DIAGRAM') {
    type='SCIENCE_DIAGRAM';
    const cx=300,cy=185,max=Math.max(...spec.forces.map(f=>f.magnitude));
    body=text(300,30,'Free-body diagram',20)+`<rect x="245" y="150" width="110" height="70" rx="8" fill="#eee"/>`+text(cx,191,spec.body_label,16);
    spec.forces.forEach(force=>{const radians=force.angle*Math.PI/180,length=62+55*force.magnitude/max,endX=cx+length*Math.cos(radians),endY=cy-length*Math.sin(radians);body+=line(cx,cy,endX,endY,'stroke="#111" stroke-width="3" marker-end="url(#arrow)"')+text(endX+12*Math.cos(radians),endY-10*Math.sin(radians),`${force.label}: ${force.magnitude} ${spec.unit}, ${force.angle}°`,13,radians>Math.PI/2&&radians<Math.PI*1.5?'end':'start');});
    alt=`Free-body diagram for ${spec.body_label}: ${spec.forces.map(f=>`${f.label}, ${f.magnitude} ${spec.unit} at ${f.angle} degrees`).join('; ')}.`;
  } else if(spec.kind==='ELECTRIC_CIRCUIT') {
    type='SCIENCE_DIAGRAM';
    const resistor=(x:number,y:number,labelValue:string,vertical=false)=>vertical?`<rect x="${x-13}" y="${y-30}" width="26" height="60" fill="#eee"/>${text(x+22,y+5,labelValue,14,'start')}`:`<rect x="${x-32}" y="${y-13}" width="64" height="26" fill="#eee"/>${text(x,y-21,labelValue,14)}`;
    const switchLine=spec.switch_state==='OPEN'?line(390,90,430,68,'stroke="#111" stroke-width="3"'):line(390,90,430,90,'stroke="#111" stroke-width="3"');
    body=text(300,30,`${spec.layout==='SERIES'?'Series':'Parallel'} circuit`,20)+text(45,190,spec.source_label,14,'end')+
      line(90,90,90,155)+line(90,205,90,285)+line(75,165,105,165,'stroke="#111" stroke-width="3"')+line(81,195,99,195,'stroke="#111" stroke-width="3"')+
      line(90,90,390,90)+switchLine+`<circle cx="390" cy="90" r="4"/><circle cx="430" cy="90" r="4"/>`+line(430,90,520,90)+line(520,90,520,285)+line(90,285,520,285);
    if(spec.layout==='SERIES') {
      const step=360/(spec.resistors.length+1);
      spec.resistors.forEach((r,i)=>{const x=90+step*(i+1);body+=line(i?90+step*i+32:90,285,x-32,285)+resistor(x,285,r)+line(x+32,285,i===spec.resistors.length-1?520:90+step*(i+2)-32,285);});
    } else {
      const step=360/(spec.resistors.length+1);
      spec.resistors.forEach((r,i)=>{const x=90+step*(i+1);body+=line(x,90,x,145)+resistor(x,180,r,true)+line(x,215,x,285);});
    }
    alt=`${spec.layout==='SERIES'?'Series':'Parallel'} circuit with source ${spec.source_label}, ${spec.resistors.join(', ')}, and ${spec.switch_state.toLowerCase()} switch.`;
  } else if(spec.kind==='CONVEX_LENS_RAY') {
    type='SCIENCE_DIAGRAM';
    const f=spec.focal_length,u=spec.object_distance,v=f*u/(u-f),scale=220/Math.max(u,v,f*2),cx=300,axis=185,objX=cx-u*scale,imgX=cx+v*scale,m=v/u,objHeight=Math.min(78,78/Math.max(1,m)),imgHeight=objHeight*m;
    const objTop=axis-objHeight,imgTop=axis+imgHeight,f1=cx-f*scale,f2=cx+f*scale;
    body=text(300,28,'Convex-lens ray diagram',20)+line(45,axis,555,axis,'stroke="#777" stroke-width="1.5" marker-end="url(#arrow)"')+
      `<path d="M300 55Q270 185 300 315Q330 185 300 55Z" fill="#eee"/>`+
      line(f1,axis-8,f1,axis+8)+line(f2,axis-8,f2,axis+8)+text(f1,axis+27,'F₁',14)+text(f2,axis+27,'F₂',14)+
      line(objX,axis,objX,objTop,'stroke="#111" stroke-width="3" marker-end="url(#arrow)"')+text(objX,axis+27,'Object',13)+
      line(imgX,axis,imgX,imgTop,'stroke="#111" stroke-width="3" marker-end="url(#arrow)"')+text(imgX,axis-15,'Image',13)+
      line(objX,objTop,cx,objTop,'stroke="#111" stroke-width="1.5"')+line(cx,objTop,imgX,imgTop,'stroke="#111" stroke-width="1.5"')+line(objX,objTop,imgX,imgTop,'stroke="#555" stroke-width="1.5"')+
      text(70,335,`f = ${f} ${spec.unit}; u = ${u} ${spec.unit}`,14,'start');
    alt=`Convex lens ray diagram with focal length ${f} ${spec.unit} and object distance ${u} ${spec.unit}.`;
  } else if(spec.kind==='TRANSVERSE_WAVE') {
    type='SCIENCE_DIAGRAM';
    const left=70,right=530,axis=180,amp=82,total=right-left,samples=120,points=Array.from({length:samples+1},(_,i)=>{const x=left+total*i/samples,y=axis-amp*Math.sin(2*Math.PI*spec.cycles*i/samples);return `${x},${y}`;}).join(' '),oneWave=total/spec.cycles;
    body=text(300,28,'Transverse wave',20)+line(45,axis,555,axis,'stroke="#999" stroke-width="1.5" marker-end="url(#arrow)"')+`<polyline points="${points}" fill="none" stroke="#111" stroke-width="3"/>`+
      line(52,axis-amp,52,axis,'stroke="#111" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"')+text(42,axis-amp/2,`A = ${spec.amplitude} ${spec.unit}`,13,'end')+
      line(left,305,left+oneWave,305,'stroke="#111" stroke-width="1.5" marker-start="url(#arrow)" marker-end="url(#arrow)"')+line(left,290,left,315)+line(left+oneWave,290,left+oneWave,315)+text(left+oneWave/2,334,`λ = ${spec.wavelength} ${spec.unit}`,14);
    alt=`Transverse wave with amplitude ${spec.amplitude} ${spec.unit}, wavelength ${spec.wavelength} ${spec.unit}, and ${spec.cycles} displayed cycles.`;
  } else if(spec.kind==='TECHNICAL_SCENE') {
    type=spec.domain==='MATHS'?'GEOMETRY':spec.domain==='SOCIAL'?'OTHER':'SCIENCE_DIAGRAM';
    const shade=(value?:'NONE'|'LIGHT'|'HATCH')=>value==='HATCH'?'url(#hatch)':value==='LIGHT'?'#ddd':'none';
    body=text(300,25,spec.title,19);
    spec.primitives.forEach(p=>{
      if(p.kind==='LINE'||p.kind==='ARROW')body+=line(p.from[0],p.from[1],p.to[0],p.to[1],`stroke="#111" stroke-width="2"${p.style==='DASHED'?' stroke-dasharray="6 5"':''}${p.kind==='ARROW'?' marker-end="url(#arrow)"':''}`);
      else if(p.kind==='RECT')body+=`<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="${shade(p.fill)}"/>`;
      else if(p.kind==='CIRCLE')body+=`<circle cx="${p.cx}" cy="${p.cy}" r="${p.r}" fill="${shade(p.fill)}"/>`;
      else if(p.kind==='ELLIPSE')body+=`<ellipse cx="${p.cx}" cy="${p.cy}" rx="${p.rx}" ry="${p.ry}" fill="${shade(p.fill)}"/>`;
      else if(p.kind==='POLYLINE')body+=`<${p.closed?'polygon':'polyline'} points="${p.points.map(v=>v.join(',')).join(' ')}" fill="${shade(p.fill)}"/>`;
      else if(p.kind==='TEXT') body+=text(p.x,p.y,p.text,p.size||14);
    });
    body+=text(300,348,'Schematic; not to scale',12);
    alt=`${spec.domain.toLowerCase()} schematic titled ${spec.title}.`;
  } else if(spec.kind==='INCLINED_MANOMETER') {
    type='SCIENCE_DIAGRAM';
    const angle=spec.angle*Math.PI/180;
    const leftX=245,leftTop=108,bottomY=315,startX=315,startY=280;
    const tubeLength=Math.min(240,175/Math.cos(angle),210/Math.sin(angle));
    const rightX=startX+tubeLength*Math.cos(angle),rightY=startY-tubeLength*Math.sin(angle);
    const measuredLength=tubeLength*.72,interfaceX=startX+measuredLength*Math.cos(angle),interfaceY=startY-measuredLength*Math.sin(angle);
    const normalX=-Math.sin(angle)*38,normalY=-Math.cos(angle)*38;
    const dimA:[number,number]=[startX+normalX,startY+normalY],dimB:[number,number]=[interfaceX+normalX,interfaceY+normalY];
    const outer=`M44 ${leftTop}H${leftX}V250 Q${leftX} ${bottomY} 286 ${bottomY} Q305 ${bottomY} ${startX} ${startY} L${rightX} ${rightY} H570`;
    const fluid=`M${leftX} 232 V250 Q${leftX} 295 286 295 Q300 295 ${startX} ${startY} L${interfaceX} ${interfaceY}`;
    const arrow=(x1:number,y1:number,x2:number,y2:number)=>line(x1,y1,x2,y2,'stroke="#111" stroke-width="3" marker-end="url(#arrow)"');
    body=text(138,54,'Pipe A',24)+text((rightX+570)/2,Math.max(28,rightY-30),'Pipe B',24)+
      `<path d="${outer}" fill="none" stroke="#111" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`+
      `<path d="${outer}" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`+
      `<path d="${fluid}" fill="none" stroke="#b7b7b7" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`+
      `<path d="${fluid}" fill="none" stroke="url(#manometerHatch)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`+
      `<ellipse cx="44" cy="${leftTop}" rx="18" ry="11" fill="#fff" stroke="#111" stroke-width="2"/>`+
      `<ellipse cx="${rightX}" cy="${rightY}" rx="18" ry="11" fill="#fff" stroke="#111" stroke-width="2"/>`+
      `<ellipse cx="570" cy="${rightY}" rx="18" ry="11" fill="#fff" stroke="#111" stroke-width="2"/>`+
      line(44,leftTop,leftX,leftTop,'stroke="#777" stroke-width="1" stroke-dasharray="6 5"')+
      line(rightX,rightY,570,rightY,'stroke="#777" stroke-width="1" stroke-dasharray="6 5"')+
      arrow(95,leftTop,180,leftTop)+arrow(Math.min(rightX+25,520),rightY,550,rightY)+
      line(270,startY,555,startY,'stroke="#777" stroke-width="1.5" stroke-dasharray="6 5"')+
      line(dimA[0],dimA[1],dimB[0],dimB[1],'stroke="#111" stroke-width="1.8" marker-start="url(#arrow)" marker-end="url(#arrow)"')+
      line(startX,startY,dimA[0],dimA[1],'stroke="#111" stroke-width="1.2"')+line(interfaceX,interfaceY,dimB[0],dimB[1],'stroke="#111" stroke-width="1.2"')+
      ` <g transform="translate(${(dimA[0]+dimB[0])/2} ${(dimA[1]+dimB[1])/2-7}) rotate(${-spec.angle})">${text(0,0,`L = ${spec.length} ${spec.unit}`,17)}</g>`+
      line(535,interfaceY,535,startY,'stroke="#111" stroke-width="1.8" marker-start="url(#arrow)" marker-end="url(#arrow)"')+
      text(548,(interfaceY+startY)/2+5,'hᵥ',18,'start')+
      `<path d="M${startX} ${startY} A48 48 0 0 0 ${startX+48*Math.cos(angle)} ${startY-48*Math.sin(angle)}" fill="none" stroke="#111" stroke-width="2"/>`+
      text(startX+57*Math.cos(angle/2),startY-57*Math.sin(angle/2)-4,`θ = ${spec.angle}°`,15,'start')+
      line(interfaceX-Math.sin(angle)*13,interfaceY-Math.cos(angle)*13,interfaceX+Math.sin(angle)*13,interfaceY+Math.cos(angle)*13,'stroke="#111" stroke-width="2"');
    alt=`Inclined manometer between Pipe A and Pipe B. Fluid-column length L = ${spec.length} ${spec.unit}, inclined ${spec.angle} degrees above horizontal; vertical rise labelled h.`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360"><title>${escape(alt)}</title>${definitions}<rect width="600" height="360" fill="#fff"/><g stroke="#111" stroke-width="2" fill="#111" font-family="Arial, sans-serif"><style>text{stroke:none}</style>${body}</g></svg>`;
  return {visual_type:type,render_spec:spec,svg_content:svg,alt_text:alt,answer_dependency:true,is_grayscale:true,figure_caption:'Question figure'+(type==='GEOMETRY'||type==='SCIENCE_DIAGRAM'?' (schematic)':''),dimensions:{width:600,height:360}};
}

export function needsQuestionDiagram(stem:string):boolean {
  return /(?:shown|given|following|above|below|shaded).{0,24}(?:figure|diagram|chart|graph|schematic)|(?:figure|diagram|chart|graph|schematic).{0,24}(?:shown|given|following|above|below)|\b(?:bar chart|bar graph|line chart|coordinate (?:plot|graph)|cartesian graph|venn diagram|manometer|cell diagram|beam diagram|free[ -]body diagram|force diagram|electric circuit|circuit diagram|convex lens|ray diagram|transverse wave|wave diagram|fraction bar|timeline|mirror image|water image)\b/i.test(stem);
}

/** Re-render stored structured data so edited SVG cannot bypass the template. */
export function questionVisualIssues(q:{question_text:string;visual_specification?:VisualSpecification},required=false,expectedType?:string):string[] {
  const v=q.visual_specification;
  if(!v)return required||needsQuestionDiagram(q.question_text)?['This question requires a checked grayscale figure.']:[];
  if(!v.render_spec)return ['This figure needs a supported structured specification before it can enter the checked bank.'];
  const issues=diagramIssues(v.render_spec,q.question_text);
  if(!issues.length&&required&&expectedType&&!['NONE','OTHER','IMAGE'].includes(expectedType)) {
    const actual=renderQuestionDiagram(v.render_spec).visual_type;
    if(actual!==(expectedType==='LINE_GRAPH'?'LINE_CHART':expectedType))issues.push('The figure type does not match the blueprint requirement.');
  }
  return issues;
}
