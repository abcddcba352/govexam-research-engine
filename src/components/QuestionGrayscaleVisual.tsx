import React from 'react';
import type { VisualSpecification } from '../types.ts';
import { renderQuestionDiagram } from '../questionDiagrams.ts';

export function QuestionGrayscaleVisual({visual}:{visual?:VisualSpecification}) {
  if(!visual)return null;
  let value=visual;
  try {if(visual.render_spec)value=renderQuestionDiagram(visual.render_spec);}catch{return <p role="alert">Figure data needs correction before printing.</p>;}
  // SVG is an isolated image, never executable markup in the admin document.
  const src=value.svg_content?`data:image/svg+xml;charset=utf-8,${encodeURIComponent(value.svg_content)}`:value.image_url?.startsWith('https://')?value.image_url:undefined;
  if(!src)return null;
  return <figure className="my-3 mx-auto max-w-xl break-inside-avoid rounded-lg border border-neutral-300 bg-white p-3 print:rounded-none print:border-neutral-700 print:p-2" style={{printColorAdjust:'exact',WebkitPrintColorAdjust:'exact'}}>
    <img src={src} alt={value.alt_text||'Question figure'} width={value.dimensions?.width} height={value.dimensions?.height} className="mx-auto block h-auto max-h-80 w-full object-contain grayscale print:max-h-72"/>
    {value.figure_caption&&<figcaption className="mt-1 text-center text-xs text-neutral-700">{value.figure_caption}</figcaption>}
  </figure>;
}
