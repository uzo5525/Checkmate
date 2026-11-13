/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { finalCheck, mostUrgent, tripPhase, type CheckRow } from './finalCheck.ts';

const row = (over: Partial<CheckRow>): CheckRow => ({ id: 'a', title: 'A', done: true, required: false, gate: null, ...over });

test('모두 끝내고 서류도 통과하면 준비 완료', () => {
  const r = finalCheck([row({ gate: 'passed' }), row({ id: 'b' })]);
  assert.equal(r.verdict, 'ready');
  assert.equal(r.passedDocs.length, 1);
  assert.equal(r.doneCount, 2);
});

test('서류 요건 미달은 체크돼 있어도 막음', () => {
  const r = finalCheck([row({ gate: 'failed', done: true })]);
  assert.equal(r.verdict, 'blocked');
  assert.match(r.blockers[0].reason, /요건/);
});

test('필수 미완료는 막고, 선택 미완료는 확인 필요', () => {
  assert.equal(finalCheck([row({ done: false, required: true })]).verdict, 'blocked');
  assert.equal(finalCheck([row({ done: false })]).verdict, 'check');
});

test('일단 체크한 서류는 준비 완료로 치지 않음', () => {
  const r = finalCheck([row({ gate: 'waived' })]);
  assert.equal(r.verdict, 'check');
  assert.match(r.warnings[0].reason, /일단 체크/);
});

test('서류 검사를 안 했으면 막고, 다른 기기에서 체크했으면 확인 필요', () => {
  assert.equal(finalCheck([row({ gate: 'pending', done: false })]).verdict, 'blocked');
  assert.equal(finalCheck([row({ gate: 'pending', done: true })]).verdict, 'check');
});

test('통과했지만 체크를 안 했으면 확인 필요', () => {
  assert.equal(finalCheck([row({ gate: 'passed', done: false })]).verdict, 'check');
});

test('가장 급한 일: 여유가 있으면 띄우지 않음', () => {
  assert.equal(mostUrgent([{ ...row({ done: false, required: true }), dueOffset: 7 }], 20), null);
});

test('가장 급한 일: 선택 항목은 마감이 지나도 띄우지 않음', () => {
  assert.equal(mostUrgent([{ ...row({ done: false }), dueOffset: 30 }], 20), null);
});

test('가장 급한 일: 서류 미달이 먼저, 그다음 마감이 이른 필수', () => {
  const a = { ...row({ id: 'a', done: false, required: true }), dueOffset: 30 };
  const b = { ...row({ id: 'b', done: false, required: true }), dueOffset: 14 };
  const c = { ...row({ id: 'c', gate: 'failed' }), dueOffset: 1 };
  assert.equal(mostUrgent([b, a], 20)?.id, 'a');
  assert.equal(mostUrgent([b, a], 20)?.reason, '마감이 10일 지났어요');
  assert.equal(mostUrgent([a, b, c], 20)?.id, 'c');
});

test('가장 급한 일: 3일 안의 마감과 검사 안 한 서류도 포함', () => {
  assert.equal(mostUrgent([{ ...row({ done: false, required: true }), dueOffset: 7 }], 10)?.reason, '3일 안에 해야 해요');
  assert.equal(mostUrgent([{ ...row({ done: false, gate: 'pending' }), dueOffset: 7 }], 7)?.reason, '오늘까지 해야 해요');
});

test('여행 전·중·후 판정 (출발일과 귀국일은 여행 중)', () => {
  assert.equal(tripPhase('2026-11-24', '2026-11-25', '2026-11-29'), 'before');
  assert.equal(tripPhase('2026-11-25', '2026-11-25', '2026-11-29'), 'during');
  assert.equal(tripPhase('2026-11-29', '2026-11-25', '2026-11-29'), 'during');
  assert.equal(tripPhase('2026-11-30', '2026-11-25', '2026-11-29'), 'after');
});
