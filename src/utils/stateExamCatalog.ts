import { INDIAN_STATES, getCleanExamTitle } from './examJurisdiction.ts';

export function formatMockNumber(seriesNumber: number): string {
  return String(Math.max(1, seriesNumber)).padStart(2, "0");
}

export function mockTestLabel(seriesNumber: number): string {
  return `Mock Test ${formatMockNumber(seriesNumber)}`;
}

export function buildMockTestTitle({
  stateCode,
  examName,
  paperName,
  subjectName,
  seriesNumber,
}: {
  stateCode: string;
  examName: string;
  paperName: string;
  subjectName?: string | null;
  seriesNumber: number;
}): string {
  const location = `${stateCode} ${examName} · ${paperName}`;
  return `${location}${subjectName ? ` · ${subjectName}` : ""} · ${mockTestLabel(seriesNumber)}`;
}

export function toCatalogSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function studentFacingMockTestTitle({
  examName,
  paperLabel,
  seriesNumber,
  subjectName,
}: {
  examName: string;
  paperLabel: string;
  seriesNumber: number;
  subjectName?: string | null;
}): string {
  return `${examName} · ${paperLabel}${subjectName ? ` · ${subjectName}` : ""} · ${mockTestLabel(seriesNumber)}`;
}

export function inferExamKind(name: string): "police" | "education" | "engineering" | "administration" | "general" {
  const normalized = name.toLowerCase();
  if (/police|constable|\bsi\b|sub[- ]?inspector/.test(normalized)) return "police" as const;
  if (/teacher|tet|dsc|school|education/.test(normalized)) return "education" as const;
  if (/engineer|aee|ae\b|technical/.test(normalized)) return "engineering" as const;
  if (/executive|officer|group|service|psc/.test(normalized)) return "administration" as const;
  return "general" as const;
}

export function hasMockTestSuffixOrMention(name: string): boolean {
  if (!name) return false;
  return /\b(mock[\s-]*tests?|test[\s-]*series)\b/i.test(name);
}

export function formatExamHeading(name: string): string {
  if (!name) return "";
  if (hasMockTestSuffixOrMention(name)) {
    return name;
  }
  return `${name} Mock Tests`;
}

export function formatExamFallbackTitle(examName: string, stateName?: string): string {
  if (!examName) return "";
  const hasSuffix = hasMockTestSuffixOrMention(examName);
  const mentionsState = Boolean(stateName && examName.toLowerCase().includes(stateName.toLowerCase()));

  if (hasSuffix) {
    if (mentionsState || !stateName) {
      return examName;
    }
    return `${examName} in ${stateName}`;
  }

  if (mentionsState || !stateName) {
    return `${examName} Mock Tests`;
  }
  return `${examName} Mock Tests in ${stateName}`;
}

export function formatExamFallbackDescription(examName: string, stateName?: string): string {
  if (!examName) return "";
  const hasSuffix = hasMockTestSuffixOrMention(examName);
  const mentionsState = Boolean(stateName && examName.toLowerCase().includes(stateName.toLowerCase()));
  const target = hasSuffix ? examName : `${examName} mock tests`;
  const location = mentionsState || !stateName ? "" : ` for ${stateName}`;
  return `Practise ${target}${location}. Explore papers, take timed tests and review every answer.`;
}

/**
 * Returns 2-letter state code for a given Indian State name, or uppercase abbreviation.
 */
export function getStateCode(stateName?: string): string {
  if (!stateName) return '';
  const trimmed = stateName.trim();
  const match = INDIAN_STATES.find(s => s.name.toLowerCase() === trimmed.toLowerCase() || s.code.toLowerCase() === trimmed.toLowerCase());
  if (match) return match.code;
  if (trimmed.toUpperCase() === 'CENTRAL') return 'ALL-INDIA';
  if (trimmed.length <= 3) return trimmed.toUpperCase();
  return trimmed.substring(0, 2).toUpperCase();
}

/**
 * Helper to derive all standardized state exam catalog metadata for an exam record or intake input.
 */
export function deriveStateExamCatalogMetadata(exam: {
  title: string;
  state_or_central?: string;
  paper?: string;
}) {
  const stateName = exam.state_or_central || '';
  const stateCode = getStateCode(stateName);
  const cleanName = getCleanExamTitle(exam.title);
  const examKind = inferExamKind(cleanName);
  const heading = formatExamHeading(cleanName);
  const fallbackTitle = formatExamFallbackTitle(cleanName, stateName);
  const fallbackDescription = formatExamFallbackDescription(cleanName, stateName);
  const catalogSlug = toCatalogSlug(stateName ? `${stateName}-${cleanName}` : cleanName);
  const sampleMockTitle = buildMockTestTitle({
    stateCode: stateCode || 'IN',
    examName: cleanName,
    paperName: exam.paper || 'Paper-I',
    seriesNumber: 1
  });
  const sampleStudentTitle = studentFacingMockTestTitle({
    examName: cleanName,
    paperLabel: exam.paper || 'Paper-I',
    seriesNumber: 1
  });

  return {
    stateCode,
    cleanName,
    examKind,
    heading,
    fallbackTitle,
    fallbackDescription,
    catalogSlug,
    sampleMockTitle,
    sampleStudentTitle
  };
}
