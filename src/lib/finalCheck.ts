// 출발 전 최종 점검: 체크 상태와 서류 검사 결과를 모아 판정 (순수 함수).
import type { DocGate } from './docGate.ts';

export type CheckRow = { id: string; title: string; done: boolean; required: boolean; gate: DocGate | null };
export type CheckLine = { id: string; title: string; reason: string };
export type FinalVerdict = 'ready' | 'check' | 'blocked';
export type FinalResult = { verdict: FinalVerdict; blockers: CheckLine[]; warnings: CheckLine[]; passedDocs: CheckLine[]; doneCount: number; total: number };

export function finalCheck(rows: CheckRow[]): FinalResult {
  const blockers: CheckLine[] = [];
  const warnings: CheckLine[] = [];
  const passedDocs: CheckLine[] = [];
  for (const { id, title, done, required, gate } of rows) {
    const line = (reason: string) => ({ id, title, reason });
    if (gate === 'failed') blockers.push(line('서류 검사에서 요건을 충족하지 못했어요'));
    else if (gate === 'passed') {
      if (done) passedDocs.push(line('검사 통과'));
      else warnings.push(line('검사는 통과했지만 아직 체크하지 않았어요'));
    } else if (gate === 'waived') warnings.push(line('확인 없이 일단 체크했어요'));
    else if (gate === 'pending') (done ? warnings : blockers).push(line(done ? '이 기기에서 검사한 기록이 없어요' : '서류 검사를 아직 하지 않았어요'));
    else if (!done) (required ? blockers : warnings).push(line(required ? '필수 항목이 남아 있어요' : '아직 끝내지 않았어요'));
  }
  return {
    verdict: blockers.length ? 'blocked' : warnings.length ? 'check' : 'ready',
    blockers,
    warnings,
    passedDocs,
    doneCount: rows.filter((r) => r.done).length,
    total: rows.length,
  };
}

const URGENT_WITHIN_DAYS = 3;

export type UrgentRow = CheckRow & { dueOffset: number };

/**
 * 홈에 띄울 가장 급한 일 하나. 없으면 null (할 일은 준비 목록에서 봄).
 * 기준: 1) 서류 요건 미달 2) 필수·서류 항목 중 마감이 지났거나 3일 안에 마감, 마감이 가장 이른 것
 */
export function mostUrgent(rows: UrgentRow[], daysLeft: number): CheckLine | null {
  const failed = rows.find((r) => r.gate === 'failed');
  if (failed) return { id: failed.id, title: failed.title, reason: '서류 요건을 충족하지 못했어요' };
  const soon = rows
    .filter((r) => !r.done && (r.required || r.gate !== null) && daysLeft - r.dueOffset <= URGENT_WITHIN_DAYS)
    .sort((a, b) => b.dueOffset - a.dueOffset)[0];
  if (!soon) return null;
  const left = daysLeft - soon.dueOffset;
  return { id: soon.id, title: soon.title, reason: left < 0 ? `마감이 ${-left}일 지났어요` : left === 0 ? '오늘까지 해야 해요' : `${left}일 안에 해야 해요` };
}

/** 오늘이 여행 전·중·후 중 어디인지 */
export type TripPhase = 'before' | 'during' | 'after';

export function tripPhase(today: string, departDate: string, returnDate: string): TripPhase {
  if (today < departDate) return 'before';
  return today <= returnDate ? 'during' : 'after';
}
