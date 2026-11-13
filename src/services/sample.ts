// 시연용 샘플 여행: "오사카 4박 5일 · 4명" (가상 동행자 3명, 진행 상황, 지도 투표 장소 포함)
import { addDays } from '@/lib/dates';
import { today } from '@/lib/clock';

import { repo } from './repo';

const COMPANIONS = ['민수', '서연', '지호'];

// voters: 0 = 나, 1~3 = 동행자
const OSAKA_PLACES = [
  { name: '도톤보리', note: '글리코 간판, 타코야키', lat: 34.6687, lng: 135.5013, voters: [0, 1, 2] },
  { name: '유니버설 스튜디오 재팬', note: '하루 종일 코스', lat: 34.6654, lng: 135.4323, voters: [1, 3] },
  { name: '오사카성', note: '천수각 · 공원 산책', lat: 34.6873, lng: 135.5262, voters: [2] },
  { name: '신세카이', note: '쿠시카츠 골목', lat: 34.6525, lng: 135.5063, voters: [0] },
  { name: '우메다 스카이빌딩', note: '공중정원 야경', lat: 34.7053, lng: 135.4896, voters: [3, 0] },
  { name: '구로몬 시장', note: '해산물 먹방', lat: 34.6655, lng: 135.5068, voters: [1] },
];

export async function createSampleTrip(myNickname = '나') {
  const depart = addDays(today(), 21);
  const { trip, member } = await repo.createTrip({
    countryCode: 'JP',
    nationality: 'KR',
    departDate: depart,
    returnDate: addDays(depart, 4),
    partySize: 4,
    nickname: myNickname,
    title: '오사카 4박 5일',
  });
  try {
    await repo.seedDemo(trip.id, COMPANIONS, OSAKA_PLACES);
  } catch {
    // 샘플 채우기에 실패해도 여행은 그대로 사용
  }
  return { trip, member };
}

// ───────── 여행사 패키지 (하나투어 예약 연동 시연용) ─────────
// 여행사가 예약을 받으면 이 함수로 여행 방을 세팅하고, 고객에게 방 코드를 줍니다 (고객은 방 코드로만 참여).
// 시연용 방은 미리 만들어 둠: 방 코드 DEMO_PACKAGE_ROOM (방장 닉네임 "하나투어")
export const DEMO_PACKAGE_ROOM = 'HANA26';
const PACKAGE_PROVIDER = '하나투어';

// day: 0부터, 하루 안 순서대로
const PACKAGE_STOPS = [
  { day: 0, name: '간사이 공항 도착 · 가이드 미팅', note: '입국 후 B출구 하나투어 피켓', lat: 34.4347, lng: 135.244 },
  { day: 0, name: '도톤보리', note: '자유 저녁 식사', lat: 34.6687, lng: 135.5013 },
  { day: 1, name: '기요미즈데라', note: '교토 전용 차량 이동', lat: 34.9949, lng: 135.785 },
  { day: 1, name: '기온 거리', note: '전통 거리 산책', lat: 35.0037, lng: 135.7788 },
  { day: 1, name: '후시미 이나리 신사', note: '천 개의 도리이', lat: 34.9671, lng: 135.7727 },
  { day: 2, name: '오사카성', note: '천수각 관람 (입장료 포함)', lat: 34.6873, lng: 135.5262 },
  { day: 2, name: '우메다 스카이빌딩', note: '공중정원 전망대', lat: 34.7053, lng: 135.4896 },
  { day: 3, name: '린쿠 프리미엄 아울렛', note: '쇼핑 후 공항 이동', lat: 34.4073, lng: 135.2972 },
];

// 날짜별 테마 (일정 첫 항목 note 에 "테마|설명" 으로 저장)
const PACKAGE_THEMES = [
  '오사카 도착|공항에서 가이드를 만나 호텔 체크인 후 도톤보리에서 자유 저녁',
  '교토 핵심 일주|전용 차량으로 기요미즈데라·기온·후시미 이나리를 둘러봐요',
  '오사카 시내 관광|오사카성과 우메다 전망대, 저녁은 자유 시간',
  '쇼핑 후 귀국|아울렛에서 쇼핑하고 간사이 공항으로 이동해요',
];

const PACKAGE_ITEMS = [
  { title: '항공권 발권', description: '왕복 항공권 발권이 끝났어요. 전자 항공권은 출발 3일 전 문자로 보내 드려요.', dueOffset: 14 },
  { title: '일정표·식사 확정', description: '날짜별 일정과 포함 식사가 확정됐어요. 여행 코스에서 확인하세요.', dueOffset: 14 },
  { title: '현지 가이드 배정', description: '현지 가이드가 배정됐어요. 출발 전날 가이드가 연락드려요.', dueOffset: 7 },
];

/** (여행사용) 패키지 여행 방 만들기 — 체크리스트 조정, 여행사 처리 항목, 확정 일정까지 세팅 */
export async function createPackageTrip(reservationCode: string, myNickname: string) {
  const depart = addDays(today(), 14);
  const { trip, member } = await repo.createTrip({
    countryCode: 'JP',
    nationality: 'KR',
    departDate: depart,
    returnDate: addDays(depart, 3),
    partySize: 2,
    nickname: myNickname,
    title: '오사카·교토 3박 4일',
    kind: 'package',
    packageInfo: {
      provider: PACKAGE_PROVIDER,
      productName: '[하나투어] 오사카·교토 3박 4일 핵심 일주',
      reservationCode: reservationCode.toUpperCase(),
      guide: '김하나 가이드',
      airline: '대한항공',
      meeting: '출발 당일 출발 2시간 30분 전, 인천공항 제1터미널 3층 하나투어 미팅 테이블',
    },
  });
  try {
    for (const it of PACKAGE_ITEMS) {
      await repo.addItem(trip.id, { ...it, scope: 'personal', category: 'package', providedBy: PACKAGE_PROVIDER });
    }
    const placed: { placeId: string; dayIndex: number; position: number; note: string }[] = [];
    const posByDay: Record<number, number> = {};
    for (const s of PACKAGE_STOPS) {
      const place = await repo.addPlace(trip.id, { name: s.name, note: s.note, lat: s.lat, lng: s.lng }, member.id);
      const position = posByDay[s.day] ?? 0;
      posByDay[s.day] = position + 1;
      placed.push({ placeId: place.id, dayIndex: s.day, position, note: position === 0 ? (PACKAGE_THEMES[s.day] ?? '') : '' });
    }
    await repo.setItinerary(trip.id, placed);
  } catch {
    // 일부 세팅에 실패해도 여행은 그대로 사용
  }
  return { trip, member };
}
