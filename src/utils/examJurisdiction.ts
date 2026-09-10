import type { ExamRecord } from '../types.ts';

export type JurisdictionTier = 'CENTRAL' | 'STATE';

export interface StateInfo {
  code: string;
  name: string;
  defaultCommission: string;
  shortCommission: string;
  popularExams: string[];
}

export const INDIAN_STATES: StateInfo[] = [
  {
    code: 'TG',
    name: 'Telangana',
    defaultCommission: 'Telangana Public Service Commission (TGPSC)',
    shortCommission: 'TGPSC',
    popularExams: [
      'TGPSC Group 2 Paper 1',
      'TGPSC AEE Civil',
      'TGPSC Group 1 Prelims',
      'TGPSC Group 3',
      'TGPSC Group 4',
      'TGPSC Polytechnic Lecturer'
    ]
  },
  {
    code: 'AP',
    name: 'Andhra Pradesh',
    defaultCommission: 'Andhra Pradesh Public Service Commission (APPSC)',
    shortCommission: 'APPSC',
    popularExams: [
      'APPSC Group 2 Screening',
      'APPSC Executive Officer Gr-III Mains Paper 1',
      'APPSC Group 1 Prelims',
      'APPSC Assistant Conservator of Forests',
      'APPSC Polytechnic Lecturer'
    ]
  },
  {
    code: 'TN',
    name: 'Tamil Nadu',
    defaultCommission: 'Tamil Nadu Public Service Commission (TNPSC)',
    shortCommission: 'TNPSC',
    popularExams: [
      'TNPSC Group 2 Prelims',
      'TNPSC Group 4',
      'TNPSC Group 1 Prelims',
      'TNPSC Combined Technical Services'
    ]
  },
  {
    code: 'KL',
    name: 'Kerala',
    defaultCommission: 'Kerala Public Service Commission (KPSC)',
    shortCommission: 'Kerala PSC',
    popularExams: [
      'Kerala PSC Degree Level Prelims',
      'Kerala PSC 10th Level Prelims',
      'Kerala PSC 12th Level Prelims',
      'Kerala Administrative Service (KAS)'
    ]
  },
  {
    code: 'KA',
    name: 'Karnataka',
    defaultCommission: 'Karnataka Public Service Commission (KPSC)',
    shortCommission: 'Karnataka PSC',
    popularExams: [
      'KPSC KAS Gazetted Probationers Prelims',
      'KPSC FDA / SDA',
      'KPSC Group C Non-Technical'
    ]
  },
  {
    code: 'UP',
    name: 'Uttar Pradesh',
    defaultCommission: 'Uttar Pradesh Public Service Commission (UPPSC)',
    shortCommission: 'UPPSC',
    popularExams: [
      'UPPSC PCS Prelims',
      'UPPSC RO / ARO (Review Officer)',
      'UPPSC Assistant Conservator of Forests'
    ]
  },
  {
    code: 'BR',
    name: 'Bihar',
    defaultCommission: 'Bihar Public Service Commission (BPSC)',
    shortCommission: 'BPSC',
    popularExams: [
      'BPSC Combined Competitive Examination (CCE) Prelims',
      'BPSC Assistant Engineer',
      'BPSC Teacher Recruitment (TRE)'
    ]
  },
  {
    code: 'MH',
    name: 'Maharashtra',
    defaultCommission: 'Maharashtra Public Service Commission (MPSC)',
    shortCommission: 'MPSC',
    popularExams: [
      'MPSC State Services (Rajyaseva) Prelims',
      'MPSC Group B Combined Prelims (PSI/STI/ASO)',
      'MPSC Group C Combined Prelims'
    ]
  },
  {
    code: 'RJ',
    name: 'Rajasthan',
    defaultCommission: 'Rajasthan Public Service Commission (RPSC)',
    shortCommission: 'RPSC',
    popularExams: [
      'RPSC RAS / RTS Prelims',
      'RPSC 1st Grade School Lecturer',
      'RPSC 2nd Grade Senior Teacher'
    ]
  },
  {
    code: 'WB',
    name: 'West Bengal',
    defaultCommission: 'Public Service Commission West Bengal (WBPSC)',
    shortCommission: 'WBPSC',
    popularExams: [
      'WBCS (Exe) Preliminary Examination',
      'WBPSC Miscellaneous Services',
      'WBPSC Clerkship Examination'
    ]
  },
  {
    code: 'MP',
    name: 'Madhya Pradesh',
    defaultCommission: 'Madhya Pradesh Public Service Commission (MPPSC)',
    shortCommission: 'MPPSC',
    popularExams: [
      'MPPSC State Service Examination (SSE) Prelims',
      'MPPSC State Forest Service Prelims'
    ]
  },
  {
    code: 'OD',
    name: 'Odisha',
    defaultCommission: 'Odisha Public Service Commission (OPSC)',
    shortCommission: 'OPSC',
    popularExams: [
      'OPSC Odisha Civil Services (OCS) Prelims',
      'OPSC Assistant Section Officer (ASO)'
    ]
  },
  {
    code: 'GJ',
    name: 'Gujarat',
    defaultCommission: 'Gujarat Public Service Commission (GPSC)',
    shortCommission: 'GPSC',
    popularExams: [
      'GPSC Class 1 & 2 Preliminary Examination',
      'GPSC Deputy Section Officer (DySO)'
    ]
  },
  {
    code: 'PB',
    name: 'Punjab',
    defaultCommission: 'Punjab Public Service Commission (PPSC)',
    shortCommission: 'PPSC',
    popularExams: [
      'PPSC Punjab State Civil Services Combined Competitive Exam'
    ]
  },
  {
    code: 'HR',
    name: 'Haryana',
    defaultCommission: 'Haryana Public Service Commission (HPSC)',
    shortCommission: 'HPSC',
    popularExams: [
      'HPSC HCS (Executive Branch) & Allied Services'
    ]
  }
];

