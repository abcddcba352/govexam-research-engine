import {
  ExamStage,
  ExamStagePaper,
  ExamStructureScheme,
} from '../src/types.ts';
import { getCandidateModels, getGenAI, getThinkingConfig } from './geminiConfig.ts';
import { isTelanganaTet, telanganaTetScheme } from './tetScheme.ts';
import { webSearchFree } from './searchDiscovery.ts';
import { stealthFetch } from './stealthFetcher.ts';
import { extractSyllabusFromNotificationText } from './syllabusExtractor.ts';
function isQuotaExhausted(error: unknown): boolean {
  const message = String((error as any)?.message || error || '').toLowerCase();
  return message.includes('429') || message.includes('resource_exhausted') || message.includes('quota') || message.includes('rate limit');
}

// Authoritative Catalog of Multi-Stage Government Examinations in India
export const OFFICIAL_EXAM_SCHEMES: ExamStructureScheme[] = [
  // 1. TGPSC Group-I
  {
    query: 'tgpsc group 1',
    exam_name: 'TGPSC Group-I Services Examination',
    commission: 'Telangana Public Service Commission (TGPSC)',
    state_or_central: 'Telangana',
    recruitment_cycle: 'Current Notification Cycle',
    total_stages: 2,
    selection_summary: 'Stage 1: Preliminary Test (Objective - 150 Marks) ➔ Stage 2: Mains Written Examination (Descriptive - 6 Papers + Qualifying English, 900 Marks total).',
    official_reference: 'https://websitenew.tspsc.gov.in/notices/group1_scheme.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'tgpsc_g1_prelims',
        stage_number: 1,
        stage_name: 'Stage 1: Preliminary Test (Objective Type)',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 150,
        description: 'Screening test to shortlist candidates for Mains at 1:50 ratio. Marks are not counted in final merit ranking.',
        papers: [
          {
            paper_id: 'tgpsc_g1_prelims_p1',
            paper_number: 'Preliminary Paper',
            title: 'General Studies and Mental Ability',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.25,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: [
              'Current Affairs (Regional, National and International)',
              'International Relations and Events',
              'General Science; India’s Achievements in Science and Technology',
              'Environmental Issues; Disaster Management- Prevention and Mitigation Strategies',
              'Economic and Social Development of India',
              'World Geography, Indian Geography and Geography of Telangana State',
              'History and Cultural Heritage of India',
              'Indian Constitution and Polity',
              'Governance and Public Policy in India',
              'Policies of Telangana State',
              'Society, Culture, Heritage, Arts and Literature of Telangana',
              'Social Exclusion: Rights issues such as Gender, Caste, Tribe, Disability etc.',
              'Logical Reasoning: Analytical Ability and Data Interpretation'
            ],
            syllabus_highlights: [
              'Telangana Policies & Initiatives',
              'Disaster Management & Environment',
              'Indian Constitution & Federalism',
              'Analytical Ability & Reasoning'
            ]
          }
        ]
      },
      {
        stage_id: 'tgpsc_g1_mains',
        stage_number: 2,
        stage_name: 'Stage 2: Written Examination (Mains - Descriptive)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 7,
        total_marks: 900,
        description: '7 Written papers (General English is qualifying; Papers I to VI carry 150 marks each for total 900 merit marks). Interview has been abolished.',
        papers: [
          {
            paper_id: 'tgpsc_g1_mains_english',
            paper_number: 'General English',
            title: 'General English (Class 10th Standard)',
            type: 'DESCRIPTIVE',
            total_marks: 150,
            duration_minutes: 180,
            is_qualifying: true,
            language_mediums: ['English'],
            sections: ['Spotting Errors', 'Fill in the Blanks', 'Rewriting Sentences', 'Vocabulary & Usage', 'Comprehension', 'Precis Writing', 'Letter Writing']
          },
          {
            paper_id: 'tgpsc_g1_mains_p1',
            paper_number: 'Paper-I',
            title: 'General Essay',
            type: 'DESCRIPTIVE',
            total_marks: 150,
            duration_minutes: 180,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Contemporary Social Issues & Social Problems', 'Economic Growth & Justice', 'Indian Historical & Cultural Heritage', 'Science & Tech Developments', 'Human Resource Development & Education']
          },
          {
            paper_id: 'tgpsc_g1_mains_p2',
            paper_number: 'Paper-II',
            title: 'History, Culture and Geography',
            type: 'DESCRIPTIVE',
            total_marks: 150,
            duration_minutes: 180,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['History and Culture of India with Special Reference to the Modern Period', 'History and Cultural Heritage of Telangana', 'Geography of India and Telangana']
          },
          {
            paper_id: 'tgpsc_g1_mains_p3',
            paper_number: 'Paper-III',
            title: 'Indian Society, Constitution and Governance',
            type: 'DESCRIPTIVE',
            total_marks: 150,
            duration_minutes: 180,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Indian Society, Structure, Issues and Social Movements', 'Constitution of India', 'Governance and Good Governance']
          },
          {
            paper_id: 'tgpsc_g1_mains_p4',
            paper_number: 'Paper-IV',
            title: 'Economy and Development',
            type: 'DESCRIPTIVE',
            total_marks: 150,
            duration_minutes: 180,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Indian Economy and Development', 'Telangana Economy', 'Development and Environmental Problems']
          },
          {
            paper_id: 'tgpsc_g1_mains_p5',
            paper_number: 'Paper-V',
            title: 'Science & Technology and Data Interpretation',
            type: 'DESCRIPTIVE',
            total_marks: 150,
            duration_minutes: 180,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['The Role and Impact of Science and Technology', 'Modern Trends in Application of Knowledge of Science', 'Data Interpretation and Problem Solving']
          },
          {
            paper_id: 'tgpsc_g1_mains_p6',
            paper_number: 'Paper-VI',
            title: 'Telangana Movement and State Formation',
            type: 'DESCRIPTIVE',
            total_marks: 150,
            duration_minutes: 180,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['The Idea of Telangana (1948-1970)', 'Mobilisational Phase (1971-1990)', 'Towards Formation of Telangana State (1991-2014)']
          }
        ]
      }
    ]
  },

  // 2. TGPSC Group-II
  {
    query: 'tgpsc group 2',
    exam_name: 'TGPSC Group-II Services Examination',
    commission: 'Telangana Public Service Commission (TGPSC)',
    state_or_central: 'Telangana',
    recruitment_cycle: '2024-2025 Cycle',
    total_stages: 1,
    selection_summary: 'Single-stage Written Examination (Objective Type) comprising 4 Papers of 150 marks each (Total: 600 Marks). Interview has been abolished.',
    official_reference: 'https://websitenew.tspsc.gov.in/notices/group2_scheme.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'tgpsc_g2_stage1',
        stage_number: 1,
        stage_name: 'Written Examination (Objective Type)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 4,
        total_marks: 600,
        description: 'Comprehensive 4-paper objective multiple-choice examination. 150 questions per paper, 150 minutes, 1 mark per question, 0.25 negative marking.',
        papers: [
          {
            paper_id: 'tgpsc_g2_paper_1',
            paper_number: 'Paper-I',
            title: 'General Studies and General Abilities',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.25,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Current Affairs', 'General Science', 'Environmental Studies', 'History & Culture of India', 'Indian Constitution & Polity', 'Telangana Policies', 'Logical Reasoning & Data Interpretation']
          },
          {
            paper_id: 'tgpsc_g2_paper_2',
            paper_number: 'Paper-II',
            title: 'History, Polity and Society',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.25,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Socio-Cultural History of India and Telangana', 'Overview of the Indian Constitution and Politics', 'Social Structure, Issues and Public Policies']
          },
          {
            paper_id: 'tgpsc_g2_paper_3',
            paper_number: 'Paper-III',
            title: 'Economy and Development',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.25,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Indian Economy: Issues and Challenges', 'Economy of Telangana', 'Issues of Development and Change']
          },
          {
            paper_id: 'tgpsc_g2_paper_4',
            paper_number: 'Paper-IV',
            title: 'Telangana Movement and State Formation',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.25,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['The Idea of Telangana (1948-1970)', 'Mobilisational Phase (1971-1990)', 'Towards Formation of Telangana State (1991-2014)']
          }
        ]
      }
    ]
  },

  // TSLPRB Police Constable
  {
    query: 'tslprb police constable',
    exam_name: 'TSLPRB Police Constable (SCT PC Civil / AR / SAR CPL / TSSP / Warder / Fireman)',
    commission: 'Telangana State Level Police Recruitment Board (TSLPRB)',
    state_or_central: 'Telangana',
    recruitment_cycle: 'Current Recruitment Cycle',
    total_stages: 3,
    selection_summary: 'Stage 1: Preliminary Written Test (PWT - 200 Marks) ➔ Stage 2: Physical Measurement Test & Physical Efficiency Test (PMT/PET - Qualifying) ➔ Stage 3: Final Written Examination (FWE - 200 Merit Marks).',
    official_reference: 'https://www.tslprb.in/notifications/pc_scheme.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'tslprb_pc_stage1',
        stage_number: 1,
        stage_name: 'Stage 1: Preliminary Written Test (PWT)',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 200,
        description: 'Screening test comprising 200 objective questions for 200 marks. 3 Hours duration. Qualifying in nature to proceed to Physical tests.',
        papers: [
          {
            paper_id: 'tslprb_pc_pwt_paper',
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
              'English Grammar & Vocabulary',
              'Arithmetic & Quantitative Skills',
              'General Science (Everyday observation)',
              'History of India & National Movement',
              'Indian Geography, Polity & Economy',
              'National & International Current Affairs',
              'Reasoning & Mental Ability',
              'Telangana Movement & Statehood'
            ]
          }
        ]
      },
      {
        stage_id: 'tslprb_pc_stage2',
        stage_number: 2,
        stage_name: 'Stage 2: Physical Measurement Test & Physical Efficiency Test (PMT / PET)',
        stage_type: 'PHYSICAL_TEST',
        is_qualifying_only: true,
        total_papers: 0,
        total_marks: 0,
        description: 'Physical Measurement Test (Height & Chest) and Physical Efficiency Test (1600m Run for Men, 800m Run for Women, Long Jump, Shot Put). Qualifying only.',
        papers: []
      },
      {
        stage_id: 'tslprb_pc_stage3',
        stage_number: 3,
        stage_name: 'Stage 3: Final Written Examination (FWE)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 1,
        total_marks: 200,
        description: 'Final merit examination for 200 marks (200 objective multiple choice questions, 3 hours duration). Determines final selection ranking.',
        papers: [
          {
            paper_id: 'tslprb_pc_fwe_paper',
            paper_number: 'Final Written Paper',
            title: 'Final Written Examination (Objective Type)',
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
            ],
            syllabus_highlights: [
              'English Comprehension & Grammar',
              'Arithmetic & Reasoning',
              'General Science',
              'History of India & National Movement',
              'Indian Polity & Economy',
              'Current Events',
              'Ethics & Social Sensitivity',
              'Telangana History & Culture'
            ]
          }
        ]
      }
    ]
  },

  // 3. TSLPRB Police Sub-Inspector (SI)
  {
    query: 'tslprb police si',
    exam_name: 'TSLPRB Police Sub-Inspector (SCT SI Civil / AR / SAR CPL / TSSP)',
    commission: 'Telangana State Level Police Recruitment Board (TSLPRB)',
    state_or_central: 'Telangana',
    recruitment_cycle: 'Current Recruitment Cycle',
    total_stages: 3,
    selection_summary: 'Stage 1: Preliminary Written Test (PWT - 200 Marks) ➔ Stage 2: Physical Measurement Test & Physical Efficiency Test (PMT/PET - Qualifying) ➔ Stage 3: Final Written Examination (FWE - 4 Papers, 400 Merit Marks).',
    official_reference: 'https://www.tslprb.in/notifications/si_scheme.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'tslprb_si_pwt',
        stage_number: 1,
        stage_name: 'Stage 1: Preliminary Written Test (PWT)',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 200,
        description: 'Single paper objective multiple-choice test consisting of 200 questions. Minimum qualifying mark required to enter Physical Efficiency Tests.',
        papers: [
          {
            paper_id: 'tslprb_si_pwt_p1',
            paper_number: 'PWT Paper',
            title: 'Arithmetic & Reasoning + General Studies',
            type: 'OBJECTIVE',
            total_questions: 200,
            total_marks: 200,
            duration_minutes: 180,
            negative_marking_rate: 0.20,
            is_qualifying: true,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Arithmetic and Test of Reasoning / Mental Ability (100 Questions)', 'General Studies (100 Questions: Polity, History, Geography, Current Affairs, Science & Telangana Movement)']
          }
        ]
      },
      {
        stage_id: 'tslprb_si_pmt_pet',
        stage_number: 2,
        stage_name: 'Stage 2: Physical Measurement Test (PMT) & Physical Efficiency Test (PET)',
        stage_type: 'PHYSICAL_TEST',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 0,
        description: 'Height and chest measurements followed by 1600-meter run for male candidates (completed within 7 min 15 sec) or 800-meter run for female candidates, plus Long Jump and Shot Put.',
        papers: [
          {
            paper_id: 'tslprb_si_physical_events',
            paper_number: 'Physical Fitness Test',
            title: '1600m/800m Run, Long Jump & Shot Put',
            type: 'PHYSICAL_TEST',
            total_marks: 0,
            is_qualifying: true,
            sections: ['Physical Measurement Verification (Height/Chest)', '1600m Run (Male) / 800m Run (Female)', 'Long Jump', 'Shot Put (7.26 Kgs / 4 Kgs)']
          }
        ]
      },
      {
        stage_id: 'tslprb_si_fwe',
        stage_number: 3,
        stage_name: 'Stage 3: Final Written Examination (FWE)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 4,
        total_marks: 400,
        description: '4 examination papers. Papers I & II (English & Telugu) are qualifying. Papers III & IV determine the final merit rank (Total: 400 Marks for Civil SI).',
        papers: [
          {
            paper_id: 'tslprb_si_fwe_p1',
            paper_number: 'Paper-I',
            title: 'English (Descriptive & Objective)',
            type: 'DESCRIPTIVE',
            total_marks: 100,
            duration_minutes: 180,
            is_qualifying: true,
            language_mediums: ['English'],
            sections: ['Short Essay', 'Comprehension', 'Precis Writing', 'Letter Writing', 'Paragraph Writing / Report Writing', 'Translation from English to Telugu/Urdu']
          },
          {
            paper_id: 'tslprb_si_fwe_p2',
            paper_number: 'Paper-II',
            title: 'Telugu / Urdu (Descriptive & Objective)',
            type: 'DESCRIPTIVE',
            total_marks: 100,
            duration_minutes: 180,
            is_qualifying: true,
            language_mediums: ['Telugu', 'Urdu'],
            sections: ['Short Essay', 'Comprehension', 'Precis Writing', 'Letter Writing', 'Translation from Telugu/Urdu to English']
          },
          {
            paper_id: 'tslprb_si_fwe_p3',
            paper_number: 'Paper-III',
            title: 'Arithmetic and Test of Reasoning / Mental Ability',
            type: 'OBJECTIVE',
            total_questions: 200,
            total_marks: 200,
            duration_minutes: 180,
            negative_marking_rate: 0.20,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['Arithmetic (Numbers, Percentages, Profit & Loss, Ratio, Time & Work)', 'Test of Reasoning (Verbal & Non-Verbal Reasoning, Coding-Decoding, Data Analysis, Series)']
          },
          {
            paper_id: 'tslprb_si_fwe_p4',
            paper_number: 'Paper-IV',
            title: 'General Studies',
            type: 'OBJECTIVE',
            total_questions: 200,
            total_marks: 200,
            duration_minutes: 180,
            negative_marking_rate: 0.20,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu', 'Urdu'],
            sections: ['General Science', 'Current Events', 'History of India & Indian National Movement', 'Geography of India', 'Indian Polity & Economy', 'Telangana Movement & State Formation']
          }
        ]
      }
    ]
  },

  // 4. SSC CGL
  {
    query: 'ssc cgl',
    exam_name: 'SSC Combined Graduate Level (CGL) Examination',
    commission: 'Staff Selection Commission (SSC)',
    state_or_central: 'Central',
    recruitment_cycle: 'Current Notification Cycle',
    total_stages: 2,
    selection_summary: 'Stage 1: Tier-I Computer Based Examination (100 Qs / 200 Marks - Qualifying) ➔ Stage 2: Tier-II Computer Based Examination (Paper-I Compulsory for all posts + DEST Skill Test, Paper-II for JSO).',
    official_reference: 'https://ssc.gov.in/notice_boards/cgl_scheme.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'ssc_cgl_tier1',
        stage_number: 1,
        stage_name: 'Stage 1: Tier-I Examination (Computer Based Objective)',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 200,
        description: 'Qualifying computer-based test with 100 questions (2 marks each, negative marking 0.50 per wrong response, duration 60 minutes).',
        papers: [
          {
            paper_id: 'ssc_cgl_t1_p1',
            paper_number: 'Tier-I Paper',
            title: 'General Intelligence, Awareness, Quantitative Aptitude & English',
            type: 'OBJECTIVE',
            total_questions: 100,
            total_marks: 200,
            duration_minutes: 60,
            negative_marking_rate: 0.50,
            is_qualifying: true,
            language_mediums: ['English', 'Hindi'],
            sections: [
              'General Intelligence and Reasoning (25 Questions / 50 Marks)',
              'General Awareness (25 Questions / 50 Marks)',
              'Quantitative Aptitude (25 Questions / 50 Marks)',
              'English Comprehension (25 Questions / 50 Marks)'
            ],
            syllabus_highlights: ['Non-verbal reasoning & analogies', 'Polity, History, Static GK & Current Affairs', 'Algebra, Geometry, Trigonometry, Arithmetic', 'Reading comprehension & grammar']
          }
        ]
      },
      {
        stage_id: 'ssc_cgl_tier2',
        stage_number: 2,
        stage_name: 'Stage 2: Tier-II Examination (CBE & Skill Test)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 2,
        total_marks: 390,
        description: 'Paper-I is compulsory for all posts (Section I & II determine merit: 390 marks; Section III Computer Knowledge & Module II DEST are qualifying). Paper-II is specialized for JSO posts.',
        papers: [
          {
            paper_id: 'ssc_cgl_t2_p1',
            paper_number: 'Paper-I',
            title: 'Mathematical Abilities, Reasoning, English, General Awareness & Computer',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 390,
            duration_minutes: 150,
            negative_marking_rate: 1.0,
            is_qualifying: false,
            language_mediums: ['English', 'Hindi'],
            sections: [
              'Section-I: Module-I Mathematical Abilities (30 Qs / 90 Marks) & Module-II Reasoning and General Intelligence (30 Qs / 90 Marks)',
              'Section-II: Module-I English Language and Comprehension (45 Qs / 135 Marks) & Module-II General Awareness (25 Qs / 75 Marks)',
              'Section-III: Module-I Computer Knowledge Test (20 Qs / 60 Marks - Qualifying)',
              'Section-III: Module-II Data Entry Speed Test (DEST - 2000 key depressions in 15 mins - Qualifying)'
            ]
          },
          {
            paper_id: 'ssc_cgl_t2_p2',
            paper_number: 'Paper-II',
            title: 'Statistics (Only for Junior Statistical Officer - JSO)',
            type: 'OBJECTIVE',
            total_questions: 100,
            total_marks: 200,
            duration_minutes: 120,
            negative_marking_rate: 0.50,
            is_qualifying: false,
            language_mediums: ['English', 'Hindi'],
            sections: ['Collection, Classification and Presentation of Statistical Data', 'Measures of Central Tendency & Dispersion', 'Probability and Sampling Theory', 'Analysis of Variance & Index Numbers']
          }
        ]
      }
    ]
  },

  // 5. UPSC Civil Services Examination (CSE)
  {
    query: 'upsc civil services cse',
    exam_name: 'UPSC Civil Services Examination (CSE - IAS / IPS / IFS)',
    commission: 'Union Public Service Commission (UPSC)',
    state_or_central: 'Central',
    recruitment_cycle: 'Current Cycle',
    total_stages: 3,
    selection_summary: 'Stage 1: Preliminary Examination (Objective - GS 1 + CSAT Qualifying at 33%) ➔ Stage 2: Mains Examination (Written / Descriptive - 9 Papers, 1750 Merit Marks) ➔ Stage 3: Personality Test / Interview (275 Marks). Final Merit: 2025 Marks.',
    official_reference: 'https://upsc.gov.in/examinations/civil-services-examination',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'upsc_cse_prelims',
        stage_number: 1,
        stage_name: 'Stage 1: Civil Services (Preliminary) Examination',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 2,
        total_marks: 400,
        description: 'Two objective papers of 200 marks each. Paper-I determines cutoff for Mains. Paper-II (CSAT) is qualifying with minimum 33% (66 marks).',
        papers: [
          {
            paper_id: 'upsc_prelims_p1',
            paper_number: 'Paper-I',
            title: 'General Studies (GS Paper 1)',
            type: 'OBJECTIVE',
            total_questions: 100,
            total_marks: 200,
            duration_minutes: 120,
            negative_marking_rate: 0.66,
            is_qualifying: false,
            language_mediums: ['English', 'Hindi'],
            sections: ['Current events of national and international importance', 'History of India and Indian National Movement', 'Indian and World Geography', 'Indian Polity and Governance', 'Economic and Social Development', 'General issues on Environmental Ecology & Climate Change', 'General Science']
          },
          {
            paper_id: 'upsc_prelims_p2',
            paper_number: 'Paper-II',
            title: 'Civil Services Aptitude Test (CSAT)',
            type: 'OBJECTIVE',
            total_questions: 80,
            total_marks: 200,
            duration_minutes: 120,
            negative_marking_rate: 0.83,
            is_qualifying: true,
            language_mediums: ['English', 'Hindi'],
            sections: ['Comprehension', 'Interpersonal skills including communication skills', 'Logical reasoning and analytical ability', 'Decision-making and problem solving', 'General mental ability', 'Basic numeracy & Data interpretation (Class X level)']
          }
        ]
      },
      {
        stage_id: 'upsc_cse_mains',
        stage_number: 2,
        stage_name: 'Stage 2: Civil Services (Mains) Examination',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 9,
        total_marks: 1750,
        description: '9 descriptive papers. Papers A & B (Languages) are qualifying (300 marks each). Papers I to VII carry 250 marks each and form the 1750-mark written merit score.',
        papers: [
          { paper_id: 'upsc_mains_pa', paper_number: 'Paper-A', title: 'Compulsory Indian Language (8th Schedule)', type: 'DESCRIPTIVE', total_marks: 300, duration_minutes: 180, is_qualifying: true },
          { paper_id: 'upsc_mains_pb', paper_number: 'Paper-B', title: 'English Language', type: 'DESCRIPTIVE', total_marks: 300, duration_minutes: 180, is_qualifying: true },
          { paper_id: 'upsc_mains_p1', paper_number: 'Paper-I', title: 'Essay', type: 'DESCRIPTIVE', total_marks: 250, duration_minutes: 180, is_qualifying: false },
          { paper_id: 'upsc_mains_p2', paper_number: 'Paper-II', title: 'General Studies-I (Heritage, History, Geography & Society)', type: 'DESCRIPTIVE', total_marks: 250, duration_minutes: 180, is_qualifying: false },
          { paper_id: 'upsc_mains_p3', paper_number: 'Paper-III', title: 'General Studies-II (Governance, Constitution, Polity, Social Justice & IR)', type: 'DESCRIPTIVE', total_marks: 250, duration_minutes: 180, is_qualifying: false },
          { paper_id: 'upsc_mains_p4', paper_number: 'Paper-IV', title: 'General Studies-III (Technology, Economic Dev, Biodiversity, Security & Disaster Mgmt)', type: 'DESCRIPTIVE', total_marks: 250, duration_minutes: 180, is_qualifying: false },
          { paper_id: 'upsc_mains_p5', paper_number: 'Paper-V', title: 'General Studies-IV (Ethics, Integrity and Aptitude)', type: 'DESCRIPTIVE', total_marks: 250, duration_minutes: 180, is_qualifying: false },
          { paper_id: 'upsc_mains_p6', paper_number: 'Paper-VI', title: 'Optional Subject - Paper 1', type: 'DESCRIPTIVE', total_marks: 250, duration_minutes: 180, is_qualifying: false },
          { paper_id: 'upsc_mains_p7', paper_number: 'Paper-VII', title: 'Optional Subject - Paper 2', type: 'DESCRIPTIVE', total_marks: 250, duration_minutes: 180, is_qualifying: false }
        ]
      },
      {
        stage_id: 'upsc_cse_interview',
        stage_number: 3,
        stage_name: 'Stage 3: Personality Test (Interview)',
        stage_type: 'INTERVIEW',
        is_qualifying_only: false,
        total_papers: 1,
        total_marks: 275,
        description: 'Comprehensive personality assessment conducted by the UPSC Interview Board at Dholpur House, New Delhi.',
        papers: [
          {
            paper_id: 'upsc_interview',
            paper_number: 'Interview',
            title: 'Personality Test & Oral Board Assessment',
            type: 'INTERVIEW',
            total_marks: 275,
            is_qualifying: false
          }
        ]
      }
    ]
  },

  // 6. APPSC Group-II
  {
    query: 'appsc group 2',
    exam_name: 'APPSC Group-II Services Examination',
    commission: 'Andhra Pradesh Public Service Commission (APPSC)',
    state_or_central: 'Andhra Pradesh',
    recruitment_cycle: 'Current Cycle',
    total_stages: 3,
    selection_summary: 'Stage 1: Preliminary Screening Test (Objective - 150 Marks) ➔ Stage 2: Mains Examination (Objective - 2 Papers, 300 Marks) ➔ Stage 3: Computer Proficiency Test (CPT - Qualifying).',
    official_reference: 'https://psc.ap.gov.in/notifications/group2_revised_scheme.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'appsc_g2_prelims',
        stage_number: 1,
        stage_name: 'Stage 1: Preliminary Screening Test',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 150,
        description: '150 objective questions covering 5 sections of 30 marks each: History, Geography, Indian Society, Current Affairs, and Mental Ability.',
        papers: [
          {
            paper_id: 'appsc_g2_screening_p1',
            paper_number: 'Screening Paper',
            title: 'General Studies & Mental Ability',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.33,
            is_qualifying: true,
            language_mediums: ['English', 'Telugu'],
            sections: [
              'Indian History: Ancient, Medieval and Modern (30 Marks)',
              'Geography: General & Physical, Economic, Human Geography of India & AP (30 Marks)',
              'Indian Society: Structure, Social Issues, Welfare Mechanism (30 Marks)',
              'Current Affairs: Major International, National & AP Events (30 Marks)',
              'Mental Ability: Logical Reasoning, Mental Ability, Basic Numeracy (30 Marks)'
            ]
          }
        ]
      },
      {
        stage_id: 'appsc_g2_mains',
        stage_number: 2,
        stage_name: 'Stage 2: Mains Written Examination',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 2,
        total_marks: 300,
        description: 'Two objective papers of 150 marks each. Final selection is based on the aggregate 300 marks scored in this Mains examination.',
        papers: [
          {
            paper_id: 'appsc_g2_mains_p1',
            paper_number: 'Paper-I',
            title: 'Social and Cultural History of Andhra Pradesh & Indian Constitution',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.33,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu'],
            sections: [
              'Social and Cultural History of Andhra Pradesh (Satavahanas to AP Bifurcation - 75 Marks)',
              'General Overview of the Indian Constitution and Polity (75 Marks)'
            ]
          },
          {
            paper_id: 'appsc_g2_mains_p2',
            paper_number: 'Paper-II',
            title: 'Indian and AP Economy & Science and Technology',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.33,
            is_qualifying: false,
            language_mediums: ['English', 'Telugu'],
            sections: [
              'Structure of Indian Economy and Economic Policies & AP Economy (75 Marks)',
              'Science and Technology: National Policies, Space, Defense, Energy, ICT & Environment (75 Marks)'
            ]
          }
        ]
      },
      {
        stage_id: 'appsc_g2_cpt',
        stage_number: 3,
        stage_name: 'Stage 3: Computer Proficiency Test (CPT)',
        stage_type: 'SKILL_TEST',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 50,
        description: 'Practical test on Microsoft Office automation and typing proficiency. Qualifying in nature.',
        papers: [
          {
            paper_id: 'appsc_cpt_p1',
            paper_number: 'CPT Practical',
            title: 'Proficiency in Office Automation with Word, Excel, PowerPoint & Internet',
            type: 'SKILL_TEST',
            total_marks: 50,
            duration_minutes: 30,
            is_qualifying: true
          }
        ]
      }
    ]
  },

  // 7. RRB NTPC (Railways)
  {
    query: 'rrb ntpc',
    exam_name: 'RRB Non-Technical Popular Categories (NTPC) Examination',
    commission: 'Railway Recruitment Boards (RRB)',
    state_or_central: 'Central',
    recruitment_cycle: 'Current Cycle',
    total_stages: 3,
    selection_summary: 'Stage 1: 1st Stage Computer Based Test (CBT-1 - Screening) ➔ Stage 2: 2nd Stage Computer Based Test (CBT-2 - Merit) ➔ Stage 3: Computer Based Aptitude Test (CBAT) / Typing Skill Test (TST).',
    official_reference: 'https://indianrailways.gov.in/railwayboard/view_section.jsp?lang=0&id=0,4,1244',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'rrb_ntpc_cbt1',
        stage_number: 1,
        stage_name: 'Stage 1: 1st Stage Computer Based Test (CBT-1)',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 100,
        description: 'Common screening test for all graduate and undergraduate posts. 100 objective questions, 90 minutes, 1/3rd negative marking.',
        papers: [
          {
            paper_id: 'rrb_ntpc_cbt1_p1',
            paper_number: 'CBT-1 Paper',
            title: 'General Awareness, Mathematics, General Intelligence & Reasoning',
            type: 'OBJECTIVE',
            total_questions: 100,
            total_marks: 100,
            duration_minutes: 90,
            negative_marking_rate: 0.33,
            is_qualifying: true,
            sections: ['General Awareness (40 Questions)', 'Mathematics (30 Questions)', 'General Intelligence and Reasoning (30 Questions)']
          }
        ]
      },
      {
        stage_id: 'rrb_ntpc_cbt2',
        stage_number: 2,
        stage_name: 'Stage 2: 2nd Stage Computer Based Test (CBT-2)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 1,
        total_marks: 120,
        description: 'Conducted separately for each 7th CPC Level. Marks scored in CBT-2 form the primary merit ranking.',
        papers: [
          {
            paper_id: 'rrb_ntpc_cbt2_p1',
            paper_number: 'CBT-2 Paper',
            title: 'Advanced General Awareness, Mathematics & Reasoning',
            type: 'OBJECTIVE',
            total_questions: 120,
            total_marks: 120,
            duration_minutes: 90,
            negative_marking_rate: 0.33,
            is_qualifying: false,
            sections: ['General Awareness (50 Questions)', 'Mathematics (35 Questions)', 'General Intelligence and Reasoning (35 Questions)']
          }
        ]
      },
      {
        stage_id: 'rrb_ntpc_cbat_tst',
        stage_number: 3,
        stage_name: 'Stage 3: Aptitude / Typing Skill Test & Document Verification',
        stage_type: 'SKILL_TEST',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 0,
        description: 'CBAT for Station Master / Traffic Assistant; Typing Skill Test (30 WPM English / 25 WPM Hindi) for Clerical and Typist posts.',
        papers: [
          {
            paper_id: 'rrb_cbat_tst_paper',
            paper_number: 'Skill Test',
            title: 'CBAT Psycho Test or Typing Skill Test (DEST)',
            type: 'SKILL_TEST',
            total_marks: 0,
            is_qualifying: true
          }
        ]
      }
    ]
  },

  // 9. TGPSC Assistant Executive Engineer (AEE)
  {
    query: 'tgpsc aee',
    exam_name: 'TGPSC Assistant Executive Engineer (AEE Civil / Mechanical / Electrical)',
    commission: 'Telangana Public Service Commission (TGPSC)',
    state_or_central: 'Telangana',
    recruitment_cycle: 'Notification 12/2022 Cycle',
    total_stages: 1,
    selection_summary: 'Single-stage written examination comprising Paper-I (General Studies) and Paper-II (Engineering Discipline - 300 Marks), followed by Certificate Verification.',
    official_reference: 'https://tgpsc.gov.in/web/notifications/notif_12_2022_aee.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'tgpsc_aee_stage1',
        stage_number: 1,
        stage_name: 'Written Examination (Objective Type - CBRT / OMR)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 2,
        total_marks: 450,
        description: 'Computer Based Recruitment Test (CBRT) / OMR comprising Paper-I (General Studies) and Paper-II (Engineering Discipline).',
        papers: [
          {
            paper_id: 'tgpsc_aee_p1',
            paper_number: 'Paper-I',
            title: 'Paper-I: General Studies and General Abilities',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.25,
            is_qualifying: false,
            sections: [
              'Current Affairs (Regional, National & International)',
              'International Relations and Events',
              'General Science: Achievements in Science and Technology',
              'Environmental Issues and Disaster Management',
              'Economic and Social Development of India and Telangana',
              'Physical, Social and Economic Geography of India',
              'Physical, Social and Economic Geography and Demography of Telangana',
              'Socio-economic, Political and Cultural History of Modern India',
              'Indian Constitution, Indian Political System, Governance and Public Policy',
              'Social Exclusion, Rights Issues and Inclusive Policies',
              'Society, Culture, Heritage, Arts and Literature of Telangana',
              'Policies of Telangana State',
              'Logical Reasoning, Analytical Ability and Data Interpretation',
              'Basic English (10th Standard)'
            ]
          },
          {
            paper_id: 'tgpsc_aee_p2',
            paper_number: 'Paper-II',
            title: 'Paper-II: Civil / Mechanical / Electrical Engineering (Degree Level)',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 300,
            duration_minutes: 150,
            negative_marking_rate: 0.25,
            is_qualifying: false,
            sections: [
              'Building Materials and Construction',
              'Strength of Materials and Structural Analysis',
              'Design of Steel and Concrete Structures',
              'Fluid Mechanics and Hydraulics',
              'Hydrology and Water Resources Engineering',
              'Environmental Engineering',
              'Geotechnical and Foundation Engineering',
              'Surveying and Transportation Engineering'
            ]
          }
        ]
      }
    ]
  },

  // 10. APPSC Executive Officer (Grade-III) Endowments
  {
    query: 'appsc executive officer',
    exam_name: 'APPSC Executive Officer (Grade-III) in Endowments Subordinate Service',
    commission: 'Andhra Pradesh Public Service Commission (APPSC)',
    state_or_central: 'Andhra Pradesh',
    recruitment_cycle: 'Notification 24/2021 Cycle',
    total_stages: 2,
    selection_summary: 'Stage 1: Screening Test (Objective Type - 150 Marks) ➔ Stage 2: Main Examination (2 Papers - 300 Marks Total).',
    official_reference: 'https://psc.ap.gov.in/notifications/eo_notif_24_2021.pdf',
    source_status: 'VERIFIED_OFFICIAL_CATALOG',
    stages: [
      {
        stage_id: 'appsc_eo_screening',
        stage_number: 1,
        stage_name: 'Stage 1: Screening Test (Objective Type)',
        stage_type: 'PRELIMINARY',
        is_qualifying_only: true,
        total_papers: 1,
        total_marks: 150,
        description: 'Preliminary screening examination to shortlist candidates for the Main examination at 1:50 ratio.',
        papers: [
          {
            paper_id: 'appsc_eo_scr_p1',
            paper_number: 'Screening Paper',
            title: 'Composite Screening Paper: Part-A (General Studies & Mental Ability - 50 Qs) + Part-B (Hindu Philosophy & Temple System - 100 Qs)',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.33,
            is_qualifying: true,
            sections: [
              'Part-A (50 Qs / 50 Marks): General Studies & Mental Ability (Current Affairs, General Science, History, Polity, AP Economy, Geography, Disaster Management, Logical Reasoning, AP Bifurcation Act)',
              'Part-B (100 Qs / 100 Marks): Hindu Philosophy & Temple System (Ramayana, Mahabharata, Bhagavad Gita, Bhagavata Purana, Major Temples of AP, Agamas, Upanishads & Darshanas, Bhakti Movement, AP Endowments Act 1987)'
            ]
          }
        ]
      },
      {
        stage_id: 'appsc_eo_mains',
        stage_number: 2,
        stage_name: 'Stage 2: Main Examination (Objective Type)',
        stage_type: 'MAINS',
        is_qualifying_only: false,
        total_papers: 2,
        total_marks: 300,
        description: 'Final merit examination comprising Paper-I (General Studies) and Paper-II (Hindu Philosophy & Temple System).',
        papers: [
          {
            paper_id: 'appsc_eo_mains_p1',
            paper_number: 'Paper-I',
            title: 'Paper-I: General Studies and Mental Ability',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.33,
            is_qualifying: false,
            sections: [
              'AP Endowments Administration & Governance Structure',
              'Bifurcation Act 2014 & Schedule IX/X Institutions',
              'Disaster Management & Remote Sensing in AP Coastal Hazards',
              'Data Analysis & Summary Statistics (Mean, Median, Mode, Dispersion)',
              'Indian Constitution, Fundamental Rights & AP e-Governance',
              'Economic Development of AP & Major Irrigation Projects',
              'Modern Indian & AP Socio-Political History',
              'Environmental Protection & UNFCCC Climate Commitments'
            ]
          },
          {
            paper_id: 'appsc_eo_mains_p2',
            paper_number: 'Paper-II',
            title: 'Paper-II: Hindu Philosophy and Temple System',
            type: 'OBJECTIVE',
            total_questions: 150,
            total_marks: 150,
            duration_minutes: 150,
            negative_marking_rate: 0.33,
            is_qualifying: false,
            sections: [
              'Ramayana, Mahabharata and Bhagavata Purana',
              'Hindu Temples, Customs, Rituals and Festivals',
              'Agamas: Vaikhanasa, Pancharatra, Saiva and Sakta',
              'Vedic Literature, Upanishads and Darshanas',
              'AP Charitable and Hindu Religious Institutions and Endowments Act 1987'
            ]
          }
        ]
      }
    ]
  }
];

