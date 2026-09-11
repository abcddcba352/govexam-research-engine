import type { ExamStructureScheme, ExamStagePaper } from '../src/types.ts';

export function isTelanganaTet(query:string) {
  return /\b(?:tg\s*[- ]?\s*tet|ts\s*[- ]?\s*tet|telangana.*(?:\btet\b|teacher eligibility))\b/i.test(query);
}

/** Historical starting structure; never verification of a newly requested cycle. */
export function telanganaTetScheme(query:string):ExamStructureScheme {
  const language1=['Telugu','Urdu','Hindi','Kannada','Marathi','Tamil','Gujarati','Bengali'];
  const paper2Languages=['Telugu','Urdu','Hindi','Kannada','Marathi','Tamil','Sanskrit'];
  const common=['Child Development and Pedagogy','Language I','Language II (English)'];
  const make=(id:string,title:string,sections:string[],languages:string[]):ExamStagePaper=>({
    paper_id:id,paper_number:id.endsWith('_1')?'Paper-I':'Paper-II',title,type:'OBJECTIVE',
    total_questions:150,total_marks:150,duration_minutes:150,negative_marking_rate:0,
    language_i_options:languages,language_ii:'English',language_mediums:['Telugu','Hindi','Urdu','Kannada','Marathi','Tamil','English'],
    sections:[...common,...sections],syllabus_reference:'https://tgtet.aptonline.in/UI/HomePage/Syllabus.aspx',
  });
  const papers=[make('tg_tet_1','Paper I: Classes I–V',['Mathematics','Environmental Studies'],language1),
    make('tg_tet_2_maths','Paper II: Mathematics and Science',['Mathematics and Science'],paper2Languages),
    make('tg_tet_2_social','Paper II: Social Studies',['Social Studies'],paper2Languages)];
  return {query,exam_name:'Telangana Teacher Eligibility Test (TG TET)',commission:'Department of School Education, Telangana',
    state_or_central:'Telangana',recruitment_cycle:'January 2026 reference; confirm requested session',total_stages:1,
    selection_summary:'Choose one paper variant. Paper I and Paper II are teaching-level alternatives, not sequential selection stages. Language II is English.',
    official_reference:'https://tgtet.aptonline.in/Documents/Information%20Bulletin-TGTET-JANUARY-2026.pdf',
    source_status:'REVIEW_REQUIRED',discovery_notes:['Historical structure only. Fetch and review the selected session’s syllabus and medium rules before generation. Section headings are not the complete syllabus.'],
    stages:[{stage_id:'tg_tet_written',stage_number:1,stage_name:'Teacher eligibility examination',stage_type:'MAINS',total_papers:3,papers}]};
}
