// 이 기기의 참여 정보: 어떤 여행에 어떤 멤버로 들어가 있는지 (회원가입 없음)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type SessionState = {
  memberships: Record<string, string>; // tripId -> memberId
  tripOrder: string[]; // 최근 순
  lastTripId: string | null; // 마지막으로 연 여행 (새로고침 후 복원)
  setLastTrip: (tripId: string) => void;
  setMembership: (tripId: string, memberId: string) => void;
  forgetTrip: (tripId: string) => void;
  clear: () => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      memberships: {},
      tripOrder: [],
      lastTripId: null,
      setLastTrip: (tripId) => set({ lastTripId: tripId }),
      setMembership: (tripId, memberId) =>
        set((s) => ({
          memberships: { ...s.memberships, [tripId]: memberId },
          tripOrder: [tripId, ...s.tripOrder.filter((id) => id !== tripId)],
        })),
      forgetTrip: (tripId) =>
        set((s) => {
          const { [tripId]: _, ...rest } = s.memberships;
          return { memberships: rest, tripOrder: s.tripOrder.filter((id) => id !== tripId), lastTripId: s.lastTripId === tripId ? null : s.lastTripId };
        }),
      clear: () => set({ memberships: {}, tripOrder: [], lastTripId: null }),
    }),
    { name: 'readygo-session', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