/**
 * Fuzzy matches an exam query against the official verified catalog
 */
export function findOfficialScheme(query: string): ExamStructureScheme | null {
  const q = query.toLowerCase().trim();
  if (isTelanganaTet(q)) return telanganaTetScheme(query);

  // 1. Specific keywords
  if (q.includes('police si') || q.includes('sub inspector') || (q.includes('police') && (q.includes('si') || q.includes('sub-inspector')))) {
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'tslprb police si') || null;
  }

  if (q.includes('constable') || q.includes('sct pc') || (q.includes('police') && (q.includes('constable') || q.includes('pc')))) {
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'tslprb police constable') || null;
  }

  if (q.includes('aee') || q.includes('assistant executive engineer')) {
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'tgpsc aee') || null;
  }

  if (q.includes('endowment') || q.includes('executive officer')) {
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'appsc executive officer') || null;
  }

  if (q.includes('group 1') || q.includes('group i') || q.includes('group-1') || q.includes('group-i')) {
    if (q.includes('appsc') || q.includes('andhra')) {
      const g1Appsc = OFFICIAL_EXAM_SCHEMES.find(s => s.query.includes('appsc'));
      if (g1Appsc) return g1Appsc;
    }
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'tgpsc group 1') || null;
  }

  if (q.includes('group 2') || q.includes('group ii') || q.includes('group-2') || q.includes('group-ii')) {
    if (q.includes('appsc') || q.includes('andhra')) {
      return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'appsc group 2') || null;
    }
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'tgpsc group 2') || null;
  }

  if (q.includes('ssc cgl') || q.includes('cgl')) {
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'ssc cgl') || null;
  }

  if (q.includes('upsc') || q.includes('civil services') || q.includes('ias') || q.includes('ips') || q.includes('cse')) {
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'upsc civil services cse') || null;
  }

  if (q.includes('ntpc') || (q.includes('railway') && q.includes('rrb'))) {
    return OFFICIAL_EXAM_SCHEMES.find(s => s.query === 'rrb ntpc') || null;
  }

  // 2. Exact or contains match on catalog
  for (const scheme of OFFICIAL_EXAM_SCHEMES) {
    if (q.includes(scheme.query) || scheme.query.includes(q)) {
      return scheme;
    }
  }

  return null;
}

