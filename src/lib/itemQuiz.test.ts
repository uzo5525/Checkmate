/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { diffCards, quizFor, type QuizContext } from './itemQuiz.ts';

const ctx = (over: Partial<QuizContext> = {}): QuizContext => ({ key: 'visa', countryCode: 'JP', countryName: '일본', nationality: 'KR', stayDays: 5, sourceUrl: 'https://example.com', sourceName: '출처', ...over });

test('비자: 단기 관광은 카드 없이 통과', () => {
  const r = quizFor(ctx())!.evaluate({ purpose: 'short', stay: 'within' });
  assert.equal(r.tone, 'match');
  assert.equal(r.cards.length, 0);
  assert.equal(r.finishes, true);
});

test('비자: 체류 기간 질문의 기본값은 여행 일수로 정해짐', () => {
  const q = (stayDays: number) => quizFor(ctx({ stayDays, countryCode: 'VN', countryName: '베트남' }))!.questions.find((x) => x.id === 'stay')!;
  assert.equal(q(5).initial, 'within');
  assert.equal(q(60).initial, 'over');
});

test('비자: 장기 목적이면 비자 신청 카드', () => {
  const r = quizFor(ctx())!.evaluate({ purpose: 'long', stay: 'within' });
  assert.equal(r.tone, 'mismatch');
  assert.equal(r.cards[0].title, '일본 비자 신청');
  assert.equal(r.cards[0].sourceUrl, 'https://example.com');
});

test('비자: 베트남 45일 초과는 전자비자 카드', () => {
  const r = quizFor(ctx({ countryCode: 'VN', countryName: '베트남' }))!.evaluate({ purpose: 'short', stay: 'over' });
  assert.match(r.cards[0].title, /전자비자/);
  assert.equal(r.cards[0].sourceUrl, 'https://evisa.gov.vn/');
});

test('비자: 미국은 ESTA 안내, 제한 국가 이력이면 비자 카드', () => {
  const quiz = quizFor(ctx({ countryCode: 'US', countryName: '미국' }))!;
  assert.equal(quiz.questions.length, 3);
  assert.equal(quiz.evaluate({ purpose: 'short', stay: 'within', history: 'no' }).cards.length, 0);
  assert.equal(quiz.evaluate({ purpose: 'short', stay: 'within', history: 'yes' }).cards[0].title, '미국 비자 신청');
});

test('비자: 다른 국적은 단정하지 않고 확인 카드', () => {
  const r = quizFor(ctx({ nationality: 'US' }))!.evaluate({ purpose: 'short' });
  assert.equal(r.tone, 'check');
  assert.equal(r.finishes, false);
  assert.equal(r.cards.length, 1);
});

test('공항 이동: 늦게 도착하면 심야 카드, 안 정했으면 체크하지 않음', () => {
  const quiz = quizFor(ctx({ key: 'airport_transfer' }))!;
  const r = quiz.evaluate({ arrive: 'late', decided: 'no' });
  assert.equal(r.cards[0].title, '심야 이동 수단 정하기');
  assert.equal(r.finishes, false);
  assert.equal(quiz.evaluate({ arrive: 'day', decided: 'yes' }).cards.length, 0);
});

test('eSIM: 지원 여부에 따라 다른 카드', () => {
  const quiz = quizFor(ctx({ key: 'esim' }))!;
  assert.equal(quiz.evaluate({ support: 'yes' }).cards[0].title, 'eSIM QR 출국 전 등록');
  assert.match(quiz.evaluate({ support: 'no' }).cards[0].title, /로밍/);
  assert.equal(quiz.evaluate({ support: 'unknown' }).finishes, false);
});

test('짐: 고른 것만 카드로, 짐 싸기는 체크하지 않음', () => {
  const quiz = quizFor(ctx({ key: 'packing' }))!;
  const r = quiz.evaluate({ medicine: 'yes', food: 'no', liquid: 'yes' });
  assert.equal(r.cards.length, 2);
  assert.equal(r.finishes, false);
});

test('질문이 없는 항목', () => {
  assert.equal(quizFor(ctx({ key: 'weather' })), null);
});

test('답을 바꾸면 필요 없어진 카드를 지우고 이미 있는 건 다시 만들지 않음', () => {
  const card = (title: string) => ({ title, description: '', dueOffset: 1, category: 'x' });
  const d = diffCards(['A', 'B'], [card('B'), card('C')], ['A', 'B']);
  assert.deepEqual(d.add.map((c) => c.title), ['C']);
  assert.deepEqual(d.remove, ['A']);
});
