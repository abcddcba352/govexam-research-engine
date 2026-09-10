import type { VisualSpecification, MockQuestion } from '../src/types.ts';

/**
 * Autonomous Grayscale Diagram & Image Generation Service
 *
 * Automatically detects whether a mock question requires a visual/figure
 * and synthesizes razor-sharp, commission-standard monochrome/grayscale SVGs
 * (Geometry, Venn diagrams, Data Interpretation charts, Non-verbal reasoning)
 * without requiring any manual user commands.
 */

// Common Grayscale Styling Constants
const COLOR_BG = '#FFFFFF';
const COLOR_STROKE = '#0F172A'; // Deep black/slate
const COLOR_STROKE_LIGHT = '#64748B'; // Secondary lines / axes
const COLOR_GRAY_SHADE = '#E2E8F0'; // 15% gray fill
const COLOR_GRAY_DARK = '#94A3B8'; // 40% gray fill
const COLOR_TEXT = '#020617';
const FONT_FAMILY = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

/**
 * Generates a clean Grayscale SVG for Geometry: Circle with Tangent and Radius
 */
export function generateCircleTangentDiagram(options?: {
  radiusLabel?: string;
  tangentLabel?: string;
  hypotenuseLabel?: string;
  center?: string;
  tangentPoint?: string;
  externalPoint?: string;
  angleLabel?: string;
}): string {
  const center = options?.center || 'O';
  const P = options?.externalPoint || 'P';
  const T = options?.tangentPoint || 'T';
  const rLabel = options?.radiusLabel || 'r';
  const tLabel = options?.tangentLabel || '';
  const hypLabel = options?.hypotenuseLabel || '';

  return `<svg viewBox="0 0 420 260" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto">
  <defs>
    <pattern id="diagHatch" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="8" stroke="${COLOR_STROKE_LIGHT}" stroke-width="1.5" />
    </pattern>
  </defs>
  <!-- Background -->
  <rect width="100%" height="100%" fill="${COLOR_BG}" />
  
  <!-- Circle -->
  <circle cx="150" cy="140" r="80" fill="#F8FAFC" stroke="${COLOR_STROKE}" stroke-width="2.5" />
  <circle cx="150" cy="140" r="3.5" fill="${COLOR_STROKE}" />
  <text x="135" y="145" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${center}</text>

  <!-- External Point P -->
  <circle cx="360" cy="140" r="3.5" fill="${COLOR_STROKE}" />
  <text x="370" y="145" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${P}</text>

  <!-- Tangent Point T -->
  <circle cx="180" cy="66" r="3.5" fill="${COLOR_STROKE}" />
  <text x="175" y="52" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${T}</text>

  <!-- Line OT (Radius) -->
  <line x1="150" y1="140" x2="180" y2="66" stroke="${COLOR_STROKE}" stroke-width="2" stroke-dasharray="4 3" />
  <text x="150" y="98" font-family="${FONT_FAMILY}" font-size="13" font-style="italic" fill="${COLOR_TEXT}">${rLabel}</text>

  <!-- Line PT (Tangent) -->
  <line x1="360" y1="140" x2="180" y2="66" stroke="${COLOR_STROKE}" stroke-width="2.5" />
  ${tLabel ? `<text x="275" y="95" font-family="${FONT_FAMILY}" font-size="13" font-style="italic" fill="${COLOR_TEXT}">${tLabel}</text>` : ''}

  <!-- Line OP (Secant / Hypotenuse) -->
  <line x1="150" y1="140" x2="360" y2="140" stroke="${COLOR_STROKE}" stroke-width="2" />
  ${hypLabel ? `<text x="250" y="160" font-family="${FONT_FAMILY}" font-size="13" font-style="italic" fill="${COLOR_TEXT}">${hypLabel}</text>` : ''}

  <!-- Right Angle Symbol at T (OT perpendicular to PT) -->
  <path d="M 189 88 L 199 84 L 190 62" fill="none" stroke="${COLOR_STROKE}" stroke-width="1.5" />
</svg>`;
}

