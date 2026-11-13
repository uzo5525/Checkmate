// AI 준비 에이전트의 입력 "신호"를 규칙으로 계산 (순수 함수).
// AI 를 쓸 수 없을 때는 같은 신호로 규칙 기반 브리핑을 만든다 → 기능은 항상 동작.
import type { ChecklistItem, ItineraryItem, Member, Place } from '../types.ts';

/** 에이전트가 제안하고, 사용자가 승인하면 앱이 바로 실행하는 행동 */
export type AgentAction = {
  type: 'assign' | 'move_stop' | 'add_packing';
  title: string; // 버튼 위에 보일 한 줄 (예: "환전은 민수님이 맡기")
  reason: string;
  itemId: string | null; // assign
  memberId: string | null; // assign
  placeId: string | null; // move_stop
  toDay: number | null; // move_stop (0부터)
  item: string | null; // add_packing
};

export type Briefing = {
  headline: string;
  tasks: { title: string; reason: string; itemId: string | null }[];
  suggestions: { title: string; description: string; scope: 'personal' | 'shared'; dueOffset: number; reason: string }[];
  roleTips: string[];
  actions: AgentAction[];
};

export type TripDayWeather = { date: string; text: string; rain: number | null; max: number; min: number };

export type SignalInput = {
  tripTitle: string;
  countryName: string;
  departDate: string;
  returnDate: string;
  daysLeft: number;
  me: Member;
  members: Member[];
  /** 내 체크리스트에 보이는 항목 (개인 + 공유) */
  items: ChecklistItem[];
  isDone: (item: ChecklistItem, memberId: string) => boolean;
  places: Place[];
  scheduledPlaceIds: string[];
  itinerary?: ItineraryItem[];
  /** 여행 날짜의 예보 (출발 16일 전부터) */
  weather?: TripDayWeather[];
  /** 짐 리스트에 이미 있는 물건 이름 */
  packingNames?: string[];
  canAssign?: boolean; // 방장: 공유 항목 담당자 지정 가능
  canEditPlan?: boolean; // 일정 수정 가능 (패키지는 불가)
};

const isRainy = (w: TripDayWeather) => (w.rain ?? 0) >= 60 || /비|소나기|뇌우|눈/.test(w.text);

const THEME_PARK = /(유니버설|universal|usj|디즈니|disney|레고랜드|legoland|식스플래그|six flags|롯데월드)/i;
const TICKET = /(티켓|입장권|예매|ticket)/i;
const OBSERVATORY = /(전망대|스카이|sky|타워|tower)/i;

