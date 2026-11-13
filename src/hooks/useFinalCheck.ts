// 최종 점검 화면 데이터: 내게 보이는 항목의 체크 상태 + 이 기기의 서류 검사 결과
import { visibleTo } from '@/lib/checklist';
import { finalCheck, mostUrgent } from '@/lib/finalCheck';
import { useDocsStore } from '@/store/docs';
import { useTripStore } from '@/store/trip';
import type { Scope } from '@/types';

import { itemDocGate } from './useItemCheck';
import { useReadyView } from './useTripViews';
import { useMe } from './useTrip';

/** 홈에 띄울 가장 급한 일 (없으면 null) */
export function useUrgentItem(scope: Scope) {
  const r = useReadyView(scope);
  const byTrip = useDocsStore((s) => s.byTrip);
  const waived = useDocsStore((s) => s.waived);
  if (!r) return null;
  const rows = r.list.map((i) => ({ id: i.id, title: i.title, done: r.done(i), required: i.required, dueOffset: i.dueOffset, gate: itemDocGate(i, r.trip, { byTrip, waived }) }));
  return mostUrgent(rows, r.daysLeft);
}

export function useFinalCheck() {
  const r = useReadyView('personal');
  const items = useTripStore((s) => s.items);
  const byTrip = useDocsStore((s) => s.byTrip);
  const waived = useDocsStore((s) => s.waived);
  const { me } = useMe();
  if (!r) return null;
  const rows = items
    .filter((i) => visibleTo(i, me?.id) && (i.scope === 'personal' || i.assigneeId === me?.id))
    .map((i) => ({ id: i.id, title: i.title, done: r.done(i), required: i.required, gate: itemDocGate(i, r.trip, { byTrip, waived }) }));
  return { trip: r.trip, dday: r.dday, ...finalCheck(rows) };
}