export interface CentralCommissionInfo {
  name: string;
  shortName: string;
  popularExams: string[];
}

export const CENTRAL_COMMISSIONS: CentralCommissionInfo[] = [
  {
    name: 'Staff Selection Commission (SSC)',
    shortName: 'SSC',
    popularExams: [
      'SSC CGL Tier 1',
      'SSC CHSL Tier 1',
      'SSC CPO (Sub-Inspector in Delhi Police & CAPFs)',
      'SSC MTS & Havaldar',
      'SSC GD Constable',
      'SSC Stenographer Grade C & D'
    ]
  },
  {
    name: 'Railway Recruitment Boards (RRB)',
    shortName: 'RRB / Railways',
    popularExams: [
      'RRB NTPC CBT-1',
      'RRB Group D (Level-1)',
      'RRB ALP (Assistant Loco Pilot)',
      'RRB Technician Grade I & III',
      'RRB JE (Junior Engineer)'
    ]
  },
  {
    name: 'Union Public Service Commission (UPSC)',
    shortName: 'UPSC',
    popularExams: [
      'UPSC Civil Services Prelims (CSE Paper 1 - GS)',
      'UPSC Civil Services CSAT (Paper 2)',
      'UPSC CDS (Combined Defence Services)',
      'UPSC NDA & NA Examination',
      'UPSC CAPF (Assistant Commandants)',
      'UPSC Engineering Services (ESE)'
    ]
  },
  {
    name: 'Banking & Financial Institutions (IBPS / SBI / RBI)',
    shortName: 'Banking',
    popularExams: [
      'IBPS PO Prelims',
      'IBPS Clerk Prelims',
      'SBI PO Prelims',
      'SBI Clerk Prelims',
      'RBI Grade B Phase-1'
    ]
  }
];

