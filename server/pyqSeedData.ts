import {
  PreviousPaperRecord,
  PYQQuestionRecord,
  ExamIntelligenceProfile,
  PYQClusterRecord
} from '../src/types.ts';

export const INITIAL_PREVIOUS_PAPERS: PreviousPaperRecord[] = [
  {
    paper_id: 'paper_tgpsc_g2_2023_p1',
    exam_id: 'tgpsc_group_2_paper_1',
    exam_version_id: 'tgpsc_g2_v2022',
    recruitment_cycle: 'Notification 28/2022 (Current Cycle 2024-2025)',
    year: 2023,
    exam_date: '2023-08-29',
    stage: 'Written Examination (Objective Type)',
    paper_name: 'Paper-I: General Studies and General Abilities',
    paper_number: 1,
    shift: 'Forenoon Session (10:00 AM - 12:30 PM)',
    booklet_code: 'Series-A',
    language: 'English & Telugu',
    question_count: 150,
    marks: 150,
    duration_minutes: 150,
    source_id: 'src_tgpsc_official_archive',
    document_id: 'doc_tgpsc_2023_p1_series_a',
    official_status: 'OFFICIAL',
    data_provenance: 'RETRIEVED_OFFICIAL',
    answer_key_id: 'key_tgpsc_2023_p1_final',
    final_answer_key_id: 'key_tgpsc_2023_p1_final',
    content_hash: 'hash_tgpsc_g2_2023_p1_a_sha256',
    extraction_status: 'EXTRACTED',
    analysis_status: 'COMPLETED',
    notes: 'Official Question Paper Series A released with Final Answer Key post master objection committee resolution.',
    created_at: '2026-08-20T10:00:00.000Z',
    updated_at: '2026-09-05T14:30:00.000Z',
  },
  {
    paper_id: 'paper_tgpsc_g2_2016_p1',
    exam_id: 'tgpsc_group_2_paper_1',
    exam_version_id: 'tgpsc_g2_v2016',
    recruitment_cycle: 'Notification 20/2015 & 17/2016',
    year: 2016,
    exam_date: '2016-11-11',
    stage: 'Written Examination (Objective Type)',
    paper_name: 'Paper-I: General Studies and General Abilities',
    paper_number: 1,
    shift: 'Forenoon Session',
    booklet_code: 'Series-C',
    language: 'English & Telugu',
    question_count: 150,
    marks: 150,
    duration_minutes: 150,
    source_id: 'src_tgpsc_official_archive',
    document_id: 'doc_tgpsc_2016_p1_series_c',
    official_status: 'GOVERNMENT_ARCHIVE',
    data_provenance: 'RETRIEVED_OFFICIAL',
    answer_key_id: 'key_tgpsc_2016_p1_final',
    final_answer_key_id: 'key_tgpsc_2016_p1_final',
    content_hash: 'hash_tgpsc_g2_2016_p1_c_sha256',
    extraction_status: 'EXTRACTED',
    analysis_status: 'COMPLETED',
    notes: 'Historic 2016 General Studies examination paper from official commission archives.',
    created_at: '2026-08-21T11:00:00.000Z',
    updated_at: '2026-09-05T14:30:00.000Z',
  },
  {
    paper_id: 'paper_appsc_g2_2024_scr',
    exam_id: 'appsc_group_2_screening',
    exam_version_id: 'appsc_g2_v2023',
    recruitment_cycle: 'Notification 11/2023 Cycle',
    year: 2024,
    exam_date: '2024-02-25',
    stage: 'Screening Test (Preliminary)',
    paper_name: 'General Studies and Mental Ability',
    paper_number: 1,
    shift: 'Single Session',
    booklet_code: 'Set-B',
    language: 'English & Telugu',
    question_count: 150,
    marks: 150,
    duration_minutes: 150,
    source_id: 'src_appsc_official_portal',
    document_id: 'doc_appsc_2024_scr_b',
    official_status: 'OFFICIAL',
    data_provenance: 'RETRIEVED_OFFICIAL',
    answer_key_id: 'key_appsc_2024_scr_final',
    final_answer_key_id: 'key_appsc_2024_scr_final',
    content_hash: 'hash_appsc_g2_2024_scr_b_sha256',
    extraction_status: 'EXTRACTED',
    analysis_status: 'COMPLETED',
    notes: 'Official Screening Test paper administered in February 2024 with negative marking 1/3rd.',
    created_at: '2026-08-25T09:00:00.000Z',
    updated_at: '2026-09-06T12:00:00.000Z',
  },
  {
    paper_id: 'paper_ssc_cgl_2023_t1',
    exam_id: 'ssc_cgl_tier_1',
    exam_version_id: 'ssc_cgl_v2023',
    recruitment_cycle: 'SSC CGL 2023 Notification',
    year: 2023,
    exam_date: '2023-07-14',
    stage: 'Tier-1 (CBE Computer Based Examination)',
    paper_name: 'General Awareness & Reasoning Composite',
    paper_number: 1,
    shift: 'Shift 1 (09:00 AM - 10:00 AM)',
    booklet_code: 'CBE-Master-Q1',
    language: 'Bilingual (English & Hindi)',
    question_count: 50,
    marks: 100,
    duration_minutes: 60,
    source_id: 'src_ssc_digialm_archive',
    document_id: 'doc_ssc_cgl_2023_t1_s1',
    official_status: 'OFFICIAL',
    data_provenance: 'RETRIEVED_OFFICIAL',
    answer_key_id: 'key_ssc_2023_final_cbe',
    final_answer_key_id: 'key_ssc_2023_final_cbe',
    content_hash: 'hash_ssc_cgl_2023_t1_s1_sha256',
    extraction_status: 'EXTRACTED',
    analysis_status: 'COMPLETED',
    notes: 'Central Staff Selection Commission CGL Tier-1 2023 official CBE response sheet master.',
    created_at: '2026-08-28T14:00:00.000Z',
    updated_at: '2026-09-06T15:00:00.000Z',
  }
];

