// 여행별 D-day 알림 켜기/끄기 (이 기기에만 저장, 기본 켜짐)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type NotifyState = {
  off: Record<string, boolean>;
  setEnabled: (tripId: string, enabled: boolean) => void;
};

export const useNotifyStore = create<NotifyState>()(
  persist(
    (set) => ({
      off: {},
      setEnabled: (tripId, enabled) => set((s) => ({ off: { ...s.off, [tripId]: !enabled } })),
    }),
    { name: 'readygo-notify', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
