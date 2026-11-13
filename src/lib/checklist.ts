// 체크리스트 생성·분류 로직 (순수 함수).
import type { CountryData } from '../data/countries/index.ts';
import { SHARED_OWNER, type ChecklistItem, type ItemStatus, type Member, type Trip } from '../types.ts';

/** 타임라인 구간 (출발 N일 전) */
export const BUCKETS = [30, 14, 7, 3, 1] as const;
export type Bucket = (typeof BUCKETS)[number];

/** 마감 dueOffset 인 항목이 속하는 구간: dueOffset 이상인 가장 작은 구간 */
export function bucketOf(dueOffset: number): Bucket {
  for (let i = BUCKETS.length - 1; i >= 0; i--) {
    if (BUCKETS[i] >= dueOffset) return BUCKETS[i];
  }
  return BUCKETS[0];
}

/** 오늘(daysLeft)이 속한 구간: daysLeft 이하인 가장 큰 구간 */
export function currentBucket(daysLeft: number): Bucket | null {
  for (const b of BUCKETS) if (b <= daysLeft) return b;
  return null;
}

type TripInput = Pick<Trip, 'id' | 'nationality' | 'partySize'>;

/** 규칙 데이터 + 여행 정보 → 체크리스트 항목 */
export function generateChecklist(country: CountryData, trip: TripInput, makeId: () => string): ChecklistItem[] {
  return country.items.map((t, i) => {
    const override = t.byNationality?.[trip.nationality];
    // 혼자 가는 여행이면 공유 항목도 개인 체크리스트로
    const scope = trip.partySize <= 1 ? 'personal' : t.scope;
    return {
      id: makeId(),
      tripId: trip.id,
      templateId: t.id,
      title: override?.title ?? t.title,
      description: override?.description ?? t.description,
      dueOffset: t.dueOffset,
      scope,
      category: t.category,
      sourceUrl: t.sourceUrl,
      sourceName: t.sourceName,
      verified: t.verified,
      required: !!t.required,
      assigneeId: null,
      sortOrder: i,
      ownerMemberId: null,
      createdByAi: false,
      providedBy: null,
    };
  });
}

/** 패키지 여행에서 여행사가 대신 처리하는 기본 항목 */
export const PACKAGE_PROVIDED_KEYS = ['insurance', 'accommodation', 'airport_transfer', 'airport_meetup'];
/** 패키지 여행에서는 필요 없는 항목 (여행사 일정·단체 이동으로 대체) */
export const PACKAGE_DROPPED_KEYS = ['shared_supplies'];

/** 패키지 여행용으로 체크리스트 조정: 모두 개인 항목, 여행사 처리 항목은 완료·잠금 */
export function adaptForPackage(items: ChecklistItem[], provider: string, keyOf: (templateId: string | null) => string | null): ChecklistItem[] {
  return items
    .filter((i) => !PACKAGE_DROPPED_KEYS.includes(keyOf(i.templateId) ?? ''))
    .map((i) => ({ ...i, scope: 'personal' as const, providedBy: PACKAGE_PROVIDED_KEYS.includes(keyOf(i.templateId) ?? '') ? provider : null }));
}

export function ownerKeyFor(item: ChecklistItem, memberId: string): string {
  return item.scope === 'shared' ? SHARED_OWNER : memberId;
}

export function statusKey(itemId: string, ownerKey: string): string {
  return `${itemId}:${ownerKey}`;
}

export type StatusMap = Record<string, ItemStatus>;

export function indexStatuses(statuses: ItemStatus[]): StatusMap {
  const map: StatusMap = {};
  for (const s of statuses) map[statusKey(s.itemId, s.ownerKey)] = s;
  return map;
}

export function isDone(map: StatusMap, item: ChecklistItem, memberId: string): boolean {
  if (item.providedBy) return true;
  return !!map[statusKey(item.id, ownerKeyFor(item, memberId))]?.done;
}

export type Classified = {
  overdue: ChecklistItem[];
  now: ChecklistItem[];
  byBucket: { bucket: Bucket; items: ChecklistItem[] }[];
};

/**
 * - 기한 지난 미완료: 미완료 && 남은 일수 < dueOffset
 * - 지금 할 일: 미완료 && 아직 기한 전 && 현재 구간(오늘이 속한 D-구간) 안에 마감
 */
export function classify(items: ChecklistItem[], done: (item: ChecklistItem) => boolean, daysLeft: number): Classified {
  const sorted = [...items].sort((a, b) => b.dueOffset - a.dueOffset || a.sortOrder - b.sortOrder);
  const cur = currentBucket(daysLeft);
  const nextLower = cur === null ? null : (BUCKETS[BUCKETS.indexOf(cur) + 1] ?? 0);
  const overdue: ChecklistItem[] = [];
  const nowItems: ChecklistItem[] = [];
  for (const it of sorted) {
    if (done(it)) continue;
    if (daysLeft < it.dueOffset) overdue.push(it);
    else if (cur !== null && nextLower !== null && it.dueOffset <= daysLeft && it.dueOffset > nextLower) nowItems.push(it);
  }
  const byBucket = BUCKETS.map((bucket) => ({ bucket, items: sorted.filter((i) => bucketOf(i.dueOffset) === bucket) })).filter(
    (g) => g.items.length > 0,
  );
  return { overdue, now: nowItems, byBucket };
}

export type MemberProgress = {
  member: Member;
  done: number;
  total: number;
  pending: ChecklistItem[];
};

/** 이 멤버에게 보이는 항목인지 (다른 멤버가 직접 추가한 개인 항목은 제외) */
export function visibleTo(item: ChecklistItem, memberId: string | undefined): boolean {
  return item.ownerMemberId === null || item.ownerMemberId === memberId;
}

/** 멤버별 개인 체크리스트 진행률 + 담당 공유 항목 */
export function memberProgress(members: Member[], items: ChecklistItem[], map: StatusMap): MemberProgress[] {
  return members.map((m) => {
    const mine = items.filter((i) => (i.scope === 'personal' && visibleTo(i, m.id)) || i.assigneeId === m.id);
    const pending = mine.filter((i) => !isDone(map, i, m.id));
    return { member: m, done: mine.length - pending.length, total: mine.length, pending };
  });
}

/** 동행 현황에 보여 줄 서류 항목. 체크 여부만 다루고 서류 내용은 서버에 없음 */
const DOC_KEYS: { suffix: string; label: string }[] = [
  { suffix: '.passport_validity', label: '여권' },
  { suffix: '.insurance', label: '보험' },
  { suffix: '.visa', label: '비자' },
  { suffix: '.entry_card', label: '입국 서류' },
];

export type MemberDoc = { label: string; done: boolean };

export function memberDocs(member: Member, items: ChecklistItem[], map: StatusMap): MemberDoc[] {
  return DOC_KEYS.flatMap(({ suffix, label }) => {
    const item = items.find((i) => i.templateId?.endsWith(suffix) && i.scope === 'personal');
    return item ? [{ label, done: isDone(map, item, member.id) }] : [];
  });
}

export type Permissions = {
  canManage: boolean; // 멤버 관리, 공유 항목 추가/삭제, 담당자 지정
  canToggle: (item: ChecklistItem) => boolean;
};

export function permissionsFor(me: Member | undefined): Permissions {
  return {
    canManage: !!me?.isOwner,
    canToggle: (item) => {
      if (!me) return false;
      if (item.providedBy) return false; // 여행사가 처리한 항목은 바꿀 수 없음
      if (item.scope === 'personal') return true;
      return me.isOwner || me.canEditShared || item.assigneeId === me.id;
    },
  };
}
