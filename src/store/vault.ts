// 보관함 파일 목록. 항공권·보험 증권처럼 개인 서류라서 이 기기에만 저장하고 서버·동행자에게 보내지 않습니다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { PrepKey } from '@/lib/prepCards';

export type VaultFile = {
  id: string;
  name: string;
  uri: string;
  mimeType: string;
  card: PrepKey | null;
  addedAt: string;
};

type VaultState = {
  byTrip: Record<string, VaultFile[]>;
  add: (tripId: string, file: VaultFile) => void;
  remove: (tripId: string, id: string) => void;
  rename: (tripId: string, id: string, name: string) => void;
  clearTrip: (tripId: string) => void;
};

export const EMPTY_VAULT: VaultFile[] = [];

export const useVaultStore = create<VaultState>()(
  persist(
    (set) => ({
      byTrip: {},
      add: (tripId, file) => set((s) => ({ byTrip: { ...s.byTrip, [tripId]: [...(s.byTrip[tripId] ?? []), file] } })),
      remove: (tripId, id) => set((s) => ({ byTrip: { ...s.byTrip, [tripId]: (s.byTrip[tripId] ?? []).filter((f) => f.id !== id) } })),
      rename: (tripId, id, name) => set((s) => ({ byTrip: { ...s.byTrip, [tripId]: (s.byTrip[tripId] ?? []).map((f) => (f.id === id ? { ...f, name } : f)) } })),
      clearTrip: (tripId) =>
        set((s) => {
          const byTrip = { ...s.byTrip };
          delete byTrip[tripId];
          return { byTrip };
        }),
    }),
    { name: 'readygo-vault', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
