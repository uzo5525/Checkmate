import type { IconName } from '@/components/ui';

export const CATEGORIES: Record<string, { label: string; icon: IconName }> = {
  documents: { label: '서류', icon: 'document' },
  entry: { label: '입국', icon: 'enter' },
  insurance: { label: '보험', icon: 'lock' },
  stay: { label: '숙소', icon: 'calendar' },
  telecom: { label: '통신', icon: 'phone' },
  money: { label: '환전', icon: 'money' },
  transport: { label: '이동', icon: 'plane' },
  packing: { label: '짐', icon: 'luggage' },
  customs: { label: '반입 규정', icon: 'alert' },
  safety: { label: '안전', icon: 'info' },
  weather: { label: '날씨', icon: 'info' },
  flight: { label: '항공', icon: 'plane' },
  custom: { label: '직접 추가', icon: 'add' },
};

export function categoryLabel(key: string): string {
  return CATEGORIES[key]?.label ?? key;
}