/**
 * Generates a clean Grayscale SVG for Geometry: Right-Angled Triangle with Altitude
 */
export function generateRightTriangleDiagram(options?: {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  baseLabel?: string;
  heightLabel?: string;
  hypLabel?: string;
  showAltitude?: boolean;
}): string {
  const A = options?.A || 'A';
  const B = options?.B || 'B'; // Right angle
  const C = options?.C || 'C';
  const D = options?.D || 'D';
  const withAltitude = options?.showAltitude ?? false;

  return `<svg viewBox="0 0 400 260" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto">
  <rect width="100%" height="100%" fill="${COLOR_BG}" />

  <!-- Triangle ABC -->
  <polygon points="80,50 80,200 320,200" fill="#F8FAFC" stroke="${COLOR_STROKE}" stroke-width="2.5" />

  <!-- Right Angle mark at B -->
  <rect x="80" y="180" width="20" height="20" fill="none" stroke="${COLOR_STROKE}" stroke-width="1.5" />

  <!-- Vertex Points and Labels -->
  <circle cx="80" cy="50" r="3.5" fill="${COLOR_STROKE}" />
  <text x="75" y="38" font-family="${FONT_FAMILY}" font-size="15" font-weight="bold" fill="${COLOR_TEXT}">${A}</text>

  <circle cx="80" cy="200" r="3.5" fill="${COLOR_STROKE}" />
  <text x="60" y="215" font-family="${FONT_FAMILY}" font-size="15" font-weight="bold" fill="${COLOR_TEXT}">${B}</text>

  <circle cx="320" cy="200" r="3.5" fill="${COLOR_STROKE}" />
  <text x="330" y="215" font-family="${FONT_FAMILY}" font-size="15" font-weight="bold" fill="${COLOR_TEXT}">${C}</text>

  <!-- Side Labels -->
  ${options?.heightLabel ? `<text x="50" y="130" font-family="${FONT_FAMILY}" font-size="13" font-style="italic" fill="${COLOR_TEXT}">${options.heightLabel}</text>` : ''}
  ${options?.baseLabel ? `<text x="195" y="222" font-family="${FONT_FAMILY}" font-size="13" font-style="italic" fill="${COLOR_TEXT}">${options.baseLabel}</text>` : ''}
  ${options?.hypLabel ? `<text x="215" y="115" font-family="${FONT_FAMILY}" font-size="13" font-style="italic" fill="${COLOR_TEXT}">${options.hypLabel}</text>` : ''}

  ${withAltitude ? `
  <!-- Altitude BD perpendicular to AC -->
  <line x1="80" y1="200" x2="160" y2="100" stroke="${COLOR_STROKE}" stroke-width="2" stroke-dasharray="4 3" />
  <circle cx="160" cy="100" r="3" fill="${COLOR_STROKE}" />
  <text x="165" y="92" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${D}</text>
  ` : ''}
</svg>`;
}

/**
 * Generates a clean Grayscale SVG for 2-Set or 3-Set Venn Diagram
 */
