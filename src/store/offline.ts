// 인터넷이 끊겨도 볼 수 있도록 여행 데이터를 이 기기에 저장 (마지막으로 받은 내용)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TripSnapshot } from '@/types';

type OfflineState = {
  byTrip: Record<string, TripSnapshot>;
  save: (tripId: string, snapshot: TripSnapshot) => void;
  drop: (tripId: string) => void;
};

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set, get) => ({
      byTrip: {},
      save(tripId, snapshot) {
        // 몇 초마다 새로고침하므로 내용이 바뀌었을 때만 저장
        if (JSON.stringify(get().byTrip[tripId]) === JSON.stringify(snapshot)) return;
        set((s) => ({ byTrip: { ...s.byTrip, [tripId]: snapshot } }));
      },
      drop: (tripId) =>
        set((s) => {
          const byTrip = { ...s.byTrip };
          delete byTrip[tripId];
          return { byTrip };
        }),
    }),
    { name: 'readygo-offline', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
