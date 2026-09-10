import fs from 'node:fs';
import { discoverCurrentAffairs } from '../autonomousResearch.ts';
const result=await discoverCurrentAffairs({exam_id:'collection-probe',syllabus_topics:['Science and Technology','Economy','Environment','Current Affairs']} as any,new Date().toISOString().slice(0,10));
const report={...result,articles:result.articles.map(a=>({...a,text:a.text.slice(0,180)}))};
fs.mkdirSync('work',{recursive:true});fs.writeFileSync('work/autonomous-research-live.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report));
