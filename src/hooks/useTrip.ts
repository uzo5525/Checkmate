// 여행 방 데이터/로직 훅. 화면 컴포넌트는 이 훅들이 돌려주는 값만 보여줍니다.
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';

import { getCountry } from '@/data/countries';
import { docKindOf, docResultOf, itemDocGate } from '@/hooks/useItemCheck';
import { useToday } from '@/lib/clock';
import {
  classify,
  isDone,
  memberDocs,
  memberProgress,
  ownerKeyFor,
  permissionsFor,
  statusKey,
  visibleTo,
} from '@/lib/checklist';
import { ddayLabel, diffDays } from '@/lib/dates';
import { canCheckDoc } from '@/lib/docGate';
import { cancelTripReminders } from '@/services/notifications';
import { repo, type ItemPatch, type TripPatch } from '@/services/repo';
import { useDocsStore } from '@/store/docs';
import { useSessionStore } from '@/store/session';
import { useTripStore } from '@/store/trip';
import { useOfflineStore } from '@/store/offline';
import { useVaultStore } from '@/store/vault';
import { dropFile } from '@/services/vaultFile';
import type { ChecklistItem, Member, Scope } from '@/types';

/** 방 레이아웃에서 한 번 호출: 로드 + 실시간 구독 */
export function useTripSync(tripId: string) {
  const load = useTripStore((s) => s.load);
  // 이 여행 화면이 앞에 올 때 불러옴 (뒤로 가서 다시 보는 경우 포함)
  useFocusEffect(
    useCallback(() => {
      load(tripId);
      useSessionStore.getState().setLastTrip(tripId);
    }, [tripId, load]),
  );
  // 스택 뒤에 남은 여행 화면의 새로고침이 지금 열린 여행을 덮어쓰지 않도록, 열려 있을 때만 새로고침
  useEffect(
    () =>
      repo.subscribe(tripId, () => {
        if (useTripStore.getState().tripId === tripId) load(tripId);
      }),
    [tripId, load],
  );
}

/** 방 밖의 화면(공유 받기 → 코스 등)에서 특정 여행을 열어야 할 때 */
export function useEnsureTrip(tripId?: string) {
  const load = useTripStore((s) => s.load);
  const current = useTripStore((s) => s.tripId);
  useEffect(() => {
    if (tripId && tripId !== current) load(tripId);
  }, [tripId, current, load]);
}

export function useMe() {
  const tripId = useTripStore((s) => s.tripId);
  const members = useTripStore((s) => s.members);
  const memberId = useSessionStore((s) => (tripId ? s.memberships[tripId] : undefined));
  const me = members.find((m) => m.id === memberId);
  return { me, memberId: memberId ?? null };
}

export function useTripHeader() {
  const trip = useTripStore((s) => s.trip);
  const today = useToday();
  if (!trip) return null;
  const country = getCountry(trip.countryCode)?.country;
  const daysLeft = diffDays(today, trip.departDate);
  const length = diffDays(trip.departDate, trip.returnDate);
  return { trip, country, daysLeft, dday: ddayLabel(daysLeft, length), today };
}

export function useDaysLeft(): number {
  const trip = useTripStore((s) => s.trip);
  const today = useToday();
  return trip ? diffDays(today, trip.departDate) : 0;
}

export function useChecklist(scope: Scope) {
  const items = useTripStore((s) => s.items);
  const statuses = useTripStore((s) => s.statuses);
  const members = useTripStore((s) => s.members);
  const { me } = useMe();
  const daysLeft = useDaysLeft();
  const perms = permissionsFor(me);
  const toggle = useToggleItem();

  const scoped = useMemo(() => items.filter((i) => i.scope === scope && visibleTo(i, me?.id)), [items, scope, me]);
  const done = useCallback((i: ChecklistItem) => (me ? isDone(statuses, i, me.id) : false), [statuses, me]);
  const classified = useMemo(() => classify(scoped, done, daysLeft), [scoped, done, daysLeft]);
  const doneCount = scoped.filter(done).length;
  const assigneeName = (i: ChecklistItem) => members.find((m) => m.id === i.assigneeId)?.nickname ?? null;
  const hasShared = items.some((i) => i.scope === 'shared');

  return { ...classified, done, toggle, perms, daysLeft, total: scoped.length, doneCount, assigneeName, hasShared, me };
}

