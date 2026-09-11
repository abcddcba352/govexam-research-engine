import type { ExamRecord } from '../types.ts';

export type JurisdictionTier = 'CENTRAL' | 'STATE';

export type BoardCategory =
  | 'PSC'
  | 'POLICE'
  | 'TEACHER'
  | 'HEALTH'
  | 'TECHNICAL_INSTITUTE'
  | 'POWER'
  | 'CENTRAL'
  | 'BANKING'
  | 'RAILWAY';

export interface BoardExamItem {
  id: string;
  title: string;
  post: string;
  stage?: string;
  paper?: string;
  category?: string;
  description?: string;
}

export interface ConductingBoardInfo {
  id: string;
  name: string;
  shortName: string;
  category: BoardCategory;
  icon: string;
  jurisdictionTier: JurisdictionTier;
  state?: string;
  officialPortal: string;
  description: string;
  exams: BoardExamItem[];
}

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

// ============================================================================
// HIERARCHICAL CONDUCTING BOARDS CATALOG
// ============================================================================

export const CENTRAL_CONDUCTING_BOARDS: ConductingBoardInfo[] = [
  {
    id: 'ssc',
    name: 'Staff Selection Commission (SSC)',
    shortName: 'SSC',
    category: 'CENTRAL',
    icon: '🏛️',
    jurisdictionTier: 'CENTRAL',
    officialPortal: 'https://ssc.gov.in',
    description: 'Premier central recruiting commission for Group B and C non-technical and technical posts across Ministries and Departments of Government of India.',
    exams: [
      { id: 'ssc_cgl_tier_1', title: 'SSC Combined Graduate Level (CGL) Examination', post: 'Assistant Section Officer, Inspector, Sub-Inspector, Tax Assistant', paper: 'Tier-I' },
      { id: 'ssc_chsl_tier_1', title: 'SSC Combined Higher Secondary Level (CHSL)', post: 'Lower Division Clerk (LDC), Junior Secretariat Assistant (JSA), Data Entry Operator', paper: 'Tier-I' },
      { id: 'ssc_cpo_tier_1', title: 'SSC Central Police Organization (CPO)', post: 'Sub-Inspector (Executive) in Delhi Police & CAPFs (CRPF, BSF, CISF, ITBP, SSB)', paper: 'Paper-I' },
      { id: 'ssc_mts_paper_1', title: 'SSC Multi-Tasking (Non-Technical) Staff & Havaldar', post: 'MTS & Havaldar in CBIC & CBN', paper: 'Session-I & II' },
      { id: 'ssc_gd_constable', title: 'SSC Constable (GD) in Central Armed Police Forces', post: 'Constable (General Duty) & Rifleman', paper: 'Computer Based Exam' },
      { id: 'ssc_je_paper_1', title: 'SSC Junior Engineer (JE)', post: 'Junior Engineer (Civil, Electrical, Mechanical)', paper: 'Paper-I' }
    ]
  },
  {
    id: 'rrb',
    name: 'Railway Recruitment Boards (RRB) / Indian Railways',
    shortName: 'RRB / Railways',
    category: 'RAILWAY',
    icon: '🚆',
    jurisdictionTier: 'CENTRAL',
    officialPortal: 'https://indianrailways.gov.in',
    description: 'Conducts nationwide recruitment for operational, technical, non-technical, and supervisory cadres across 21 Railway Recruitment Boards.',
    exams: [
      { id: 'rrb_ntpc_cbt_1', title: 'RRB Non-Technical Popular Categories (NTPC)', post: 'Station Master, Goods Train Manager, Senior Commercial Clerk', paper: 'CBT-1' },
      { id: 'rrb_group_d_cbt', title: 'RRB Group-D (Level-1 Posts)', post: 'Track Maintainer Grade-IV, Assistant Pointsman, Mechanical Assistant', paper: 'CBT' },
      { id: 'rrb_alp_cbt_1', title: 'RRB Assistant Loco Pilot (ALP)', post: 'Assistant Loco Pilot in Indian Railways', paper: 'CBT-1' },
      { id: 'rrb_technician_cbt', title: 'RRB Technician (Grade-I Signal & Grade-III)', post: 'Technician in Electrical, Mechanical, S&T', paper: 'CBT' },
      { id: 'rrb_je_cbt_1', title: 'RRB Junior Engineer (JE)', post: 'Junior Engineer (Civil, Electrical, Electronics, IT)', paper: 'CBT-1' }
    ]
  },
  {
    id: 'upsc',
    name: 'Union Public Service Commission (UPSC)',
    shortName: 'UPSC',
    category: 'CENTRAL',
    icon: '🏛️',
    jurisdictionTier: 'CENTRAL',
    officialPortal: 'https://upsc.gov.in',
    description: 'Constitutional recruiting body of India for premier All-India Civil Services, Armed Forces Commissioned Officers, and Central Engineering Services.',
    exams: [
      { id: 'upsc_cse_prelims_gs', title: 'UPSC Civil Services Examination (CSE Prelims)', post: 'Indian Administrative Service (IAS), IPS, IFS, IRS Officers', paper: 'General Studies Paper-I' },
      { id: 'upsc_cse_csat', title: 'UPSC Civil Services Aptitude Test (CSAT)', post: 'Civil Services Qualifying Aptitude', paper: 'CSAT Paper-II' },
      { id: 'upsc_cds', title: 'UPSC Combined Defence Services (CDS)', post: 'Commissioned Officers in Indian Military Academy, Naval Academy, Air Force', paper: 'Written Exam' },
      { id: 'upsc_nda', title: 'UPSC National Defence Academy & Naval Academy (NDA & NA)', post: 'Cadet Trainees for Armed Forces', paper: 'Mathematics & GAT' },
      { id: 'upsc_capf_ac', title: 'UPSC Central Armed Police Forces (Assistant Commandants)', post: 'Assistant Commandants in BSF, CRPF, CISF, ITBP, SSB', paper: 'Paper-I & II' },
      { id: 'upsc_ese_prelims', title: 'UPSC Engineering Services Examination (ESE)', post: 'Central Engineering Service (Civil, Mechanical, Electrical, E&T)', paper: 'Prelims Paper-I & II' }
    ]
  },
  {
    id: 'banking',
    name: 'Banking & Financial Institutions (IBPS / SBI / RBI)',
    shortName: 'Banking (IBPS / SBI / RBI)',
    category: 'BANKING',
    icon: '🏦',
    jurisdictionTier: 'CENTRAL',
    officialPortal: 'https://ibps.in',
    description: 'Recruitment boards for 11 Nationalized Public Sector Banks, State Bank of India, and the Reserve Bank of India.',
    exams: [
      { id: 'ibps_po_prelims', title: 'IBPS Probationary Officer (PO / MT)', post: 'Probationary Officer / Management Trainee in Public Sector Banks', paper: 'Prelims' },
      { id: 'ibps_clerk_prelims', title: 'IBPS Clerk (Customer Support & Sales)', post: 'Clerical Cadre in Participating Banks', paper: 'Prelims' },
      { id: 'sbi_po_prelims', title: 'State Bank of India Probationary Officer (SBI PO)', post: 'Junior Management Grade Scale-I Officer', paper: 'Phase-I Prelims' },
      { id: 'sbi_clerk_prelims', title: 'State Bank of India Junior Associates (SBI Clerk)', post: 'Customer Support and Sales in Branches', paper: 'Phase-I Prelims' },
      { id: 'rbi_grade_b_phase1', title: 'Reserve Bank of India Grade-B Officer (General)', post: 'Direct Recruit Grade-B Officer in Central Bank', paper: 'Phase-I' }
    ]
  },
  {
    id: 'central_institutes',
    name: 'National Testing Agency & Central Institutes (NITs / IITs / Central Universities)',
    shortName: 'NITs & Central Institutes',
    category: 'TECHNICAL_INSTITUTE',
    icon: '🔬',
    jurisdictionTier: 'CENTRAL',
    officialPortal: 'https://nta.ac.in',
    description: 'Premier National Institutes of Technology, Indian Institutes of Technology, and Central Universities recruiting administrative and technical personnel.',
    exams: [
      { id: 'nit_non_teaching', title: 'National Institutes of Technology Non-Teaching Recruitment', post: 'Technical Assistant, Junior Engineer, Superintendent', paper: 'Common Recruitment Test' },
      { id: 'cu_non_teaching', title: 'Central Universities Non-Teaching Staff Examination (CUTE)', post: 'Section Officer, Senior Assistant, Technical Assistant', paper: 'Written Exam' },
      { id: 'nta_recruitment_general', title: 'National Testing Agency Recruitment Exams', post: 'Scientific Assistant, Examiner of Patents & Designs', paper: 'Preliminary Test' }
    ]
  }
];

