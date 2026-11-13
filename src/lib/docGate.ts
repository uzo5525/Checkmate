// 서류 확인 항목(여권·보험)을 완료로 표시해도 되는지 판단 (순수 함수).
import type { DocVerdict } from '../services/documentCheck.ts';

/** pending: 아직 확인 전 / passed: 요건 충족 / failed: 요건 미달 / waived: 확인 못 하고 일단 체크 */
export type DocGate = 'pending' | 'passed' | 'failed' | 'waived';

export function docGateOf(verdict: DocVerdict | null, waived: boolean): DocGate {
  if (verdict === 'mismatch') return 'failed';
  if (verdict) return 'passed';
  return waived ? 'waived' : 'pending';
}

export function canCheckDoc(gate: DocGate): boolean {
  return gate === 'passed' || gate === 'waived';
}