export function useToggleItem() {
  const patch = useTripStore((s) => s.patchStatus);
  const load = useTripStore((s) => s.load);
  const statuses = useTripStore((s) => s.statuses);
  const { me } = useMe();
  return useCallback(
    async (item: ChecklistItem) => {
      if (!me) return;
      const ownerKey = ownerKeyFor(item, me.id);
      const next = !statuses[statusKey(item.id, ownerKey)]?.done;
      const docs = useDocsStore.getState();
      if (next) {
        // 서류 확인 항목은 확인을 마쳐야 체크됨. 어느 화면에서 눌러도 확인 화면으로 보냄
        const gate = itemDocGate(item, useTripStore.getState().trip, docs);
        if (gate && !canCheckDoc(gate)) {
          router.push(`/item/${item.id}`);
          return;
        }
      } else if (item.templateId) {
        docs.setWaived(item.tripId, item.templateId, false);
      }
      patch(item.id, ownerKey, next, me.id);
      try {
        await repo.setDone({ tripId: item.tripId, itemId: item.id, ownerKey, done: next, by: me.id });
      } catch {
        load(item.tripId);
      }
    },
    [me, statuses, patch, load],
  );
}

export function useItemDetail(itemId: string) {
  const item = useTripStore((s) => s.items.find((i) => i.id === itemId));
  const members = useTripStore((s) => s.members);
  const statuses = useTripStore((s) => s.statuses);
  const load = useTripStore((s) => s.load);
  const trip = useTripStore((s) => s.trip);
  const byTrip = useDocsStore((s) => s.byTrip);
  const waived = useDocsStore((s) => s.waived);
  const setWaived = useDocsStore((s) => s.setWaived);
  const { me } = useMe();
  const perms = permissionsFor(me);
  const toggle = useToggleItem();
  const daysLeft = useDaysLeft();
  if (!item) return null;

  const reload = () => load(item.tripId);
  const done = me ? isDone(statuses, item, me.id) : false;
  const sharedStatus = statuses[statusKey(item.id, 'shared')];
  const doneBy = item.scope === 'shared' && sharedStatus?.done ? members.find((m) => m.id === sharedStatus.updatedBy)?.nickname : undefined;
  // 직접 추가한 항목만 수정·삭제 (규칙 데이터 항목은 고정)
  const isCustom = item.templateId === null;
  const canEdit = isCustom && !item.providedBy && (item.scope === 'shared' ? !!me && (me.isOwner || me.canEditShared) : item.ownerMemberId === me?.id);
  // 서류 확인 항목은 확인을 통과했거나 일단 체크를 고른 경우에만 완료 가능
  const docGate = itemDocGate(item, trip, { byTrip, waived });
  const kind = docKindOf(item);
  const blockedReason = docGate === 'failed' && kind && trip ? (docResultOf(kind, byTrip[item.tripId]?.[kind] ?? {}, trip)?.title ?? null) : null;

  return {
    item,
    done,
    doneBy,
    daysLeft,
    overdue: !done && daysLeft < item.dueOffset,
    members,
    assignee: members.find((m) => m.id === item.assigneeId) ?? null,
    canToggle: perms.canToggle(item) && (done || !docGate || canCheckDoc(docGate)),
    blockedReason,
    docKind: docGate ? kind : null,
    docGate,
    canWaive: perms.canToggle(item) && !done && docGate === 'pending',
    /** 카메라를 못 쓰는 등 지금 확인할 수 없을 때: 미확인 표시를 남기고 체크 */
    waive: async () => {
      setWaived(item.tripId, item.templateId!, true);
      await toggle(item);
    },
    canAssign: perms.canManage && item.scope === 'shared',
    canEdit,
    toggle: () => toggle(item),
    assign: async (memberId: string | null) => {
      await repo.assignItem(item.id, memberId);
      await reload();
    },
    edit: async (patch: ItemPatch) => {
      await repo.updateItem(item.id, patch);
      await reload();
    },
    remove: async () => {
      await repo.deleteItem(item.id);
      await reload();
    },
  };
}