// STATE-SPECIFIC CONDUCTING BOARDS
export const STATE_CONDUCTING_BOARDS: Record<string, ConductingBoardInfo[]> = {
  Telangana: [
    {
      id: 'tgpsc',
      name: 'Telangana Public Service Commission (TGPSC)',
      shortName: 'TGPSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Telangana',
      officialPortal: 'https://tgpsc.gov.in',
      description: 'Constitutional state public service commission of Telangana conducting gazetted and non-gazetted administrative, executive, and technical examinations.',
      exams: [
        { id: 'tgpsc_group_1', title: 'TGPSC Group-I Services Prelims', post: 'Deputy Collector, DSP, Commercial Tax Officer, RDO', paper: 'Preliminary Test' },
        { id: 'tgpsc_group_2_paper_1', title: 'TGPSC Group-II Services', post: 'Municipal Commissioner, Sub-Registrar, ACTO, Extension Officer', paper: 'Paper-I: General Studies and General Abilities' },
        { id: 'tgpsc_group_3', title: 'TGPSC Group-III Services', post: 'Senior Accountant, Auditor, Junior Assistant in Secretariat', paper: 'Paper-I & II' },
        { id: 'tgpsc_group_4', title: 'TGPSC Group-IV Services', post: 'Junior Assistant, Typist, Junior Steno in various departments', paper: 'Paper-I & II' },
        { id: 'tgpsc_aee_civil_paper_1', title: 'TGPSC Assistant Executive Engineer (AEE Civil)', post: 'Assistant Executive Engineer in Irrigation, R&B, PR', paper: 'Paper-I: General Studies and General Abilities' },
        { id: 'tgpsc_dao', title: 'TGPSC Divisional Accounts Officer (DAO Gr-II)', post: 'Divisional Accounts Officer in Director of Works Accounts', paper: 'Paper-I & II' },
        { id: 'tgpsc_polytechnic', title: 'TGPSC Polytechnic Lecturer', post: 'Lecturer in Government Polytechnic Colleges', paper: 'Paper-I & II' }
      ]
    },
    {
      id: 'tslprb',
      name: 'Telangana State Level Police Recruitment Board (TSLPRB)',
      shortName: 'TSLPRB Police',
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: 'Telangana',
      officialPortal: 'https://tslprb.in',
      description: 'Statutory police recruitment board of Telangana conducting direct recruitments for Police, Fire Services, Prisons, and Special Protection Force.',
      exams: [
        { id: 'tslprb_si_prelims', title: 'Telangana Police Sub-Inspector (SI)', post: 'Sub-Inspector of Police (Civil, AR, TSSP, Communications)', paper: 'Preliminary Written Test (PWT)' },
        { id: 'tslprb_pc_prelims', title: 'Telangana Police Constable (PC)', post: 'Police Constable (Civil, AR, TSSP, IT & Communications, Driver)', paper: 'Preliminary Written Test (PWT)' },
        { id: 'tslprb_asi_fpb', title: 'Telangana Police Assistant Sub-Inspector (ASI FPB)', post: 'ASI Finger Print Bureau & Scientific Support', paper: 'Written Examination' }
      ]
    },
    {
      id: 'tg_education',
      name: 'Telangana Residential Educational Institutions & DSC (TREIRB / TG DSC)',
      shortName: 'TG DSC / Teachers',
      category: 'TEACHER',
      icon: '🎓',
      jurisdictionTier: 'STATE',
      state: 'Telangana',
      officialPortal: 'https://treirb.telangana.gov.in',
      description: 'Conducts District Selection Committee (DSC) teacher recruitment and Telangana Residential Educational Institutions (Gurukulam) society appointments.',
      exams: [
        { id: 'tg_dsc_sa', title: 'Telangana DSC School Assistant (SA)', post: 'School Assistant (Mathematics, Physical Science, Biological Science, Social Studies, English)', paper: 'Written Test' },
        { id: 'tg_dsc_sgt', title: 'Telangana DSC Secondary Grade Teacher (SGT)', post: 'Secondary Grade Teacher in Government and Local Body Schools', paper: 'Written Test' },
        { id: 'tg_treirb_tgt', title: 'TREIRB Trained Graduate Teacher (TGT)', post: 'TGT in Social, Science, Maths in Gurukulam Societies', paper: 'Paper-I & II' },
        { id: 'tg_treirb_pgt', title: 'TREIRB Post Graduate Teacher (PGT)', post: 'PGT in Telangana Residential Schools', paper: 'Paper-I & II' }
      ]
    },
    {
      id: 'tg_mhsrb',
      name: 'Medical & Health Services Recruitment Board (MHSRB Telangana)',
      shortName: 'TG MHSRB Health',
      category: 'HEALTH',
      icon: '🏥',
      jurisdictionTier: 'STATE',
      state: 'Telangana',
      officialPortal: 'https://mhsrb.telangana.gov.in',
      description: 'Specialized recruiting authority for government teaching hospitals, directorate of medical education, and public health institutions.',
      exams: [
        { id: 'tg_staff_nurse', title: 'Telangana MHSRB Staff Nurse Recruitment', post: 'Staff Nurse in DME, DH and TVVP', paper: 'CBRT Examination' },
        { id: 'tg_cas', title: 'Telangana Civil Assistant Surgeon (CAS)', post: 'Civil Assistant Surgeon General & Specialist Medical Officers', paper: 'Computer Based Test' },
        { id: 'tg_mpha_female', title: 'Telangana Multi-Purpose Health Assistant (ANM / MPHAF)', post: 'MPHA Female in Health and Family Welfare', paper: 'Written Test' }
      ]
    },
    {
      id: 'tg_nit_warangal',
      name: 'National Institute of Technology Warangal & State Central Institutes',
      shortName: 'NIT Warangal / Institutes',
      category: 'TECHNICAL_INSTITUTE',
      icon: '🔬',
      jurisdictionTier: 'STATE',
      state: 'Telangana',
      officialPortal: 'https://nitw.ac.in',
      description: 'National Institute of Technology in Telangana conducting recruitment for technical officers, superintendents, junior engineers, and administrative cadre.',
      exams: [
        { id: 'nitw_technical_assistant', title: 'NIT Warangal Technical Assistant Recruitment', post: 'Technical Assistant in Engineering Labs, Computer Center, Departments', paper: 'Trade Test & Written Test' },
        { id: 'nitw_junior_engineer', title: 'NIT Warangal Junior Engineer (Civil/Electrical)', post: 'Junior Engineer in Estate Maintenance Division', paper: 'Written Test' },
        { id: 'nitw_junior_assistant', title: 'NIT Warangal Junior Assistant / Senior Assistant', post: 'Junior Assistant in Academic & Administration Wings', paper: 'Written Test' }
      ]
    },
    {
      id: 'tg_power',
      name: 'Telangana Power Generation & Transmission Utilities (TG TRANSCO / GENCO)',
      shortName: 'TG Power Utilities',
      category: 'POWER',
      icon: '⚡',
      jurisdictionTier: 'STATE',
      state: 'Telangana',
      officialPortal: 'https://tstransco.cgg.gov.in',
      description: 'Telangana power utilities recruiting Assistant Engineers, Sub-Engineers, and Junior Accounts Officers.',
      exams: [
        { id: 'tg_transco_ae', title: 'TG TRANSCO Assistant Engineer (Electrical & Civil)', post: 'Assistant Engineer in Grid Sub-Stations and Transmission Lines', paper: 'Written Test' },
        { id: 'tg_genco_ae', title: 'TG GENCO Assistant Engineer (Electrical, Mechanical & Civil)', post: 'Assistant Engineer in Thermal and Hydel Power Stations', paper: 'Written Test' },
        { id: 'tsspdcl_sub_engineer', title: 'TSSPDCL Sub-Engineer (Electrical)', post: 'Sub-Engineer in Distribution Network', paper: 'Written Test' }
      ]
    }
  ],

  'Andhra Pradesh': [
    {
      id: 'appsc',
      name: 'Andhra Pradesh Public Service Commission (APPSC)',
      shortName: 'APPSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Andhra Pradesh',
      officialPortal: 'https://psc.ap.gov.in',
      description: 'Constitutional state recruiting commission of Andhra Pradesh conducting gazetted, non-gazetted, and specialized cadre selections.',
      exams: [
        { id: 'appsc_group_1', title: 'APPSC Group-I Services Prelims', post: 'Deputy Collector, DSP, Commercial Tax Officer', paper: 'Screening Test' },
        { id: 'appsc_group_2_screening', title: 'APPSC Group-II Services', post: 'Municipal Commissioner Gr-III, Sub-Registrar Gr-II, ACTO, ASO', paper: 'Screening Test' },
        { id: 'appsc_endowment_officer_mains_paper_1', title: 'APPSC Executive Officer (Grade-III) in AP Endowments', post: 'Executive Officer Grade-III', paper: 'Paper-I: General Studies and Mental Ability' },
        { id: 'appsc_acf', title: 'APPSC Assistant Conservator of Forests (ACF)', post: 'Assistant Conservator of Forests in AP Forest Service', paper: 'Screening & Mains' },
        { id: 'appsc_polytechnic', title: 'APPSC Polytechnic Lecturer', post: 'Lecturer in Government Polytechnics', paper: 'Paper-I & II' }
      ]
    },
    {
      id: 'slprb_ap',
      name: 'State Level Police Recruitment Board Andhra Pradesh (SLPRB AP)',
      shortName: 'AP Police (SLPRB)',
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: 'Andhra Pradesh',
      officialPortal: 'https://slprb.ap.gov.in',
      description: 'Statutory police recruitment board of Andhra Pradesh conducting examinations for Police, Special Protection Force, and Prisons.',
      exams: [
        { id: 'slprb_ap_si', title: 'AP Police Sub-Inspector (SI)', post: 'Sub-Inspector of Police (Civil & APSP)', paper: 'Preliminary Written Test' },
        { id: 'slprb_ap_pc', title: 'AP Police Constable (PC)', post: 'Police Constable (Civil & APSP)', paper: 'Preliminary Written Test' }
      ]
    },
    {
      id: 'ap_dsc',
      name: 'Andhra Pradesh District Selection Committee (AP DSC / TRT)',
      shortName: 'AP DSC / Teachers',
      category: 'TEACHER',
      icon: '🎓',
      jurisdictionTier: 'STATE',
      state: 'Andhra Pradesh',
      officialPortal: 'https://cse.ap.gov.in',
      description: 'School Education Department recruitment for School Assistants, Secondary Grade Teachers (SGT), and Language Pandits.',
      exams: [
        { id: 'ap_dsc_sa', title: 'AP DSC School Assistant (SA)', post: 'School Assistant (Maths, Physical Science, Bio Science, Social)', paper: 'TET-cum-TRT' },
        { id: 'ap_dsc_sgt', title: 'AP DSC Secondary Grade Teacher (SGT)', post: 'Secondary Grade Teacher in Zilla Parishad & Mandal Praja Parishad Schools', paper: 'TET-cum-TRT' }
      ]
    },
    {
      id: 'ap_nit_andhra',
      name: 'National Institute of Technology Andhra Pradesh (NIT-AP Tadepalligudem)',
      shortName: 'NIT Andhra Pradesh',
      category: 'TECHNICAL_INSTITUTE',
      icon: '🔬',
      jurisdictionTier: 'STATE',
      state: 'Andhra Pradesh',
      officialPortal: 'https://nitandhra.ac.in',
      description: 'Premier National Institute of Technology in Andhra Pradesh recruiting technical assistants, junior engineers, and administrative staff.',
      exams: [
        { id: 'nitap_tech_asst', title: 'NIT Andhra Pradesh Technical Assistant', post: 'Technical Assistant in Computer Science, Electrical, Mechanical', paper: 'Written Test' },
        { id: 'nitap_junior_asst', title: 'NIT Andhra Pradesh Junior Assistant', post: 'Junior Assistant in Administration and Accounts', paper: 'Written Test' }
      ]
    }
  ],

  'Tamil Nadu': [
    {
      id: 'tnpsc',
      name: 'Tamil Nadu Public Service Commission (TNPSC)',
      shortName: 'TNPSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Tamil Nadu',
      officialPortal: 'https://tnpsc.gov.in',
      description: 'Constitutional public service commission of Tamil Nadu.',
      exams: [
        { id: 'tnpsc_group_1', title: 'TNPSC Group-I Services Prelims', post: 'Deputy Collector, DSP, Assistant Commissioner (Commercial Taxes)', paper: 'Preliminary' },
        { id: 'tnpsc_group_2', title: 'TNPSC Group-II / IIA Combined Civil Services', post: 'Municipal Commissioner, Sub-Registrar, Junior Employment Officer', paper: 'Preliminary' },
        { id: 'tnpsc_group_4', title: 'TNPSC Group-IV & VAO Examination', post: 'Village Administrative Officer (VAO), Junior Assistant, Typist', paper: 'Single Paper' },
        { id: 'tnpsc_cts', title: 'TNPSC Combined Technical Services', post: 'Assistant Engineer (Civil, Mechanical, Electrical)', paper: 'Paper-I & II' }
      ]
    },
    {
      id: 'tnusrb',
      name: 'Tamil Nadu Uniformed Services Recruitment Board (TNUSRB)',
      shortName: 'TNUSRB Police',
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: 'Tamil Nadu',
      officialPortal: 'https://tnusrb.tn.gov.in',
      description: 'Recruitment board for Tamil Nadu Police, Fire and Rescue Services, and Prison Department.',
      exams: [
        { id: 'tnusrb_si', title: 'TNUSRB Sub-Inspector of Police (Taluk, AR, TSP)', post: 'Sub-Inspector of Police', paper: 'Written Examination' },
        { id: 'tnusrb_constable', title: 'TNUSRB Police Constable (Grade-II) & Jail Warder', post: 'Grade-II Police Constable, Jail Warder, Fireman', paper: 'Written Examination' }
      ]
    },
    {
      id: 'nit_trichy',
      name: 'National Institute of Technology Tiruchirappalli (NIT Trichy)',
      shortName: 'NIT Trichy',
      category: 'TECHNICAL_INSTITUTE',
      icon: '🔬',
      jurisdictionTier: 'STATE',
      state: 'Tamil Nadu',
      officialPortal: 'https://nitt.edu',
      description: 'National Institute of Technology in Tamil Nadu recruiting technical and administrative personnel.',
      exams: [
        { id: 'nitt_tech_asst', title: 'NIT Trichy Technical Assistant Recruitment', post: 'Technical Assistant in Departments and Centers', paper: 'Screening Test' }
      ]
    }
  ],

  Karnataka: [
    {
      id: 'kpsc',
      name: 'Karnataka Public Service Commission (KPSC)',
      shortName: 'KPSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Karnataka',
      officialPortal: 'https://kpsc.kar.nic.in',
      description: 'Constitutional recruiting commission of Karnataka for state civil and technical services.',
      exams: [
        { id: 'kpsc_kas_prelims', title: 'KPSC Gazetted Probationers (KAS Prelims)', post: 'Assistant Commissioner, DSP, Assistant Commissioner of Commercial Taxes', paper: 'Paper-I & II' },
        { id: 'kpsc_fda_sda', title: 'KPSC First Division Assistant (FDA) / SDA', post: 'First Division Assistant, Second Division Assistant', paper: 'Paper-I & II' },
        { id: 'kpsc_group_c', title: 'KPSC Group-C Non-Technical Services', post: 'Commercial Tax Inspector, Sub-Registrar, Bill Collector', paper: 'Paper-I & II' }
      ]
    },
    {
      id: 'ksp',
      name: 'Karnataka State Police Recruitment (KSP)',
      shortName: 'KSP Police',
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: 'Karnataka',
      officialPortal: 'https://ksp-recruitment.in',
      description: 'Karnataka State Police recruiting agency for Sub-Inspectors and Constables.',
      exams: [
        { id: 'ksp_psi', title: 'Karnataka Police Sub-Inspector (PSI Civil)', post: 'Police Sub-Inspector', paper: 'Paper-I (Descriptive) & Paper-II' },
        { id: 'ksp_cpc', title: 'Karnataka Civil Police Constable (CPC)', post: 'Civil Police Constable (Men & Women)', paper: 'Written Test' }
      ]
    },
    {
      id: 'nitk_surathkal',
      name: 'National Institute of Technology Karnataka (NITK Surathkal)',
      shortName: 'NITK Surathkal',
      category: 'TECHNICAL_INSTITUTE',
      icon: '🔬',
      jurisdictionTier: 'STATE',
      state: 'Karnataka',
      officialPortal: 'https://nitk.ac.in',
      description: 'Premier National Institute of Technology in Karnataka recruiting technical assistants and engineers.',
      exams: [
        { id: 'nitk_tech_asst', title: 'NITK Surathkal Technical Assistant', post: 'Technical Assistant in Engineering Labs', paper: 'Written & Skill Test' }
      ]
    }
  ],

  'Uttar Pradesh': [
    {
      id: 'uppsc',
      name: 'Uttar Pradesh Public Service Commission (UPPSC)',
      shortName: 'UPPSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Uttar Pradesh',
      officialPortal: 'https://uppsc.up.nic.in',
      description: 'Constitutional state recruiting commission of Uttar Pradesh for state civil services and engineering cadres.',
      exams: [
        { id: 'uppsc_pcs_prelims', title: 'UPPSC Combined State / Upper Subordinate (PCS Prelims)', post: 'SDM, DSP, BDO, ARTO, Commercial Tax Officer', paper: 'GS Paper-I & CSAT Paper-II' },
        { id: 'uppsc_ro_aro', title: 'UPPSC Review Officer / Assistant Review Officer (RO / ARO)', post: 'Review Officer in UP Secretariat & Public Service Commission', paper: 'Preliminary Test' },
        { id: 'uppsc_ae', title: 'UPPSC Combined State Engineering Services (AE)', post: 'Assistant Engineer in Irrigation, PWD, Minor Irrigation', paper: 'Paper-I & II' }
      ]
    },
    {
      id: 'upprpb',
      name: 'Uttar Pradesh Police Recruitment & Promotion Board (UPPRPB)',
      shortName: 'UPPRPB Police',
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: 'Uttar Pradesh',
      officialPortal: 'https://uppbpb.gov.in',
      description: 'Statutory board conducting police recruitment for Uttar Pradesh Police.',
      exams: [
        { id: 'upprpb_si', title: 'UP Police Sub-Inspector (SI Civil / Platoon Commander)', post: 'Sub-Inspector in Civil Police & PAC', paper: 'Online Written Exam' },
        { id: 'upprpb_constable', title: 'UP Police Constable Civil & PAC', post: 'Police Constable & Fireman', paper: 'Written Exam' }
      ]
    },
    {
      id: 'upsssc',
      name: 'Uttar Pradesh Subordinate Services Selection Commission (UPSSSC)',
      shortName: 'UPSSSC',
      category: 'CENTRAL',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Uttar Pradesh',
      officialPortal: 'https://upsssc.gov.in',
      description: 'Recruitment for Group C and non-gazetted positions across Uttar Pradesh state departments.',
      exams: [
        { id: 'upsssc_pet', title: 'UPSSSC Preliminary Eligibility Test (PET)', post: 'Eligibility Qualifier for Group-C Posts', paper: 'Single Paper' },
        { id: 'upsssc_vdo', title: 'UPSSSC Village Development Officer (VDO)', post: 'Gram Vikas Adhikari / Panchayat Secretary', paper: 'Written Test' }
      ]
    }
  ],

  Bihar: [
    {
      id: 'bpsc',
      name: 'Bihar Public Service Commission (BPSC)',
      shortName: 'BPSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Bihar',
      officialPortal: 'https://bpsc.bih.nic.in',
      description: 'Constitutional state recruiting commission of Bihar.',
      exams: [
        { id: 'bpsc_cce_prelims', title: 'BPSC Integrated Combined Competitive Exam (CCE Prelims)', post: 'SDM, DSP, Revenue Officer, Block Panchayati Raj Officer', paper: 'Preliminary Test' },
        { id: 'bpsc_tre', title: 'BPSC School Teacher Recruitment Examination (TRE)', post: 'Primary, Middle, Secondary & Higher Secondary Teacher', paper: 'Written Test' },
        { id: 'bpsc_ae', title: 'BPSC Assistant Engineer (Civil/Mechanical/Electrical)', post: 'Assistant Engineer in Road Construction & Building Construction', paper: 'Written Test' }
      ]
    },
    {
      id: 'bpssc',
      name: 'Bihar Police Sub-ordinate Services Commission (BPSSC)',
      shortName: 'BPSSC Police SI',
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: 'Bihar',
      officialPortal: 'https://bpssc.bih.nic.in',
      description: 'Conducts direct recruitments for Police Sub-Inspector, Sergeant, and Assistant Jail Superintendent.',
      exams: [
        { id: 'bpssc_si_prelims', title: 'Bihar Police Sub-Inspector (SI Prelims)', post: 'Police Sub-Inspector in Home Police Dept', paper: 'Preliminary Written Exam' }
      ]
    }
  ],

  Maharashtra: [
    {
      id: 'mpsc',
      name: 'Maharashtra Public Service Commission (MPSC)',
      shortName: 'MPSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Maharashtra',
      officialPortal: 'https://mpsc.gov.in',
      description: 'Constitutional state public service commission of Maharashtra.',
      exams: [
        { id: 'mpsc_rajyaseva', title: 'MPSC Civil Services (Rajyaseva Prelims)', post: 'Deputy Collector, DSP, Tehsildar', paper: 'Paper-I & II' },
        { id: 'mpsc_group_b', title: 'MPSC Non-Gazetted Group-B Services Combined Prelims', post: 'Police Sub-Inspector (PSI), State Tax Inspector (STI), ASO', paper: 'Joint Prelims' },
        { id: 'mpsc_group_c', title: 'MPSC Group-C Services Combined Prelims', post: 'Tax Assistant, Clerk-Typist, Sub-Inspector (State Excise)', paper: 'Joint Prelims' }
      ]
    },
    {
      id: 'mah_police',
      name: 'Maharashtra State Police Recruitment',
      shortName: 'Maharashtra Police',
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: 'Maharashtra',
      officialPortal: 'https://mahapolice.gov.in',
      description: 'Conducts direct recruitment for Police Constable, Driver, and SRPF Constables in Maharashtra.',
      exams: [
        { id: 'mah_police_constable', title: 'Maharashtra Police Constable Recruitment', post: 'Police Constable & Driver', paper: 'Written Exam' }
      ]
    }
  ],

  Kerala: [
    {
      id: 'kerala_psc',
      name: 'Kerala Public Service Commission (KPSC Kerala)',
      shortName: 'Kerala PSC',
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: 'Kerala',
      officialPortal: 'https://keralapsc.gov.in',
      description: 'Constitutional recruiting commission of Kerala conducting common prelims and mains tests.',
      exams: [
        { id: 'kerala_psc_degree_prelims', title: 'Kerala PSC Degree Level Common Preliminary Examination', post: 'Secretariat Assistant, Sub-Inspector, Auditor', paper: 'Degree Prelims' },
        { id: 'kerala_psc_10th_prelims', title: 'Kerala PSC Tenth Level Common Preliminary Exam', post: 'Lower Division Clerk (LDC), Last Grade Servants (LGS)', paper: '10th Prelims' },
        { id: 'kerala_psc_kas', title: 'Kerala Administrative Service (KAS)', post: 'Junior Time Scale Trainee Officer', paper: 'Paper-I & II' }
      ]
    }
  ]
};

