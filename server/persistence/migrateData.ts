import fs from 'fs';
import path from 'path';
import { getSupabaseClient, isSupabaseConfigured } from './supabaseClient.ts';
import { createSupabaseRegistry } from './supabase/index.ts';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');

export interface MigrationClassification {
  totalRecords: number;
  eligibleForImport: number;
  quarantinedFixtures: number;
  reasons: Record<string, number>;
}

export interface DryRunReport {
  dryRun: boolean;
  timestamp: string;
  exams: MigrationClassification;
  sources: MigrationClassification;
  pyqs: MigrationClassification;
  preparationBases: MigrationClassification;
  eligibleRecordsSummary: {
    examIds: string[];
    sourceCount: number;
    pyqCount: number;
    basisCount: number;
  };
  quarantinedSummary: {
    demoMocksCount: number;
    syntheticQuestionsCount: number;
  };
}

function readJson<T>(file: string, fallback: T): T {
  try {
    const full = path.join(DATA_DIR, file);
    if (!fs.existsSync(full)) return fallback;
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (e) {
    return fallback;
  }
}

export async function runDataMigration(options: { dryRun: boolean }): Promise<DryRunReport> {
  const dryRun = options.dryRun !== false;

  // 1. Analyze Exams
  const exams = readJson<any[]>('exams.json', []);
  const eligibleExams = exams.filter(e =>
    e.exam_profile_status === 'VERIFIED' ||
    (e.data_provenance && e.data_provenance !== 'SYNTHETIC_TEST_DATA' && e.data_provenance !== 'DEMO_DATA') ||
    e.exam_id === 'tgpsc_group_2_paper_1'
  );
  const quarantinedExams = exams.length - eligibleExams.length;

  // 2. Analyze Sources
  const sources = readJson<any[]>('sources.json', []);
  const eligibleSources = sources.filter(s =>
    s.verification_status === 'VERIFIED_OFFICIAL' ||
    s.verification_status === 'VERIFIED_GOVERNMENT' ||
    s.source_level === 'LEVEL_5_OFFICIAL' ||
    s.source_level === 'LEVEL_4_GOVERNMENT'
  );
  const quarantinedSources = sources.length - eligibleSources.length;

  // 3. Analyze PYQs
  const pyqs = readJson<any[]>('pyq_questions.json', []);
  const eligiblePyqs = pyqs.filter(q =>
    q.data_provenance === 'RETRIEVED_OFFICIAL' ||
    (q.answer_verification_status && q.answer_verification_status !== 'UNVERIFIED')
  );
  const quarantinedPyqs = pyqs.length - eligiblePyqs.length;

  // 4. Analyze Preparation Bases
  const eligibleExamIds = new Set(eligibleExams.map(e => e.exam_id));
  const bases = readJson<any[]>('preparation_bases.json', []);
  const eligibleBases = bases.filter(b =>
    eligibleExamIds.has(b.exam_id) &&
    (b.status === 'HISTORICAL_BASIS_VERIFIED' || b.status === 'CURRENT_NOTIFICATION_VERIFIED')
  );
  const quarantinedBases = bases.length - eligibleBases.length;

  // 5. Analyze Mocks (Strict Quarantining of DEMO / SYNTHETIC)
  const mocks = readJson<any[]>('mocks.json', []);
  const demoMocks = mocks.filter(m =>
    m.status !== 'FINAL' ||
    m.test_mode === 'DEMO' ||
    m.data_provenance === 'DEMO_DATA' ||
    m.data_provenance === 'SYNTHETIC_TEST_DATA'
  );

  const report: DryRunReport = {
    dryRun,
    timestamp: new Date().toISOString(),
    exams: {
      totalRecords: exams.length,
      eligibleForImport: eligibleExams.length,
      quarantinedFixtures: quarantinedExams,
      reasons: {
        'VERIFIED_OFFICIAL': eligibleExams.length,
        'UNVERIFIED_OR_FIXTURE': quarantinedExams
      }
    },
    sources: {
      totalRecords: sources.length,
      eligibleForImport: eligibleSources.length,
      quarantinedFixtures: quarantinedSources,
      reasons: {
        'OFFICIAL_OR_GOVT_LEVEL': eligibleSources.length,
        'SECONDARY_OR_UNVERIFIED': quarantinedSources
      }
    },
    pyqs: {
      totalRecords: pyqs.length,
      eligibleForImport: eligiblePyqs.length,
      quarantinedFixtures: quarantinedPyqs,
      reasons: {
        'OFFICIAL_PROVENANCE': eligiblePyqs.length,
        'NON_OFFICIAL': quarantinedPyqs
      }
    },
    preparationBases: {
      totalRecords: bases.length,
      eligibleForImport: eligibleBases.length,
      quarantinedFixtures: quarantinedBases,
      reasons: {
        'VERIFIED_BASIS': eligibleBases.length,
        'PARTIAL_OR_UNVERIFIED': quarantinedBases
      }
    },
    eligibleRecordsSummary: {
      examIds: eligibleExams.map(e => e.exam_id),
      sourceCount: eligibleSources.length,
      pyqCount: eligiblePyqs.length,
      basisCount: eligibleBases.length
    },
    quarantinedSummary: {
      demoMocksCount: demoMocks.length,
      syntheticQuestionsCount: demoMocks.reduce((acc, m) => acc + (m.sections?.flatMap((s: any) => s.questions)?.length || 0), 0)
    }
  };

  if (!dryRun) {
    if (!isSupabaseConfigured()) {
      throw new Error('MIGRATION_ABORTED: Cannot perform live migration without active Supabase credentials.');
    }
    const registry = createSupabaseRegistry();

    // Import eligible exams
    for (const exam of eligibleExams) {
      await registry.exams.saveExam(exam);
    }
    // Import eligible sources
    for (const source of eligibleSources) {
      await registry.sources.saveSource(source);
    }
    // Import eligible bases
    for (const basis of eligibleBases) {
      await registry.bases.savePreparationBasis(basis);
    }
    // Import eligible PYQs
    for (const pyq of eligiblePyqs) {
      await registry.pyqs.savePYQQuestion(pyq);
    }
  }

  return report;
}

// CLI Execution Support
if (process.argv[1]?.endsWith('migrateData.ts')) {
  const isLive = process.argv.includes('--live');
  console.log(`Running GovExam Data Migration [Mode: ${isLive ? 'LIVE' : 'DRY-RUN'}]...`);
  runDataMigration({ dryRun: !isLive })
    .then(report => {
      console.log('====================================================');
      console.log('📊 GOVEXAM DATA MIGRATION AUDIT REPORT');
      console.log('====================================================');
      console.log(JSON.stringify(report, null, 2));
    })
    .catch(err => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
