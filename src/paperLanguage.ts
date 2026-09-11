/** Language subjects retain their own language even in a translated subject paper. */
export function paperQuestionLanguage(mediums:string[],paper:string,subject:string,topic:string):string {
  const content=`${subject} ${topic}`;
  if(/language\s*(?:ii|2)\b|\benglish\b/i.test(content))return 'English';
  const identity=paper||'';
  if(/language\s*(?:i|1)\b/i.test(content))return identity.match(/Language I:\s*([^|]+)/i)?.[1]?.trim()||mediums?.[0]||'English';
  return identity.match(/Medium:\s*([^|]+)/i)?.[1]?.trim()||'English';
}
export function paperLanguageIssues(language:string,text:string):string[] {
  const script=language==='Telugu'?/[\u0c00-\u0c7f]/:language==='Hindi'?/[\u0900-\u097f]/:null;
  return script&&!script.test(text)?[`The ${language} question is missing its required script. Review or regenerate it.`]:[];
}
