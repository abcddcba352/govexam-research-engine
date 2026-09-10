import { jurisdictionMatches,subjectsForExam,type SubjectId } from '../src/researchCoverage.ts';
import type { ExamRecord } from '../src/types.ts';
export interface SubjectPublisher {
  jurisdiction?:'Andhra Pradesh'|'Telangana';
  id:string; name:string; url:string; subjects:SubjectId[];
  mode:'FEED'|'ICC_NEWS'|'REFERENCE'|'UNAVAILABLE'; kind:'CURRENT'|'REFERENCE';
  refresh_hours:number; note:string; title_filter?:RegExp;
}
export const SUBJECT_PUBLISHERS:SubjectPublisher[]=[
  {id:'icc',name:'ICC cricket news',url:'https://www.icc-cricket.com/news',subjects:['sports'],mode:'ICC_NEWS',kind:'CURRENT',refresh_hours:12,note:'Cricket only. Results, records and rankings need event/category checks.'},
  {id:'fide',name:'FIDE chess news',url:'https://www.fide.com/feed/',subjects:['sports'],mode:'FEED',kind:'CURRENT',refresh_hours:12,note:'Chess only. A preview is not a completed tournament result.'},
  {id:'pmindia-schemes',name:'PM India scheme announcements',url:'https://www.pmindia.gov.in/en/feed/?s=scheme&post_type=news_updates',subjects:['schemes'],mode:'FEED',kind:'CURRENT',refresh_hours:12,title_filter:/scheme|yojana|welfare|beneficiar|cabinet|programme|program|project/i,note:'Announcements need comparison with department guidelines.'},
  {id:'pmkisan',name:'PM-KISAN scheme portal',url:'https://www.pmkisan.gov.in/',subjects:['schemes'],mode:'REFERENCE',kind:'REFERENCE',refresh_hours:168,note:'Reference description and exclusions; effective version must be verified.'},
  {id:'pib',name:'PIB releases',url:'https://www.pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=1&reg=1',subjects:['schemes','science','economy','environment','polity','international'],mode:'FEED',kind:'CURRENT',refresh_hours:6,note:'Only subjects supported by article terms are assigned.'},
  {id:'isro',name:'ISRO press releases',url:'https://www.isro.gov.in/Press.html',subjects:['science'],mode:'FEED',kind:'CURRENT',refresh_hours:24,note:'Space science coverage only.'},
  {id:'rbi',name:'RBI press releases',url:'https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx?prid=',subjects:['economy'],mode:'FEED',kind:'CURRENT',refresh_hours:12,note:'Routine operational notices receive lower priority.'},
  {id:'india-geography',name:'National Portal: physical geography',url:'https://www.india.gov.in/explore-india/facts-of-india/physical-background/physical-features',subjects:['geography'],mode:'REFERENCE',kind:'REFERENCE',refresh_hours:168,note:'Physical features reference; individual facts still require review.'},
  {id:'telangana-profile',name:'Telangana state profile',url:'https://www.telangana.gov.in/about/state-profile/',subjects:['state','history','geography'],jurisdiction:'Telangana',mode:'REFERENCE',kind:'REFERENCE',refresh_hours:168,note:'Formation and state profile. Census/statistical reference years must be checked.'},
  {id:'ap-district-profile',name:'AP: Vizianagaram district profile',url:'https://vizianagaram.ap.gov.in/about-district/',subjects:['state','history','geography'],jurisdiction:'Andhra Pradesh',mode:'REFERENCE',kind:'REFERENCE',refresh_hours:168,note:'One district only; historical boundaries and administrative claims need version checks.'},
  {id:'myscheme',name:'myScheme discovery',url:'https://www.myscheme.gov.in/',subjects:['schemes'],mode:'UNAVAILABLE',kind:'REFERENCE',refresh_hours:168,note:'Public page does not expose usable scheme records to this extractor. Department sources are used instead.'},
  {id:'ncert',name:'NCERT educational resources',url:'https://ncert.nic.in/ebooks.php',subjects:['history','geography','science','math','english'],mode:'UNAVAILABLE',kind:'REFERENCE',refresh_hours:168,note:'Chapter/edition extraction adapter still required; catalogue links do not count as textbook evidence.'},
  {id:'india-code',name:'India Code',url:'https://indiacode.gov.in/',subjects:['polity','specialist'],mode:'UNAVAILABLE',kind:'REFERENCE',refresh_hours:168,note:'Act, section and amendment version extraction still required.'},
];
export const getSubjectPublisher=(id:string)=>SUBJECT_PUBLISHERS.find(p=>p.id===id);
export const publisherApplies=(publisher:SubjectPublisher,exam:ExamRecord)=>jurisdictionMatches(exam,publisher.jurisdiction)&&publisher.subjects.some(s=>subjectsForExam(exam).includes(s));
