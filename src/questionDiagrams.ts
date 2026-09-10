import type { VisualSpecification } from './types.ts';

/** Data only: never accept model-authored SVG, scripts or external image URLs. */
export type QuestionDiagram =
  | {kind:'BAR_CHART'|'LINE_CHART';title:string;categories:string[];values:number[];unit:string}
  | {kind:'RIGHT_TRIANGLE';vertices:[string,string,string];base:number;height:number;unit:string}
  | {kind:'CIRCLE_TANGENT';radius:number;distance:number;unit:string}
  | {kind:'VENN_2';sets:[string,string];region:'INTERSECTION'|'UNION'|'A_ONLY'|'B_ONLY'}
  | {kind:'INCLINED_MANOMETER';length:number;angle:number;unit:string};

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
const label=(value:unknown,max=36):value is string=>typeof value==='string'&&value.trim().length>0&&value.length<=max&&!/[<>\x00-\x1f]/.test(value);
const number=(value:unknown):value is number=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e6;
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
  }
  return [];
}

export function renderQuestionDiagram(spec:QuestionDiagram,stem?:string):VisualSpecification {
  const issues=diagramIssues(spec,stem);if(issues.length)throw Error(issues.join(' '));
  let body='',alt='',type:VisualSpecification['visual_type']='GEOMETRY';
  const definitions='<defs><pattern id="hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="#666" stroke-width="2"/></pattern><pattern id="manometerHatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V8" stroke="#666" stroke-width="1.4"/></pattern><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" fill="#111"/></marker></defs>';
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
  } else if(spec.kind==='INCLINED_MANOMETER') {
    type='SCIENCE_DIAGRAM';
    // Fixed schematic proportions make the drawing read like a printed engineering figure;
    // the only numeric labels come from the question's structured values.
    const angle=spec.angle*Math.PI/180;
    const leftX=255,leftTop=118,bottomY=322,rightX=465,rightY=84;
    const outer=`M44 ${leftTop}H${leftX}V258 Q${leftX} ${bottomY} ${leftX+40} ${bottomY} Q${leftX+68} ${bottomY} ${leftX+88} ${bottomY-34} L${rightX} ${rightY} H570`;
    const fluid=`M${leftX} 242 V258 Q${leftX} 300 ${leftX+40} 300 Q${leftX+56} 300 ${leftX+73} 274 L390 220`;
    const arrow=(x1:number,y1:number,x2:number,y2:number)=>line(x1,y1,x2,y2,'stroke="#111" stroke-width="3" marker-end="url(#arrow)"');
    const datumY=222;
    // The dimension line is deliberately offset above the inclined tube, as in a printed engineering plate.
    const dimA=[345,174],dimB=[445,58];
    body=text(138,62,'Pipe A',25)+text(515,34,'Pipe B',25)+
      `<path d="${outer}" fill="none" stroke="#111" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`+
      `<path d="${outer}" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>`+
      `<path d="${fluid}" fill="none" stroke="#b7b7b7" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>`+
      `<path d="${fluid}" fill="none" stroke="url(#manometerHatch)" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>`+
      `<ellipse cx="44" cy="${leftTop}" rx="18" ry="11" fill="#fff" stroke="#111" stroke-width="2"/>`+
      `<ellipse cx="${rightX}" cy="${rightY}" rx="18" ry="11" fill="#fff" stroke="#111" stroke-width="2"/>`+
      `<ellipse cx="570" cy="${rightY}" rx="18" ry="11" fill="#fff" stroke="#111" stroke-width="2"/>`+
      line(44,leftTop,leftX,leftTop,'stroke="#777" stroke-width="1" stroke-dasharray="6 5"')+
      line(rightX,rightY,570,rightY,'stroke="#777" stroke-width="1" stroke-dasharray="6 5"')+
      arrow(95,leftTop,185,leftTop)+arrow(495,rightY,550,rightY)+
      line(250,datumY,555,datumY,'stroke="#777" stroke-width="1.5" stroke-dasharray="6 5"')+
      line(dimA[0],dimA[1],dimB[0],dimB[1],'stroke="#111" stroke-width="1.8" marker-start="url(#arrow)" marker-end="url(#arrow)"')+
      line(345,174,390,220,'stroke="#111" stroke-width="1.2"')+line(445,58,465,84,'stroke="#111" stroke-width="1.2"')+
      ` <g transform="translate(395 118) rotate(${-spec.angle})">${text(0,0,`L = ${spec.length} ${spec.unit}`,18)}</g>`+
      line(535,rightY,535,datumY,'stroke="#111" stroke-width="1.8" marker-start="url(#arrow)" marker-end="url(#arrow)"')+
      text(548,162,'hᵥ',18,'start')+
      `<path d="M360 ${datumY} A47 47 0 0 0 ${360+47*Math.cos(angle)} ${datumY-47*Math.sin(angle)}" fill="none" stroke="#111" stroke-width="2"/>`+
      text(382,192,`θ = ${spec.angle}°`,16,'start')+
      // The interface line is perpendicular to the inclined leg; it identifies the measured fluid column.
      line(398,226,418,204,'stroke="#111" stroke-width="1.5"');
    alt=`Inclined manometer between Pipe A and Pipe B. Fluid-column length L = ${spec.length} ${spec.unit}, inclined ${spec.angle} degrees above horizontal; vertical rise labelled h.`;
  }
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360" width="600" height="360"><title>${escape(alt)}</title>${definitions}<rect width="600" height="360" fill="#fff"/><g stroke="#111" stroke-width="2" fill="#111" font-family="Arial, sans-serif"><style>text{stroke:none}</style>${body}</g></svg>`;
  return {visual_type:type,render_spec:spec,svg_content:svg,alt_text:alt,answer_dependency:true,is_grayscale:true,figure_caption:'Question figure'+(type==='GEOMETRY'||type==='SCIENCE_DIAGRAM'?' (schematic)':''),dimensions:{width:600,height:360}};
}

export function needsQuestionDiagram(stem:string):boolean {
  return /(?:shown|given|following|above|below|shaded).{0,24}(?:figure|diagram|chart|graph)|(?:figure|diagram|chart|graph).{0,24}(?:shown|given|following|above|below)|\b(?:bar chart|bar graph|line chart|venn diagram|manometer|mirror image|water image)\b/i.test(stem);
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
