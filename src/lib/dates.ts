// 날짜 계산(순수 함수). 날짜는 항상 'YYYY-MM-DD' 문자열(로컬 날짜)로 다룹니다.

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isDateStr(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function utc(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** b - a (일) */
export function diffDays(a: string, b: string): number {
  return Math.round((utc(b) - utc(a)) / DAY_MS);
}

export function addDays(s: string, n: number): string {
  const t = new Date(utc(s) + n * DAY_MS);
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`;
}

/** 개월 더하기 (말일 보정: 1/31 + 1개월 = 2/28) */
export function addMonths(s: string, n: number): string {
  const [y, m, d] = s.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(Date.UTC(ny, nm, 0)).getUTCDate();
  return `${ny}-${String(nm).padStart(2, '0')}-${String(Math.min(d, last)).padStart(2, '0')}`;
}

export function formatKDate(s: string): string {
  const [, m, d] = s.split('-').map(Number);
  const dow = ['일', '월', '화', '수', '목', '금', '토'][new Date(utc(s)).getUTCDay()];
  return `${m}월 ${d}일 (${dow})`;
}

/** 출발까지 남은 일수 → "D-12" / "D-DAY" / "여행 중" */
export function ddayLabel(daysLeft: number, tripLength: number): string {
  if (daysLeft > 0) return `D-${daysLeft}`;
  if (daysLeft === 0) return 'D-DAY';
  if (-daysLeft <= tripLength) return '여행 중';
  return '여행 종료';
}

/** 박/일 */
export function nightsLabel(depart: string, ret: string): string {
  const n = diffDays(depart, ret);
  return `${n}박 ${n + 1}일`;
}
