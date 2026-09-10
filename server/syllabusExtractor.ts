/**
 * Official Notification Syllabus & Structure Extraction Engine
 * Parses gazetted government notifications, PDF extracts, and scheme documents
 * into verified syllabus topics, section hierarchies, exam patterns, and stage papers.
 */

import type { ExamStage } from '../src/types.ts';

export interface ExtractedNotificationScheme {
  authority?: string;
  exam_name?: string;
  notification_number?: string;
  recruitment_cycle?: string;
  stages: ExamStage[];
  primary_stage_name?: string;
  primary_paper_name?: string;
  pattern: {
    total_questions: number;
    duration_minutes: number;
    total_marks: number;
    marks_per_question: number;
    negative_marking_rate: number;
    sections: string[];
    mediums: string[];
  };
  syllabus_topics: string[];
  detailed_syllabus: Record<string, string[]>;
  raw_syllabus_excerpt: string;
  confidence: number;
  is_official_gazette: boolean;
}

/**
 * Cleans an extracted topic line removing enumeration prefixes and noise
 */
export function cleanTopicString(raw: string): string {
  let cleaned = raw.replace(/\r/g, '').trim();
  // Remove bullet numbers like '1.', '1)', '(1)', '1 -', 'A.', '(a)', '(i)', 'i.'
  cleaned = cleaned.replace(/^(\(?\d{1,2}\)?|\(?[a-z]\)|\(?[ivx]+\))[.\-–—:\s]+/i, '').trim();
  // Remove markdown list markers
  cleaned = cleaned.replace(/^[*•-]\s*/, '').trim();
  // Remove trailing dots or colons
  cleaned = cleaned.replace(/[:.\s]+$/, '').trim();
  return cleaned;
}

/**
 * Checks whether text contains authentic government recruitment gazette markers
 */
export function isOfficialGazetteText(text: string): boolean {
  if (!text || text.length < 80) return false;
  const t = text.toLowerCase();
  const gazetteMarkers = [
    'telangana state level police recruitment board',
    'tslprb',
    'tgprb',
    'telangana public service commission',
    'tgpsc',
    'tspsc',
    'andhra pradesh public service commission',
    'appsc',
    'staff selection commission',
    'ssc.gov.in',
    'union public service commission',
    'upsc.gov.in',
    'railway recruitment board',
    'registered no',
    'published by authority',
    'the telangana gazette',
    'the andhra pradesh gazette',
    'the gazette of india',
    'extraordinary',
    'notification no',
    'rc no',
    'advt no',
    'notice combined graduate',
    'scheme of examination',
    'annexure - ii',
    'annexure-ii',
    'annexure - i',
    'annexure-i'
  ];
  return gazetteMarkers.some(m => t.includes(m));
}

/**
 * Identifies the recruiting authority from document text
 */
export function extractAuthorityFromText(text: string): string | undefined {
  const t = text.toLowerCase();
  if (t.includes('telangana state level police recruitment board') || t.includes('tslprb') || t.includes('tgprb') || (t.includes('police recruitment') && t.includes('telangana'))) {
    return 'Telangana State Level Police Recruitment Board (TSLPRB)';
  }
  if (t.includes('telangana public service commission') || t.includes('tgpsc') || t.includes('tspsc')) {
    return 'Telangana Public Service Commission (TGPSC)';
  }
  if (t.includes('andhra pradesh public service commission') || t.includes('appsc') || t.includes('psc.ap.gov.in')) {
    return 'Andhra Pradesh Public Service Commission (APPSC)';
  }
  if (t.includes('staff selection commission') || t.includes('ssc.gov.in')) {
    return 'Staff Selection Commission (SSC)';
  }
  if (t.includes('union public service commission') || t.includes('upsc.gov.in')) {
    return 'Union Public Service Commission (UPSC)';
  }
  if (t.includes('railway recruitment board') || t.includes('rrb')) {
    return 'Railway Recruitment Board (RRB)';
  }
  const m = text.match(/([A-Z][A-Za-z\s]{4,50}(?:COMMISSION|BOARD|COUNCIL))/);
  if (m) return m[1].trim();
  return undefined;
}

/**
 * Extracts notification number or recruitment cycle from document text
 */