export const CENTRAL_EXAM_PRESETS: string[] = [
  'SSC CGL Tier 1',
  'RRB NTPC CBT-1',
  'UPSC Civil Services Prelims',
  'SSC CHSL Tier 1',
  'RRB Group D',
  'IBPS PO Prelims',
  'UPSC CDS'
];

/**
 * Determines whether an examination belongs to the Central / National jurisdiction.
 */
export function isCentralExam(exam: ExamRecord | { state_or_central?: string; commission?: string; title?: string }): boolean {
  const soc = (exam.state_or_central || '').trim().toLowerCase();
  if (soc === 'central' || soc === 'national' || soc === 'all-india' || soc === 'union') {
    return true;
  }
  const comm = (exam.commission || '').toLowerCase();
  const title = (exam.title || '').toLowerCase();

  // Central commission keywords
  if (
    comm.includes('staff selection') ||
    comm.includes('ssc') ||
    comm.includes('railway') ||
    comm.includes('rrb') ||
    comm.includes('upsc') ||
    comm.includes('union public') ||
    comm.includes('ibps') ||
    comm.includes('sbi') ||
    comm.includes('rbi')
  ) {
    return true;
  }

  // Central title keywords
  if (
    title.includes('ssc cgl') ||
    title.includes('ssc chsl') ||
    title.includes('rrb ntpc') ||
    title.includes('railway') ||
    title.includes('upsc civil services') ||
    title.includes('ibps')
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts and normalizes the State name for a state examination.
 * Returns null if it is a Central exam.
 */
export function getExamState(exam: ExamRecord | { state_or_central?: string; commission?: string; title?: string }): string | null {
  if (isCentralExam(exam)) return null;

  const soc = (exam.state_or_central || '').trim();
  if (soc && soc.toLowerCase() !== 'state') {
    // Look for exact or partial state match
    const found = INDIAN_STATES.find(s => s.name.toLowerCase() === soc.toLowerCase());
    if (found) return found.name;
    return soc;
  }

  // Check commission and title for known states
  const text = `${exam.commission || ''} ${exam.title || ''}`.toLowerCase();
  for (const s of INDIAN_STATES) {
    if (
      text.includes(s.name.toLowerCase()) ||
      text.includes(s.shortCommission.toLowerCase()) ||
      text.includes(s.defaultCommission.toLowerCase())
    ) {
      return s.name;
    }
  }

  return 'Other States';
}

export interface GroupedExams {
  central: ExamRecord[];
  states: Record<string, ExamRecord[]>;
  stateNames: string[];
}

/**
 * Groups a collection of examinations cleanly into Central and State-Wise categories.
 */
export function groupExamsByJurisdiction(exams: ExamRecord[]): GroupedExams {
  const central: ExamRecord[] = [];
  const states: Record<string, ExamRecord[]> = {};

  for (const exam of exams) {
    if (isCentralExam(exam)) {
      central.push(exam);
    } else {
      const stateName = getExamState(exam) || 'Other States';
      if (!states[stateName]) {
        states[stateName] = [];
      }
      states[stateName].push(exam);
    }
  }

  const stateNames = Object.keys(states).sort((a, b) => {
    // Prioritize prominent states with exams
    if (a === 'Telangana') return -1;
    if (b === 'Telangana') return 1;
    if (a === 'Andhra Pradesh') return -1;
    if (b === 'Andhra Pradesh') return 1;
    return a.localeCompare(b);
  });

  return { central, states, stateNames };
}

/**
 * Filter exams by jurisdiction tier and optional state.
 */
export function filterExamsByJurisdiction(
  exams: ExamRecord[],
  tier: 'ALL' | 'CENTRAL' | 'STATE',
  selectedState?: string
): ExamRecord[] {
  if (tier === 'ALL') return exams;
  if (tier === 'CENTRAL') {
    return exams.filter(isCentralExam);
  }
  // STATE tier
  return exams.filter(e => {
    if (isCentralExam(e)) return false;
    if (!selectedState || selectedState === 'ALL_STATES') return true;
    return getExamState(e) === selectedState;
  });
}
