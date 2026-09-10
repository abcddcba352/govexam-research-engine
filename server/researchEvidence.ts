import type { CriticalFactName, ExamIdentification, ResearchFact, ResearchMode, SourceTrustLevel } from '../src/types.ts';
import { CRITICAL_EXAM_FACTS } from '../src/types.ts';

export interface RetrievedResearchSource {
  url: string;
  name: string;
  content: string;
  level: SourceTrustLevel;
  is_official_mirror?: boolean;
}

export const normalizeEvidence = (text: string): string => text.normalize('NFKC').toLowerCase()
  .replace(/&amp;/g, '&').replace(/&/g, ' and ').replace(/[^a-z0-9/]+/g, ' ').trim();

export function paperNumber(text: string): string | undefined {
  const token = text.match(/\b(?:paper|tier|stage)\s*[-–—:]?\s*(iii|ii|iv|i|[1-4])\b/i)?.[1]?.toLowerCase();
  return token ? ({ i: '1', ii: '2', iii: '3', iv: '4' }[token] || token) : undefined;
}

export function cycleNumber(text: string): string | undefined {
  const notif = text.match(/\b(?:notification\s*(?:no\.?\s*)?)?(\d{1,3}\s*\/\s*20\d{2})\b/i)?.[1]?.replace(/\s/g, '');
  if (notif) return notif;
  const year = text.match(/\b(20\d{2}(?:-\d{2,4})?)\b/)?.[1];
  return year;
}

export function containsIdentity(content: string, id: ExamIdentification): boolean {
  const normalized = normalizeEvidence(content);
  const target = (id.post && !/unknown|not specified/i.test(id.post)) ? id.post : id.exam;
  const identity = normalizeEvidence(target)
    .replace(/\b(appsc|tgpsc|tspsc|ssc|upsc|rrb|examination|exam|tier|paper|stage|notification|grade)\b/g, '')
    .trim();
  const tokens = identity.split(/\s+/).filter(t => t.length > 2 && !['the', 'and', 'for', 'with', 'grade', 'iii', 'all'].includes(t));
  const cycle = cycleNumber(id.recruitment_cycle);
  const tokensMatch = tokens.length >= 2 ? tokens.every(t => normalized.split(' ').includes(t)) : (tokens.length === 1 && normalized.includes(tokens[0]));
  const isSyllabusOrScheme = /scheme|syllabus|annexure|curriculum/i.test(normalized);
  const cycleYear = cycle ? (cycle.includes('/') ? cycle.split('/')[1] : cycle.slice(0, 4)) : undefined;
  const cycleMatch = !cycle || normalized.includes(cycle) || (cycle.includes('-') && normalized.includes(cycle.split('-')[0])) || (cycleYear ? normalized.includes(cycleYear) : false) || isSyllabusOrScheme;
  return tokensMatch && cycleMatch;
}

/** Check if document text contains authentic commission headers and scheme structures */
export function isAuthenticOfficialDocument(text: string, id: ExamIdentification): boolean {
  if (!text || text.length < 150) return false;
  const norm = normalizeEvidence(text);
  
  const comm = normalizeEvidence(id.commission || '');
  const hasAuthority = norm.includes(comm) ||
    (comm.includes('staff selection') && (norm.includes('staff selection commission') || norm.includes('ssc'))) ||
    (comm.includes('telangana') && (norm.includes('telangana public service') || norm.includes('tgpsc') || norm.includes('tspsc'))) ||
    (comm.includes('andhra pradesh') && (norm.includes('andhra pradesh public service') || norm.includes('appsc') || norm.includes('psc ap gov in'))) ||
    (comm.includes('union public') && (norm.includes('union public service') || norm.includes('upsc'))) ||
    (comm.includes('railway') && (norm.includes('railway recruitment') || norm.includes('rrb')));

  if (!hasAuthority) return false;

  const hasOfficialNoticeMarkers = /scheme of (?:the )?examination|scheme of (?:tier|stage|paper)|scheme and syllabus|annexure\s*[-–—:]?\s*(?:i{1,3}|iv|[1-4])|tentative schedule of tier|computer based (?:recruitment )?(?:examination|test)|notice combined graduate|notification no\b/i.test(text);

  if (!hasOfficialNoticeMarkers) return false;

  return containsIdentity(text, id);
}

