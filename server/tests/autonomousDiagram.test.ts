import { test } from 'node:test';
import assert from 'node:assert';
import {
  generateCircleTangentDiagram,
  generateRightTriangleDiagram,
  generateVennDiagram,
  generateGrayscaleBarChart,
  generateMirrorPatternDiagram,
  detectAndGenerateDiagram
} from '../autonomousDiagramService.ts';

test('1. Circle with Tangent SVG generation produces valid grayscale diagram', () => {
  const svg = generateCircleTangentDiagram({
    radiusLabel: '5 cm',
    tangentLabel: '12 cm',
    hypotenuseLabel: '13 cm',
    center: 'O',
    tangentPoint: 'T',
    externalPoint: 'P'
  });

  assert.ok(svg.includes('<svg'), 'Must contain SVG opening tag');
  assert.ok(svg.includes('</svg>'), 'Must contain SVG closing tag');
  assert.ok(svg.includes('5 cm'), 'Must contain radius label');
  assert.ok(svg.includes('12 cm'), 'Must contain tangent label');
  assert.ok(svg.includes('13 cm'), 'Must contain hypotenuse label');
  assert.ok(svg.includes('#0F172A') || svg.includes('#000000'), 'Must use monochrome/grayscale stroke');
  assert.ok(svg.includes('#FFFFFF'), 'Must use white background');
});

test('2. Right-Angled Triangle SVG generation produces valid geometry', () => {
  const svg = generateRightTriangleDiagram({
    A: 'A',
    B: 'B',
    C: 'C',
    baseLabel: '8 cm',
    heightLabel: '6 cm',
    hypLabel: '10 cm',
    showAltitude: true
  });

  assert.ok(svg.includes('<polygon'), 'Must contain polygon for triangle');
  assert.ok(svg.includes('8 cm'), 'Must include base label');
  assert.ok(svg.includes('6 cm'), 'Must include height label');
  assert.ok(svg.includes('10 cm'), 'Must include hypotenuse label');
  assert.ok(svg.includes('Altitude'), 'Must support altitude visualization');
});

test('3. Venn Diagrams produce valid 2-Set and 3-Set grayscale SVG layouts', () => {
  const svg2 = generateVennDiagram({
    setA: 'Cricket',
    setB: 'Football',
    shadingRegion: 'INTERSECTION'
  });
  assert.ok(svg2.includes('Cricket'), 'Must include set A label');
  assert.ok(svg2.includes('Football'), 'Must include set B label');
  assert.ok(svg2.includes('A ∩ B'), 'Must indicate intersection');

  const svg3 = generateVennDiagram({
    setA: 'Engineers',
    setB: 'Doctors',
    setC: 'Artists',
    shadingRegion: 'ALL_THREE'
  });
  assert.ok(svg3.includes('Engineers'), 'Must include set A');
  assert.ok(svg3.includes('Doctors'), 'Must include set B');
  assert.ok(svg3.includes('Artists'), 'Must include set C');
});

test('4. Data Interpretation Bar Chart produces calibrated grayscale bars and axes', () => {
  const svg = generateGrayscaleBarChart({
    title: 'Yearly Production (in Lakhs)',
    categories: ['2020', '2021', '2022', '2023'],
    values: [40, 60, 85, 95]
  });

  assert.ok(svg.includes('Yearly Production (in Lakhs)'), 'Must contain chart title');
  assert.ok(svg.includes('2020'), 'Must contain year 2020');
  assert.ok(svg.includes('2023'), 'Must contain year 2023');
  assert.ok(svg.includes('95'), 'Must render bar value 95');
  assert.ok(svg.includes('<rect'), 'Must contain bar rectangles');
});

test('5. Non-Verbal Reasoning Mirror Pattern produces reflection diagram', () => {
  const svg = generateMirrorPatternDiagram({
    symbol: 'T E S T'
  });

  assert.ok(svg.includes('T E S T'), 'Must include test symbol');
  assert.ok(svg.includes('Mirror Line MN') || svg.includes('M'), 'Must include mirror line');
  assert.ok(svg.includes('Mirror Image'), 'Must include mirror image caption');
});

test('6. Autonomous Detection: Geometry question automatically generates diagram', () => {
  const visual = detectAndGenerateDiagram({
    question_text: 'In the given figure, a tangent PT of 12 cm is drawn from an external point P to a circle with radius of 5 cm and center O. What is distance OP?',
    topic: 'Geometry - Circles & Tangents',
    question_type: 'CALCULATION'
  });

  assert.ok(visual !== undefined, 'Must detect and generate visual specification');
  assert.strictEqual(visual?.visual_type, 'GEOMETRY');
  assert.strictEqual(visual?.is_grayscale, true);
  assert.ok(visual?.svg_content && visual.svg_content.includes('<svg'));
  assert.ok(visual?.svg_content?.includes('5 cm'));
  assert.ok(visual?.svg_content?.includes('12 cm'));
  assert.strictEqual(visual?.answer_dependency, true);
});

test('7. Autonomous Detection: Venn diagram question automatically generates diagram', () => {
  const visual = detectAndGenerateDiagram({
    question_text: 'In a class of 80 students, refer to the Venn diagram representing students who play cricket and football.',
    topic: 'Logical Reasoning - Venn Diagrams'
  });

  assert.ok(visual !== undefined, 'Must detect Venn diagram');
  assert.strictEqual(visual?.visual_type, 'VENN');
  assert.strictEqual(visual?.is_grayscale, true);
  assert.ok(visual?.svg_content?.includes('<svg'));
});

test('8. Autonomous Detection: Non-visual question produces no diagram', () => {
  const visual = detectAndGenerateDiagram({
    question_text: 'Under Article 32 of the Constitution of India, which writ is issued to produce a detained person?',
    topic: 'Indian Polity & Constitution'
  });

  assert.strictEqual(visual, undefined, 'Must not generate diagram for pure text questions');
});