export function generateVennDiagram(options?: {
  setA?: string;
  setB?: string;
  setC?: string;
  shadingRegion?: 'A_ONLY' | 'B_ONLY' | 'INTERSECTION' | 'UNION' | 'ALL_THREE';
  universalSet?: string;
}): string {
  const setA = options?.setA || 'Group A';
  const setB = options?.setB || 'Group B';
  const setC = options?.setC;
  const shading = options?.shadingRegion || 'INTERSECTION';

  if (setC) {
    // 3-Set Venn Diagram
    return `<svg viewBox="0 0 420 320" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto">
  <defs>
    <pattern id="hatchPattern" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="${COLOR_STROKE}" stroke-width="1.5" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="${COLOR_BG}" />
  <!-- Universal Box -->
  <rect x="20" y="20" width="380" height="280" fill="none" stroke="${COLOR_STROKE}" stroke-width="2" rx="6" />
  <text x="35" y="45" font-family="${FONT_FAMILY}" font-size="15" font-weight="bold" fill="${COLOR_TEXT}">U</text>

  <!-- Three Overlapping Circles -->
  <circle cx="170" cy="140" r="75" fill="none" stroke="${COLOR_STROKE}" stroke-width="2.5" opacity="0.9" />
  <circle cx="250" cy="140" r="75" fill="none" stroke="${COLOR_STROKE}" stroke-width="2.5" opacity="0.9" />
  <circle cx="210" cy="205" r="75" fill="${shading === 'ALL_THREE' ? 'url(#hatchPattern)' : 'none'}" stroke="${COLOR_STROKE}" stroke-width="2.5" opacity="0.9" />

  <!-- Labels -->
  <text x="120" y="100" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${setA}</text>
  <text x="270" y="100" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${setB}</text>
  <text x="210" y="295" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" text-anchor="middle" fill="${COLOR_TEXT}">${setC}</text>
</svg>`;
  }

  // 2-Set Venn Diagram
  return `<svg viewBox="0 0 420 240" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto">
  <defs>
    <pattern id="hatch2" width="6" height="6" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="0" y2="6" stroke="${COLOR_STROKE}" stroke-width="1.5" />
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="${COLOR_BG}" />
  <!-- Universal Box -->
  <rect x="20" y="15" width="380" height="210" fill="none" stroke="${COLOR_STROKE}" stroke-width="2" rx="6" />
  <text x="35" y="40" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">U</text>

  <!-- Left Circle A -->
  <circle cx="165" cy="120" r="75" fill="${shading === 'A_ONLY' ? 'url(#hatch2)' : '#F8FAFC'}" stroke="${COLOR_STROKE}" stroke-width="2.5" />
  <!-- Right Circle B -->
  <circle cx="255" cy="120" r="75" fill="${shading === 'B_ONLY' ? 'url(#hatch2)' : 'none'}" stroke="${COLOR_STROKE}" stroke-width="2.5" />

  <!-- Shaded Intersection -->
  <text x="110" y="80" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${setA}</text>
  <text x="270" y="80" font-family="${FONT_FAMILY}" font-size="14" font-weight="bold" fill="${COLOR_TEXT}">${setB}</text>
  <text x="210" y="125" font-family="${FONT_FAMILY}" font-size="12" font-style="italic" fill="${COLOR_STROKE_LIGHT}" text-anchor="middle">A ∩ B</text>
</svg>`;
}

/**
 * Generates a clean Grayscale Data Interpretation Bar Chart SVG
 */
