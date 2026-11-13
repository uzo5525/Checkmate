/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { jstToMs, parseGdacs, parseJapanQuakes, parseJapanTsunami, parseUsgs, sortEvents } from './disaster.ts';

const NOW = jstToMs('2026/11/04 12:00:00');
const quake = (id: string, time: string, maxScale: number, domesticTsunami = 'None') => ({ id, earthquake: { time, maxScale, domesticTsunami, hypocenter: { name: '千葉県北東部', magnitude: 5.2 } } });

test('일본 지진: 진도 5약 이상, 7일 이내만', () => {
  const out = parseJapanQuakes([quake('a', '2026/11/03 10:00:00', 45), quake('b', '2026/11/03 11:00:00', 40), quake('c', '2026/10/20 10:00:00', 60)], NOW);
  assert.deepEqual(out.map((e) => e.id), ['a']);
  assert.equal(out[0].title, '지진 · 최대 진도 5약');
});

test('일본 지진: 같은 지진의 중복 발표는 하나로', () => {
  assert.equal(parseJapanQuakes([quake('a', '2026/11/03 10:00:00', 45), quake('b', '2026/11/03 10:00:00', 45)], NOW).length, 1);
});

test('일본 지진: 쓰나미 정보가 있으면 심각으로 표시', () => {
  const [e] = parseJapanQuakes([quake('a', '2026/11/03 10:00:00', 45, 'Warning')], NOW);
  assert.equal(e.severe, true);
  assert.match(e.detail, /쓰나미/);
});

test('쓰나미: 가장 높은 등급과 지역', () => {
  const [e] = parseJapanTsunami([{ id: 't', issue: { time: '2026/11/04 11:00:00' }, areas: [{ grade: 'Watch', name: 'A' }, { grade: 'Warning', name: 'B' }] }], NOW);
  assert.equal(e.title, '쓰나미 경보');
  assert.equal(e.detail, 'B');
});

test('쓰나미: 해제됐거나 오래되면 표시하지 않음', () => {
  assert.equal(parseJapanTsunami([{ id: 't', cancelled: true, issue: { time: '2026/11/04 11:00:00' } }], NOW).length, 0);
  assert.equal(parseJapanTsunami([{ id: 't', issue: { time: '2026/10/20 11:00:00' }, areas: [{ grade: 'Watch', name: 'A' }] }], NOW).length, 0);
  assert.equal(parseJapanTsunami([], NOW).length, 0);
});

test('GDACS: 주황·적색, 7일 이내만', () => {
  const feature = (eventid: number, alertlevel: string, todate: string) => ({ properties: { eventtype: 'TC', eventid, alertlevel, name: 'Typhoon X', todate } });
  const out = parseGdacs({ features: [feature(1, 'Red', '2026-11-03T00:00:00'), feature(2, 'Green', '2026-11-03T00:00:00'), feature(3, 'Orange', '2026-10-01T00:00:00')] }, NOW);
  assert.deepEqual(out.map((e) => e.title), ['태풍 · 적색 경보']);
  assert.equal(out[0].severe, true);
});

test('USGS: 그 나라 범위, 규모 5.5 이상만', () => {
  const quakeAt = (id: string, lng: number, lat: number, mag: number, tsunami = 0) => ({ id, properties: { mag, place: 'somewhere', time: NOW - 3600_000, tsunami }, geometry: { coordinates: [lng, lat, 10] } });
  const json = { features: [quakeAt('in', 121.5, 24, 6, 0), quakeAt('small', 121.5, 24, 5), quakeAt('out', 140, 36, 7), quakeAt('wave', 121.5, 24, 5.6, 1)] };
  const out = parseUsgs(json, 'TW', NOW);
  assert.deepEqual(out.map((e) => e.id), ['usgs-in', 'usgs-wave']);
  assert.equal(out[0].title, '지진 · 규모 6.0');
  assert.equal(out[1].severe, true);
  assert.deepEqual(parseUsgs(json, 'XX', NOW), []);
});

test('심각한 것 먼저, 그다음 최근 순', () => {
  const e = (id: string, severe: boolean, at: string) => ({ id, title: '', detail: '', severe, at });
  assert.deepEqual(sortEvents([e('a', false, '2026-11-04'), e('b', true, '2026-11-01'), e('c', false, '2026-11-03')]).map((x) => x.id), ['b', 'a', 'c']);
});