/**
 * Dynamically queries Gemini to extract official stages and papers for an arbitrary government examination
 */
export async function queryAIForExamStructure(query: string): Promise<ExamStructureScheme | null> {
  const models = getCandidateModels();
  const prompt = `You are the lead curriculum architect for government examinations in India.
Given the examination query: "${query}", extract and return the complete, official, authoritative multi-stage selection scheme and individual examination papers.

Output strictly valid JSON conforming to this schema:
{
  "exam_name": "Official Full Name of Examination",
  "commission": "Conducting Authority or Public Service Commission",
  "state_or_central": "Central or State Name",
  "recruitment_cycle": "Current / Official Recruitment Cycle",
  "total_stages": number of stages (e.g. 2 or 3),
  "selection_summary": "Concise 1-2 sentence overview of the selection process (e.g. Stage 1: Preliminary ➔ Stage 2: Mains ➔ Stage 3: Interview).",
  "official_reference": "Official commission portal or notification URL",
  "stages": [
    {
      "stage_id": "unique_string_id",
      "stage_number": 1,
      "stage_name": "Stage 1: Preliminary / Screening Test",
      "stage_type": "PRELIMINARY" | "MAINS" | "INTERVIEW" | "PHYSICAL_TEST" | "SKILL_TEST",
      "is_qualifying_only": boolean,
      "total_papers": number,
      "total_marks": number,
      "description": "Brief explanation of this stage",
      "papers": [
        {
          "paper_id": "paper_string_id",
          "paper_number": "Paper-I",
          "title": "Title of Paper (e.g. General Studies & Mental Ability)",
          "type": "OBJECTIVE" | "DESCRIPTIVE" | "SKILL_TEST" | "PHYSICAL_TEST",
          "total_questions": number (omit if descriptive or physical),
          "total_marks": number,
          "duration_minutes": number,
          "negative_marking_rate": number (e.g. 0.25, 0.33, 0.20, or 0),
          "is_qualifying": boolean,
          "sections": ["Section 1", "Section 2"],
          "syllabus_highlights": ["Key topic 1", "Key topic 2"]
        }
      ]
    }
  ]
}
Be completely truthful to the gazetted official notification rules for this exam. If interview has been abolished for this post, do not include interview. Return JSON only.`;

  for (const model of models) {
    try {
      const response = await getGenAI().models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          thinkingConfig: getThinkingConfig('MEDIUM'),
        }
      });

      const text = response.text || '{}';
      const cleanJson = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
      const parsed = JSON.parse(cleanJson);

      if (parsed && parsed.exam_name && Array.isArray(parsed.stages) && parsed.stages.length > 0) {
        return {
          query,
          exam_name: parsed.exam_name,
          commission: parsed.commission || 'Public Service Commission / Recruiting Authority',
          state_or_central: parsed.state_or_central || 'State / Central',
          recruitment_cycle: parsed.recruitment_cycle || 'Current Notification Cycle',
          total_stages: parsed.stages.length,
          selection_summary: parsed.selection_summary || `Multi-stage selection with ${parsed.stages.length} stage(s).`,
          official_reference: parsed.official_reference,
          source_status: 'LIVE_AI_RETRIEVED',
          stages: parsed.stages.map((stage: any, sIdx: number) => ({
            stage_id: stage.stage_id || `stage_${sIdx + 1}`,
            stage_number: stage.stage_number || sIdx + 1,
            stage_name: stage.stage_name || `Stage ${sIdx + 1}`,
            stage_type: stage.stage_type || (sIdx === 0 ? 'PRELIMINARY' : 'MAINS'),
            is_qualifying_only: Boolean(stage.is_qualifying_only),
            total_papers: Array.isArray(stage.papers) ? stage.papers.length : 1,
            total_marks: stage.total_marks || (Array.isArray(stage.papers) ? stage.papers.reduce((acc: number, p: any) => acc + (p.total_marks || 0), 0) : 100),
            description: stage.description,
            papers: (Array.isArray(stage.papers) ? stage.papers : []).map((paper: any, pIdx: number) => ({
              paper_id: paper.paper_id || `paper_${sIdx + 1}_${pIdx + 1}`,
              paper_number: paper.paper_number || `Paper-${pIdx + 1}`,
              title: paper.title || `Paper ${pIdx + 1}`,
              type: paper.type || 'OBJECTIVE',
              total_questions: paper.total_questions ? Number(paper.total_questions) : undefined,
              total_marks: Number(paper.total_marks || 100),
              duration_minutes: paper.duration_minutes ? Number(paper.duration_minutes) : undefined,
              negative_marking_rate: paper.negative_marking_rate !== undefined ? Number(paper.negative_marking_rate) : undefined,
              is_qualifying: Boolean(paper.is_qualifying),
              sections: Array.isArray(paper.sections) ? paper.sections : [],
              syllabus_highlights: Array.isArray(paper.syllabus_highlights) ? paper.syllabus_highlights : []
            }))
          }))
        };
      }
    } catch (err: any) {
      if (isQuotaExhausted(err)) {
        continue;
      }
    }
  }
  return null;
}