const aliases: Record<string, CriticalFactName> = {
  'authority': 'authority', 'commission': 'authority', 'official commission authority': 'authority',
  'exam name': 'exam_name', 'exam_name': 'exam_name', 'recruitment cycle': 'recruitment_cycle',
  'stage tier': 'stage_tier', 'stage': 'stage_tier', 'paper': 'paper', 'paper scope': 'paper',
  'question count': 'question_count', 'total questions': 'question_count', 'duration': 'duration',
  'marks': 'marks', 'total marks': 'marks', 'negative marking': 'negative_marking',
  'negative marking rule': 'negative_marking', 'language rules': 'language_rules',
  'section structure': 'section_structure', 'syllabus version': 'syllabus_version',
};

export function factKey(fact: ResearchFact): CriticalFactName | undefined {
  if (fact.critical_field && CRITICAL_EXAM_FACTS.includes(fact.critical_field)) return fact.critical_field;
  return aliases[normalizeEvidence(fact.fact)];
}

export function explicitNumber(key: CriticalFactName, evidence: string): number | undefined {
  const t = normalizeEvidence(evidence);
  const expressions: Partial<Record<CriticalFactName, RegExp[]>> = {
    question_count: [
      /\b(\d+)\s+(?:objective\s+)?questions\b/,
      /\b(?:total questions|question count)\s+(\d+)\b/,
      /\btotal\s+(?:no\.?\s*of\s*)?questions\s*[:=]?\s*(\d+)\b/,
      /\b(\d+)\s+(?:multiple choice questions|mcqs)\b/
    ],
    duration: [
      /\b(\d+)\s+(?:minutes|mins)\b/,
      /\bduration\s+(\d+)\b/,
    ],
    marks: [
      /\b(\d+)\s+(?:total |maximum )?marks\b/,
      /\b(?:total marks|maximum marks|marks)\s*[:=]?\s*(\d+)\b/,
    ],
  };

  if (key === 'duration') {
    const hrMatch = t.match(/\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?)\b/);
    if (hrMatch && Number(hrMatch[1]) > 0) {
      return Math.round(Number(hrMatch[1]) * 60);
    }
  }

  if (key === 'question_count') {
    const tableMatch = t.match(/scheme of (?:tier|stage|paper)\s*[-–—:]?\s*(?:i{1,3}|iv|[1-4])\b[\s\S]*?(?:scheme of (?:tier|stage|paper)\s*[-–—:]?\s*(?:ii|iii|iv|2|3|4)|$)/i);
    const scope = tableMatch ? tableMatch[0] : t;
    const subMatches = [...scope.matchAll(/\b(?:general intelligence|reasoning|general awareness|general studies|quantitative aptitude|mathematics|english comprehension|arithmetic)[^\d]{0,40}(\d{2})\b/g)];
    if (subMatches.length >= 3) {
      const sum = subMatches.reduce((acc, m) => acc + Number(m[1]), 0);
      if (sum >= 75) return sum;
    }
  }

  if (key === 'marks') {
    const tableMatch = t.match(/scheme of (?:tier|stage|paper)\s*[-–—:]?\s*(?:i{1,3}|iv|[1-4])\b[\s\S]*?(?:scheme of (?:tier|stage|paper)\s*[-–—:]?\s*(?:ii|iii|iv|2|3|4)|$)/i);
    const scope = tableMatch ? tableMatch[0] : t;
    const subMatches = [...scope.matchAll(/\b(?:general intelligence|reasoning|general awareness|general studies|quantitative aptitude|mathematics|english comprehension|arithmetic)[^\d]{0,40}\d{2}\s+(\d{2,3})\b/g)];
    if (subMatches.length >= 3) {
      const sum = subMatches.reduce((acc, m) => acc + Number(m[1]), 0);
      if (sum >= 150) return sum;
    }
  }

  if (key === 'negative_marking') {
    if (!/negative|wrong answer|penalt|deduct/.test(t)) return undefined;
    if (/no negative|no penalty|zero penalty/.test(t)) return 0;
    if (/1\/3|one third/.test(t)) return 0.33;
    if (/1\/4|one fourth/.test(t)) return 0.25;
    if (/1\/2|one half/.test(t)) return 0.5;
    const decimal = t.match(/(?:negative|wrong answer|deduct(?:ion)?|penalt(?:y)?)[^\d]{0,25}(0[\.\s]\d{1,2})/);
    if (decimal) return Number(decimal[1].replace(/\s+/, '.'));
    const decimalAfter = t.match(/(0[\.\s]\d{1,2})\s*(?:marks?|penalty)?\s*(?:negative|for each wrong)/);
    if (decimalAfter) return Number(decimalAfter[1].replace(/\s+/, '.'));
    return undefined;
  }

  for (const expression of expressions[key] || []) {
    const match = t.match(expression);
    if (match && Number(match[1]) > 0) return Number(match[1]);
  }
  return undefined;
}

