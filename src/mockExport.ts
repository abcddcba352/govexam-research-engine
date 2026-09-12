import type { MockQuestion, MockTestRecord } from './types.ts';

export const VARADHI_IMPORT_HEADERS = [
  'import_key',
  'subject',
  'question_en',
  'option_a_en',
  'option_b_en',
  'option_c_en',
  'option_d_en',
  'question_te',
  'option_a_te',
  'option_b_te',
  'option_c_te',
  'option_d_te',
  'correct_answer',
  'explanation_en',
  'explanation_te',
  'source_reference',
  'source_exam_date',
  'difficulty',
  'content_lifecycle',
  'review_on',
  'expires_on',
  'is_active',
] as const;

export type VaradhiImportHeader = typeof VARADHI_IMPORT_HEADERS[number];
export type VaradhiImportRow = Record<VaradhiImportHeader, string>;

function isoDateFrom(baseDate: string, days: number): string {
  const parsed = new Date(baseDate);
  if (Number.isNaN(parsed.getTime())) return '';
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

function isTelugu(question: MockQuestion): boolean {
  return /telugu|తెలుగు|\bte\b/i.test(question.bilingual?.secondary_language || '');
}

function inferLifecycle(question: MockQuestion): 'PERMANENT' | 'REVIEW' {
  if (question.content_lifecycle) return question.content_lifecycle;
  if (question.current_affairs_evidence) return 'REVIEW';
  return /current\s*affairs?|latest|recent event/i.test(`${question.section_name} ${question.topic}`)
    ? 'REVIEW'
    : 'PERMANENT';
}

export function buildVaradhiImportRows(mock: MockTestRecord): VaradhiImportRow[] {
  return mock.sections.flatMap(section => section.questions).map((question, index) => {
    const lifecycle = inferLifecycle(question);
    const created = (mock.created_at || new Date().toISOString()).slice(0, 10);
    const telugu = isTelugu(question) ? question.bilingual : undefined;
    const reviewOn = lifecycle === 'REVIEW'
      ? (question.review_on || isoDateFrom(created, 90))
      : '';
    const expiresOn = lifecycle === 'REVIEW'
      ? (question.expires_on || isoDateFrom(created, 365))
      : '';
    const importKey = `${mock.exam_id}:${mock.paper_id || 'paper'}:${mock.mock_number}:${String(index + 1).padStart(3, '0')}`;

    return {
      import_key: importKey,
      subject: question.section_name || question.topic || '',
      question_en: question.question_text || '',
      option_a_en: question.options?.[0] || '',
      option_b_en: question.options?.[1] || '',
      option_c_en: question.options?.[2] || '',
      option_d_en: question.options?.[3] || '',
      question_te: telugu?.question_text || '',
      option_a_te: telugu?.options?.[0] || '',
      option_b_te: telugu?.options?.[1] || '',
      option_c_te: telugu?.options?.[2] || '',
      option_d_te: telugu?.options?.[3] || '',
      correct_answer: ['A', 'B', 'C', 'D'][question.correct_option_index] || '',
      explanation_en: question.explanation || '',
      explanation_te: telugu?.explanation || '',
      source_reference: question.source_reference || '',
      source_exam_date: question.source_exam_date || question.current_affairs_evidence?.event_date || '',
      difficulty: question.difficulty || '',
      content_lifecycle: lifecycle,
      review_on: reviewOn,
      expires_on: expiresOn,
      is_active: question.is_active === false ? 'FALSE' : 'TRUE',
    };
  });
}

function spreadsheetSafe(value: string): string {
  return /^[=+@-]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string): string {
  return `"${spreadsheetSafe(value).replace(/"/g, '""')}"`;
}

export function buildVaradhiCsv(mock: MockTestRecord): string {
  const rows = buildVaradhiImportRows(mock);
  return [
    VARADHI_IMPORT_HEADERS.join(','),
    ...rows.map(row => VARADHI_IMPORT_HEADERS.map(header => csvCell(row[header])).join(',')),
  ].join('\r\n');
}

function xmlCell(value: string): string {
  const escaped = spreadsheetSafe(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return `<Cell><Data ss:Type="String">${escaped}</Data></Cell>`;
}

export function buildVaradhiExcelXml(mock: MockTestRecord): string {
  const rows = buildVaradhiImportRows(mock);
  const headerXml = VARADHI_IMPORT_HEADERS.map(header => xmlCell(header)).join('');
  const rowXml = rows.map(row => `<Row>${VARADHI_IMPORT_HEADERS.map(header => xmlCell(row[header])).join('')}</Row>`).join('');
  return `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><Worksheet ss:Name="Mock Questions"><Table><Row>${headerXml}</Row>${rowXml}</Table></Worksheet></Workbook>`;
}