/**
 * Returns all conducting boards operating in a specific state.
 * If custom boards exist for the state, returns them.
 * Otherwise, generates standard State PSC and State Police boards dynamically.
 */
export function getBoardsForState(stateName: string): ConductingBoardInfo[] {
  if (STATE_CONDUCTING_BOARDS[stateName]) {
    return STATE_CONDUCTING_BOARDS[stateName];
  }

  const stateInfo = INDIAN_STATES.find(s => s.name.toLowerCase() === stateName.toLowerCase());
  const pscName = stateInfo?.defaultCommission || `${stateName} Public Service Commission`;
  const pscShort = stateInfo?.shortCommission || `${stateName} PSC`;

  return [
    {
      id: `${stateName.toLowerCase().replace(/\s+/g, '_')}_psc`,
      name: pscName,
      shortName: pscShort,
      category: 'PSC',
      icon: '🏛️',
      jurisdictionTier: 'STATE',
      state: stateName,
      officialPortal: `https://${stateInfo?.code?.toLowerCase() || 'gov'}.gov.in`,
      description: `Constitutional public service commission conducting state civil service examinations for ${stateName}.`,
      exams: (stateInfo?.popularExams || [`${stateName} Civil Services Prelims`, `${stateName} Group 2`]).map((exTitle, idx) => ({
        id: `${stateName.toLowerCase().replace(/\s+/g, '_')}_exam_${idx + 1}`,
        title: exTitle,
        post: 'Executive & Administrative Cadre',
        paper: 'Paper-I'
      }))
    },
    {
      id: `${stateName.toLowerCase().replace(/\s+/g, '_')}_police`,
      name: `${stateName} State Police Recruitment Board`,
      shortName: `${stateName} Police`,
      category: 'POLICE',
      icon: '👮',
      jurisdictionTier: 'STATE',
      state: stateName,
      officialPortal: `https://${stateInfo?.code?.toLowerCase() || 'police'}.gov.in`,
      description: `Recruitment board for police officers and constables in ${stateName}.`,
      exams: [
        {
          id: `${stateName.toLowerCase().replace(/\s+/g, '_')}_police_si`,
          title: `${stateName} Police Sub-Inspector (SI)`,
          post: 'Sub-Inspector of Police',
          paper: 'Preliminary Written Test'
        },
        {
          id: `${stateName.toLowerCase().replace(/\s+/g, '_')}_police_constable`,
          title: `${stateName} Police Constable`,
          post: 'Police Constable',
          paper: 'Preliminary Written Test'
        }
      ]
    }
  ];
}

