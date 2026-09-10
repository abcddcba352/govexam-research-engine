export interface CollectedArticle {
  url: string;
  requested_url?: string;
  title: string;
  text: string;
  publication_date?: string;
  retrieved_at: string;
  content_hash: string;
  matched_topics: string[];
  priority_score: number;
  priority_reasons: string[];
  status: 'REVIEW_REQUIRED' | 'OUTSIDE_WINDOW' | 'NO_SYLLABUS_MATCH';
}

export interface CurrentAffairsEvidence {
  event_date: string;
  publication_date: string;
  source_url: string;
  evidence_snippet: string;
  validated_at?: string;
  content_hash?: string;
}

export function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

/** Preserve the publisher's calendar date; local timezone conversion can shift it backwards. */
export function parsePublicationDate(raw:string|undefined):string|undefined {
  if(!raw) return undefined;
  const iso=raw.match(/\b(20\d{2}-\d{2}-\d{2})(?=T|\b)/)?.[1];
  if(iso) return validDate(iso)?iso:undefined;
  const a=raw.match(/\b(\d{1,2})\s+([A-Za-z]{3,9})[\s,]+(20\d{2})\b/);
  const b=raw.match(/\b([A-Za-z]{3,9})\s*,?\s*(\d{1,2})\s*,\s*(20\d{2})\b/);
  if(!a&&!b) return undefined;
  const day=a?.[1]||b![2], monthName=a?.[2]||b![1], year=a?.[3]||b![3];
  const month=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'].indexOf(monthName.toLowerCase().slice(0,3))+1;
  const date=`${year}-${String(month).padStart(2,'0')}-${day.padStart(2,'0')}`;
  return month&&validDate(date)?date:undefined;
}

export const normalize = (text: string) => text.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

/** Registered broad sections supplement curated subtopics, without inventing exam coverage. */
export function currentAffairsTopics(exam:{syllabus_topics:string[];pattern?:{sections?:string[]}}):string[] {
  const broad=(exam.pattern?.sections||[]).flatMap(section=>{
    const match=section.trim().match(/^(Current Affairs|General Awareness|General Knowledge)(?:\s*\(|$)/i);
    return match ? [match[1]] : [];
  });
  return [...new Set([...exam.syllabus_topics,...broad])];
}

// Explicit topic vocabulary helps match headlines without a model call.
// These are relevance hints; they cannot authenticate a claim or its answer.
const TOPIC_VOCABULARY: Array<[RegExp,RegExp]> = [
  [/science|technology|scientific/, /\b(isro|satellites?|space|gaganyaan|launch|biotechnology|semiconductor|artificial intelligence)\b/],
  [/econom|banking|finance/, /\b(rbi|inflation|gdp|monetary|fiscal|banking|financial|budget|employment)\b/],
  [/environment|ecolog|biodiversity/, /\b(climate|carbon|wildlife|forests?|biodiversity|conservation|pollution)\b/],
  [/polity|constitution|governance/, /\b(constitution|parliament|elections?|panchayat|governance|legislation)\b/],
  [/history|culture|heritage/, /\b(archaeology|heritage|museums?|monuments?|classical|inscriptions?)\b/],
  [/geography/, /\b(rivers?|cyclones?|monsoon|earthquakes?|oceans?|glaciers?)\b/],
];

// This is an editorial research priority, never a probability of appearing in an exam.
export function rankArticle(text: string, topics: string[], publicationDate: string | undefined, cutoff: string) {
  const normalizedText = normalize(text);
  const words = new Set(normalizedText.split(' '));
  const matched = topics.filter(topic => {
    const normalizedTopic=normalize(topic);
    if (/^(?:current affairs|general awareness|general knowledge)$/.test(normalizedTopic)) return true;
    // Broad subject vocabulary must not stand in for a specific subtopic.
    const broadTopic=!topic.includes(':') && normalizedTopic.split(' ').length<=4;
    if (broadTopic && TOPIC_VOCABULARY.some(([category,terms])=>category.test(normalizedTopic)&&terms.test(normalizedText))) return true;
    const specificTopic=topic.includes(':') ? topic.slice(topic.indexOf(':')+1) : topic;
    const tokens = [...new Set(normalize(specificTopic).split(' ').filter(w => w.length > 3 &&
      !['with', 'from', 'current', 'affairs', 'general', 'other', 'their'].includes(w)))];
    return tokens.length > 0 && tokens.filter(t => words.has(t)).length >= Math.min(2, tokens.length) &&
      tokens.filter(t => words.has(t)).length / tokens.length >= 0.5;
  });
  const age = validDate(publicationDate) && validDate(cutoff) ? (Date.parse(cutoff) - Date.parse(publicationDate)) / 86400000 : null;
  const outside = age !== null && (age < 0 || age > 366);
  const broadOnly=matched.length>0 && matched.every(t=>/^(?:current affairs|general awareness|general knowledge)$/.test(normalize(t)));
  const routineRelease=/\b(?:variable rate reverse repo|vrrr)\b.{0,100}\bauction\b/i.test(text.slice(0,350));
  const reasons = [matched.length ? `Syllabus match: ${matched.join('; ')}` : 'No matching topic in this paper’s syllabus.'];
  if (age === null) reasons.push('Publication date is missing: review before use.');
  else if (outside) reasons.push('Publication falls outside the one-year preparation window.');
  else reasons.push(`Published ${age} days before the selected cutoff.`);
  reasons.push('Retrieved from an allowed primary publisher. Event date and answer still require validation.');
  if(routineRelease) reasons.push('Recurring operational auction release: lower research priority than a policy or syllabus development.');
  if(broadOnly) reasons.push('Broad section match only: specific topic relevance needs review.');
  return {
    matched_topics: matched,
    priority_score: !matched.length || outside ? 0 : Math.min(broadOnly?45:100,30 + Math.min(40, matched.length * 20) +
      (age === null ? 0 : age <= 30 ? 20 : age <= 90 ? 15 : age <= 180 ? 10 : 5)) - (routineRelease ? 25 : 0),
    priority_reasons: reasons,
    status: (outside ? 'OUTSIDE_WINDOW' : !matched.length ? 'NO_SYLLABUS_MATCH' : 'REVIEW_REQUIRED') as CollectedArticle['status'],
  };
}

export function checkCurrentAffairsDates(evidence: CurrentAffairsEvidence | undefined, cutoff: string | undefined): string[] {
  const errors: string[] = [];
  if (!validDate(cutoff)) errors.push('A valid paper cutoff date is required.');
  if (!evidence || !validDate(evidence.event_date)) errors.push('A verified event date is required.');
  if (!evidence || !validDate(evidence.publication_date)) errors.push('A source publication date is required.');
  if (evidence && validDate(cutoff)) {
    if (validDate(evidence.event_date) && evidence.event_date > cutoff) errors.push('Event occurred after the paper cutoff.');
    if (validDate(evidence.publication_date) && evidence.publication_date > cutoff) errors.push('Source was published after the paper cutoff.');
    if (validDate(evidence.event_date) && validDate(evidence.publication_date) && evidence.event_date > evidence.publication_date)
      errors.push('A planned future event cannot be treated as a completed event.');
  }
  return errors;
}