/** A URL, model confidence, or model-authored verification label is not evidence. */
export function validateResearchFact(
  candidate: Partial<ResearchFact>, sources: RetrievedResearchSource[], id: ExamIdentification, mode: ResearchMode,
): ResearchFact {
  const source = sources.find(s => s.url === candidate.source_url);
  const quote = candidate.evidence_text || candidate.evidence_snippet || '';
  const fact: ResearchFact = {
    fact: String(candidate.fact || 'Source discovery'), value: String(candidate.value || ''),
    source_url: source?.url || String(candidate.source_url || ''), source_title: source?.name || 'Unverified source',
    source_domain: '', source_level: source?.level || 'LEVEL_1_DISCOVERY',
    publication_date: candidate.publication_date || 'Unknown', retrieved_at: new Date().toISOString(),
    is_current: false, confidence: 0, research_mode: mode, verification_status: 'UNVERIFIED',
    critical_field: candidate.critical_field, evidence_text: quote, evidence_snippet: quote,
    evidence_validated: false,
  };
  try { fact.source_domain = new URL(fact.source_url).hostname; } catch {}
  const key = factKey(fact);
  const isDirectOfficial = source && (source.level === 'LEVEL_5_OFFICIAL' || source.level === 'LEVEL_4_GOVERNMENT');
  const isMirrorOfficial = source && (Boolean(source.is_official_mirror) || isAuthenticOfficialDocument(source.content, id));
  if (!source || (!isDirectOfficial && !isMirrorOfficial) || !key || quote.trim().length < 20 ||
      !normalizeEvidence(source.content).includes(normalizeEvidence(quote)) || !containsIdentity(source.content, id)) return fact;

  if (!isDirectOfficial && isMirrorOfficial) {
    fact.source_title = `${source.name || source.url} (Official Commission Mirror)`;
  }

  const paper = paperNumber(id.paper);
  if (key === 'negative_marking' && paper && paperNumber(quote) && paperNumber(quote) !== paper) return fact;
  const paperSpecific = ['question_count', 'duration', 'marks', 'paper', 'language_rules', 'section_structure', 'syllabus_version'].includes(key);
  if (paperSpecific && paper && paperNumber(quote) && paperNumber(quote) !== paper) return fact;
  if (['question_count', 'duration', 'marks', 'negative_marking'].includes(key)) {
    const value = explicitNumber(key, quote);
    if (value === undefined) return fact;
    fact.value = String(value);
  } else {
    // Only retain the actual source excerpt, never a synthesized claim unsupported by it.
    fact.value = quote;
    const text = normalizeEvidence(quote);
    if (key === 'authority') {
      const comm = normalizeEvidence(id.commission).replace(/\s*\((?:ssc|upsc|rrb|appsc|tgpsc|tspsc)\)|\s+(?:ssc|upsc|rrb|appsc|tgpsc|tspsc)$/ig, '').trim();
      if (!text.includes(comm) && !text.includes(normalizeEvidence(id.commission))) return fact;
    }
    if (key === 'exam_name' && !containsIdentity(quote, id)) return fact;
    if (key === 'recruitment_cycle') {
      const qCycle = cycleNumber(quote);
      const idCycle = cycleNumber(id.recruitment_cycle);
      if (qCycle && idCycle) {
        const qYear = qCycle.includes('/') ? qCycle.split('/')[1] : qCycle.slice(0, 4);
        const idYear = idCycle.includes('/') ? idCycle.split('/')[1] : idCycle.slice(0, 4);
        if (qYear !== idYear && qCycle !== idCycle) return fact;
      }
    }
    if (key === 'stage_tier' && !/written examination|screening test|preliminary examination|mains examination|computer based examination|tier\s*[-–—:]?\s*(?:i{1,3}|iv|[1-4])/i.test(quote)) return fact;
    if (key === 'language_rules' && !/medium|bilingual|language|english\s*(?:and|&)\s*hindi/i.test(quote)) return fact;
    if (['section_structure', 'syllabus_version'].includes(key) && !/syllabus|sections|curriculum|scheme\s+of\s+(?:the\s+)?examination/i.test(quote)) return fact;
  }
  return { ...fact, critical_field: key, evidence_validated: true, verification_status: 'VERIFIED_OFFICIAL', confidence: 95 };
}

