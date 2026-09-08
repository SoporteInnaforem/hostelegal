import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeText } from './normalizeText';

test('iguala ingredientes aunque cambien tildes, mayúsculas o espacios', () => {
  assert.equal(normalizeText(' Atún '), normalizeText('ATUN'));
  assert.equal(normalizeText('Crema   de sésamo'), normalizeText('crema de sesamo'));
});