/** 항목 추가: 공유 항목(편집 권한) 또는 나만 보는 개인 항목 */
export function useAddItem() {
  const tripId = useTripStore((s) => s.tripId);
  const load = useTripStore((s) => s.load);
  const { me } = useMe();
  return {
    canAddShared: !!me && (me.isOwner || me.canEditShared),
    async add(input: { title: string; description: string; dueOffset: number; scope: Scope; createdByAi?: boolean; category?: string; sourceUrl?: string; sourceName?: string }) {
      if (!tripId || !me) return;
      await repo.addItem(tripId, { ...input, ownerMemberId: input.scope === 'personal' ? me.id : null });
      await load(tripId);
    },
  };
}

export function useMembers() {
  const trip = useTripStore((s) => s.trip);
  const members = useTripStore((s) => s.members);
  const items = useTripStore((s) => s.items);
  const statuses = useTripStore((s) => s.statuses);
  const load = useTripStore((s) => s.load);
  const forgetTrip = useSessionStore((s) => s.forgetTrip);
  const { me } = useMe();
  const progress = useMemo(() => memberProgress(members, items, statuses), [members, items, statuses]);
  const reload = () => trip && load(trip.id);

  return {
    trip,
    me,
    progress,
    canManage: !!me?.isOwner,
    setPermission: async (memberId: string, value: boolean) => {
      await repo.setMemberPermission(memberId, value);
      await reload();
    },
    /** 멤버별 서류 항목 체크 여부 */
    docsOf: (member: Member) => memberDocs(member, items, statuses),
    removeMember: async (memberId: string) => {
      await repo.removeMember(memberId);
      await reload();
    },
    transferOwner: async (memberId: string) => {
      if (!trip) return;
      await repo.transferOwner(trip.id, memberId);
      await reload();
    },
    /** 방 나가기 (방장은 먼저 방장을 넘겨야 함) */
    leave: async () => {
      if (!trip || !me) return;
      await repo.removeMember(me.id);
      await cancelTripReminders(trip.id);
      forgetTrip(trip.id);
      useOfflineStore.getState().drop(trip.id);
    },
  };
}

/** 여행 정보 수정·삭제 (방장) */
export function useTripAdmin() {
  const trip = useTripStore((s) => s.trip);
  const load = useTripStore((s) => s.load);
  const reset = useTripStore((s) => s.reset);
  const forgetTrip = useSessionStore((s) => s.forgetTrip);
  const { me } = useMe();
  return {
    trip,
    canEdit: !!me?.isOwner,
    update: async (patch: TripPatch) => {
      if (!trip) return;
      await repo.updateTrip(trip.id, patch);
      await load(trip.id);
    },
    remove: async () => {
      if (!trip) return;
      await repo.deleteTrip(trip.id);
      await cancelTripReminders(trip.id);
      forgetTrip(trip.id);
      // 이 기기에 저장한 서류 정보와 보관함 파일도 함께 지움
      useDocsStore.getState().clearTrip(trip.id);
      await Promise.all((useVaultStore.getState().byTrip[trip.id] ?? []).map((f) => dropFile(f.uri).catch(() => undefined)));
      useVaultStore.getState().clearTrip(trip.id);
      useOfflineStore.getState().drop(trip.id);
      reset();
    },
  };
}
