// 모든 "오늘" 계산은 여기 now()/today() 를 거칩니다.
// 시연용으로 오늘 날짜를 덮어쓸 수 있습니다 (설정 > D-day 시뮬레이터).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { toDateStr } from './dates';

type ClockState = {
  overrideDate: string | null; // YYYY-MM-DD
  setOverride: (date: string | null) => void;
};

export const useClockStore = create<ClockState>()(
  persist(
    (set) => ({
      overrideDate: null,
      setOverride: (overrideDate) => set({ overrideDate }),
    }),
    { name: 'readygo-clock', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

export function now(): Date {
  const o = useClockStore.getState().overrideDate;
  if (!o) return new Date();
  const [y, m, d] = o.split('-').map(Number);
  const real = new Date();
  return new Date(y, m - 1, d, real.getHours(), real.getMinutes(), real.getSeconds());
}

export function today(): string {
  return toDateStr(now());
}

export function realToday(): string {
  return toDateStr(new Date());
}

/** 컴포넌트에서 오늘 날짜를 구독 (덮어쓰기 변경 시 다시 렌더링) */
export function useToday(): string {
  const o = useClockStore((s) => s.overrideDate);
  return o ?? realToday();
}

export function useIsClockOverridden(): boolean {
  return useClockStore((s) => s.overrideDate !== null);
}