export function extractNotificationNumber(text: string): string | undefined {
  const rcMatch = text.match(/\b(?:Rc\s*No\.?|Notification\s*No\.?|Advt\s*No\.?|Notice\s*No\.?)\s*[:\-–—]?\s*([A-Za-z0-9\-_./ ]{3,60})/i);
  if (rcMatch) {
    const raw = rcMatch[1].replace(/\r?\n.*/s, '').replace(/\s{2,}/g, ' ').trim();
    if (raw.length >= 4 && !raw.toLowerCase().includes('dated') && !raw.toLowerCase().includes('page')) {
      return raw;
    }
  }
  const cycleMatch = text.match(/\b(\d{1,3}\s*\/\s*20\d{2})\b/);
  if (cycleMatch) return cycleMatch[1].replace(/\s/g, '');
  return undefined;
}

/**
 * Extracts negative marking rate from text
 */
export function extractNegativeMarking(text: string): number {
  const t = text.toLowerCase();
  if (t.includes('no negative') || t.includes('no penalty') || t.includes('without negative marking') || t.includes('zero penalty')) {
    return 0;
  }
  if (t.includes('1/4') || t.includes('one fourth') || t.includes('0.25') || t.includes('25%')) {
    return 0.25;
  }
  if (t.includes('1/3') || t.includes('one third') || t.includes('0.33') || t.includes('33%')) {
    return 0.33;
  }
  if (t.includes('1/2') || t.includes('one half') || t.includes('0.5')) {
    return 0.5;
  }
  const decMatch = t.match(/(?:negative|wrong answer|deduct(?:ion)?|penalt(?:y)?)[^\d]{0,25}(0\.\d{1,2})/);
  if (decMatch) return Number(decMatch[1]);
  return 0.25;
}

/**
 * Extracts duration in minutes from text
 */
export function extractDurationMinutes(text: string): number {
  const hrMatch = text.match(/\b([1-4](?:\.\d+)?|\d½)\s*(?:hours?|hrs?)\b/i);
  if (hrMatch) {
    const val = hrMatch[1].replace('½', '.5');
    return Math.round(Number(val) * 60);
  }
  const minMatch = text.match(/\b(60|90|100|120|150|180|210|240)\s*(?:minutes|mins)\b/i);
  if (minMatch) {
    return Number(minMatch[1]);
  }
  return 150;
}

/**
 * Extracts total questions count from text
 */
export function extractQuestionCount(text: string): number {
  const explicit = text.match(/\b(50|75|100|120|150|180|200|250|300)\s*(?:objective\s+)?(?:questions|mcqs)\b/i);
  if (explicit) return Number(explicit[1]);

  const headerMatch = text.match(/\((\d{2,3})\s*questions\)/i);
  if (headerMatch) return Number(headerMatch[1]);

  const qCountMatch = text.match(/(?:total\s+questions|number\s+of\s+questions|no\.\s+of\s+questions)\s*[:=\-–—]?\s*(\d{2,3})/i);
  if (qCountMatch) return Number(qCountMatch[1]);

  return 150;
}

/**
 * Extracts total marks from text
 */
export function extractTotalMarks(text: string, defaultMarks = 150): number {
  const explicit = text.match(/\b(50|75|100|120|150|180|200|300|400|450|600|900)\s*(?:total\s+)?(?:maximum\s+)?marks\b/i);
  if (explicit) return Number(explicit[1]);

  const marksMatch = text.match(/(?:total\s+marks|maximum\s+marks|max\s+marks)\s*[:=\-–—]?\s*(\d{2,3})/i);
  if (marksMatch) return Number(marksMatch[1]);

  return defaultMarks;
}

/**
 * Extracts language mediums from text
 */
export function extractLanguageMediums(text: string): string[] {
  const mediums: string[] = [];
  const t = text.toLowerCase();
  if (t.includes('english')) mediums.push('English');
  if (t.includes('telugu')) mediums.push('Telugu');
  if (t.includes('urdu')) mediums.push('Urdu');
  if (t.includes('hindi')) mediums.push('Hindi');
  if (mediums.length === 0) return ['English', 'Telugu'];
  return [...new Set(mediums)];
}

/**
 * Extracts multi-stage examination hierarchy from notification text
 */
