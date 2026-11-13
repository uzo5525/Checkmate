/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { ChecklistItem } from '../types.ts';
import { buildPrepCards, cardOf, percent } from './prepCards.ts';

const item = (id: string, category: string, dueOffset = 7) => ({ id, category, dueOffset, sortOrder: 0 }) as ChecklistItem;

test('분류별로 카드에 묶고 직접 추가 항목은 뺌', () => {
  assert.equal(cardOf(item('a', 'documents')), 'entry');
  assert.equal(cardOf(item('b', 'weather')), 'baggage');
  assert.equal(cardOf(item('c', 'stay')), 'flight');
  assert.equal(cardOf(item('d', 'custom')), null);
});

test('항목 없는 카드는 숨기고 완료·놓침 상태를 계산', () => {
  const items = [item('a', 'documents', 30), item('b', 'entry', 7), item('c', 'money', 14), item('d', 'custom')];
  const done = (i: ChecklistItem) => i.id === 'c';
  const cards = buildPrepCards(items, done, 10);
  assert.deepEqual(cards.map((c) => c.key), ['entry', 'money']);
  assert.equal(cards[0].overdue, true);
  assert.equal(cards[0].finished, false);
  assert.equal(cards[1].finished, true);
  assert.equal(cards[1].overdue, false);
  assert.deepEqual(cards[0].items.map((i) => i.id), ['a', 'b']);
});

test('준비율은 반올림, 항목이 없으면 0', () => {
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(3, 3), 100);
  assert.equal(percent(0, 0), 0);
});