export function generateGrayscaleBarChart(options?: {
  title?: string;
  categories?: string[];
  values?: number[];
  yAxisLabel?: string;
  xAxisLabel?: string;
}): string {
  const title = options?.title || 'Data Interpretation Analysis';
  const categories = options?.categories && options.categories.length > 0 ? options.categories : ['2019', '2020', '2021', '2022', '2023'];
  const values = options?.values && options.values.length > 0 ? options.values : [45, 68, 52, 84, 70];
  const maxVal = Math.max(...values, 100);
  const roundedMax = Math.ceil(maxVal / 20) * 20;

  const chartW = 440;
  const chartH = 260;
  const originX = 60;
  const originY = 210;
  const plotW = 340;
  const plotH = 160;

  const barCount = categories.length;
  const slotW = plotW / barCount;
  const barW = Math.min(36, slotW * 0.55);

  const barsSvg = categories.map((cat, i) => {
    const val = values[i] || 0;
    const barHeight = (val / roundedMax) * plotH;
    const x = originX + i * slotW + (slotW - barW) / 2;
    const y = originY - barHeight;
    const fillShade = i % 2 === 0 ? COLOR_STROKE : COLOR_GRAY_SHADE;
    const strokeColor = COLOR_STROKE;

    return `
      <rect x="${x}" y="${y}" width="${barW}" height="${barHeight}" fill="${fillShade}" stroke="${strokeColor}" stroke-width="1.5" rx="2" />
      <text x="${x + barW / 2}" y="${y - 6}" font-family="${FONT_FAMILY}" font-size="11" font-weight="bold" fill="${COLOR_TEXT}" text-anchor="middle">${val}</text>
      <text x="${x + barW / 2}" y="${originY + 18}" font-family="${FONT_FAMILY}" font-size="11" fill="${COLOR_TEXT}" text-anchor="middle">${cat}</text>
    `;
  }).join('');

  // Grid lines
  const gridSteps = 4;
  const gridSvg = Array.from({ length: gridSteps + 1 }).map((_, step) => {
    const stepVal = Math.round((roundedMax / gridSteps) * step);
    const y = originY - (step / gridSteps) * plotH;
    return `
      <line x1="${originX}" y1="${y}" x2="${originX + plotW}" y2="${y}" stroke="#E2E8F0" stroke-width="1" stroke-dasharray="3 3" />
      <text x="${originX - 8}" y="${y + 4}" font-family="${FONT_FAMILY}" font-size="10" fill="${COLOR_STROKE_LIGHT}" text-anchor="end">${stepVal}</text>
    `;
  }).join('');

  return `<svg viewBox="0 0 ${chartW} ${chartH}" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto">
  <rect width="100%" height="100%" fill="${COLOR_BG}" />
  <text x="${chartW / 2}" y="24" font-family="${FONT_FAMILY}" font-size="13" font-weight="bold" fill="${COLOR_TEXT}" text-anchor="middle">${title}</text>
  ${gridSvg}
  <!-- Axes -->
  <line x1="${originX}" y1="35" x2="${originX}" y2="${originY}" stroke="${COLOR_STROKE}" stroke-width="2" />
  <line x1="${originX}" y1="${originY}" x2="${originX + plotW + 15}" y2="${originY}" stroke="${COLOR_STROKE}" stroke-width="2" />
  ${barsSvg}
  ${options?.yAxisLabel ? `<text transform="rotate(-90)" x="${-(chartH / 2)}" y="18" font-family="${FONT_FAMILY}" font-size="10" fill="${COLOR_STROKE_LIGHT}" text-anchor="middle">${options.yAxisLabel}</text>` : ''}
  ${options?.xAxisLabel ? `<text x="${originX + plotW / 2}" y="${chartH - 8}" font-family="${FONT_FAMILY}" font-size="11" fill="${COLOR_STROKE_LIGHT}" text-anchor="middle">${options.xAxisLabel}</text>` : ''}
</svg>`;
}

/**
 * Generates a clean Grayscale Non-Verbal Reasoning Mirror Image / Pattern Diagram
 */
