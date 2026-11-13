// 현재 열려 있는 여행의 데이터 (방 화면의 탭들이 함께 사용)
import { create } from 'zustand';

import { friendlyError } from '@/lib/errors';
import { indexStatuses, statusKey, type StatusMap } from '@/lib/checklist';
import { repo } from '@/services/repo';
import { useOfflineStore } from '@/store/offline';
import type { ChecklistItem, ItineraryItem, Member, Place, Trip, TripSnapshot } from '@/types';

const fromSnapshot = (snap: TripSnapshot) => ({
  trip: snap.trip,
  members: snap.members,
  items: snap.items,
  statuses: indexStatuses(snap.statuses),
  places: snap.places ?? [],
  itinerary: snap.itinerary ?? [],
});

type TripState = {
  tripId: string | null;
  trip: Trip | null;
  members: Member[];
  items: ChecklistItem[];
  statuses: StatusMap;
  places: Place[];
  itinerary: ItineraryItem[];
  loading: boolean;
  error: string | null;
  /** 서버에 닿지 못해 마지막으로 저장한 내용을 보여 주는 중 */
  offline: boolean;
  load: (tripId: string) => Promise<void>;
  patchStatus: (itemId: string, ownerKey: string, done: boolean, by: string) => void;
  reset: () => void;
};

export const useTripStore = create<TripState>()((set, get) => ({
  tripId: null,
  trip: null,
  members: [],
  items: [],
  statuses: {},
  places: [],
  itinerary: [],
  loading: false,
  error: null,
  offline: false,

  async load(tripId) {
    const switching = get().tripId !== tripId;
    if (switching) set({ tripId, trip: null, members: [], items: [], statuses: {}, places: [], itinerary: [], loading: true, error: null });
    try {
      const snap = await repo.getSnapshot(tripId);
      if (get().tripId !== tripId) return;
      if (!snap) {
        set({ loading: false, error: '여행을 찾을 수 없습니다.' });
        return;
      }
      useOfflineStore.getState().save(tripId, snap);
      set({ ...fromSnapshot(snap), loading: false, error: null, offline: false });
    } catch (e) {
      if (get().tripId !== tripId) return;
      // 인터넷이 끊기면 마지막으로 저장한 내용을 보여 줌
      const saved = useOfflineStore.getState().byTrip[tripId];
      if (saved) set({ ...fromSnapshot(saved), loading: false, error: null, offline: true });
      else set({ loading: false, error: friendlyError(e) });
    }
  },

  // 낙관적 업데이트
  patchStatus(itemId, ownerKey, done, by) {
    const tripId = get().tripId ?? '';
    set((s) => ({
      statuses: {
        ...s.statuses,
        [statusKey(itemId, ownerKey)]: { tripId, itemId, ownerKey, done, updatedBy: by, updatedAt: new Date().toISOString() },
      },
    }));
  },

  reset: () => set({ tripId: null, trip: null, members: [], items: [], statuses: {}, places: [], itinerary: [], error: null }),
}));
