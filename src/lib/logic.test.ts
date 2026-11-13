/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import rules from '../data/baggage-rules.json' with { type: 'json' };
import type { ChecklistItem, Member } from '../types.ts';
import { calcWh, judgeBaggage, type BaggageRules } from './baggage.ts';
import { bucketOf, classify, indexStatuses, memberDocs } from './checklist.ts';
import { addDays, diffDays } from './dates.ts';

const R = rules as unknown as BaggageRules;
const draft = (category: any, values: Record<string, string> = {}, subtype?: string) => ({
  id: 'x',
  category,
  values,
  subtype,
  source: 'manual' as const,
});

test('Wh 계산', () => {
  assert.equal(calcWh(10000, 3.7), 37);
  assert.equal(calcWh(27000, 3.7), 99.9);
});

test('보조배터리 판정', () => {
  assert.equal(judgeBaggage(draft('powerbank', { mAh: '20000' }), R, 'JP').verdict, 'cabin');
  const mid = judgeBaggage(draft('powerbank', { mAh: '30000' }), R, 'JP'); // 111Wh
  assert.equal(mid.verdict, 'check');
  assert.equal(mid.cabin, 'approval');
  assert.equal(judgeBaggage(draft('powerbank', { mAh: '50000' }), R, 'JP').verdict, 'restricted');
  assert.equal(judgeBaggage(draft('powerbank', { mAh: '20000' }), R, 'JP').checked, 'no');
});

test('액체류·스프레이·식품 판정', () => {
  assert.equal(judgeBaggage(draft('liquid', { ml: '100' }), R, 'JP').verdict, 'cabin');
  assert.equal(judgeBaggage(draft('liquid', { ml: '150' }), R, 'JP').verdict, 'checked');
  assert.equal(judgeBaggage(draft('spray', {}, 'other'), R, 'JP').verdict, 'restricted');
  assert.equal(judgeBaggage(draft('spray', { ml: '300' }, 'toiletry'), R, 'JP').verdict, 'checked');
  assert.equal(judgeBaggage(draft('food', {}, 'meat'), R, 'JP').verdict, 'restricted');
  assert.equal(judgeBaggage(draft('food', {}, 'meat'), R, 'XX').verdict, 'check');
});

test('날짜 계산', () => {
  assert.equal(diffDays('2026-10-25', '2026-11-24'), 30);
  assert.equal(addDays('2026-12-30', 3), '2027-01-02');
});

test('D-day 분류: 지금 할 일 / 기한 지남', () => {
  const mk = (id: string, dueOffset: number): ChecklistItem => ({
    id, tripId: 't', templateId: null, title: id, description: '', dueOffset, scope: 'personal',
    category: 'x', sourceUrl: null, sourceName: null, verified: false, required: false, assigneeId: null, sortOrder: 0, ownerMemberId: null, createdByAi: false, providedBy: null,
  });
  const items = [mk('a', 30), mk('b', 14), mk('c', 7), mk('d', 1)];
  const none = () => false;
  assert.deepEqual(classify(items, none, 30).now.map((i) => i.id), ['a']);
  assert.deepEqual(classify(items, none, 30).overdue, []);
  const d10 = classify(items, none, 10);
  assert.deepEqual(d10.overdue.map((i) => i.id), ['a', 'b']);
  assert.deepEqual(d10.now.map((i) => i.id), ['c']);
  assert.deepEqual(classify(items, none, 1).now.map((i) => i.id), ['d']);
  assert.equal(bucketOf(21), 30);
  assert.equal(bucketOf(5), 7);
});

test('동행 서류 현황: 개인 항목의 체크 여부만', () => {
  const member = { id: 'm1' } as Member;
  const doc = (id: string, templateId: string, scope: 'personal' | 'shared' = 'personal') => ({ id, templateId, scope, providedBy: null }) as ChecklistItem;
  const items = [doc('p', 'jp.passport_validity'), doc('i', 'jp.insurance'), doc('w', 'jp.weather')];
  const map = indexStatuses([{ tripId: 't', itemId: 'p', ownerKey: 'm1', done: true, updatedBy: 'm1', updatedAt: '' }]);
  assert.deepEqual(memberDocs(member, items, map), [
    { label: '여권', done: true },
    { label: '보험', done: false },
  ]);
});
