import assert from 'node:assert/strict';
import test from 'node:test';
import { extractStructuredFactsFromDoc } from '../universalResearchDiscovery.ts';

const identity = {
  commission: 'Andhra Pradesh Public Service Commission (APPSC)',
  state_or_central: 'Andhra Pradesh',
  exam: 'Executive Officer Grade III',
  post: 'Executive Officer Grade III',
  stage: 'Written Examination',
  paper: 'Paper I',
  recruitment_cycle: 'Notification 10/2025',
};

test('universal discovery emits only values stated by the source', () => {
  const facts = extractStructuredFactsFromDoc(
    'Andhra Pradesh Public Service Commission. Notification No. 10/2025.',
    'https://psc.ap.gov.in/notifications/10-2025.pdf', identity,
  );
  assert.deepEqual(facts, []);
  assert.ok(facts.every(f => f.evidence_text && !/150|0\.25|General Studies/.test(f.evidence_text)));
});

test('a discovered mirror cannot promote a fact to official verification', () => {
  const facts = extractStructuredFactsFromDoc(
    'APPSC Notification No. 10/2025. This educational mirror is a discovery lead and not a commission source.', 'https://example.edu/mirror.pdf', identity,
  );
  assert.deepEqual(facts, []);
});
