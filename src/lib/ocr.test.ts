/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { findInsurancePeriod } from './ocrText.ts';

test('보험 기간: 한글 날짜와 이름표', () => {
  assert.deepEqual(findInsurancePeriod('피보험자 홍길동\n보험기간 : 2026년 11월 25일 00시 ~ 2026년 11월 29일 24시'), { start: '2026-11-25', end: '2026-11-29' });
});

test('보험 기간: 이름표 다음 줄에 날짜', () => {
  assert.deepEqual(findInsurancePeriod('보 험 기 간\n2026.11.25\n2026.11.29'), { start: '2026-11-25', end: '2026-11-29' });
});

test('보험 기간: 영문 증명서', () => {
  assert.deepEqual(findInsurancePeriod('Period of Insurance: 25 Nov 2026 to 29 Nov 2026'), { start: '2026-11-25', end: '2026-11-29' });
  assert.deepEqual(findInsurancePeriod('Coverage Period Nov 25, 2026 - Nov 29, 2026'), { start: '2026-11-25', end: '2026-11-29' });
});

test('보험 기간: 이름표가 없으면 물결표로 이어진 날짜만', () => {
  assert.deepEqual(findInsurancePeriod('증권번호 12345\n2026-11-25 ~ 2026-11-29'), { start: '2026-11-25', end: '2026-11-29' });
});

test('보험 기간: 생년월일·발급일만 있으면 찾지 않음', () => {
  assert.equal(findInsurancePeriod('생년월일 2001.03.04\n발급일 2026.10.01'), null);
});

test('보험 기간: 순서가 뒤집히면 인정하지 않음', () => {
  assert.equal(findInsurancePeriod('보험기간 2026.11.29 ~ 2026.11.25'), null);
});

import { addMonths } from './dates.ts';
import { parseTD3 } from './mrz.ts';
import { extractCapacity, findMrzExpiry, findMrzLines } from './ocrText.ts';

test('OCR 텍스트에서 MRZ 찾기 (공백·« 보정)', () => {
  const ocr = [
    'REPUBLIC OF UTOPIA',
    'PASSPORT',
    'P<UTOERIKSSON<<ANNA<MARIA«<<<<<<<<<<<<<<<<<<',
    'L898902C36 UTO7408122F1204159ZE184226B<<<<<10',
  ].join('\n');
  const lines = findMrzLines(ocr);
  assert.ok(lines);
  const r = parseTD3(lines[0], lines[1], 2026);
  assert.equal(r.valid, true);
  assert.equal(r.expiryDate, '2012-04-15');
});

test('MRZ 없으면 null', () => {
  assert.equal(findMrzLines('hello\nworld'), null);
});

test('2번째 줄만으로 만료일 (조각난 줄, 0/O 오인식, 1번째 줄 잘림)', () => {
  // ICAO 예시 2번째 줄을 조각내고 숫자 자리 0 → O 로 오인식
  const ocr = ['대한민국 REPUBLIC OF KOREA', 'L898902C36UTO74O8122F', '1204159ZE184226B<<<<<10'].join('\n');
  const r = findMrzExpiry(ocr);
  assert.ok(r);
  assert.equal(r.expiryYymmdd, '120415');
});

test('PMKOR 1번째 줄에서 이름', () => {
  const ocr = ['PMKORHONG<<GILDONG<<<<<<<<<<<<<<<<<<<<<<<<<<', 'L898902C36KOR7408122F1204159ZE184226B<<<<<10'].join('\n');
  const r = findMrzExpiry(ocr);
  assert.ok(r);
  assert.equal(r.name, 'HONG GILDONG');
});

test('국적 칸의 O 를 0 으로 잘못 읽어도 만료일을 읽음', () => {
  assert.equal(findMrzExpiry('P<UTOERIKSSON<<ANNA<KMARTA<<<K<KLLLLLLLLLLKKLK\nL898902C36UT07408122F12041597E184226B<<<<<10\n')?.expiryYymmdd, '120415');
});

test('체크 디지트 틀리면 만료일 안 읽음', () => {
  assert.equal(findMrzExpiry('L898902C36UTO7408122F1204158ZE184226B<<<<<10'), null);
});

test('보조배터리 라벨 용량', () => {
  const c = extractCapacity('Rated capacity 10,000 mAh 3.7V 37Wh\nInput 5V 2A');
  assert.equal(c.mAh, 10000);
  assert.equal(c.wh, 37);
  assert.equal(c.voltage, 3.7);
});

test('화장품 용량', () => {
  assert.equal(extractCapacity('SUN CREAM 150 mL').ml, 150);
  assert.equal(extractCapacity('토너 200ml').ml, 200);
});

test('개월 더하기', () => {
  assert.equal(addMonths('2026-11-29', 6), '2027-05-29');
  assert.equal(addMonths('2026-08-31', 6), '2027-02-28');
});