export function extractStagesFromNotification(text: string, examName?: string): ExamStage[] {
  const stages: ExamStage[] = [];

  // Pattern A: Police exam with PWT, PMT/PET, and FWE
  const hasPWT = /preliminary written test|pwt\b/i.test(text);
  const hasPET = /physical measurement|physical efficiency|pmt\b|pet\b/i.test(text);
  const hasFWE = /final written examination|fwe\b|mains written/i.test(text);

  if (hasPWT || (hasPET && hasFWE)) {
    let sNum = 1;
    if (hasPWT) {
      stages.push({
        stage_id: 'stage_pwt',
        stage_number: sNum++,
        stage_name: 'Stage 1: Preliminary Written Test (PWT)',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 200,
        description: 'Screening test comprising 200 objective questions for 200 marks. Qualifying in nature to proceed to Physical tests.',
        papers: [
          {
            paper_id: 'paper_pwt_1',
            paper_number: 'Preliminary Paper',
            title: 'Syllabus for Preliminary Written Test (Objective Type)',
            type: 'OBJECTIVE',
            total_questions: 200,
            total_marks: 200,
            duration_minutes: 180,
            negative_marking_rate: 0,
            is_qualifying: true,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: [
              'English',
              'Arithmetic',
              'General Science',
              'History of India, Indian culture, Indian National Movement',
              'Indian Geography, Polity and Economy',
              'Current events of national and international importance',
              'Test of Reasoning / Mental Ability',
              'Contents pertaining to the State of Telangana'
            ],
            syllabus_highlights: [
              'English & Grammar',
              'Arithmetic & Mensuration',
              'General Science',
              'Indian History & National Movement',
              'Geography, Polity & Economy',
              'Current Events',
              'Reasoning & Mental Ability',
              'Telangana History & Movement'
            ]
          }
        ]
      });
    }

    if (hasPET) {
      stages.push({
        stage_id: 'stage_pet',
        stage_number: sNum++,
        stage_name: 'Stage 2: Physical Measurement Test & Physical Efficiency Test (PMT / PET)',
        stage_type: 'PHYSICAL_TEST',
        is_qualifying_only: true,
        total_papers: 0,
        total_marks: 0,
        description: 'Physical Measurement Test (Height & Chest) and 1600m / 800m Run, Long Jump, Shot Put events. Qualifying in nature.',
        papers: []
      });
    }

    if (hasFWE) {
      stages.push({
        stage_id: 'stage_fwe',
        stage_number: sNum++,
        stage_name: 'Stage 3: Final Written Examination (FWE)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 1,
        total_marks: 200,
        description: 'Final merit examination comprising 200 objective questions for 200 marks testing core domains.',
        papers: [
          {
            paper_id: 'paper_fwe_1',
            paper_number: 'Paper-I',
            title: 'Final Written Examination Paper (Objective Type)',
            type: 'OBJECTIVE',
            total_questions: 200,
            total_marks: 200,
            duration_minutes: 180,
            negative_marking_rate: 0,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: [
              'English',
              'Arithmetic',
              'General Science',
              'History of India, Indian culture, Indian National Movement',
              'Indian Geography, Polity and Economy',
              'Current events of national and international importance',
              'Test of Reasoning / Mental Ability',
              'Personality test (Ethics, Gender Sensitivity, Weaker Sections)',
              'Contents pertaining to the State of Telangana'
            ]
          }
        ]
      });
    }

    return stages;
  }

  // Pattern B: Prelims + Mains (Standard PSC or UPSC style)
  const hasPrelims = /preliminary (?:examination|test)|prelims|screening test|tier\s*[-–—:]?\s*i\b/i.test(text);
  const hasMains = /main(?:s)? (?:examination|written)|tier\s*[-–—:]?\s*ii\b/i.test(text);

  if (hasPrelims && hasMains) {
    stages.push({
      stage_id: 'stage_prelims',
      stage_number: 1,
      stage_name: 'Stage 1: Preliminary Screening Test',
      stage_type: 'PRELIMINARY',
      is_qualifying_only: true,
      total_papers: 1,
      total_marks: 150,
      description: 'Screening test to shortlist candidates for the Mains examination.',
      papers: [
        {
          paper_id: 'paper_prelims_1',
          paper_number: 'Preliminary Paper',
          title: 'General Studies and Mental Ability',
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: true,
          language_mediums: ['English', 'Telugu']
        }
      ]
    });

    stages.push({
      stage_id: 'stage_mains',
      stage_number: 2,
      stage_name: 'Stage 2: Mains Written Examination',
      stage_type: 'MAINS',
      is_qualifying_only: false,
      total_papers: 2,
      total_marks: 300,
      description: 'Comprehensive written examination determining final merit list.',
      papers: [
        {
          paper_id: 'paper_mains_1',
          paper_number: 'Paper-I',
          title: 'General Studies & Mental Ability',
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false
        },
        {
          paper_id: 'paper_mains_2',
          paper_number: 'Paper-II',
          title: 'Domain / Specialized Subject Paper',
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false
        }
      ]
    });

    return stages;
  }

  // Default: Single stage competitive examination
  return [
    {
      stage_id: 'stage_written_1',
      stage_number: 1,
      stage_name: 'Written Examination (Objective Type)',
      stage_type: 'MAINS',
      is_qualifying_only: false,
      total_papers: 1,
      total_marks: 150,
      description: 'Official competitive examination testing general and domain syllabus areas.',
      papers: [
        {
          paper_id: 'paper_1',
          paper_number: 'Paper-I',
          title: `${examName || 'Competitive Examination'}: Paper-I`,
          type: 'OBJECTIVE',
          total_questions: 150,
          total_marks: 150,
          duration_minutes: 150,
          negative_marking_rate: 0.25,
          is_qualifying: false
        }
      ]
    }
  ];
}

