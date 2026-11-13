/// <reference types="node" />
import assert from 'node:assert/strict';
import { test } from 'node:test';

import { planItinerary, routeKm } from './itinerary.ts';
import { addressQueries, countryCodeOf, extractCoords, extractName, isShortMapsUrl, parseSharedText, splitPlaceText } from './mapsLink.ts';

test('구글 지도 앱 공유 텍스트 (짧은 링크)', () => {
  const r = parseSharedText('도톤보리\n일본 오사카부 오사카시 주오구\nhttps://maps.app.goo.gl/AbCd123');
  assert.equal(r.name, '도톤보리');
  assert.equal(r.lat, null);
  assert.equal(r.needsResolve, true);
  assert.equal(r.url, 'https://maps.app.goo.gl/AbCd123');
});

test('긴 링크에서 좌표·이름 추출 (!3d!4d 우선)', () => {
  const url = 'https://www.google.com/maps/place/Dotonbori/@34.6687,135.5012,17z/data=!3m1!4b1!4m6!3m5!1s0x1!8m2!3d34.668723!4d135.501295';
  const r = parseSharedText(url);
  assert.equal(r.name, 'Dotonbori');
  assert.equal(r.lat, 34.668723);
  assert.equal(r.lng, 135.501295);
  assert.equal(r.needsResolve, false);
});

test('q= 좌표 링크', () => {
  assert.deepEqual(extractCoords('https://maps.google.com/?q=13.7563,100.5018'), { lat: 13.7563, lng: 100.5018 });
  assert.deepEqual(extractCoords('https://www.google.com/maps/search/25.0330,+121.5654'), { lat: 25.033, lng: 121.5654 });
});

test('지도 링크가 아니면 좌표 없음', () => {
  const r = parseSharedText('그냥 메모');
  assert.equal(r.lat, null);
  assert.equal(r.url, null);
  assert.equal(r.needsResolve, false);
  assert.equal(isShortMapsUrl('https://example.com/x'), false);
});

test('좌표 없는 공유 주소에서 이름과 영문 주소 나누기', () => {
  const url = 'https://www.google.com/maps/place/%EC%8A%A4%ED%85%8C%EC%B8%84+%EC%98%A4%EB%B8%8C+%EB%A6%AC%EB%B2%84%ED%8B%B0+%EA%B5%AD%EA%B0%80%EA%B8%B0%EB%85%90%EB%AC%BC+New+York,+NY+10004+%EB%AF%B8%EA%B5%AD/data=!4m2!3m1!1s0x89c25090129c363d:0x40c6a5770d25022b!18m1!1e1?g_st=ac';
  assert.equal(extractCoords(url), null);
  assert.deepEqual(splitPlaceText(extractName(url)!), { name: '스테츄 오브 리버티 국가기념물', address: 'New York, NY 10004' });
});

test('이름 나누기: 나라 이름과 우편번호 빼기', () => {
  assert.deepEqual(splitPlaceText('도톤보리 일본 〒542-0071 Osaka, Chuo Ward, Dotonbori, 1 Chome'), { name: '도톤보리', address: 'Osaka, Chuo Ward, Dotonbori, 1 Chome' });
});

test('이름 나누기: 영문 이름은 쉼표로, 한글만 있으면 주소 없음', () => {
  assert.deepEqual(splitPlaceText('Statue of Liberty, New York, NY 10004'), { name: 'Statue of Liberty', address: 'New York, NY 10004' });
  assert.deepEqual(splitPlaceText('도톤보리'), { name: '도톤보리', address: null });
});

test('공유 주소에서 나라 찾기', () => {
  assert.equal(countryCodeOf('스테츄 오브 리버티 국가기념물 New York, NY 10004 미국'), 'us');
  assert.equal(countryCodeOf('도톤보리 일본 〒542-0071 Osaka, Chuo Ward'), 'jp');
  assert.equal(countryCodeOf('Statue of Liberty, New York, NY 10004, United States'), 'us');
  assert.equal(countryCodeOf('Tour Eiffel, Paris, France'), null);
});

test('주소 검색은 전체부터, 그다음 맨 끝을 뺀 것', () => {
  assert.deepEqual(addressQueries('Osaka, Chuo Ward, 1 Chome'), ['Osaka, Chuo Ward, 1 Chome', 'Osaka, Chuo Ward']);
  assert.deepEqual(addressQueries('Osaka'), ['Osaka']);
});

test('일정 자동 구성: 가까운 장소끼리 같은 날', () => {
  const places = [
    { id: 'namba1', lat: 34.6687, lng: 135.5012, votes: 3 },
    { id: 'namba2', lat: 34.665, lng: 135.503, votes: 1 },
    { id: 'usj', lat: 34.6654, lng: 135.4323, votes: 2 },
    { id: 'kyoto1', lat: 35.0116, lng: 135.7681, votes: 2 },
    { id: 'kyoto2', lat: 35.0037, lng: 135.7787, votes: 1 },
    { id: 'nocoord', lat: null, lng: null, votes: 0 },
  ];
  const plan = planItinerary(places, 2);
  assert.equal(plan.length, 2);
  const dayOf = (id: string) => plan.findIndex((d) => d.placeIds.includes(id));
  assert.equal(dayOf('kyoto1'), dayOf('kyoto2'));
  assert.equal(dayOf('namba1'), dayOf('namba2'));
  assert.notEqual(dayOf('kyoto1'), dayOf('namba1'));
  assert.equal(plan.flatMap((d) => d.placeIds).length, 6);
});

test('동선 거리', () => {
  assert.equal(routeKm([{ lat: 0.0001, lng: 0 }]), 0);
  assert.ok(routeKm([{ lat: 34.6687, lng: 135.5012 }, { lat: 35.0116, lng: 135.7681 }]) > 40);
});
