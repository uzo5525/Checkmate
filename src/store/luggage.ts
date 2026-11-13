// 여행별 짐 리스트·반입 규정 확인 목록 (이 기기에만 저장)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { BaggageDraft } from '@/lib/baggage';

export type PackItem = { id: string; name: string; qty: number; packed: boolean };

type TripLuggage = { drafts: BaggageDraft[]; airline: string | null; packing: PackItem[] | null };

type LuggageState = {
  byTrip: Record<string, TripLuggage>;
  update: (tripId: string, fn: (cur: TripLuggage) => Partial<TripLuggage>) => void;
};

export const EMPTY_LUGGAGE: TripLuggage = { drafts: [], airline: null, packing: null };

export const useLuggageStore = create<LuggageState>()(
  persist(
    (set) => ({
      byTrip: {},
      update: (tripId, fn) =>
        set((s) => {
          const cur = s.byTrip[tripId] ?? EMPTY_LUGGAGE;
          return { byTrip: { ...s.byTrip, [tripId]: { ...cur, ...fn(cur) } } };
        }),
    }),
    { name: 'readygo-luggage', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