/** Extract explicit statements, scheme tables, and syllabus without Gemini. */
export function extractDirectFacts(sources: RetrievedResearchSource[], id: ExamIdentification, mode: ResearchMode): ResearchFact[] {
  const facts: ResearchFact[] = [];

  function findExcerpt(text: string, regex: RegExp): string | null {
    const m = text.match(regex);
    if (!m || m.index === undefined) return null;
    const start = Math.max(0, text.lastIndexOf('\n', m.index));
    let end = text.indexOf('\n', m.index + m[0].length);
    if (end === -1 || end - start < 30) end = Math.min(text.length, m.index + m[0].length + 60);
    const line = text.slice(start, end).replace(/\s+/g, ' ').trim();
    return line.length >= 20 ? line : null;
  }

  for (const source of sources) {
    const isDirectOfficial = source.level === 'LEVEL_5_OFFICIAL' || source.level === 'LEVEL_4_GOVERNMENT';
    const isMirrorOfficial = Boolean(source.is_official_mirror) || isAuthenticOfficialDocument(source.content, id);
    if (!isDirectOfficial && !isMirrorOfficial) continue;

    // 1. Table row check: (Paper-I ... Questions Duration Marks)
    // E.g.: "Paper-I: General Studies and General Abilities 150 150 150"
    const pNum = paperNumber(id.paper) || '1';
    const paperPattern = new RegExp(`(?:Paper|Tier|Stage)\\s*[-–—:]?\\s*(?:I{1,3}|IV|${pNum})[^\\d\\n\\r]{0,80}\\s+(\\d{2,3})\\s+(\\d{2,3})\\s+(\\d{2,3})`, 'i');
    const tableMatch = source.content.match(paperPattern);
    if (tableMatch) {
      const quote = tableMatch[0].replace(/\s+/g, ' ').trim();
      const qCount = Number(tableMatch[1]);
      const dur = Number(tableMatch[2]);
      const mrk = Number(tableMatch[3]);
      const tableFacts: Array<[CriticalFactName, number]> = [
        ['question_count', qCount],
        ['duration', dur],
        ['marks', mrk],
      ];
      for (const [k, v] of tableFacts) {
        if (!facts.some(f => f.critical_field === k)) {
          const f = validateResearchFact({ fact: k.replace(/_/g, ' '), critical_field: k, source_url: source.url,
            evidence_text: quote, value: String(v) }, sources, id, mode);
          if (f.evidence_validated) facts.push(f);
        }
      }
    }

    // 2. Keep each paper/tier's statements separate, including when several share a document.
    const excerpts = source.content.split(/(?=\b(?:Paper|Tier|Stage)\s*[-–—:]?\s*(?:III|II|IV|I|[1-4])\b)/i);
    for (const excerpt of excerpts) {
      for (const key of ['question_count', 'duration', 'marks', 'negative_marking'] as CriticalFactName[]) {
        if (facts.some(f => f.critical_field === key)) continue;
        if (explicitNumber(key, excerpt) === undefined) continue;
        const fact = validateResearchFact({ fact: key.replace(/_/g, ' '), critical_field: key, source_url: source.url,
          evidence_text: excerpt, value: '' }, sources, id, mode);
        if (fact.evidence_validated && !facts.some(f => f.critical_field === key)) facts.push(fact);
      }
    }

    // 3. Document-level negative marking if not yet resolved
    if (!facts.some(f => f.critical_field === 'negative_marking')) {
      const neg = explicitNumber('negative_marking', source.content);
      if (neg !== undefined) {
        const m = source.content.match(/(?:negative|wrong answer|deduct|penalt)[^\n\r.]{0,80}/i);
        const quote = m ? m[0].replace(/\s+/g, ' ').trim() : `Negative marking rate: ${neg}`;
        if (quote.length >= 20) {
          const fact = validateResearchFact({ fact: 'negative marking', critical_field: 'negative_marking',
            source_url: source.url, evidence_text: quote, value: String(neg) }, sources, id, mode);
          if (fact.evidence_validated) facts.push(fact);
        }
      }
    }
  }
  return facts;
}