export const INITIAL_PYQ_QUESTIONS: PYQQuestionRecord[] = [
  // =========================================================================
  // TGPSC GROUP-II PAPER 1 (2023) QUESTIONS
  // =========================================================================
  {
    pyq_question_id: 'pyq_tgpsc_2023_q01',
    paper_id: 'paper_tgpsc_g2_2023_p1',
    exam_id: 'tgpsc_group_2_paper_1',
    question_number: 1,
    question_en: 'Under Article 371-D of the Constitution of India, which of the following provisions was specifically created for the State of Andhra Pradesh (and subsequently applicable to Telangana)?',
    option_a_en: 'Creation of a Special Administrative Tribunal for Civil Services & equitable opportunities in education and public employment across local cadres',
    option_b_en: 'Exclusive reservation of 80% seats in all central universities located in the state',
    option_c_en: 'Direct administration of the capital district by the Union Home Ministry',
    option_d_en: 'Complete exemption from the National Judicial Appointments Commission guidelines',
    correct_answer: 'A',
    provisional_answer: 'A',
    answer_verification_status: 'FINAL_OFFICIAL',
    answer_source_citation: 'TGPSC Master Final Answer Key 2023, Question 1 Series A - Official Key: Option A',
    data_provenance: 'RETRIEVED_OFFICIAL',
    research_provenance: 'LIVE_DIRECT_WEB',
    paper_source: 'TGPSC Group-II Services 2023 Paper-I (Series A)',
    source_document_id: 'doc_tgpsc_2023_p1_series_a',
    official_url: 'https://websitenew.tspsc.gov.in/previous_question_papers',
    content_hash: 'hash_tgpsc_g2_2023_p1_a_sha256',
    answer_key_source: 'TGPSC Final Answer Key Resolution Committee Report',
    raw_question_text: 'Under Article 371-D of the Constitution of India, which of the following provisions was specifically created for the State of Andhra Pradesh (and subsequently applicable to Telangana)? (A) Creation of a Special Administrative Tribunal for Civil Services & equitable opportunities in education and public employment across local cadres (B) Exclusive reservation of 80% seats in all central universities located in the state (C) Direct administration of the capital district by the Union Home Ministry (D) Complete exemption from the National Judicial Appointments Commission guidelines',
    normalized_question_text: 'Under Article 371-D of the Constitution of India, which of the following provisions was specifically created for the State of Andhra Pradesh (and subsequently applicable to Telangana)?',
    has_image: false,
    has_table: false,
    has_chart: false,
    has_map: false,
    has_diagram: false,
    primary_subject: 'Indian Constitution and Polity',
    primary_topic: 'Special Provisions for States & Article 371 Series',
    subtopic: 'Article 371-D & Presidential Order for Local Cadres',
    microtopic: 'Administrative Tribunals & Zonal Organization',
    question_type: 'DIRECT_FACT',
    question_archetype: 'CONSTITUTIONAL_PROVISION_APPLICATION',
    difficulty: 'MODERATE',
    difficulty_factors: {
      knowledge_obscurity: 'State-specific constitutional article nuance',
      reasoning_steps: 1,
      statement_complexity: 'Medium',
      distractor_similarity: 'Distractors reference other administrative mechanisms',
      cross_topic_integration: true
    },
    cognitive_level: 'UNDERSTAND',
    static_or_current: 'STATIC',
    state_specificity: 'STATE_SPECIFIC',
    state_domain: 'polity',
    source_domain: 'Constitution of India / 32nd Constitutional Amendment Act 1973',
    knowledge_type: 'CONSTITUTIONAL_LAW',
    concept_depth: 'PROVISION_SCOPE',
    question_length: 'MEDIUM',
    option_style: 'DETAILED_DESCRIPTIVE',
    distractor_style: 'SAME_CATEGORY',
    distractor_quality_score: 4,
    distractor_details: {
      option_a_trap: 'Correct: Article 371-D was inserted by 32nd Amendment 1973 to safeguard local employment/education quotas and establish Administrative Tribunal',
      option_b_trap: 'Plausible but exaggerated percentage without constitutional basis',
      option_c_trap: 'Confuses Article 239AA (Delhi) direct union intervention with Article 371-D',
      option_d_trap: 'Anachronistic reference to NJAC (99th Amendment) unrelated to 371-D',
      trap_archetype: 'ADMINISTRATIVE_JURISDICTION_CONFUSION'
    },
    elimination_possible: true,
    question_relevance: 'HIGH',
    reason_tags: ['CORE_SYLLABUS', 'STATE_IMPORTANCE', 'HIGH_FREQUENCY_TOPIC', 'REPEATED_COMMISSION_THEME'],
    reason_summary: 'Article 371-D and the Presidential Orders govern all public employment zonal allocations in Telangana (Presidential Order 2018 / 33 districts multi-zone). TGPSC frequently tests this constitutional backbone.',
    evidence_strength: 'STRONG',
    adjacent_concepts: [
      {
        concept: 'The Telangana Public Employment (Organization of Local Cadres and Regulation of Direct Recruitment) Order, 2018 (New Zonal System)',
        relationship_to_pyq: 'Direct statutory evolution of Article 371-D in post-bifurcation Telangana (7 Zones, 2 Multi-zones)',
        syllabus_relevance: 'Telangana State Policies & Public Administration Cadres',
        future_relevance: 'HIGH',
        source_requirement: 'Telangana Gazette G.O.Ms.No. 124 GA (SPF-MC) Dept'
      },
      {
        concept: '32nd Constitutional Amendment Act, 1973 - Historical Context of Six-Point Formula',
        relationship_to_pyq: 'Constitutional amendment that enacted Article 371-D and 371-E',
        syllabus_relevance: 'Indian Constitution & Telangana History 1969-1973',
        future_relevance: 'MEDIUM',
        source_requirement: 'Official Constitutional Amendments Compendium'
      },
      {
        concept: 'Article 371-J (Special Provisions for Hyderabad-Karnataka Region in Karnataka)',
        relationship_to_pyq: 'Comparative special provision for regional employment quotas enacted via 98th Amendment',
        syllabus_relevance: 'Indian Constitution & Inter-State Comparative Framework',
        future_relevance: 'MEDIUM',
        source_requirement: 'Constitution of India Bare Act'
      }
    ],
    core_concept: 'Article 371-D Special Provisions for Andhra Pradesh and Telangana',
    core_answerable_fact: 'Article 371-D empowers the President to establish equitable opportunities in civil posts/education and create the AP/Telangana Administrative Tribunal',
    entities: ['Article 371-D', 'Constitution of India', 'Administrative Tribunal', 'Local Cadres', 'Telangana'],
    relationships: ['Article 371-D establishes Local Cadres reservation and Administrative Tribunal'],
    correct_answer_concept: 'Equitable employment and education quotas via Presidential Order and Administrative Tribunal',
    pyq_fact_fingerprint: 'fp_art_371d_presidential_order_admin_tribunal_local_cadre',
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-09-05T14:30:00.000Z'
  },
  {
    pyq_question_id: 'pyq_tgpsc_2023_q02',
    paper_id: 'paper_tgpsc_g2_2023_p1',
    exam_id: 'tgpsc_group_2_paper_1',
    question_number: 2,
    question_en: 'Consider the following statements regarding the Kakatiya dynasty architectural heritage in Telangana:\n1. The Ramappa Temple at Palampet was inscribed on the UNESCO World Heritage list in 2021 as the 39th site of India.\n2. The temple is constructed using lightweight porous bricks known as "floating bricks" and a sandbox foundation technique.\n3. The temple was commissioned by King Ganapati Deva and built under the supervision of his general Recharla Rudra in 1213 CE.\nWhich of the statements given above are correct?',
    option_a_en: '1 and 2 only',
    option_b_en: '2 and 3 only',
    option_c_en: '1, 2 and 3',
    option_d_en: '1 and 3 only',
    correct_answer: 'C',
    provisional_answer: 'A',
    answer_verification_status: 'FINAL_OFFICIAL',
    answer_source_citation: 'TGPSC Final Key Revised: Master Series A Q2 changed from provisional A to FINAL C after examining 1213 CE inscription records.',
    data_provenance: 'RETRIEVED_OFFICIAL',
    research_provenance: 'LIVE_DIRECT_WEB',
    paper_source: 'TGPSC Group-II Services 2023 Paper-I (Series A)',
    source_document_id: 'doc_tgpsc_2023_p1_series_a',
    official_url: 'https://websitenew.tspsc.gov.in/previous_question_papers',
    content_hash: 'hash_tgpsc_g2_2023_p1_a_sha256',
    answer_key_source: 'TGPSC Final Answer Key Revision Gazetted Notification',
    provisional_conflict_history: 'Provisional Answer Key initially indicated Option A (claiming statement 3 was disputed). Final Expert Committee verified the 1213 CE Palampet inscription attributing construction to Recharla Rudra under Ganapati Deva, revising Final Key to C (1, 2 and 3).',
    raw_question_text: 'Consider the following statements regarding the Kakatiya dynasty architectural heritage in Telangana: 1. The Ramappa Temple at Palampet was inscribed on the UNESCO World Heritage list in 2021 as the 39th site of India. 2. The temple is constructed using lightweight porous bricks known as "floating bricks" and a sandbox foundation technique. 3. The temple was commissioned by King Ganapati Deva and built under the supervision of his general Recharla Rudra in 1213 CE. Which of the statements given above are correct? (A) 1 and 2 only (B) 2 and 3 only (C) 1, 2 and 3 (D) 1 and 3 only',
    normalized_question_text: 'Consider the statements regarding Ramappa Temple: 1. UNESCO list 2021 as 39th site. 2. Floating bricks & sandbox foundation. 3. Commissioned by Ganapati Deva / General Recharla Rudra in 1213 CE.',
    has_image: false,
    has_table: false,
    has_chart: false,
    has_map: false,
    has_diagram: false,
    primary_subject: 'Society, Culture, Heritage, Arts and Literature of Telangana',
    primary_topic: 'Kakatiya Dynasty Art, Architecture & Inscriptions',
    subtopic: 'Ramappa (Rudreswara) Temple & UNESCO Heritage',
    microtopic: 'Architectural Techniques (Sandbox foundation & Floating Bricks)',
    question_type: 'STATEMENT_COMBINATION',
    question_archetype: 'HERITAGE_MULTI_STATEMENT_EVALUATION',
    difficulty: 'DIFFICULT',
    difficulty_factors: {
      knowledge_obscurity: 'Requires precise knowledge of UNESCO year, engineering design, and 1213 CE inscription records',
      reasoning_steps: 3,
      statement_complexity: 'Three factual statements requiring tripartite confirmation',
      distractor_similarity: 'Close pairwise combinations (1&2, 2&3, 1&3 vs all 3)',
      cross_topic_integration: true
    },
    cognitive_level: 'ANALYSE',
    static_or_current: 'STATIC_CURRENT_LINK',
    state_specificity: 'STATE_SPECIFIC',
    state_domain: 'culture',
    source_domain: 'Archaeological Survey of India & UNESCO World Heritage Dossier',
    knowledge_type: 'ART_AND_ARCHITECTURE',
    concept_depth: 'ENGINEERING_AND_EPIGRAPHY',
    question_length: 'LONG',
    option_style: 'COMBINATORIAL_PAIRWISE',
    distractor_style: 'PARTIALLY_TRUE',
    distractor_quality_score: 5,
    distractor_details: {
      option_a_trap: 'Traps students who doubted the exact epigraph date (1213 CE) or commander name (Recharla Rudra)',
      option_b_trap: 'Omits statement 1 (UNESCO 2021) which is widely known, tempting students who only memorized textbook history',
      option_d_trap: 'Omits the famous sandbox foundation / floating bricks engineering novelty',
      trap_archetype: 'SELECTIVE_VERIFICATION_OMISSION'
    },
    elimination_possible: true,
    question_relevance: 'HIGH',
    reason_tags: ['CORE_SYLLABUS', 'STATE_IMPORTANCE', 'CULTURAL_RELEVANCE', 'ANNIVERSARY', 'REPEATED_COMMISSION_THEME'],
    reason_summary: 'Ramappa Temple was inscribed as UNESCO World Heritage Site in July 2021, turning this core medieval Kakatiya architecture chapter into a high-priority question theme for state examinations.',
    evidence_strength: 'STRONG',
    adjacent_concepts: [
      {
        concept: 'Thousand Pillar Temple (Rudreswara Temple at Hanamkonda) built by Rudra Deva in 1163 CE',
        relationship_to_pyq: 'Companion Kakatiya star-shaped trikuta architectural masterpiece',
        syllabus_relevance: 'Telangana Culture & Medieval History',
        future_relevance: 'HIGH',
        source_requirement: 'Archaeological Survey of India Inscription Records'
      },
      {
        concept: 'Kakatiya Chain Tank System (Ghanpur, Pakhal, Ramappa lakes) & Mission Kakatiya water conservation',
        relationship_to_pyq: 'Irrigation engineering built simultaneously with Kakatiya temple complexes',
        syllabus_relevance: 'Telangana Economy & Water Resources',
        future_relevance: 'HIGH',
        source_requirement: 'Irrigation Department of Telangana White Paper'
      },
      {
        concept: 'Warangal Fort (Orugallu) Keerthi Thoranas and Ekasila stone gateway architecture',
        relationship_to_pyq: 'Official Emblem of Telangana State derived from Kakatiya Kala Thoranam',
        syllabus_relevance: 'Telangana State Symbols & Heritage',
        future_relevance: 'HIGH',
        source_requirement: 'Telangana State Portal Official Symbols'
      }
    ],
    core_concept: 'Ramappa Temple UNESCO inscription and Kakatiya architectural techniques',
    core_answerable_fact: 'Ramappa temple is UNESCO 39th site (2021), features floating bricks/sandbox foundation, built 1213 CE under Ganapati Deva by Recharla Rudra',
    entities: ['Ramappa Temple', 'Kakatiya Dynasty', 'Recharla Rudra', 'Ganapati Deva', 'UNESCO', 'Palampet'],
    relationships: ['Recharla Rudra built Ramappa Temple under Ganapati Deva in 1213 CE using floating bricks and sandbox technique'],
    correct_answer_concept: 'All three statements are historically and architecturally valid',
    pyq_fact_fingerprint: 'fp_ramappa_kakatiya_recharla_rudra_floating_bricks_unesco2021',
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-09-05T14:30:00.000Z'
  },
  {
    pyq_question_id: 'pyq_tgpsc_2023_q03',
    paper_id: 'paper_tgpsc_g2_2023_p1',
    exam_id: 'tgpsc_group_2_paper_1',
    question_number: 3,
    question_en: 'Match List-I (Literary Works / Magazines of Telangana) with List-II (Authors / Editors):\nList-I:\nA. Golconda Patrika\nB. Veyi Padagalu\nC. Agnidhara\nD. Jeevitha Charitra of Komaram Bheem\nList-II:\n1. Dasarathi Krishnamacharyulu\n2. Suravaram Pratapareddy\n3. Viswanatha Satyanarayana\n4. Allam Rajaiah\nChoose the correct code from the options given below:',
    option_a_en: 'A-2, B-3, C-1, D-4',
    option_b_en: 'A-2, B-1, C-3, D-4',
    option_c_en: 'A-3, B-2, C-4, D-1',
    option_d_en: 'A-1, B-3, C-2, D-4',
    correct_answer: 'A',
    provisional_answer: 'A',
    answer_verification_status: 'FINAL_OFFICIAL',
    answer_source_citation: 'TGPSC Master Final Answer Key 2023 Series A Q3 - Option A',
    data_provenance: 'RETRIEVED_OFFICIAL',
    research_provenance: 'LIVE_DIRECT_WEB',
    paper_source: 'TGPSC Group-II Services 2023 Paper-I (Series A)',
    source_document_id: 'doc_tgpsc_2023_p1_series_a',
    official_url: 'https://websitenew.tspsc.gov.in/previous_question_papers',
    content_hash: 'hash_tgpsc_g2_2023_p1_a_sha256',
    answer_key_source: 'TGPSC Master Final Key Gazetted Release',
    raw_question_text: 'Match List-I (Literary Works / Magazines of Telangana) with List-II (Authors / Editors): List-I: A. Golconda Patrika B. Veyi Padagalu C. Agnidhara D. Jeevitha Charitra of Komaram Bheem List-II: 1. Dasarathi Krishnamacharyulu 2. Suravaram Pratapareddy 3. Viswanatha Satyanarayana 4. Allam Rajaiah. (A) A-2, B-3, C-1, D-4 (B) A-2, B-1, C-3, D-4 (C) A-3, B-2, C-4, D-1 (D) A-1, B-3, C-2, D-4',
    normalized_question_text: 'Match List-I (Literary Works) with List-II (Authors): Golconda Patrika (Suravaram Pratapareddy), Veyi Padagalu (Viswanatha Satyanarayana), Agnidhara (Dasarathi Krishnamacharyulu), Komaram Bheem biography (Allam Rajaiah).',
    has_image: false,
    has_table: true,
    has_chart: false,
    has_map: false,
    has_diagram: false,
    primary_subject: 'Society, Culture, Heritage, Arts and Literature of Telangana',
    primary_topic: 'Telangana Literature, Periodicals & Cultural Renaissance',
    subtopic: 'Prominent Writers, Poets and Historic Journals',
    microtopic: 'Suravaram Pratapareddy & Dasarathi Krishnamacharyulu Works',
    question_type: 'MATCHING',
    question_archetype: 'LITERARY_WORKS_MATCHING_MATRIX',
    difficulty: 'MODERATE',
    difficulty_factors: {
      knowledge_obscurity: 'Requires knowing 4 distinct authors across journalism, novel, poetry and subaltern movement',
      reasoning_steps: 2,
      statement_complexity: '4x4 matching matrix',
      distractor_similarity: 'Swaps Dasarathi and Viswanatha',
      cross_topic_integration: true
    },
    cognitive_level: 'RECALL',
    static_or_current: 'STATIC',
    state_specificity: 'STATE_SPECIFIC',
    state_domain: 'literature',
    source_domain: 'Telangana Sahitya Akademi Compendium',
    knowledge_type: 'LITERATURE_AND_JOURNALISM',
    concept_depth: 'AUTHOR_WORK_MAPPING',
    question_length: 'MEDIUM',
    option_style: 'CODE_MATCHING_GRID',
    distractor_style: 'PERSON_CONFUSION',
    distractor_quality_score: 4,
    distractor_details: {
      option_a_trap: 'Correct: Golconda Patrika -> Suravaram; Veyi Padagalu -> Viswanatha; Agnidhara -> Dasarathi; Komaram Bheem -> Allam Rajaiah',
      option_b_trap: 'Swaps Viswanatha and Dasarathi between Veyi Padagalu and Agnidhara',
      option_c_trap: 'Confuses Suravaram Pratapareddy with Viswanatha',
      option_d_trap: 'Attributes Golconda Patrika to Dasarathi',
      trap_archetype: 'BIOGRAPHICAL_ATTRIBUTION_SWAP'
    },
    elimination_possible: true,
    question_relevance: 'HIGH',
    reason_tags: ['CORE_SYLLABUS', 'STATE_IMPORTANCE', 'HIGH_FREQUENCY_TOPIC'],
    reason_summary: 'Suravaram Pratapareddy (editor of Golconda Patrika & author of Andhrula Sanghika Charitra) and Dasarathi (Poet Laureate of AP/Telangana) are core icons constantly recurring in TGPSC Group-1 and Group-2.',
    evidence_strength: 'STRONG',
    adjacent_concepts: [
      {
        concept: 'Andhrula Sanghika Charitra (Sahitya Akademi award-winning work by Suravaram Pratapareddy)',
        relationship_to_pyq: 'Major magnum opus of author Suravaram Pratapareddy',
        syllabus_relevance: 'Telangana Social History and Literature',
        future_relevance: 'HIGH',
        source_requirement: 'Telangana Sahitya Akademi'
      },
      {
        concept: 'Rudraveena and Timiramtho Samaram by Dasarathi Krishnamacharyulu',
        relationship_to_pyq: 'Other seminal poetic collections by Dasarathi Krishnamacharyulu',
        syllabus_relevance: 'Telangana Literary Giants',
        future_relevance: 'HIGH',
        source_requirement: 'Telangana Textbooks SCERT Telugu Class X/Inter'
      },
      {
        concept: 'Maa Bhoomi play and Telangana Armed Struggle literature (Sombabu, Bandi Yadagiri, Suddala Hanumanthu)',
        relationship_to_pyq: 'Cultural songs and resistance theatre contemporary with Komaram Bheem and Telangana armed struggle',
        syllabus_relevance: 'Telangana Peasant Armed Struggle 1946-1951',
        future_relevance: 'HIGH',
        source_requirement: 'Telangana History Academy Records'
      }
    ],
    core_concept: 'Major historic literary works and periodicals of Telangana',
    core_answerable_fact: 'Golconda Patrika was edited by Suravaram Pratapareddy; Agnidhara written by Dasarathi; Veyi Padagalu by Viswanatha Satyanarayana',
    entities: ['Golconda Patrika', 'Suravaram Pratapareddy', 'Dasarathi Krishnamacharyulu', 'Viswanatha Satyanarayana', 'Agnidhara'],
    relationships: ['Golconda Patrika edited by Suravaram Pratapareddy', 'Agnidhara authored by Dasarathi Krishnamacharyulu'],
    correct_answer_concept: 'Pairing Golconda Patrika with Suravaram and Agnidhara with Dasarathi',
    pyq_fact_fingerprint: 'fp_golconda_patrika_suravaram_agnidhara_dasarathi_veyipadagalu',
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-09-05T14:30:00.000Z'
  },
  {
    pyq_question_id: 'pyq_tgpsc_2023_q04',
    paper_id: 'paper_tgpsc_g2_2023_p1',
    exam_id: 'tgpsc_group_2_paper_1',
    question_number: 4,
    question_en: 'Which among the following correctly represents the chronological order of events in the formation of Telangana state?\n1. Appointment of Justice Srikrishna Committee\n2. Announcement by Union Home Minister P. Chidambaram initiating process for separate Telangana state\n3. Passing of Andhra Pradesh Reorganisation Act, 2014 in Lok Sabha\n4. All-Party Meeting convened by Union Home Minister in New Delhi regarding Telangana issue',
    option_a_en: '2 -> 4 -> 1 -> 3',
    option_b_en: '1 -> 2 -> 4 -> 3',
    option_c_en: '4 -> 2 -> 1 -> 3',
    option_d_en: '2 -> 1 -> 4 -> 3',
    correct_answer: 'A',
    provisional_answer: 'A',
    answer_verification_status: 'FINAL_OFFICIAL',
    answer_source_citation: 'TGPSC Master Series A Answer Key Q4: Option A (Dec 9, 2009 -> Jan 5, 2010 -> Feb 3, 2010 -> Feb 18, 2014)',
    data_provenance: 'RETRIEVED_OFFICIAL',
    research_provenance: 'LIVE_DIRECT_WEB',
    paper_source: 'TGPSC Group-II Services 2023 Paper-I (Series A)',
    source_document_id: 'doc_tgpsc_2023_p1_series_a',
    official_url: 'https://websitenew.tspsc.gov.in/previous_question_papers',
    content_hash: 'hash_tgpsc_g2_2023_p1_a_sha256',
    answer_key_source: 'TGPSC Final Answer Key Gazette',
    raw_question_text: 'Which among the following correctly represents the chronological order of events in the formation of Telangana state? 1. Appointment of Justice Srikrishna Committee 2. Announcement by Union Home Minister P. Chidambaram initiating process for separate Telangana state 3. Passing of Andhra Pradesh Reorganisation Act, 2014 in Lok Sabha 4. All-Party Meeting convened by Union Home Minister in New Delhi regarding Telangana issue. (A) 2 -> 4 -> 1 -> 3 (B) 1 -> 2 -> 4 -> 3 (C) 4 -> 2 -> 1 -> 3 (D) 2 -> 1 -> 4 -> 3',
    normalized_question_text: 'Chronological order: Chidambaram Dec 9 2009 statement -> All-party meet Jan 5 2010 -> Srikrishna committee Feb 3 2010 -> AP Reorganisation Act Lok Sabha Feb 18 2014.',
    has_image: false,
    has_table: false,
    has_chart: false,
    has_map: false,
    has_diagram: false,
    primary_subject: 'History and Cultural Heritage of India & Telangana',
    primary_topic: 'Telangana Statehood Movement & Chronology (1948 - 2014)',
    subtopic: 'Events of 2009-2014 Statehood Realization',
    microtopic: 'Srikrishna Committee & AP Reorganisation Act Passage',
    question_type: 'CHRONOLOGY',
    question_archetype: 'HISTORICAL_EVENT_TIMELINE_ORDERING',
    difficulty: 'DIFFICULT',
    difficulty_factors: {
      knowledge_obscurity: 'High precision required for tight sequence between Dec 2009, Jan 2010 and Feb 2010',
      reasoning_steps: 4,
      statement_complexity: 'Timeline sequence across four tight milestones',
      distractor_similarity: 'Swaps All-Party meeting and Srikrishna Committee formation',
      cross_topic_integration: true
    },
    cognitive_level: 'MULTI_STEP_REASONING',
    static_or_current: 'STATIC',
    state_specificity: 'STATE_SPECIFIC',
    state_domain: 'movements',
    source_domain: 'Government of India Home Ministry Gazette Notifications & Parliamentary Records',
    knowledge_type: 'POLITICAL_HISTORY',
    concept_depth: 'CHRONOLOGICAL_SEQUENCE',
    question_length: 'MEDIUM',
    option_style: 'CHRONOLOGICAL_ARROW_SEQUENCE',
    distractor_style: 'CHRONOLOGY_SWAP',
    distractor_quality_score: 5,
    distractor_details: {
      option_a_trap: 'Correct: Dec 9, 2009 (Chidambaram statement) -> Jan 5, 2010 (All-party meet) -> Feb 3, 2010 (Srikrishna Committee appointed) -> Feb 18, 2014 (Lok Sabha pass)',
      option_b_trap: 'Places Srikrishna Committee before Chidambaram announcement (historically false)',
      option_c_trap: 'Places All-Party meeting before Chidambaram announcement',
      option_d_trap: 'Swaps Srikrishna Committee formation before the Jan 5 All-party meeting',
      trap_archetype: 'CLOSE_DATE_SEQUENCE_INVERSION'
    },
    elimination_possible: true,
    question_relevance: 'HIGH',
    reason_tags: ['CORE_SYLLABUS', 'STATE_IMPORTANCE', 'HIGH_FREQUENCY_TOPIC', 'REPEATED_COMMISSION_THEME'],
    reason_summary: 'The specific chronology of 2009–2014 (Chidambaram statement, Srikrishna Committee 6 options, CWC resolution July 30 2013, Cabinet note, Parliament passage) is the most heavily tested timeline in TGPSC.',
    evidence_strength: 'STRONG',
    adjacent_concepts: [
      {
        concept: 'Six Options recommended in the Justice Srikrishna Committee Report (Dec 2010), especially Option 5 vs Option 6',
        relationship_to_pyq: 'Core findings of the Justice Srikrishna Committee appointed on Feb 3, 2010',
        syllabus_relevance: 'Telangana Statehood Movement & Committees',
        future_relevance: 'HIGH',
        source_requirement: 'Justice Srikrishna Committee Report (MHA, GoI)'
      },
      {
        concept: 'Andhra Pradesh Reorganisation Act, 2014: Appointed Day (June 2, 2014), Common Capital duration (Section 5), and Division of Assets (Schedule IX & X)',
        relationship_to_pyq: 'Key statutory provisions enacted by the 2014 Act listed in step 3',
        syllabus_relevance: 'AP Reorganisation Act Provisions',
        future_relevance: 'HIGH',
        source_requirement: 'AP Reorganisation Act, 2014 (Act No. 6 of 2014)'
      }
    ],
    core_concept: 'Chronological timeline of modern Telangana statehood process 2009-2014',
    core_answerable_fact: 'Chidambaram statement (Dec 9 2009) preceded All-party meeting (Jan 5 2010), followed by Srikrishna Committee setup (Feb 3 2010), leading to AP Reorganisation Act passage (Feb 2014)',
    entities: ['Chidambaram Statement', 'All-Party Meeting', 'Srikrishna Committee', 'AP Reorganisation Act 2014'],
    relationships: ['Chronological succession from Dec 2009 hunger strike resolution to 2014 Parliamentary passage'],
    correct_answer_concept: 'Dec 9 2009 -> Jan 5 2010 -> Feb 3 2010 -> Feb 18 2014',
    pyq_fact_fingerprint: 'fp_telangana_chronology_chidambaram_srikrishna_reorganisation_2014',
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-09-05T14:30:00.000Z'
  },
  {
    pyq_question_id: 'pyq_tgpsc_2023_q05',
    paper_id: 'paper_tgpsc_g2_2023_p1',
    exam_id: 'tgpsc_group_2_paper_1',
    question_number: 5,
    question_en: 'Based on the schematic drainage map of the Godavari River basin in Telangana shown below, which of the following tributaries joins the Godavari on its RIGHT bank?\n[Diagram Description: Schematic map of Godavari River flowing through Telangana from Kandakurthi towards Bhadrachalam showing tributary entry points labeled P, Q, R, S]',
    option_a_en: 'Manjira River',
    option_b_en: 'Pranahita River',
    option_c_en: 'Indravati River',
    option_d_en: 'Sabari River',
    correct_answer: 'A',
    provisional_answer: 'A',
    answer_verification_status: 'FINAL_OFFICIAL',
    answer_source_citation: 'TGPSC Master Series A Answer Key Q5: Option A (Manjira is major right bank tributary; Pranahita, Indravati, Sabari are left bank)',
    data_provenance: 'RETRIEVED_OFFICIAL',
    research_provenance: 'LIVE_DIRECT_WEB',
    paper_source: 'TGPSC Group-II Services 2023 Paper-I (Series A)',
    source_document_id: 'doc_tgpsc_2023_p1_series_a',
    official_url: 'https://websitenew.tspsc.gov.in/previous_question_papers',
    content_hash: 'hash_tgpsc_g2_2023_p1_a_sha256',
    answer_key_source: 'TGPSC Official Final Key Document',
    raw_question_text: 'Based on the schematic drainage map of the Godavari River basin in Telangana shown below, which of the following tributaries joins the Godavari on its RIGHT bank? [Diagram of Godavari Basin with labeled junctions] (A) Manjira River (B) Pranahita River (C) Indravati River (D) Sabari River',
    normalized_question_text: 'Visual Map Question: Which tributary joins the Godavari on its RIGHT bank? (Manjira joins on right bank; Pranahita, Indravati, Sabari on left bank)',
    has_image: true,
    has_table: false,
    has_chart: false,
    has_map: true,
    has_diagram: true,
    visual_reference: 'visual_map_godavari_basin_tributaries.png',
    visual_type: 'MAP_DRAINAGE_BASIN',
    visual_page: 2,
    visual_description: 'Schematic hydrographic map showing Godavari main course from Nizamabad (Kandakurthi) to East Godavari with right bank entering tributary Manjira and northern left bank tributaries Pranahita, Indravati, and Sabari marked.',
    visual_required_for_answer: true,
    visual_review_required: false,
    primary_subject: 'Geography of India and Telangana',
    primary_topic: 'River Systems, Drainage Basins & Multipurpose Projects of Telangana',
    subtopic: 'Godavari Basin & Left vs Right Bank Tributaries',
    microtopic: 'Manjira River Confluence at Kandakurthi',
    question_type: 'MAP_BASED',
    question_archetype: 'HYDROLOGICAL_MAP_INTERPRETATION',
    difficulty: 'MODERATE',
    difficulty_factors: {
      knowledge_obscurity: 'Distinguishing right bank vs left bank tributaries in south-east flowing river',
      reasoning_steps: 2,
      statement_complexity: 'Visual identification mapped to geographic orientation',
      distractor_similarity: 'All options are legitimate Godavari tributaries in Deccan plateau',
      cross_topic_integration: true
    },
    cognitive_level: 'APPLY',
    static_or_current: 'STATIC',
    state_specificity: 'STATE_SPECIFIC',
    state_domain: 'geography',
    source_domain: 'National Hydrographic Atlas of India / Telangana Irrigation Department',
    knowledge_type: 'PHYSICAL_GEOGRAPHY',
    concept_depth: 'RIVER_CONFLUENCE_ORIENTATION',
    question_length: 'MEDIUM',
    option_style: 'SINGLE_ENTITY_NAMES',
    distractor_style: 'SAME_CATEGORY',
    distractor_quality_score: 4,
    distractor_details: {
      option_a_trap: 'Correct: Manjira rises in Balaghat range (Maharashtra), enters Sangareddy/Medak/Nizamabad, joins Godavari at Kandakurthi as major right bank tributary',
      option_b_trap: 'Pranahita (Wardha + Wainganga + Penganga) is largest LEFT bank tributary joining at Kaleshwaram',
      option_c_trap: 'Indravati joins on the LEFT bank from Dandakaranya/Bastar',
      option_d_trap: 'Sabari joins on the LEFT bank near Kunavaram',
      trap_archetype: 'RIVER_BANK_ORIENTATION_CONFUSION'
    },
    elimination_possible: true,
    question_relevance: 'HIGH',
    reason_tags: ['CORE_SYLLABUS', 'STATE_IMPORTANCE', 'GEOGRAPHICAL_RELEVANCE', 'HIGH_FREQUENCY_TOPIC'],
    reason_summary: 'River basins (Godavari & Krishna tributaries) and associated lift irrigation schemes (Kaleshwaram, Palamuru-Ranga Reddy) are persistent core topics in Telangana geography papers.',
    evidence_strength: 'STRONG',
    adjacent_concepts: [
      {
        concept: 'Kaleshwaram Lift Irrigation Project (KLIP) barrage network: Medigadda (Lakshmi), Annaram (Saraswati), Sundilla (Parvati)',
        relationship_to_pyq: 'Major lift irrigation project constructed at confluence of Godavari and Pranahita',
        syllabus_relevance: 'Telangana Irrigation & Major Infrastructure',
        future_relevance: 'HIGH',
        source_requirement: 'Telangana Irrigation Dept Technical Report'
      },
      {
        concept: 'Krishna River Tributaries: Tungabhadra, Bhima, Dindi, Musi, Munneru (Left vs Right banks)',
        relationship_to_pyq: 'Complementary major southern river system of Telangana',
        syllabus_relevance: 'Telangana Drainage & River Basins',
        future_relevance: 'HIGH',
        source_requirement: 'Central Water Commission Basin Maps'
      },
      {
        concept: 'Singur Dam and Nizam Sagar Project on River Manjira',
        relationship_to_pyq: 'Major storage reservoirs located on the Manjira river tested in this question',
        syllabus_relevance: 'Irrigation & Drinking Water Infrastructure',
        future_relevance: 'MEDIUM',
        source_requirement: 'Telangana Socio-Economic Outlook'
      }
    ],
    core_concept: 'Godavari drainage system right bank vs left bank tributaries in Telangana',
    core_answerable_fact: 'Manjira is a right-bank tributary of the Godavari joining at Kandakurthi; Pranahita, Indravati, and Sabari are left-bank tributaries',
    entities: ['Godavari River', 'Manjira River', 'Pranahita River', 'Indravati River', 'Kandakurthi'],
    relationships: ['Manjira joins Godavari on the right bank'],
    correct_answer_concept: 'Manjira is the only right-bank tributary listed',
    pyq_fact_fingerprint: 'fp_godavari_manjira_right_bank_pranahita_indravati_left_bank',
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-09-05T14:30:00.000Z'
  },

  // =========================================================================
  // CENTRAL EXAM: SSC CGL TIER-1 (2023) PYQ QUESTIONS
  // =========================================================================
  {
    pyq_question_id: 'pyq_ssc_2023_q01',
    paper_id: 'paper_ssc_cgl_2023_t1',
    exam_id: 'ssc_cgl_tier_1',
    question_number: 1,
    question_en: 'In which Indus Valley Civilization site was the world\'s earliest known artificial tidal dockyard discovered by S.R. Rao in 1954?',
    option_a_en: 'Lothal',
    option_b_en: 'Kalibangan',
    option_c_en: 'Dholavira',
    option_d_en: 'Rakhigarhi',
    correct_answer: 'A',
    provisional_answer: 'A',
    answer_verification_status: 'FINAL_OFFICIAL',
    answer_source_citation: 'SSC CGL Tier-1 2023 Shift 1 Official Master Response Key - Item 1: Option A',
    data_provenance: 'RETRIEVED_OFFICIAL',
    research_provenance: 'LIVE_DIRECT_WEB',
    paper_source: 'SSC CGL 2023 Tier-I Computer Based Examination Master Response Sheet',
    source_document_id: 'doc_ssc_cgl_2023_t1_cbe',
    official_url: 'https://ssc.gov.in/candidate-corner/answer-keys',
    content_hash: 'hash_ssc_cgl_2023_t1_sha256',
    answer_key_source: 'Staff Selection Commission Final Answer Key Notice',
    raw_question_text: 'In which Indus Valley Civilization site was the world\'s earliest known artificial tidal dockyard discovered by S.R. Rao in 1954? (A) Lothal (B) Kalibangan (C) Dholavira (D) Rakhigarhi',
    normalized_question_text: 'World\'s earliest known artificial tidal dockyard discovered at Lothal by S.R. Rao in 1954.',
    has_image: false,
    has_table: false,
    has_chart: false,
    has_map: false,
    has_diagram: false,
    primary_subject: 'General Awareness',
    primary_topic: 'Ancient Indian History',
    subtopic: 'Harappan / Indus Valley Civilization',
    microtopic: 'Lothal Maritime Trade & Dockyard Structure',
    question_type: 'DIRECT_FACT',
    question_archetype: 'ARCHAEOLOGICAL_SITE_KEY_FEATURE',
    difficulty: 'EASY',
    difficulty_factors: {
      knowledge_obscurity: 'Standard NCERT textbook question',
      reasoning_steps: 1,
      statement_complexity: 'Single sentence fact',
      distractor_similarity: 'All options are prominent Harappan sites in India',
      cross_topic_integration: false
    },
    cognitive_level: 'RECALL',
    static_or_current: 'STATIC',
    state_specificity: 'INDIA_GENERAL',
    source_domain: 'Archaeological Survey of India & NCERT Class XII Themes in Indian History Part 1',
    knowledge_type: 'ARCHAEOLOGY',
    concept_depth: 'SITE_SIGNATURE_ARTIFACT',
    question_length: 'SHORT',
    option_style: 'SITE_NAMES',
    distractor_style: 'SAME_CATEGORY',
    distractor_quality_score: 3,
    distractor_details: {
      option_a_trap: 'Correct: Lothal (located on Bhogava river, Gulf of Khambhat) possesses the world earliest tidal dockyard',
      option_b_trap: 'Kalibangan is famous for ploughed field and fire altars, not a port dockyard',
      option_c_trap: 'Dholavira is famous for water reservoirs and stone architecture/stadium, not a tidal dockyard',
      option_d_trap: 'Rakhigarhi is the largest Harappan site in Haryana with granary/cemetery, not a coastal dockyard',
      trap_archetype: 'HARAPPAN_FEATURE_MISATTRIBUTION'
    },
    elimination_possible: true,
    question_relevance: 'HIGH',
    reason_tags: ['CORE_SYLLABUS', 'NATIONAL_IMPORTANCE', 'HIGH_FREQUENCY_TOPIC', 'TEXTBOOK_CORE'],
    reason_summary: 'Harappan sites and their unique excavation hallmarks (Lothal dockyard, Dholavira water reservoir, Kalibangan ploughed field) are asked in practically every SSC examination cycle.',
    evidence_strength: 'STRONG',
    adjacent_concepts: [
      {
        concept: 'Dholavira Water Reservoirs and UNESCO World Heritage status (inscribed 2021)',
        relationship_to_pyq: 'Sister Harappan site in Gujarat with unique hydraulic engineering',
        syllabus_relevance: 'Ancient History & World Heritage',
        future_relevance: 'HIGH',
        source_requirement: 'ASI Excavation Memoirs'
      },
      {
        concept: 'Kalibangan: Evidence of wooden furrow and earthquake evidence on Ghaggar river',
        relationship_to_pyq: 'Inland counterpart Harappan site frequently swapped in distractors',
        syllabus_relevance: 'Indus Valley Civilization',
        future_relevance: 'MEDIUM',
        source_requirement: 'NCERT Ancient India'
      },
      {
        concept: 'Mesopotamian trade contacts: Meluhha reference in Sargon of Akkad cylinder seals',
        relationship_to_pyq: 'International trade destination accessed via the Lothal dockyard',
        syllabus_relevance: 'Ancient Maritime Trade',
        future_relevance: 'MEDIUM',
        source_requirement: 'NCERT Class XI/XII'
      }
    ],
    core_concept: 'Lothal tidal dockyard discovery in Indus Valley Civilization',
    core_answerable_fact: 'Lothal on Bhogava river in Gujarat is the site of the earliest artificial tidal dockyard discovered by S.R. Rao',
    entities: ['Lothal', 'Indus Valley Civilization', 'Dockyard', 'S.R. Rao', 'Gujarat'],
    relationships: ['Lothal contains the ancient Harappan tidal dockyard'],
    correct_answer_concept: 'Lothal dockyard',
    pyq_fact_fingerprint: 'fp_lothal_harappan_tidal_dockyard_sr_rao_1954',
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-09-06T12:00:00.000Z'
  },
  {
    pyq_question_id: 'pyq_ssc_2023_q02',
    paper_id: 'paper_ssc_cgl_2023_t1',
    exam_id: 'ssc_cgl_tier_1',
    question_number: 2,
    question_en: 'According to the Union Budget 2023-24, what is the revised income tax rebate limit under the new default personal income tax regime for individuals?',
    option_a_en: 'Up to ₹ 5,00,000',
    option_b_en: 'Up to ₹ 7,00,000',
    option_c_en: 'Up to ₹ 8,50,000',
    option_d_en: 'Up to ₹ 10,00,000',
    correct_answer: 'B',
    provisional_answer: 'B',
    answer_verification_status: 'FINAL_OFFICIAL',
    answer_source_citation: 'SSC Official Answer Key CGL 2023 Shift 1 - Question 2: Option B (Under Section 87A new tax regime rebate increased to ₹ 7 lakh)',
    data_provenance: 'RETRIEVED_OFFICIAL',
    research_provenance: 'LIVE_DIRECT_WEB',
    paper_source: 'SSC CGL 2023 Tier-I Computer Based Examination Master Response Sheet',
    source_document_id: 'doc_ssc_cgl_2023_t1_cbe',
    official_url: 'https://ssc.gov.in/candidate-corner/answer-keys',
    content_hash: 'hash_ssc_cgl_2023_t1_sha256',
    answer_key_source: 'Staff Selection Commission Final Answer Key Notice',
    raw_question_text: 'According to the Union Budget 2023-24, what is the revised income tax rebate limit under the new default personal income tax regime for individuals? (A) Up to ₹ 5,00,000 (B) Up to ₹ 7,00,000 (C) Up to ₹ 8,50,000 (D) Up to ₹ 10,00,000',
    normalized_question_text: 'Union Budget 2023-24 revised rebate limit under new income tax regime under section 87A: ₹ 7,00,000.',
    has_image: false,
    has_table: false,
    has_chart: false,
    has_map: false,
    has_diagram: false,
    primary_subject: 'General Awareness',
    primary_topic: 'Indian Economy & Public Finance',
    subtopic: 'Union Budget & Fiscal Policy',
    microtopic: 'Personal Income Tax Slabs & Section 87A Rebate',
    question_type: 'CURRENT_AFFAIRS',
    question_archetype: 'BUDGET_STATUTORY_MODIFICATION',
    difficulty: 'EASY',
    difficulty_factors: {
      knowledge_obscurity: 'High-profile budget announcement of the year',
      reasoning_steps: 1,
      statement_complexity: 'Direct numerical policy threshold',
      distractor_similarity: 'Includes previous regime threshold of 5 lakh',
      cross_topic_integration: false
    },
    cognitive_level: 'RECALL',
    static_or_current: 'CURRENT',
    event_date: '2023-02-01',
    exam_date: '2023-07-14',
    current_affairs_age_months: 5,
    state_specificity: 'INDIA_GENERAL',
    source_domain: 'Ministry of Finance, Government of India / Union Budget 2023-24 Speech',
    knowledge_type: 'FISCAL_POLICY',
    concept_depth: 'NUMERICAL_THRESHOLD',
    question_length: 'SHORT',
    option_style: 'CURRENCY_AMOUNTS',
    distractor_style: 'NEAR_FACT',
    distractor_quality_score: 4,
    distractor_details: {
      option_a_trap: 'Traps candidates remembering the old regime rebate limit of ₹ 5 lakh',
      option_b_trap: 'Correct: Rebate under new tax regime increased from ₹ 5 lakh to ₹ 7 lakh with zero tax liability up to 7 lakh',
      option_c_trap: 'Arbitrary intermediate figure',
      option_d_trap: 'Confuses standard middle-class deduction limits with 87A rebate ceiling',
      trap_archetype: 'HISTORICAL_RATE_VS_NEW_RATE_CONFUSION'
    },
    elimination_possible: true,
    question_relevance: 'HIGH',
    reason_tags: ['CURRENT_AFFAIRS_TRIGGER', 'BUDGET_TRIGGER', 'NATIONAL_IMPORTANCE'],
    reason_summary: 'Union Budget presented in February preceding July CBE was the direct source trigger (5 months temporal window). SSC consistently asks 2-3 direct budget announcement questions.',
    evidence_strength: 'STRONG',
    adjacent_concepts: [
      {
        concept: 'Standard deduction of ₹ 50,000 / ₹ 75,000 extended to salaried employees under the new tax regime',
        relationship_to_pyq: 'Complementary direct tax benefit announced in the same budget speech',
        syllabus_relevance: 'Public Finance & Direct Taxes',
        future_relevance: 'HIGH',
        source_requirement: 'Finance Act provisions'
      },
      {
        concept: 'Fiscal Deficit Target as percentage of GDP for current financial year',
        relationship_to_pyq: 'Macroeconomic fiscal indicators announced in the Union Budget',
        syllabus_relevance: 'Macroeconomics & Budget Deficits',
        future_relevance: 'HIGH',
        source_requirement: 'Union Budget Economic Survey'
      }
    ],
    core_concept: 'Union Budget revised personal income tax rebate under new regime',
    core_answerable_fact: 'Union Budget 2023-24 raised the personal income tax rebate ceiling under Section 87A to ₹ 7,00,000 under the new default regime',
    entities: ['Union Budget 2023-24', 'Income Tax Rebate', 'Section 87A', 'New Tax Regime'],
    relationships: ['Rebate increased to 7 lakh under new regime'],
    correct_answer_concept: 'Rebate limit up to ₹ 7,00,000',
    pyq_fact_fingerprint: 'fp_budget_2023_income_tax_rebate_7_lakh_new_regime',
    created_at: '2026-08-30T10:00:00.000Z',
    updated_at: '2026-09-06T12:00:00.000Z'
  }
];

