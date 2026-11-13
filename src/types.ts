// 도메인 모델. Supabase 테이블(supabase/schema.sql + migrations)과 1:1 대응합니다.

export type Scope = 'personal' | 'shared';

export type Trip = {
  id: string;
  code: string; // 6자리 방 코드
  countryCode: string; // 'JP' | 'VN' | 'TH' | 'TW' | 'US'
  nationality: string; // 'KR' | 'OTHER'
  departDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  partySize: number;
  title: string;
  ownerMemberId: string;
  createdAt: string;
  kind: TripKind; // 자유 여행 / 여행사 패키지
  packageInfo: PackageInfo | null;
};

export type TripKind = 'free' | 'package';

/** 여행사 패키지 정보 (예약 연동 시 여행사가 채움) */
export type PackageInfo = {
  provider: string; // '하나투어'
  productName: string;
  reservationCode: string;
  guide?: string;
  meeting?: string; // 공항 미팅 안내
  airline?: string; // 패키지 항공사 (짐 반입 규정 기준)
};

export type Member = {
  id: string;
  tripId: string;
  nickname: string;
  isOwner: boolean;
  canEditShared: boolean; // 방장이 부여하는 공유 체크리스트·일정 편집 권한
  joinedAt: string;
};

export type ChecklistItem = {
  id: string;
  tripId: string;
  templateId: string | null; // 규칙 데이터에서 온 항목이면 템플릿 id, 직접 추가하면 null
  title: string;
  description: string;
  dueOffset: number; // 출발 며칠 전까지
  scope: Scope;
  category: string;
  sourceUrl: string | null;
  sourceName: string | null;
  verified: boolean;
  required: boolean; // 과제 필수 6개 항목
  assigneeId: string | null; // 공유 항목 담당자
  sortOrder: number;
  ownerMemberId: string | null; // 내가 직접 추가한 개인 항목이면 내 멤버 id (다른 멤버에게는 안 보임)
  createdByAi: boolean; // AI 에이전트 제안으로 추가됨
  providedBy: string | null; // 여행사가 이미 처리한 항목 (완료·잠금 표시)
};

// 개인 항목은 ownerKey = memberId, 공유 항목은 ownerKey = 'shared'
export const SHARED_OWNER = 'shared';

export type ItemStatus = {
  tripId: string;
  itemId: string;
  ownerKey: string;
  done: boolean;
  updatedBy: string;
  updatedAt: string;
};

/** 여행 코스 투표: 가고 싶은 장소 제안 + 투표 */
export type Place = {
  id: string;
  tripId: string;
  name: string;
  note: string;
  createdBy: string;
  voterIds: string[];
  createdAt: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  sourceUrl: string | null;
};

/** 날짜별 일정 (dayIndex 0 = 출발일) */
export type ItineraryItem = {
  id: string;
  tripId: string;
  placeId: string;
  dayIndex: number;
  position: number;
  note: string;
};

export type TripSnapshot = {
  trip: Trip;
  members: Member[];
  items: ChecklistItem[];
  statuses: ItemStatus[];
  places: Place[];
  itinerary: ItineraryItem[];
};