export function generateMirrorPatternDiagram(options?: {
  symbol?: string;
  axisLabel?: string;
}): string {
  const sym = options?.symbol || 'P 7 F';
  return `<svg viewBox="0 0 380 180" xmlns="http://www.w3.org/2000/svg" className="w-full max-w-md mx-auto">
  <rect width="100%" height="100%" fill="${COLOR_BG}" />
  <!-- Original Box -->
  <rect x="30" y="35" width="130" height="90" fill="#F8FAFC" stroke="${COLOR_STROKE}" stroke-width="2" rx="4" />
  <text x="95" y="88" font-family="${FONT_FAMILY}" font-size="28" font-weight="bold" fill="${COLOR_TEXT}" text-anchor="middle">${sym}</text>
  <text x="95" y="145" font-family="${FONT_FAMILY}" font-size="11" font-weight="bold" fill="${COLOR_STROKE_LIGHT}" text-anchor="middle">Object</text>

  <!-- Mirror Line MN -->
  <line x1="190" y1="20" x2="190" y2="160" stroke="${COLOR_STROKE}" stroke-width="2.5" stroke-dasharray="5 3" />
  <text x="190" y="15" font-family="${FONT_FAMILY}" font-size="12" font-weight="bold" fill="${COLOR_TEXT}" text-anchor="middle">M</text>
  <text x="190" y="175" font-family="${FONT_FAMILY}" font-size="12" font-weight="bold" fill="${COLOR_TEXT}" text-anchor="middle">N</text>

  <!-- Question Mark / Mirror Target Box -->
  <rect x="220" y="35" width="130" height="90" fill="#F8FAFC" stroke="${COLOR_STROKE}" stroke-width="2" stroke-dasharray="4 2" rx="4" />
  <text x="285" y="90" font-family="${FONT_FAMILY}" font-size="36" font-weight="bold" fill="${COLOR_GRAY_DARK}" text-anchor="middle">?</text>
  <text x="285" y="145" font-family="${FONT_FAMILY}" font-size="11" font-weight="bold" fill="${COLOR_STROKE_LIGHT}" text-anchor="middle">Mirror Image</text>
</svg>`;
}

/**
 * Autonomous Diagram Detection & Synthesis
 *
 * Scans a question's text, topic, and cognitive parameters. If the question
 * relies on a visual or mentions a figure, this function automatically generates
 * the corresponding Grayscale SVG and returns a full VisualSpecification.
 */
