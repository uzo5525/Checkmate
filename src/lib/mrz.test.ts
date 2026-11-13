/// <reference types="node" />
// 실행: npm test  (Node 22.6+ 의 TypeScript 타입 제거 기능 사용)
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { checkDigit, MrzError, parseTD3 } from './mrz.ts';

// ICAO Doc 9303 Part 4 의 견본 여권 MRZ
const L1 = 'P<UTOERIKSSON<<ANNA<MARIA<<<<<<<<<<<<<<<<<<<';
const L2 = 'L898902C36UTO7408122F1204159ZE184226B<<<<<10';

test('체크 디지트 계산', () => {
  assert.equal(checkDigit('L898902C3'), 6);
  assert.equal(checkDigit('740812'), 2);
  assert.equal(checkDigit('120415'), 9);
});

test('ICAO 견본 MRZ 파싱', () => {
  const r = parseTD3(L1, L2, 2026);
  assert.equal(r.documentType, 'P');
  assert.equal(r.issuingCountry, 'UTO');
  assert.equal(r.surname, 'ERIKSSON');
  assert.equal(r.givenNames, 'ANNA MARIA');
  assert.equal(r.nationality, 'UTO');
  assert.equal(r.birthDate, '1974-08-12');
  assert.equal(r.sex, 'F');
  assert.equal(r.expiryDate, '2012-04-15');
  assert.equal(r.valid, true);
});

test('여권번호는 반환 객체에 포함되지 않음', () => {
  const r = parseTD3(L1, L2, 2026);
  const json = JSON.stringify(r);
  assert.equal(json.includes('L898902C3'), false);
  assert.equal('documentNumber' in r, false);
});

test('체크 디지트 불일치 감지', () => {
  const tampered = L2.slice(0, 13) + '7408132' + L2.slice(20); // 생년월일 변조
  const r = parseTD3(L1, tampered, 2026);
  assert.equal(r.checks.birthDate, false);
  assert.equal(r.checks.composite, false);
  assert.equal(r.valid, false);
});

test('OCR 공백·소문자 정리', () => {
  const r = parseTD3(L1.toLowerCase(), L2.replace('UTO', 'U T O'), 2026);
  assert.equal(r.valid, true);
});

test('길이 오류', () => {
  assert.throws(() => parseTD3('P<UTO', L2), MrzError);
});