export function buildSignals(s: SignalInput) {
  const mine = s.items.filter((i) => i.scope === 'personal' || i.assigneeId === s.me.id);
  const pending = mine.filter((i) => !s.isDone(i, s.me.id));
  const overdue = pending.filter((i) => s.daysLeft < i.dueOffset).sort((a, b) => b.dueOffset - a.dueOffset);
  const dueSoon = pending
    .filter((i) => s.daysLeft >= i.dueOffset && i.dueOffset >= Math.max(1, s.daysLeft - 7))
    .sort((a, b) => b.dueOffset - a.dueOffset);
  const shared = s.items.filter((i) => i.scope === 'shared');
  const unassignedShared = shared.filter((i) => !i.assigneeId && !s.isDone(i, 'shared'));

  // 동행 진행률 (개인 항목 이름은 보내지 않음)
  const personalTemplates = s.items.filter((i) => i.scope === 'personal' && i.ownerMemberId === null);
  const companions = s.members
    .filter((m) => m.id !== s.me.id)
    .map((m) => {
      const done = personalTemplates.filter((i) => s.isDone(i, m.id)).length;
      return { memberId: m.id, nickname: m.nickname, done, total: personalTemplates.length };
    });
  const nick = (id: string | null) => s.members.find((m) => m.id === id)?.nickname ?? null;
  const sharedPending = shared
    .filter((i) => !s.isDone(i, 'shared'))
    .sort((a, b) => b.dueOffset - a.dueOffset)
    .slice(0, 6)
    .map((i) => ({ itemId: i.id, title: i.title, dueOffset: i.dueOffset, assigneeId: i.assigneeId, assignee: nick(i.assigneeId) }));

  // 날짜별 일정 (장소 이름) + 여행 날짜 날씨
  const itin = s.itinerary ?? [];
  const tripDays = Math.max(1, Math.round((Date.parse(s.returnDate) - Date.parse(s.departDate)) / 86400000) + 1);
  const days = Array.from({ length: tripDays }, (_, d) => ({
    day: d,
    stops: itin
      .filter((x) => x.dayIndex === d)
      .sort((a, b) => a.position - b.position)
      .map((x) => ({ placeId: x.placeId, name: s.places.find((p) => p.id === x.placeId)?.name ?? '' }))
      .filter((x) => x.name),
  }));
  const weather = s.weather ?? [];
  const rainDays = weather.filter(isRainy).map((w) => w.date);
  const packing = (s.packingNames ?? []).slice(0, 40);

  // 일정·장소 기반 할 일 후보 (체크리스트에 비슷한 항목이 없을 때만)
  const allTitles = s.items.map((i) => i.title).join(' ');
  const candidates: { title: string; why: string; scope: 'personal' | 'shared'; dueOffset: number }[] = [];
  const parks = s.places.filter((p) => THEME_PARK.test(p.name));
  if (parks.length && !TICKET.test(allTitles)) {
    candidates.push({ title: `${parks[0].name} 입장권 사전 예매`, why: '테마파크는 현장 구매가 비싸거나 매진될 수 있어요', scope: 'shared', dueOffset: 14 });
  }
  const sky = s.places.filter((p) => OBSERVATORY.test(p.name));
  if (sky.length && !TICKET.test(allTitles)) {
    candidates.push({ title: `${sky[0].name} 방문 시간대 정하기`, why: '전망대는 일몰 시간대가 붐벼요', scope: 'shared', dueOffset: 3 });
  }
  const unscheduled = s.places.filter((p) => !s.scheduledPlaceIds.includes(p.id) && p.voterIds.length > 0);
  if (s.places.length >= 3 && s.scheduledPlaceIds.length === 0 && s.daysLeft <= 14) {
    candidates.push({ title: '투표한 장소로 날짜별 일정 정하기', why: '출발 2주 전이라 동선을 정해 두면 예약이 쉬워져요', scope: 'shared', dueOffset: 7 });
  }

  return {
    trip: { title: s.tripTitle, country: s.countryName, depart: s.departDate, return: s.returnDate, daysLeft: s.daysLeft, partySize: s.members.length },
    myProgress: { done: mine.length - pending.length, total: mine.length },
    overdue: overdue.slice(0, 5).map((i) => ({ itemId: i.id, title: i.title, dueOffset: i.dueOffset, required: i.required })),
    dueSoon: dueSoon.slice(0, 5).map((i) => ({ itemId: i.id, title: i.title, dueOffset: i.dueOffset, required: i.required })),
    unassignedShared: unassignedShared.slice(0, 5).map((i) => i.title),
    companions,
    places: s.places.slice(0, 12).map((p) => ({ name: p.name, votes: p.voterIds.length, scheduled: s.scheduledPlaceIds.includes(p.id) })),
    unscheduledVoted: unscheduled.length,
    candidates,
    sharedPending,
    days: itin.length ? days : [],
    weather,
    rainDays,
    packing,
    permissions: { canAssign: !!s.canAssign, canEditPlan: !!s.canEditPlan },
  };
}