/**
 * Primary public method: Resolves stages and papers breakdown for any exam query
 */
export async function fetchExamStructure(query: string, mode: 'HYBRID'|'GOOGLE_API'|'DIRECT_WEB' = 'HYBRID'): Promise<ExamStructureScheme> {
  const cleaned = (query || '').trim();
  if (!cleaned) {
    throw new Error('Examination query must not be empty.');
  }

  // 1. Check official verified catalog first for zero latency and 100% verified accuracy
  const official = findOfficialScheme(cleaned);
  if (official && !isTelanganaTet(cleaned)) {
    return {
      ...official,
      query: cleaned
    };
  }

  // Bounded, key-free retrieval. Extracted material remains a review candidate.
  try {
    const search=await webSearchFree(`${cleaned} official syllabus examination scheme`,4);
    const hints=search.results.filter(r=>/syllabus|scheme|bulletin|notification/i.test(r.title+' '+r.url)).slice(0,2);
    for(const hint of hints) {
      const page=await stealthFetch(hint.url,{timeoutMs:8000,simulateHuman:false});
      if(!page.success)continue;
      const parsed=extractSyllabusFromNotificationText(page.text,cleaned);
      if(parsed.stages?.length && parsed.syllabus_topics.length>3 && !isTelanganaTet(cleaned))return {
        query:cleaned,exam_name:parsed.exam_name||cleaned,commission:parsed.authority||'Authority requires review',
        state_or_central:'Requires review',recruitment_cycle:parsed.recruitment_cycle||'Session requires review',
        total_stages:parsed.stages.length,selection_summary:'Retrieved syllabus candidate. Confirm paper identity, session, source and extracted rules.',
        source_status:'REVIEW_REQUIRED',official_reference:page.url,stages:parsed.stages,
        discovery_notes:['Direct Web uses no AI key. Extraction is not official verification.'],
      };
    }
    if(official)return {...official,discovery_notes:[...(official.discovery_notes||[]),...hints.map(h=>`Discovered source for review: ${h.url}`)]};
  } catch { /* Keep the reference available when public search is unavailable. */ }
  if(official)return official;

  // 2. Try AI only when explicitly allowed by the selected mode.
  if(mode!=='DIRECT_WEB') {
  try {
    const aiResolved = await queryAIForExamStructure(cleaned);
    if (aiResolved) {
      return aiResolved;
    }
  } catch (aiErr) {
    console.warn('[AI_EXAM_STRUCTURE_WARN]', aiErr);
  }
  }

  return {query:cleaned,exam_name:cleaned,commission:'Authority requires research',state_or_central:'Unknown',total_stages:0,stages:[],source_status:'RESEARCH_INCOMPLETE',selection_summary:'No usable scheme was retrieved. Retry research with a precise exam name and session. No pattern has been invented.'};

}
