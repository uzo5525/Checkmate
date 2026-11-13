/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canCheckDoc, docGateOf } from './docGate.ts';

test('확인 전에는 체크할 수 없음', () => {
  assert.equal(docGateOf(null, false), 'pending');
  assert.equal(canCheckDoc('pending'), false);
});

test('요건을 충족하면 체크할 수 있음 (여유가 적어도)', () => {
  assert.equal(canCheckDoc(docGateOf('match', false)), true);
  assert.equal(canCheckDoc(docGateOf('check', false)), true);
});

test('요건 미달은 일단 체크를 눌렀어도 막음', () => {
  assert.equal(docGateOf('mismatch', true), 'failed');
  assert.equal(canCheckDoc('failed'), false);
});

test('확인이 안 되는 상황이면 일단 체크로 구분', () => {
  assert.equal(docGateOf(null, true), 'waived');
  assert.equal(canCheckDoc('waived'), true);
});

test('일단 체크한 뒤 확인에 성공하면 확인 완료로 바뀜', () => {
  assert.equal(docGateOf('match', true), 'passed');
});
