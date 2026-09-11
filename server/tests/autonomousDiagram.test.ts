import {test} from 'node:test';
import assert from 'node:assert/strict';
import {diagramIssues,renderQuestionDiagram,questionVisualIssues,type QuestionDiagram} from '../../src/questionDiagrams.ts';
import {detectAndGenerateDiagram} from '../autonomousDiagramService.ts';
import {templateQuestion,selectBank} from '../freeQuestionBank.ts';

test('missing figures never receive guessed values or relationships from keywords',()=>{
  for(const stem of ['Refer to the bar chart below.','In triangle ABC find its area.','Refer to the Venn diagram of students.','Choose the mirror image of AB.'])assert.equal(detectAndGenerateDiagram({question_text:stem}),undefined);
  assert.ok(questionVisualIssues({question_text:'Refer to the bar chart below.'}).length);
  assert.ok(questionVisualIssues({question_text:'A pure textual problem requiring a visual slot.'},true).length);
});
test('chart data requires matching labels, values, units and finite dimensions',()=>{
  const spec:QuestionDiagram={kind:'BAR_CHART',title:'Books',categories:['A','B'],values:[40,60],unit:'books'};
  assert.deepEqual(diagramIssues(spec,'A has 40 books and B has 60 books.'),[]);
  assert.ok(diagramIssues({...spec,values:[40,61]},'A has 40 books and B has 60 books.').length);
  for(const values of [[1],[1,NaN],[-1,2],[1,Infinity]])assert.ok(diagramIssues({...spec,values}).length);
  assert.ok(diagramIssues({...spec,unit:'tonnes'},'A has 40 books and B has 60 books.').length);
  assert.ok(diagramIssues({...spec,categories:['A','<script>']}).length);
});
test('SVG labels are escaped, and all renderer colours are neutral grayscale',()=>{
  const svg=renderQuestionDiagram({kind:'BAR_CHART',title:'A & B',categories:['A','B'],values:[2,4],unit:'books'}).svg_content!;
  assert.ok(svg.includes('A &amp; B'));assert.ok(!svg.includes('A & B'));
  for(const color of svg.match(/#[0-9a-f]{3,6}\b/gi)||[])assert.equal(new Set(color.slice(1).toLowerCase()).size,1);
  assert.ok(!/script|foreignObject|onload|https:\/\//.test(svg));
});
test('right triangle keeps the given side ratio and does not label the calculated hypotenuse',()=>{
  const stem='Triangle ABC is right-angled at B, AB = 6 cm and BC = 8 cm. Find AC from the figure.';
  const visual=renderQuestionDiagram({kind:'RIGHT_TRIANGLE',vertices:['A','B','C'],base:8,height:6,unit:'cm'},stem);
  const points=visual.svg_content!.match(/M([\d.]+) ([\d.]+)V([\d.]+)H([\d.]+)Z/)!;
  assert.ok(Math.abs((Number(points[4])-Number(points[1]))/(Number(points[3])-Number(points[2]))-8/6)<1e-8);
  assert.ok(!visual.svg_content!.includes('10 cm'));
  assert.ok(diagramIssues(visual.render_spec,stem.replace('at B','at A')).length);
});
test('circle tangent endpoint lies on the circle and is perpendicular to its radius',()=>{
  const svg=renderQuestionDiagram({kind:'CIRCLE_TANGENT',radius:5,distance:13,unit:'cm'}).svg_content!;
  const c=svg.match(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/)!;
  const lines=[...svg.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)].map(x=>x.slice(1).map(Number));
  const [radius,tangent]=lines;const [cx,cy,r]=c.slice(1).map(Number);
  assert.ok(Math.abs(Math.hypot(radius[2]-cx,radius[3]-cy)-r)<1e-8);
  assert.ok(Math.abs((radius[2]-cx)*(tangent[0]-tangent[2])+(radius[3]-cy)*(tangent[1]-tangent[3]))<1e-8);
  assert.ok(!svg.includes('12 cm'));
});
test('Venn intersections are actually clipped, while captions do not reveal the answer',()=>{
  const v=renderQuestionDiagram({kind:'VENN_2',sets:['Cricket','Football'],region:'INTERSECTION'});
  assert.ok(v.svg_content!.includes('clip-path="url(#a)"'));
  assert.ok(!/intersection|∩/i.test(v.alt_text+' '+v.figure_caption));
  const only=renderQuestionDiagram({kind:'VENN_2',sets:['Cricket','Football'],region:'A_ONLY'});
  assert.ok(only.svg_content!.includes('mask="url(#not-b)"'));
});
test('inclined manometer retains stated length and angle, with no computed rise in its figure',()=>{
  const v=renderQuestionDiagram({kind:'INCLINED_MANOMETER',length:20,angle:30,unit:'cm'},'An inclined manometer has L = 20 cm at 30 degrees. Find h.');
  assert.ok(v.svg_content!.includes('L = 20 cm'));assert.ok(v.svg_content!.includes('30°'));
  assert.ok(!/10 cm|sin\(/.test(v.svg_content!));assert.ok(v.svg_content!.includes('hᵥ'));
  for(const degrees of [15,30,55]) {
    const svg=renderQuestionDiagram({kind:'INCLINED_MANOMETER',length:20,angle:degrees,unit:'cm'}).svg_content!;
    const endpoint=svg.match(/Q305 315 315 280 L([\d.]+) ([\d.]+) H570/)!;
    const drawn=Math.atan2(280-Number(endpoint[2]),Number(endpoint[1])-315)*180/Math.PI;
    assert.ok(Math.abs(drawn-degrees)<1e-8);
  }
});
test('biology cell diagrams use valid structures and hide marker answers',()=>{
  const spec:QuestionDiagram={kind:'BIOLOGY_CELL',cell_type:'PLANT',markers:[{label:'A',structure:'NUCLEUS'},{label:'B',structure:'CHLOROPLAST'}]};
  const visual=renderQuestionDiagram(spec,'In the plant cell diagram, identify structures A and B.');
  assert.equal(visual.visual_type,'SCIENCE_DIAGRAM');
  assert.ok(visual.svg_content!.includes('>A<')&&visual.svg_content!.includes('>B<'));
  assert.ok(!/NUCLEUS|CHLOROPLAST/.test(visual.svg_content!));
  assert.ok(diagramIssues({...spec,cell_type:'ANIMAL'}).length);
});
test('beam, fraction and timeline templates preserve their structured data',()=>{
  const beam=renderQuestionDiagram({kind:'SIMPLY_SUPPORTED_BEAM',span:8,point_load:12,load_position:3,length_unit:'m',force_unit:'kN'},'A simply supported beam of span 8 m carries a 12 kN point load 3 m from the left support.');
  assert.equal(beam.visual_type,'SCIENCE_DIAGRAM');assert.ok(beam.svg_content!.includes('x1="245" y1="62"'));
  const fraction=renderQuestionDiagram({kind:'FRACTION_BAR',numerator:3,denominator:8},'The fraction bar has 3 shaded parts among 8 equal parts.');
  assert.equal((fraction.svg_content!.match(/fill="url\(#hatch\)"/g)||[]).length,3);
  const timeline:QuestionDiagram={kind:'TIMELINE',title:'Reform sequence',events:[{year:1829,label:'Event A'},{year:1856,label:'Event B'}]};
  assert.equal(diagramIssues(timeline,'Use the Reform sequence timeline to place Event A (1829) and Event B (1856) in chronological order.').length,0);
  assert.ok(diagramIssues({...timeline,events:[timeline.events[1],timeline.events[0]]}).length);
});
test('coordinate plots preserve axes, point coordinates and declared segments',()=>{
  const spec:QuestionDiagram={kind:'COORDINATE_PLOT',x_range:[-5,5],y_range:[-5,5],points:[{label:'A',x:1,y:2},{label:'B',x:4,y:-1}],segments:[['A','B']]};
  const stem='On the coordinate graph, point A is (1, 2) and point B is (4, -1). Join A and B.';
  const visual=renderQuestionDiagram(spec,stem);
  assert.equal(visual.visual_type,'GEOMETRY');
  assert.ok(visual.svg_content!.includes('A (1, 2)')&&visual.svg_content!.includes('B (4, -1)'));
  assert.ok(diagramIssues({...spec,segments:[['A','C']]},stem).length);
  assert.ok(diagramIssues({...spec,points:[{label:'A',x:8,y:2}]},stem).length);
});
test('free-body diagrams retain force magnitude, direction and units',()=>{
  const spec:QuestionDiagram={kind:'FREE_BODY_DIAGRAM',body_label:'Block',unit:'N',forces:[{label:'Pull',magnitude:30,angle:0},{label:'Normal',magnitude:50,angle:90},{label:'Weight',magnitude:50,angle:270}]};
  const stem='The free-body diagram of a Block shows Pull 30 N at 0 degrees, Normal 50 N at 90 degrees and Weight 50 N at 270 degrees.';
  const visual=renderQuestionDiagram(spec,stem);
  assert.ok(visual.svg_content!.includes('Pull: 30 N, 0\u00b0'));
  assert.ok(visual.svg_content!.includes('Weight: 50 N, 270\u00b0'));
  assert.ok(diagramIssues({...spec,forces:[...spec.forces,{label:'Bad',magnitude:-1,angle:45}]},stem).length);
});
test('electric circuit templates distinguish layout and switch state',()=>{
  const series:QuestionDiagram={kind:'ELECTRIC_CIRCUIT',layout:'SERIES',source_label:'Cell',resistors:['R1','R2'],switch_state:'CLOSED'};
  const parallel:QuestionDiagram={...series,layout:'PARALLEL',switch_state:'OPEN'};
  assert.equal(diagramIssues(series,'The closed switch in this series circuit connects Cell, R1 and R2.' ).length,0);
  assert.equal(diagramIssues(parallel,'The open switch in this parallel circuit connects Cell, R1 and R2.' ).length,0);
  assert.notEqual(renderQuestionDiagram(series).svg_content,renderQuestionDiagram(parallel).svg_content);
  assert.ok(renderQuestionDiagram(parallel).alt_text.includes('open switch'));
  assert.ok(diagramIssues({...series,resistors:['R1','R1']}).length);
});
test('convex-lens and wave templates keep supplied measurements and omit solved values',()=>{
  const lens=renderQuestionDiagram({kind:'CONVEX_LENS_RAY',focal_length:10,object_distance:30,unit:'cm'},'A convex lens has focal length 10 cm and object distance 30 cm. Study the ray diagram.');
  assert.ok(lens.svg_content!.includes('f = 10 cm; u = 30 cm'));
  assert.ok(!/v\s*=\s*15/.test(lens.svg_content!));
  const wave=renderQuestionDiagram({kind:'TRANSVERSE_WAVE',amplitude:2,wavelength:4,cycles:2,unit:'cm'},'A transverse wave diagram shows amplitude 2 cm, wavelength 4 cm and 2 cycles.');
  assert.ok(wave.svg_content!.includes('A = 2 cm')&&wave.svg_content!.includes('\u03bb = 4 cm'));
  assert.ok(diagramIssues({kind:'TRANSVERSE_WAVE',amplitude:2,wavelength:4,cycles:2.5,unit:'cm'}).length);
});
test('general technical scenes accept only bounded grayscale primitives and escape labels',()=>{
  const spec:QuestionDiagram={kind:'TECHNICAL_SCENE',domain:'PHYSICS',title:'Lever & support',scale:'NOT_TO_SCALE',primitives:[{kind:'LINE',from:[100,180],to:[500,180]},{kind:'POLYLINE',points:[[280,250],[320,250],[300,180]],closed:true,fill:'LIGHT'},{kind:'TEXT',x:300,y:275,text:'Fulcrum'}]};
  const visual=renderQuestionDiagram(spec,'The Lever & support schematic diagram identifies the Fulcrum.');
  assert.ok(visual.svg_content!.includes('Lever &amp; support'));
  assert.ok(visual.svg_content!.includes('Schematic; not to scale'));
  assert.ok(diagramIssues({...spec,primitives:[{kind:'TEXT',x:10,y:10,text:'<script>'}]}).length);
  assert.ok(diagramIssues({...spec,primitives:[{kind:'LINE',from:[-1,0],to:[5,5]}]}).length);
});
test('all new template renderers emit self-contained neutral grayscale SVG',()=>{
  const specs:QuestionDiagram[]=[
    {kind:'COORDINATE_PLOT',x_range:[-5,5],y_range:[-5,5],points:[{label:'A',x:1,y:2}],segments:[]},
    {kind:'FREE_BODY_DIAGRAM',body_label:'Block',unit:'N',forces:[{label:'Force',magnitude:20,angle:45}]},
    {kind:'ELECTRIC_CIRCUIT',layout:'PARALLEL',source_label:'Cell',resistors:['R1','R2'],switch_state:'OPEN'},
    {kind:'CONVEX_LENS_RAY',focal_length:10,object_distance:30,unit:'cm'},
    {kind:'TRANSVERSE_WAVE',amplitude:2,wavelength:4,cycles:2,unit:'cm'},
    {kind:'TECHNICAL_SCENE',domain:'SOCIAL',title:'Flow',scale:'NOT_TO_SCALE',primitives:[{kind:'ARROW',from:[100,180],to:[500,180]}]},
  ];
  for(const spec of specs) {
    const svg=renderQuestionDiagram(spec).svg_content!;
    for(const color of svg.match(/#[0-9a-f]{3,6}\b/gi)||[])assert.equal(new Set(color.slice(1).toLowerCase()).size,1);
    assert.ok(!/<script|foreignObject|onload|href=/i.test(svg));
  }
});
test('visual slot selection rejects missing or wrong figure types',()=>{
  const template=templateQuestion('Bar chart',1)!;
  const q:any={id:'q',status:'READY',question:template.question,topic:'Bar chart',subject:'Math',difficulty:'EASY',fact_family:'one',template_id:template.template_id};
  const slot:any={slot_id:'1',subject:'Math',topic:'Bar chart',difficulty:'EASY',answerable_fact_family:'',visual_requirement:true,visual_type:'BAR_CHART'};
  assert.equal(selectBank([slot],[q],new Set()).missing.length,0);
  assert.equal(selectBank([{...slot,visual_type:'MAP'}],[q],new Set()).missing.length,1);
  assert.equal(selectBank([slot],[{...q,question:{...q.question,visual_specification:undefined}}],new Set()).missing.length,1);
});
test('numerical visual templates calculate answers independently of their rendered figures',()=>{
  for(let n=0;n<20;n++) {
    const t=templateQuestion('Right triangle',n)!.question,ts=t.visual_specification!.render_spec as any;
    assert.equal(Number(t.options[t.correct_option_index])**2,ts.base**2+ts.height**2);
    const b=templateQuestion('Bar chart',n)!.question,bs=b.visual_specification!.render_spec as any;
    assert.equal(Number(b.options[b.correct_option_index]),bs.values[1]-bs.values[0]);
    assert.deepEqual(questionVisualIssues(t),[]);assert.deepEqual(questionVisualIssues(b),[]);
  }
});
