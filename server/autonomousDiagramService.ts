import type { MockQuestion, VisualSpecification } from '../src/types.ts';
import { renderQuestionDiagram } from '../src/questionDiagrams.ts';

/** Legacy callers require explicit given data. Keywords never supply missing values. */
export function detectAndGenerateDiagram(question:Partial<MockQuestion>):VisualSpecification|undefined {
  const spec=question.visual_specification?.render_spec;
  if(!spec)return undefined;
  try{return renderQuestionDiagram(spec,question.question_text||'');}catch{return undefined;}
}