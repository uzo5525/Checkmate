// 여권·보험을 여행 일정과 대조 (순수 함수, 서버·AI 미사용).
// 입력값은 사용자가 직접 입력하거나 폰 안 문자 인식(MRZ)으로 채움.
import type { CountryInfo } from '@/data/countries';
import { addMonths, diffDays } from '@/lib/dates';
import type { ChecklistItem, Trip } from '@/types';

export type DocVerdict = 'match' | 'check' | 'mismatch';

export const DOC_VERDICT_LABEL: Record<DocVerdict, string> = {
  match: '정보 일치',
  check: '추가 확인 필요',
  mismatch: '정보 불일치',
};

export type DocCheckResult = {
  verdict: DocVerdict;
  title: string;
  messages: string[];
  /** 문제가 있을 때 후속 조치 안내 */
  followUp?: { text: string; url?: string };
};

/** 여권 만료일이 목적지 요건을 충족하는지 */
export function checkPassport(expiryDate: string, trip: Trip, rule: CountryInfo['passport']): DocCheckResult {
  const base = rule.from === 'entry' ? trip.departDate : trip.returnDate;
  const required = addMonths(base, rule.minMonths);
  const requirementText =
    rule.minMonths > 0 ? `입국일(${trip.departDate}) 기준 ${rule.minMonths}개월 이상 → ${required} 이후 만료` : `귀국일(${trip.returnDate})까지 유효`;
  if (diffDays(required, expiryDate) < 0) {
    return {
      verdict: 'mismatch',
      title: '여권 유효기간이 부족해요',
      messages: [`만료일 ${expiryDate} · 요건: ${requirementText}`],
      followUp: { text: '재발급이 필요해요. 외교부 여권안내에서 절차와 소요 기간을 확인하세요.', url: 'https://www.passport.go.kr' },
    };
  }
  const margin = diffDays(required, expiryDate);
  if (margin < 30) {
    return {
      verdict: 'check',
      title: '요건은 충족하지만 여유가 거의 없어요',
      messages: [`만료일 ${expiryDate} · 요건: ${requirementText}`, '항공사·경유지에 따라 더 긴 기간을 요구할 수 있어요.'],
    };
  }
  return { verdict: 'match', title: '여권 유효기간 충분해요', messages: [`만료일 ${expiryDate} · 요건: ${requirementText}`] };
}

/** 보험 보장 기간이 출국~귀국 전체를 덮는지 */
export function checkInsurance(coverageStart: string, coverageEnd: string, trip: Trip): DocCheckResult {
  const startsLate = diffDays(coverageStart, trip.departDate) < 0;
  const endsEarly = diffDays(trip.returnDate, coverageEnd) < 0;
  if (startsLate || endsEarly) {
    const msgs: string[] = [];
    if (startsLate) msgs.push(`출국일(${trip.departDate})이 보장 시작일(${coverageStart})보다 빨라요.`);
    if (endsEarly) msgs.push(`귀국일(${trip.returnDate})이 보장 종료일(${coverageEnd})보다 늦어요.`);
    return {
      verdict: 'mismatch',
      title: endsEarly ? '귀국일의 보장이 빠져 있어요' : '출국일의 보장이 빠져 있어요',
      messages: msgs,
      followUp: { text: `${endsEarly ? trip.returnDate : trip.departDate}까지 포함되도록 보험사에 기간 연장이나 재가입을 문의하세요.` },
    };
  }
  return { verdict: 'match', title: '보장 기간이 여행 일정을 모두 덮어요', messages: [`보장 ${coverageStart} ~ ${coverageEnd} · 여행 ${trip.departDate} ~ ${trip.returnDate}`] };
}

export type VerifiedTripInfo = {
  arrivalTime?: string; // 현지 도착 'HH:mm'
};

/**
 * 확인된 정보로 체크리스트에 추가할 항목 (예: 23시 이후 도착 → 심야 이동 수단 확인).
 * 에이전트 브리핑의 규칙 신호로도 사용.
 */
export function applyVerifiedInfo(
  trip: Trip,
  items: ChecklistItem[],
  info: VerifiedTripInfo,
  makeId: () => string,
): { add: ChecklistItem[] } {
  const add: ChecklistItem[] = [];
  const hour = info.arrivalTime ? Number(info.arrivalTime.split(':')[0]) : NaN;
  if (hour >= 23 && !items.some((i) => i.templateId === 'derived.late_night_transfer')) {
    add.push({
      id: makeId(),
      tripId: trip.id,
      templateId: 'derived.late_night_transfer',
      title: '심야 이동 수단 확인',
      description: `${info.arrivalTime} 도착 예정입니다. 대중교통이 끊길 수 있으니 심야 버스·택시·공항 근처 숙소를 확인하세요.`,
      dueOffset: 7,
      scope: trip.partySize > 1 ? 'shared' : 'personal',
      category: 'transport',
      sourceUrl: null,
      sourceName: null,
      verified: false,
      required: false,
      assigneeId: null,
      sortOrder: 900,
      ownerMemberId: null,
      createdByAi: false,
      providedBy: null,
    });
  }
  return { add };
}