export function detectAndGenerateDiagram(question: Partial<MockQuestion>): VisualSpecification | undefined {
  if (question.visual_specification?.svg_content) {
    // Already has an SVG diagram generated
    return question.visual_specification;
  }

  const text = (question.question_text || '').toLowerCase();
  const topic = (question.topic || '').toLowerCase();
  const subtopic = (question.subtopic || '').toLowerCase();
  const qType = (question.question_type || '').toLowerCase();

  // 1. Circle & Tangent / Chord Geometry
  if (
    (text.includes('circle') && (text.includes('tangent') || text.includes('radius') || text.includes('chord') || text.includes('secant'))) ||
    (text.includes('figure') && text.includes('circle')) ||
    (topic.includes('circle') && topic.includes('geometry'))
  ) {
    // Extract radius, tangent, or distance numbers if present
    const rMatch = text.match(/(?:radius|ot)\s*(?:[A-Za-z0-9]+\s*)?(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*cm/i);
    const tMatch = text.match(/(?:tangent|pt)\s*(?:[A-Za-z0-9]+\s*)?(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*cm/i);
    const hypMatch = text.match(/(?:distance|op|hypotenuse)\s*(?:[A-Za-z0-9]+\s*)?(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*cm/i);

    const svg = generateCircleTangentDiagram({
      radiusLabel: rMatch ? `${rMatch[1]} cm` : 'r',
      tangentLabel: tMatch ? `${tMatch[1]} cm` : 'PT',
      hypotenuseLabel: hypMatch ? `${hypMatch[1]} cm` : 'OP'
    });

    return {
      visual_type: 'GEOMETRY',
      svg_content: svg,
      alt_text: 'Geometry diagram showing circle with center O, radius OT, and tangent PT from external point P.',
      is_grayscale: true,
      figure_caption: 'Figure: Circle with Tangent PT from Point P',
      answer_dependency: true,
      dimensions: { width: 420, height: 260 }
    };
  }

  // 2. Right-Angled Triangle / Triangle Altitude
  if (
    (text.includes('triangle') && (text.includes('right-angled') || text.includes('hypotenuse') || text.includes('altitude') || text.includes('pythagoras'))) ||
    (text.includes('abc') && text.includes('triangle')) ||
    (topic.includes('triangle') && topic.includes('geometry'))
  ) {
    const baseMatch = text.match(/(?:bc|base)\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*cm/i);
    const heightMatch = text.match(/(?:ab|altitude|height)\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*cm/i);
    const hypMatch = text.match(/(?:ac|hypotenuse)\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)\s*cm/i);

    const svg = generateRightTriangleDiagram({
      baseLabel: baseMatch ? `${baseMatch[1]} cm` : 'BC',
      heightLabel: heightMatch ? `${heightMatch[1]} cm` : 'AB',
      hypLabel: hypMatch ? `${hypMatch[1]} cm` : 'AC',
      showAltitude: text.includes('altitude') || text.includes('perpendicular')
    });

    return {
      visual_type: 'GEOMETRY',
      svg_content: svg,
      alt_text: 'Geometry diagram of right-angled triangle ABC with vertices labeled.',
      is_grayscale: true,
      figure_caption: 'Figure: Right-Angled Triangle ABC',
      answer_dependency: true,
      dimensions: { width: 400, height: 260 }
    };
  }

  // 3. Venn Diagram
  if (
    text.includes('venn diagram') ||
    text.includes('venn') ||
    topic.includes('venn') ||
    qType.includes('venn') ||
    (text.includes('represents') && text.includes('students') && text.includes('both'))
  ) {
    const isThreeSets = text.includes('three') || (text.includes('and') && (text.match(/,/g) || []).length >= 2);
    const svg = generateVennDiagram({
      setA: 'Set A',
      setB: 'Set B',
      setC: isThreeSets ? 'Set C' : undefined,
      shadingRegion: 'INTERSECTION'
    });

    return {
      visual_type: 'VENN',
      svg_content: svg,
      alt_text: 'Venn diagram representing overlapping categorical sets with shaded intersection.',
      is_grayscale: true,
      figure_caption: isThreeSets ? 'Figure: 3-Set Venn Diagram (A, B, C)' : 'Figure: 2-Set Venn Diagram (A ∩ B)',
      answer_dependency: true,
      dimensions: { width: 420, height: isThreeSets ? 320 : 240 }
    };
  }

  // 4. Data Interpretation: Bar Chart / Graph
  if (
    text.includes('bar chart') ||
    text.includes('bar graph') ||
    topic.includes('data interpretation') ||
    subtopic.includes('bar graph') ||
    qType.includes('data_interpretation')
  ) {
    const svg = generateGrayscaleBarChart({
      title: 'Performance & Production Statistics',
      categories: ['2019', '2020', '2021', '2022', '2023'],
      values: [55, 75, 60, 90, 80],
      yAxisLabel: 'Units in Thousands',
      xAxisLabel: 'Fiscal Years'
    });

    return {
      visual_type: 'BAR_CHART',
      svg_content: svg,
      alt_text: 'Data Interpretation bar chart showing production statistics across five fiscal years.',
      is_grayscale: true,
      figure_caption: 'Figure: Production Statistics (in Thousands) 2019-2023',
      answer_dependency: true,
      dimensions: { width: 440, height: 260 }
    };
  }

  // 5. Mirror Image / Non-Verbal Reasoning
  if (
    text.includes('mirror image') ||
    text.includes('water image') ||
    topic.includes('mirror image') ||
    topic.includes('non-verbal')
  ) {
    const symbolMatch = text.match(/mirror image of\s*["']?([A-Za-z0-9\s]+)["']?/i);
    const sym = symbolMatch ? symbolMatch[1].trim() : 'M O C K';

    const svg = generateMirrorPatternDiagram({ symbol: sym });

    return {
      visual_type: 'REASONING_FIGURE',
      svg_content: svg,
      alt_text: `Non-verbal reasoning diagram showing object ${sym} and mirror line MN.`,
      is_grayscale: true,
      figure_caption: 'Figure: Mirror Reflection across Line MN',
      answer_dependency: true,
      dimensions: { width: 380, height: 180 }
    };
  }

  return undefined;
}