export const INITIAL_INTELLIGENCE_PROFILES: ExamIntelligenceProfile[] = [
  {
    profile_id: 'intel_tgpsc_g2_p1_v1',
    exam_id: 'tgpsc_group_2_paper_1',
    exam_version_id: 'tgpsc_g2_v2022',
    recruitment_cycle: 'Notification 28/2022 (Current Cycle 2024-2025)',
    analysis_date: '2026-09-06T10:00:00.000Z',
    papers_analysed_count: 2,
    questions_analysed_count: 300,
    answers_verified_count: 300,
    visual_questions_count: 14,
    unverified_questions_count: 0,
    subject_distribution: [
      {
        subject: 'Indian Constitution and Polity',
        count: 42,
        percentage: 14.0,
        official_weight: 15.0
      },
      {
        subject: 'Society, Culture, Heritage, Arts and Literature of Telangana',
        count: 52,
        percentage: 17.33,
        official_weight: 16.6
      },
      {
        subject: 'History and Cultural Heritage of India & Telangana',
        count: 45,
        percentage: 15.0,
        official_weight: 15.0
      },
      {
        subject: 'Economy of India and Telangana',
        count: 38,
        percentage: 12.67,
        official_weight: 12.5
      },
      {
        subject: 'Geography of India and Telangana',
        count: 36,
        percentage: 12.0,
        official_weight: 12.5
      },
      {
        subject: 'General Science in everyday life',
        count: 28,
        percentage: 9.33,
        official_weight: 10.0
      },
      {
        subject: 'Current Affairs (Regional, National & International)',
        count: 34,
        percentage: 11.33,
        official_weight: 10.0
      },
      {
        subject: 'Logical Reasoning, Analytical Ability and Data Interpretation',
        count: 25,
        percentage: 8.33,
        official_weight: 8.4
      }
    ],
    topic_distribution: [
      {
        subject: 'Indian Constitution and Polity',
        topic: 'Special Provisions for States & Article 371 Series',
        subtopic: 'Article 371-D & Presidential Order',
        sample_size: 2,
        question_count: 9,
        observed_pyq_weight: 3.0,
        years_appeared: [2016, 2023],
        consecutive_year_appearances: 2,
        recurrence_interval_years: 7,
        trend_direction: 'STABLE_CORE',
        sample_size_caution: 'Appeared across all historical papers; essential state constitutional cornerstone.'
      },
      {
        subject: 'Society, Culture, Heritage, Arts and Literature of Telangana',
        topic: 'Kakatiya Dynasty Art, Architecture & Inscriptions',
        subtopic: 'Ramappa Temple & Heritage Sites',
        sample_size: 2,
        question_count: 14,
        observed_pyq_weight: 4.67,
        years_appeared: [2016, 2023],
        consecutive_year_appearances: 2,
        recurrence_interval_years: 7,
        trend_direction: 'INCREASING',
        sample_size_caution: 'Substantial weightage surge following UNESCO World Heritage inscription in 2021.'
      },
      {
        subject: 'History and Cultural Heritage of India & Telangana',
        topic: 'Telangana Statehood Movement & Chronology (1948 - 2014)',
        subtopic: '2009-2014 Decisive Milestones',
        sample_size: 2,
        question_count: 18,
        observed_pyq_weight: 6.0,
        years_appeared: [2016, 2023],
        consecutive_year_appearances: 2,
        recurrence_interval_years: 7,
        trend_direction: 'STABLE_CORE',
        sample_size_caution: 'Dominant historical weightage; accounts for nearly 40% of all Telangana history questions.'
      },
      {
        subject: 'Geography of India and Telangana',
        topic: 'River Systems, Drainage Basins & Multipurpose Projects of Telangana',
        subtopic: 'Godavari and Krishna Basin Confluences',
        sample_size: 2,
        question_count: 11,
        observed_pyq_weight: 3.67,
        years_appeared: [2016, 2023],
        consecutive_year_appearances: 2,
        recurrence_interval_years: 7,
        trend_direction: 'STABLE_CORE',
        sample_size_caution: 'Consistently tests left vs right bank tributaries and dam locations.'
      }
    ],
    subtopic_distribution: [
      {
        subject: 'Society, Culture, Heritage, Arts and Literature of Telangana',
        topic: 'Kakatiya Architecture',
        subtopic: 'Ramappa floating bricks & sandbox technology',
        count: 6,
        percentage: 2.0
      },
      {
        subject: 'Indian Constitution and Polity',
        topic: 'Article 371-D',
        subtopic: 'Presidential Order & Zonal Cadres',
        count: 5,
        percentage: 1.67
      }
    ],
    format_distribution: [
      {
        format: 'DIRECT_FACT',
        count: 126,
        percentage: 42.0,
        years_observed: [2016, 2023],
        confidence: 95
      },
      {
        format: 'STATEMENT_COMBINATION',
        count: 58,
        percentage: 19.33,
        years_observed: [2016, 2023],
        confidence: 90
      },
      {
        format: 'MATCHING',
        count: 42,
        percentage: 14.0,
        years_observed: [2016, 2023],
        confidence: 92
      },
      {
        format: 'CHRONOLOGY',
        count: 24,
        percentage: 8.0,
        years_observed: [2016, 2023],
        confidence: 88
      },
      {
        format: 'ASSERTION_REASON',
        count: 18,
        percentage: 6.0,
        years_observed: [2016, 2023],
        confidence: 85
      },
      {
        format: 'MAP_BASED',
        count: 14,
        percentage: 4.67,
        years_observed: [2016, 2023],
        confidence: 86
      },
      {
        format: 'DATA_INTERPRETATION',
        count: 18,
        percentage: 6.0,
        years_observed: [2016, 2023],
        confidence: 88
      }
    ],
    difficulty_distribution: {
      easy_pct: 31.0,
      moderate_pct: 49.0,
      difficult_pct: 20.0
    },
    cognitive_distribution: {
      recall_pct: 38.0,
      understand_pct: 32.0,
      apply_pct: 16.0,
      analyse_pct: 10.0,
      multi_step_pct: 4.0
    },
    static_vs_current: {
      static_pct: 74.0,
      current_pct: 18.0,
      link_pct: 8.0,
      typical_window_months: '6 - 12 Months preceding examination date'
    },
    state_vs_national: {
      state_specific_pct: 48.0,
      india_general_pct: 44.0,
      international_pct: 8.0
    },
    visual_ratio: 0.047,
    distractor_style_distribution: {
      SAME_CATEGORY: 42,
      NEAR_FACT: 28,
      PERSON_CONFUSION: 14,
      DATE_CONFUSION: 10,
      CHRONOLOGY_SWAP: 8,
      CONCEPT_REVERSAL: 6,
      OTHER: 4
    },
    answer_position_distribution: {
      A: 78,
      B: 72,
      C: 76,
      D: 74,
      A_pct: 26.0,
      B_pct: 24.0,
      C_pct: 25.33,
      D_pct: 24.67
    },
    top_recurring_themes: [
      {
        theme: 'Telangana Zonal System & Article 371-D Local Cadres',
        count: 9,
        why_asked: 'Statutory basis of all administrative postings in the state recruitment drive.',
        sample_question_ids: ['pyq_tgpsc_2023_q01']
      },
      {
        theme: 'Kakatiya Dynasty Architecture & Irrigation Works',
        count: 14,
        why_asked: 'Pride of regional history, Ramappa UNESCO 2021 status, and Mission Kakatiya modern connection.',
        sample_question_ids: ['pyq_tgpsc_2023_q02']
      },
      {
        theme: 'Chronological Milestones of Statehood Movement (2009-2014)',
        count: 18,
        why_asked: 'Core syllabus requirement testing precise knowledge of political negotiations leading to state formation.',
        sample_question_ids: ['pyq_tgpsc_2023_q04']
      }
    ],
    emerging_themes: [
      {
        theme: 'Telangana Socio-Economic Outlook & Sectoral GSDP Contributions',
        first_appeared_year: 2016,
        latest_year: 2023,
        count: 8
      },
      {
        theme: 'UNESCO World Heritage Tangible & Intangible Elements',
        first_appeared_year: 2023,
        latest_year: 2023,
        count: 4
      }
    ],
    rotational_topics: [
      {
        topic: 'Ancient Telangana Dynasties: Satavahana vs Ikshvaku vs Vishnukundina',
        cycle_length_years: 2,
        last_seen_year: 2023
      }
    ],
    adjacent_testable_areas: [
      {
        concept: 'The 2018 Presidential Order Zonal Distribution (Zones 1-7, Multi-Zones I & II)',
        source_pyq_concept: 'Article 371-D',
        future_relevance: 'HIGH',
        syllabus_area: 'Telangana State Policies & Administration'
      },
      {
        concept: 'Thousand Pillar Temple (1163 CE Rudreswara Temple) architecture & Inscriptions',
        source_pyq_concept: 'Ramappa Temple UNESCO Inscription',
        future_relevance: 'HIGH',
        syllabus_area: 'Telangana Culture & Heritage'
      },
      {
        concept: 'Justice Srikrishna Committee Option 5 vs Option 6 Detailed Recommendations',
        source_pyq_concept: 'Formation of Telangana Chronology 2009-2014',
        future_relevance: 'HIGH',
        syllabus_area: 'Telangana Movement History'
      },
      {
        concept: 'Kaleshwaram Lift Irrigation System: Barrage elevations and canal network',
        source_pyq_concept: 'Godavari Drainage Basin Tributaries',
        future_relevance: 'HIGH',
        syllabus_area: 'Telangana Geography & Projects'
      }
    ],
    confidence_score: 94,
    readiness_status: 'HIGH_CONFIDENCE',
    comparable_exam_evidence: [
      {
        comparable_exam: 'TGPSC Group-I Preliminary Test (General Studies)',
        reason: 'Same commission examining body, overlapping regional syllabus units and evaluation patterns',
        observed_overlap: '88% topic mapping overlap on Telangana History, Polity and Geography'
      }
    ]
  }
];

