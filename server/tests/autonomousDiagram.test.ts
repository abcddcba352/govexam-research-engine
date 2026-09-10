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