/**
 * Returns all Central / All-India conducting boards.
 */
export function getCentralBoards(): ConductingBoardInfo[] {
  return CENTRAL_CONDUCTING_BOARDS;
}

/**
 * Finds a board by its unique ID across Central and State catalogs.
 */
export function getBoardById(boardId: string): ConductingBoardInfo | undefined {
  const central = CENTRAL_CONDUCTING_BOARDS.find(b => b.id === boardId);
  if (central) return central;

  for (const stateBoards of Object.values(STATE_CONDUCTING_BOARDS)) {
    const found = stateBoards.find(b => b.id === boardId);
    if (found) return found;
  }
  return undefined;
}

/**
 * Resolves which board an examination record belongs to.
 */
export function getBoardForExam(exam: ExamRecord | { commission?: string; title?: string; state_or_central?: string }): ConductingBoardInfo | undefined {
  const comm = (exam.commission || '').toLowerCase();
  const title = (exam.title || '').toLowerCase();
  const soc = (exam.state_or_central || '').toLowerCase();

  // 1. Check Central Boards
  if (comm.includes('staff selection') || comm.includes('ssc') || title.includes('ssc ')) {
    return CENTRAL_CONDUCTING_BOARDS.find(b => b.id === 'ssc');
  }
  if (comm.includes('railway') || comm.includes('rrb') || title.includes('rrb ')) {
    return CENTRAL_CONDUCTING_BOARDS.find(b => b.id === 'rrb');
  }
  if (comm.includes('union public') || comm.includes('upsc') || title.includes('upsc ')) {
    return CENTRAL_CONDUCTING_BOARDS.find(b => b.id === 'upsc');
  }
  if (comm.includes('ibps') || comm.includes('banking') || comm.includes('sbi') || comm.includes('rbi')) {
    return CENTRAL_CONDUCTING_BOARDS.find(b => b.id === 'banking');
  }

  // 2. Check State Boards for Telangana
  if (comm.includes('tslprb') || comm.includes('tgprb') || title.includes('police') || comm.includes('police')) {
    return STATE_CONDUCTING_BOARDS['Telangana']?.find(b => b.id === 'tslprb');
  }
  if (comm.includes('treirb') || title.includes('dsc') || comm.includes('dsc')) {
    return STATE_CONDUCTING_BOARDS['Telangana']?.find(b => b.id === 'tg_education');
  }
  if (comm.includes('mhsrb') || title.includes('mhsrb')) {
    return STATE_CONDUCTING_BOARDS['Telangana']?.find(b => b.id === 'tg_mhsrb');
  }
  if (title.includes('nit warangal') || comm.includes('nit warangal')) {
    return STATE_CONDUCTING_BOARDS['Telangana']?.find(b => b.id === 'tg_nit_warangal');
  }
  if (comm.includes('tsspdcl') || comm.includes('tsnpdcl') || comm.includes('transco') || comm.includes('genco')) {
    return STATE_CONDUCTING_BOARDS['Telangana']?.find(b => b.id === 'tg_power');
  }
  if (comm.includes('tgpsc') || comm.includes('tspsc') || title.includes('tgpsc') || soc.includes('telangana')) {
    return STATE_CONDUCTING_BOARDS['Telangana']?.find(b => b.id === 'tgpsc');
  }

  // 3. Check State Boards for Andhra Pradesh
  if (comm.includes('slprb') || (soc.includes('andhra') && (title.includes('police') || comm.includes('police')))) {
    return STATE_CONDUCTING_BOARDS['Andhra Pradesh']?.find(b => b.id === 'slprb_ap');
  }
  if (comm.includes('ap dsc') || title.includes('ap dsc')) {
    return STATE_CONDUCTING_BOARDS['Andhra Pradesh']?.find(b => b.id === 'ap_education');
  }
  if (comm.includes('appsc') || title.includes('appsc') || soc.includes('andhra')) {
    return STATE_CONDUCTING_BOARDS['Andhra Pradesh']?.find(b => b.id === 'appsc');
  }

  return undefined;
}

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
    comm.includes('union public') ||
    comm.includes('upsc') ||
    comm.includes('banking') ||
    comm.includes('ibps') ||
    comm.includes('state bank of india') ||
    comm.includes('sbi') ||
    comm.includes('reserve bank of india') ||
    comm.includes('rbi') ||
    comm.includes('national testing agency') ||
    comm.includes('nta')
  ) {
    return true;
  }

  // Central title keywords
  if (
    title.includes('ssc ') ||
    title.includes('cgl') ||
    title.includes('chsl') ||
    title.includes('rrb ') ||
    title.includes('ntpc') ||
    title.includes('upsc ') ||
    title.includes('civil services examination') ||
    title.includes('ibps ')
  ) {
    return true;
  }

  return false;
}