/** 상황 요약 지문: 이 값이 바뀔 때만 에이전트를 다시 부름 (체크 하나마다 부르지 않도록 굵게 묶음) */
export function signalFingerprint(sig: Signals): string {
  const d = sig.trip.daysLeft;
  const stage = d < 0 ? 'after' : d <= 1 ? 'd1' : d <= 3 ? 'd3' : d <= 7 ? 'd7' : d <= 14 ? 'd14' : d <= 30 ? 'd30' : 'far';
  const behind = sig.companions.filter((c) => c.total && c.done / c.total < 0.3).map((c) => c.memberId).sort();
  const unassigned = sig.sharedPending.filter((i) => !i.assigneeId).length;
  const scheduled = sig.days.reduce((n, x) => n + x.stops.length, 0);
  return [stage, `o${Math.min(sig.overdue.length, 3)}`, `r${sig.rainDays.join('.')}`, `b${behind.join('.')}`, `u${Math.min(unassigned, 3)}`, `s${scheduled}`, `w${sig.weather.length ? 1 : 0}`].join('|');
}

export type Signals = ReturnType<typeof buildSignals>;

/** AI 없이 같은 신호로 만드는 기본 브리핑 */
export function ruleBriefing(sig: Signals): Briefing {
  const d = sig.trip.daysLeft;
  const tasks = [...sig.overdue, ...sig.dueSoon].slice(0, 3).map((t) => ({
    title: t.title,
    reason: d < t.dueOffset ? `D-${t.dueOffset}까지였어요. 지금 바로 챙겨요.` : `D-${t.dueOffset}까지 하면 돼요.`,
    itemId: t.itemId,
  }));
  const headline =
    d < 0
      ? '여행 중이에요. 귀국 일정만 확인하세요.'
      : sig.overdue.length
        ? `놓친 할 일이 ${sig.overdue.length}개 있어요. 먼저 정리해요.`
        : tasks.length
          ? `D-${d}, 오늘은 ${tasks.length}가지만 챙기면 돼요.`
          : `D-${d}, 지금 할 일은 모두 끝났어요 👏`;
  const roleTips: string[] = [];
  if (sig.unassignedShared.length) roleTips.push(`담당자가 없는 함께 준비 항목이 ${sig.unassignedShared.length}개 있어요. 나눠 맡아 보세요.`);
  const behind = sig.companions.filter((c) => c.total && c.done / c.total < 0.3 && d <= 14);
  if (behind.length) roleTips.push(`${behind.map((c) => c.nickname).join(', ')}님의 개인 준비가 아직 초반이에요. 함께 체크해 보자고 말해 보세요.`);
  // 규칙으로 만들 수 있는 행동: 날씨 → 짐, 담당자 없는 공유 항목 → 진행이 빠른 동행에게
  const actions: AgentAction[] = [];
  const has = (name: string) => sig.packing.some((p) => p.includes(name));
  const blank = { itemId: null, memberId: null, placeId: null, toDay: null, item: null };
  if (sig.rainDays.length && !has('우산')) {
    actions.push({ ...blank, type: 'add_packing', title: '짐 리스트에 우산 추가', reason: `${sig.rainDays[0].slice(5).replace('-', '/')}에 비 예보가 있어요.`, item: '우산' });
  }
  const cold = sig.weather.some((w) => w.min <= 5);
  if (cold && !has('겉옷') && !has('패딩')) {
    actions.push({ ...blank, type: 'add_packing', title: '짐 리스트에 두꺼운 겉옷 추가', reason: '여행 중 최저 기온이 5도 이하예요.', item: '두꺼운 겉옷' });
  }
  const open = sig.sharedPending.find((i) => !i.assigneeId);
  const helper = [...sig.companions].sort((a, b) => b.done / (b.total || 1) - a.done / (a.total || 1))[0];
  if (sig.permissions.canAssign && open && helper && actions.length < 2) {
    actions.push({ ...blank, type: 'assign', title: `"${open.title}"은 ${helper.nickname}님이 맡기`, reason: '담당자가 없는 함께 준비 항목이에요.', itemId: open.itemId, memberId: helper.memberId });
  }
  return {
    headline,
    tasks,
    suggestions: sig.candidates.slice(0, 2).map((c) => ({ title: c.title, description: c.why, scope: c.scope, dueOffset: c.dueOffset, reason: c.why })),
    roleTips: roleTips.slice(0, 2),
    actions: actions.slice(0, 2),
  };
}