/**
 * Extracts syllabus topics from notification text.
 * Finds the syllabus block, identifies numbered or domain items, and extracts clean topic strings.
 */
export function extractSyllabusTopicsFromText(text: string): {
  topics: string[];
  detailed: Record<string, string[]>;
  excerpt: string;
} {
  const topics: string[] = [];
  const detailed: Record<string, string[]> = {};
  let excerpt = '';

  if (!text || text.trim().length === 0) {
    return { topics, detailed, excerpt };
  }

  // 1. Locate syllabus start
  const syllabusHeaderRegex = /(?:ANNEXURE\s*[-–—:]?\s*(?:II|I|III|IV|[1-4])\b[^\n\r]*\b(?:SYLLABUS|SCHEME)\b|SCHEME\s+AND\s+SYLLABUS\b|SYLLABUS\s+FOR\s+(?:THE\s+)?(?:POST|PRELIMINARY|WRITTEN|FINAL|MAINS|TIER)[^\n\r]*|INDICATIVE\s+SYLLABUS\b|DETAILED\s+SYLLABUS\b)/i;
  const headerMatch = text.match(syllabusHeaderRegex);

  let searchScope = text;
  if (headerMatch && headerMatch.index !== undefined) {
    const startIdx = headerMatch.index;
    searchScope = text.slice(startIdx, Math.min(text.length, startIdx + 15000));
    excerpt = searchScope.slice(0, 600).trim();
  }

  // 2. Strategy A: Numbered items (1. English \n 2. Arithmetic \n 3. General Science ...)
  const numberedItemRegex = /^\s*(\d{1,2})[.)\]\-–—]\s*([^\n\r]{3,160})/gm;
  const numberedMatches = [...searchScope.matchAll(numberedItemRegex)];

  if (numberedMatches.length >= 3) {
    for (const m of numberedMatches) {
      const rawTopic = m[2].trim();
      if (/^(?:page|see rule|rule|clause|note|candidates|minimum|hall ticket|application)/i.test(rawTopic)) continue;

      if (rawTopic.includes(':')) {
        const parts = rawTopic.split(':');
        const mainSubject = cleanTopicString(parts[0]);
        const subList = parts.slice(1).join(':').split(/[,;]/).map(s => s.trim()).filter(s => s.length > 2);
        if (mainSubject.length >= 3 && !topics.includes(mainSubject)) {
          topics.push(mainSubject);
          if (subList.length > 0) {
            detailed[mainSubject] = subList;
          }
        }
      } else {
        const clean = cleanTopicString(rawTopic);
        if (clean.length >= 3 && !topics.includes(clean)) {
          topics.push(clean);
        }
      }
    }
  }

  // 3. Strategy B: Lettered items ((a) Current Affairs \n (b) International Relations ...)
  if (topics.length < 3) {
    const letteredItemRegex = /^\s*(?:\(([a-z])\)|\b([a-z])\.)\s+([^\n\r]{3,160})/gim;
    const letteredMatches = [...searchScope.matchAll(letteredItemRegex)];
    if (letteredMatches.length >= 3) {
      for (const m of letteredMatches) {
        const rawTopic = m[3].trim();
        if (/^(?:see|note|page|candidate)/i.test(rawTopic)) continue;
        const clean = cleanTopicString(rawTopic);
        if (clean.length >= 3 && !topics.includes(clean)) {
          topics.push(clean);
        }
      }
    }
  }

  // 4. Strategy C: Section / Domain Headings
  if (topics.length < 3) {
    const domainHeaders = [
      'General Studies',
      'General Abilities',
      'Arithmetic',
      'Test of Reasoning',
      'Mental Ability',
      'General Science',
      'History of India',
      'Indian Culture',
      'Indian National Movement',
      'Indian Geography',
      'Telangana Geography',
      'Indian Polity and Economy',
      'Indian Constitution',
      'Current Affairs',
      'Telangana Movement and State Formation',
      'Society, Culture, Heritage of Telangana',
      'Quantitative Aptitude',
      'English Comprehension',
      'General Intelligence and Reasoning',
      'General Awareness',
      'Computer Knowledge'
    ];

    for (const domain of domainHeaders) {
      const regex = new RegExp(`\\b${domain}\\b`, 'i');
      if (regex.test(searchScope) && !topics.includes(domain)) {
        topics.push(domain);
      }
    }
  }

  if (!excerpt) {
    excerpt = text.slice(0, 400).replace(/\s+/g, ' ').trim();
  }

  return { topics, detailed, excerpt };
}