/**
 * Extracts and normalizes the state name for an examination, or returns null if it is Central.
 */
export function getExamState(exam: ExamRecord | { state_or_central?: string; commission?: string; title?: string }): string | null {
  if (isCentralExam(exam)) {
    return null;
  }

  const soc = (exam.state_or_central || '').trim();
  if (soc && !['central', 'national', 'all-india', 'union'].includes(soc.toLowerCase())) {
    // Check if it matches a known state name
    for (const s of INDIAN_STATES) {
      if (s.name.toLowerCase() === soc.toLowerCase()) {
        return s.name;
      }
    }
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

/**
 * Strips paper, stage, and test suffixes from an exam title to return ONLY the clean Exam Name.
 * e.g.:
 * - "APPSC Group-II Services: Screening Test (General Studies & Mental Ability)" -> "APPSC Group-II Services"
 * - "APPSC Executive Officer (Grade-III) Mains: Paper-I (General Studies & Mental Ability)" -> "APPSC Executive Officer (Grade-III)"
 * - "TGPSC Group-II Services: Paper I (General Studies & General Abilities)" -> "TGPSC Group-II Services"
 * - "SSC Combined Graduate Level (CGL) Examination: Tier-I" -> "SSC Combined Graduate Level (CGL) Examination"
 */
export function getCleanExamTitle(
  examOrTitle: ExamRecord | { title?: string; structure_scheme?: { exam_name?: string } } | string | undefined | null
): string {
  if (!examOrTitle) return '';
  const title = typeof examOrTitle === 'string' ? examOrTitle : (examOrTitle.title || '');
  if (!title) return '';

  const clean = title
    // Strip ": Paper ...", ": Screening ...", ": Mains ...", ": Tier ...", ": Preliminary ..."
    .replace(/\s*[:\-–—]\s*(?:Paper|Screening|Mains|Preliminary|Prelims|Tier|Part|PWT|Objective|Written)[\s\S]*/i, '')
    // Also handle cases like "APPSC Executive Officer (Grade-III) Mains: ..." or "APPSC Executive Officer (Grade-III) Screening Test: ..."
    .replace(/\s+(?:Mains|Screening(?:\s+Test)?|Preliminary(?:\s+Written\s+Test)?|Prelims)\s*[:\-–—]?[\s\S]*/i, '')
    // Also strip generic " - Preliminary Written Test (PWT) 2026"
    .replace(/\s*-\s*Preliminary\s+Written\s+Test[\s\S]*/i, '')
    // Also strip trailing "(General Studies...)" or similar paper parentheticals if any left
    .replace(/\s*\((?:General Studies|Screening Test|Paper|Tier|Part)[\s\S]*?\)/gi, '')
    .trim();

  return clean || title;
}

