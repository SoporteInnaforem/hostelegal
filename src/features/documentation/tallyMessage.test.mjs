import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTallyMessage } from './tallyMessage.ts';

const iframe = {};
const submission = JSON.stringify({ event: 'Tally.FormSubmitted', payload: { formId: '441ZRY', id: 'submission-1' } });
test('accepts submission only from the configured iframe and origin', () => {
  assert.equal(parseTallyMessage('https://tally.so', iframe, iframe, submission), 'submitted');
  assert.equal(parseTallyMessage('https://evil.example', iframe, iframe, submission), null);
  assert.equal(parseTallyMessage('https://tally.so', {}, iframe, submission), null);
  assert.equal(parseTallyMessage('https://tally.so', null, null, submission), null);
});
test('rejects malformed payloads, different forms and missing submission ID', () => {
  for (const value of [null, {}, 'bad json', 'null', '{}', submission.replace('441ZRY', 'other'), submission.replace('submission-1', '')]) {
    assert.equal(parseTallyMessage('https://tally.so', iframe, iframe, value), null);
  }
});
test('accepts page navigation as activity but rejects invalid page numbers', () => {
  for (const page of [1, 2, 0, -1, '2', 1.5]) {
    const data = JSON.stringify({ event: 'Tally.FormPageView', payload: { formId: '441ZRY', page } });
    assert.equal(parseTallyMessage('https://tally.so', iframe, iframe, data), page === 1 || page === 2 ? 'page' : null);
  }
});