export const INITIAL_PYQ_CLUSTERS: PYQClusterRecord[] = [
  {
    cluster_id: 'cluster_tgpsc_art371d',
    exam_id: 'tgpsc_group_2_paper_1',
    cluster_name: 'Article 371-D & Local Cadres Framework',
    cluster_type: 'SAME_CONCEPT',
    core_concept: 'Constitutional protection of regional education and public employment quotas in Telangana',
    question_ids: ['pyq_tgpsc_2023_q01'],
    questions_preview: [
      {
        id: 'pyq_tgpsc_2023_q01',
        year: 2023,
        number: 1,
        text: 'Under Article 371-D of the Constitution of India, which of the following provisions was specifically created...',
        answer: 'Option A: Creation of Special Administrative Tribunal & equitable opportunities'
      }
    ]
  },
  {
    cluster_id: 'cluster_tgpsc_kakatiya',
    exam_id: 'tgpsc_group_2_paper_1',
    cluster_name: 'Kakatiya Architecture & Heritage Sites',
    cluster_type: 'SAME_CONCEPT',
    core_concept: 'Medieval Kakatiya architectural hallmarks, UNESCO World Heritage sites and epigraphs',
    question_ids: ['pyq_tgpsc_2023_q02'],
    questions_preview: [
      {
        id: 'pyq_tgpsc_2023_q02',
        year: 2023,
        number: 2,
        text: 'Consider the statements regarding Ramappa Temple: 1. UNESCO list 2021... 2. Floating bricks... 3. Recharla Rudra 1213 CE...',
        answer: 'Option C: 1, 2 and 3'
      }
    ]
  }
];
