// 오늘의 AI 브리핑을 여행별로 기기에 보관 → 하루 1번만 생성 (API 호출 최소화)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { Briefing } from '@/lib/agentSignals';

// fp = 상황 지문 (바뀌면 다시 생성), at = 생성 시각 (너무 잦은 재생성 방지)
type Entry = { day: string; briefing: Briefing; ai: boolean; dismissed: string[]; fp?: string; at?: number };

type BriefingState = {
  byTrip: Record<string, Entry>;
  put: (tripId: string, entry: Omit<Entry, 'dismissed'>) => void;
  dismiss: (tripId: string, title: string) => void;
};

export const useBriefingStore = create<BriefingState>()(
  persist(
    (set) => ({
      byTrip: {},
      put: (tripId, entry) =>
        set((s) => ({
          byTrip: { ...s.byTrip, [tripId]: { ...entry, dismissed: s.byTrip[tripId]?.day === entry.day ? s.byTrip[tripId].dismissed : [] } },
        })),
      dismiss: (tripId, title) =>
        set((s) => {
          const e = s.byTrip[tripId];
          if (!e) return s;
          return { byTrip: { ...s.byTrip, [tripId]: { ...e, dismissed: [...e.dismissed, title] } } };
        }),
    }),
    { name: 'readygo-briefing', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
