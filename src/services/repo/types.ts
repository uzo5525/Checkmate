import type { ChecklistItem, ItineraryItem, Member, PackageInfo, Place, Scope, Trip, TripKind, TripSnapshot } from '@/types';

export type CreateTripInput = {
  countryCode: string;
  nationality: string;
  departDate: string;
  returnDate: string;
  partySize: number;
  nickname: string;
  title?: string;
  kind?: TripKind;
  packageInfo?: PackageInfo | null;
};

export type NewItem = {
  title: string;
  description: string;
  dueOffset: number;
  scope: Scope;
  category?: string;
  sourceUrl?: string | null;
  sourceName?: string | null;
  /** 개인 항목을 직접 추가할 때 내 멤버 id */
  ownerMemberId?: string | null;
  createdByAi?: boolean;
  /** 여행사가 처리한 항목 (패키지) */
  providedBy?: string | null;
};

export type ItemPatch = Partial<Pick<ChecklistItem, 'title' | 'description' | 'dueOffset'>>;

export type TripPatch = Partial<Pick<Trip, 'title' | 'departDate' | 'returnDate' | 'partySize'>>;

export type NewPlace = {
  name: string;
  note: string;
  lat: number | null;
  lng: number | null;
  address?: string | null;
  sourceUrl?: string | null;
};

export type ItineraryInput = Pick<ItineraryItem, 'placeId' | 'dayIndex' | 'position'> & { note?: string };

export type DemoPlace = { name: string; note: string; lat: number; lng: number; voters: number[] };

export type AiKind = 'briefing' | 'itinerary' | 'ask';

/** Edge Function 응답 (AI 사용 불가 시 fallback: true) */
export type AiResult<T> = { data: T; cached: boolean; fallback: boolean; remaining: number | null; reason?: string };

/**
 * 데이터 저장소 인터페이스. 로컬(AsyncStorage)과 Supabase 구현이 같은 계약을 따릅니다.
 * 화면/훅은 이 인터페이스만 사용하세요.
 */
export interface TripRepo {
  readonly mode: 'local' | 'supabase';

  /** 익명 로그인 등 준비 (로컬 모드는 즉시 완료) */
  ready(): Promise<void>;

  createTrip(input: CreateTripInput): Promise<{ trip: Trip; member: Member }>;
  findTripByCode(code: string): Promise<Trip | null>;
  joinByCode(code: string, nickname: string): Promise<Member>;
  getSnapshot(tripId: string): Promise<TripSnapshot | null>;
  /** 내가 참여한 여행 + 내 멤버 id */
  listMyTrips(knownTripIds: string[]): Promise<{ trip: Trip; memberId: string | null }[]>;
  updateTrip(tripId: string, patch: TripPatch): Promise<void>;
  deleteTrip(tripId: string): Promise<void>;

  setDone(args: { tripId: string; itemId: string; ownerKey: string; done: boolean; by: string }): Promise<void>;
  assignItem(itemId: string, assigneeId: string | null): Promise<void>;
  addItem(tripId: string, item: NewItem): Promise<ChecklistItem>;
  updateItem(itemId: string, patch: ItemPatch): Promise<void>;
  deleteItem(itemId: string): Promise<void>;

  addPlace(tripId: string, place: NewPlace, by: string): Promise<Place>;
  toggleVote(placeId: string, memberId: string): Promise<void>;
  deletePlace(placeId: string): Promise<void>;
  setItinerary(tripId: string, items: ItineraryInput[]): Promise<void>;

  setMemberPermission(memberId: string, canEditShared: boolean): Promise<void>;
  removeMember(memberId: string): Promise<void>;
  transferOwner(tripId: string, toMemberId: string): Promise<void>;

  /** 구글 지도 링크의 실제 주소와 장소의 영어 이름 (Edge Function). 못 찾거나 로컬 모드면 null */
  resolveMapsLink(tripId: string, url: string): Promise<{ url: string; englishName: string | null } | null>;

  /** AI 호출 (Supabase Edge Function). 로컬 모드에서는 null → 규칙 기반 대체 */
  invokeAi<T>(kind: AiKind, payload: unknown): Promise<AiResult<T> | null>;

  /** 시연용 샘플: 가상 동행자·진행 상황·투표 장소 채우기 (방장만) */
  seedDemo(tripId: string, names: string[], places: DemoPlace[]): Promise<void>;

  /** 변경 구독. 다른 멤버의 체크가 반영되면 onChange 호출. 해제 함수 반환 */
  subscribe(tripId: string, onChange: () => void): () => void;

  /** 시연용: 로컬 데이터 전체 삭제 */
  resetAll?(): Promise<void>;
}
