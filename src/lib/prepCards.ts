// 준비 목록 카드: 체크리스트 항목을 분야별 카드로 묶음 (순수 함수).
import type { ChecklistItem } from '../types.ts';

export type PrepKey = 'entry' | 'insurance' | 'sim' | 'money' | 'baggage' | 'flight';

export const PREP_ORDER: PrepKey[] = ['entry', 'insurance', 'sim', 'money', 'baggage', 'flight'];

/** 항목 분류 → 카드. 여기 없는 분류(직접 추가 등)는 카드 없이 따로 표시 */
const CARD_OF: Record<string, PrepKey> = {
  documents: 'entry',
  entry: 'entry',
  safety: 'entry',
  insurance: 'insurance',
  telecom: 'sim',
  money: 'money',
  packing: 'baggage',
  customs: 'baggage',
  weather: 'baggage',
  flight: 'flight',
  transport: 'flight',
  stay: 'flight',
};

export function cardOf(item: Pick<ChecklistItem, 'category'>): PrepKey | null {
  return CARD_OF[item.category] ?? null;
}

export type PrepCard = {
  key: PrepKey;
  items: ChecklistItem[];
  total: number;
  doneCount: number;
  finished: boolean;
  overdue: boolean;
};

/** 항목이 있는 카드만 정해진 순서로 (패키지 여행 등은 일부 카드가 없을 수 있음) */
export function buildPrepCards(items: ChecklistItem[], done: (i: ChecklistItem) => boolean, daysLeft: number): PrepCard[] {
  return PREP_ORDER.map((key) => {
    const list = items.filter((i) => cardOf(i) === key).sort((a, b) => b.dueOffset - a.dueOffset || a.sortOrder - b.sortOrder);
    const doneCount = list.filter(done).length;
    return {
      key,
      items: list,
      total: list.length,
      doneCount,
      finished: list.length > 0 && doneCount === list.length,
      overdue: list.some((i) => !done(i) && daysLeft < i.dueOffset),
    };
  }).filter((c) => c.total > 0);
}

/** 준비율 (0~100) */
export function percent(doneCount: number, total: number): number {
  return total ? Math.round((doneCount / total) * 100) : 0;
}