/** Extract official document structure and scheme excerpts for universal discovery. */
export function extractDocumentSchemeFacts(sources: RetrievedResearchSource[], id: ExamIdentification, mode: ResearchMode): ResearchFact[] {
  const facts: ResearchFact[] = [];

  function findExcerpt(text: string, regex: RegExp): string | null {
    const m = text.match(regex);
    if (!m || m.index === undefined) return null;
    const start = Math.max(0, text.lastIndexOf('\n', m.index));
    let end = text.indexOf('\n', m.index + m[0].length);
    if (end === -1 || end - start < 30) end = Math.min(text.length, m.index + m[0].length + 60);
    const line = text.slice(start, end).replace(/\s+/g, ' ').trim();
    return line.length >= 20 ? line : null;
  }

  for (const source of sources) {
    const isDirectOfficial = source.level === 'LEVEL_5_OFFICIAL' || source.level === 'LEVEL_4_GOVERNMENT';
    const isMirrorOfficial = Boolean(source.is_official_mirror) || isAuthenticOfficialDocument(source.content, id);
    if (!isDirectOfficial && !isMirrorOfficial) continue;

    const fieldPatterns: Partial<Record<CriticalFactName, RegExp>> = {
      authority: /(?:TELANGANA|ANDHRA\s+PRADESH|STAFF\s+SELECTION|UNION\s+PUBLIC|RAILWAY\s+RECRUITMENT)[^\n\r.]{5,80}(?:COMMISSION|BOARD)/i,
      exam_name: /(?:POST\s+OF\s+[^\n\r,]{5,100}|RECRUITMENT\s+TO\s+(?:THE\s+POST\s+OF\s+)?[^\n\r,]{5,100}|EXAMINATION\s+FOR\s+[^\n\r,]{5,100})/i,
      recruitment_cycle: /(?:Notification\s+No\.?|Notice\s+No\.?|Advt\s+No\.?)\s*[:\-–—]?\s*[A-Za-z0-9\-_/]+[^\n\r.]{0,60}/i,
      stage_tier: /(?:WRITTEN\s+EXAMINATION\s*\([^)]+\)|COMPUTER\s+BASED\s+(?:RECRUITMENT\s+)?(?:EXAMINATION|TEST)\s*(?:\([^)]+\))?|SCREENING\s+TEST\s*(?:\([^)]+\))?|TIER\s*[-–—:]?\s*(?:I{1,3}|IV|[1-4])\s*(?:EXAMINATION)?|MAINS?\s+EXAMINATION\s*(?:\([^)]+\))?)/i,
      paper: /(?:Paper|Tier|Stage)\s*[-–—:]?\s*(?:III|II|IV|I|[1-4])\s*[:\-–—]?\s*[^\n\r,;]{5,100}/i,
      language_rules: /(?:Bilingual[^\n\r.]{0,80}|English\s+(?:and|&)\s+(?:Telugu|Hindi|Urdu)|Medium\s+of\s+(?:the\s+)?(?:Question\s*Paper|Examination)[^\n\r.]{5,80})/i,
      section_structure: /(?:Scheme\s+of\s+(?:the\s+)?Examination[^\n\r.]{15,250}|Annexure\s*[-–—:]?\s*(?:I{1,3}|II|III|IV|[1-4])[^\n\r.]{15,250}|Sections?\s*[:\-–—][^\n\r.]{15,250})/i,
      syllabus_version: /(?:Syllabus\s+for\s+[^\n\r.]{15,200}|Prescribed\s+Syllabus[^\n\r.]{15,200}|Annexure\s*[-–—:]?\s*(?:I{1,3}|II|III|IV|[1-4])\s*[:\-–—]?\s*(?:Scheme\s+and\s+)?Syllabus[^\n\r.]{10,200})/i,
    };

    for (const [key, regex] of Object.entries(fieldPatterns) as [CriticalFactName, RegExp][]) {
      if (facts.some(f => f.critical_field === key)) continue;
      const quote = findExcerpt(source.content, regex);
      if (!quote) continue;
      const fact = validateResearchFact({
        fact: key.replace(/_/g, ' '),
        critical_field: key,
        source_url: source.url,
        evidence_text: quote,
        value: quote
      }, sources, id, mode);
      if (fact.evidence_validated && !facts.some(f => f.critical_field === key)) {
        facts.push(fact);
      }
    }
  }
  return facts;
}