/**
 * Main public entry point: Extracts full structured scheme from notification text
 */
export function extractSyllabusFromNotificationText(text: string, examQueryOrTitle?: string): ExtractedNotificationScheme {
  const isGazette = isOfficialGazetteText(text);
  const authority = extractAuthorityFromText(text);
  const notificationNum = extractNotificationNumber(text);
  const duration = extractDurationMinutes(text);
  const qCount = extractQuestionCount(text);
  const marks = extractTotalMarks(text, qCount);
  const negRate = extractNegativeMarking(text);
  const mediums = extractLanguageMediums(text);

  const { topics, detailed, excerpt } = extractSyllabusTopicsFromText(text);
  const stages = extractStagesFromNotification(text, examQueryOrTitle);

  if (stages.length > 0 && stages[0].papers && stages[0].papers.length > 0 && topics.length > 0) {
    const p1 = stages[0].papers[0];
    p1.sections = [...topics];
    p1.syllabus_highlights = topics.slice(0, 6);
    if (qCount > 0) p1.total_questions = qCount;
    if (marks > 0) p1.total_marks = marks;
    if (duration > 0) p1.duration_minutes = duration;
    p1.negative_marking_rate = negRate;
    p1.language_mediums = mediums;
  }

  let examName = examQueryOrTitle;
  if (!examName) {
    const postMatch = text.match(/(?:post\s+of|recruitment\s+to\s+(?:the\s+post\s+of)?|examination\s+for)\s+([A-Za-z0-9\s()/\-–—]{5,80})/i);
    if (postMatch) {
      examName = postMatch[1].replace(/\r?\n.*/s, '').trim();
    } else if (authority) {
      examName = `${authority} Examination`;
    } else {
      examName = 'Official Government Recruitment';
    }
  }

  return {
    authority,
    exam_name: examName,
    notification_number: notificationNum,
    recruitment_cycle: notificationNum ? `Notification ${notificationNum}` : 'Current Recruitment Cycle',
    stages,
    primary_stage_name: stages[0]?.stage_name,
    primary_paper_name: stages[0]?.papers?.[0]?.title,
    pattern: {
      total_questions: qCount,
      duration_minutes: duration,
      total_marks: marks,
      marks_per_question: (qCount > 0 && marks > 0) ? Number((marks / qCount).toFixed(2)) : 1,
      negative_marking_rate: negRate,
      sections: topics.length > 0 ? topics : ['General Studies', 'General Abilities'],
      mediums
    },
    syllabus_topics: topics,
    detailed_syllabus: detailed,
    raw_syllabus_excerpt: excerpt,
    confidence: isGazette ? 95 : topics.length >= 4 ? 90 : 75,
    is_official_gazette: isGazette
  };
}
