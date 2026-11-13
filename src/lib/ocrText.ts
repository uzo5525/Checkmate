// 폰 안 문자 인식 결과(텍스트)에서 필요한 값만 뽑는 순수 함수들

/** OCR 텍스트에서 여권 MRZ(44자 2줄) 후보 찾기. 흔한 인식 오류(공백, «, 소문자)를 보정 */
export function findMrzLines(text: string): [string, string] | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.toUpperCase().replace(/\s/g, '').replace(/[«‹]/g, '<').replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 40 && l.length <= 46 && l.includes('<'));
  for (let i = 0; i < lines.length - 1; i++) {
    const a = lines[i];
    const b = lines[i + 1];
    if (a.startsWith('P') && /^[A-Z0-9<]{9}\d/.test(b)) {
      return [a.padEnd(44, '<').slice(0, 44), b.padEnd(44, '<').slice(0, 44)];
    }
  }
  return null;
}

const DIGIT_FIX: Record<string, string> = { O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', S: '5', B: '8', G: '6' };
const toDigits = (s: string) => s.replace(/[OQDILZSBG]/g, (c) => DIGIT_FIX[c]);

function mrzCheck(field: string, digit: string): boolean {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < field.length; i++) {
    const c = field[i];
    const v = c === '<' ? 0 : /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 55;
    sum += v * w[i % 3];
  }
  return sum % 10 === Number(digit);
}

export type MrzExpiry = { expiryYymmdd: string; name?: string };

/**
 * 여권 MRZ 2번째 줄만으로 만료일 읽기 (1번째 줄이 잘리거나 순서가 뒤섞여도 동작).
 * ML Kit 이 한 줄을 여러 조각으로 나누거나 숫자 자리의 0/O 등을 틀리는 경우를 보정하고,
 * 만료일·생년월일 체크 디지트가 모두 맞을 때만 인정. 여권번호·생년월일은 반환하지 않음.
 */
export function findMrzExpiry(text: string): MrzExpiry | null {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.toUpperCase().replace(/\s/g, '').replace(/[«‹]/g, '<').replace(/[^A-Z0-9<]/g, ''))
    .filter(Boolean);
  // 조각난 줄 대비: 한 줄, 이웃 두 줄, 세 줄 이어붙인 것까지 후보로
  const candidates = lines.flatMap((_, i) => [lines[i], lines.slice(i, i + 2).join(''), lines.slice(i, i + 3).join('')]);
  const re = /[A-Z0-9<]{9}[0-9OQDILZSBG][A-Z0-9<]{3}[0-9OQDILZSBG]{7}[MFX<][0-9OQDILZSBG]{7}/g;
  for (const c of candidates) {
    for (const m of c.matchAll(re)) {
      const s = m[0];
      const birth = toDigits(s.slice(13, 19));
      const birthCd = toDigits(s[19]);
      const expiry = toDigits(s.slice(21, 27));
      const expiryCd = toDigits(s[27]);
      if (!mrzCheck(birth, birthCd) || !mrzCheck(expiry, expiryCd)) continue;
      const mm = Number(expiry.slice(2, 4));
      const dd = Number(expiry.slice(4, 6));
      if (mm < 1 || mm > 12 || dd < 1 || dd > 31) continue;
      const l1 = lines.find((l) => /^P[A-Z<][A-Z<]{3}[A-Z]/.test(l) && l.includes('<<'));
      const name = l1 ? l1.slice(5).split('<<').map((p) => p.replace(/<+/g, ' ').trim()).filter(Boolean).slice(0, 2).join(' ') : undefined;
      return { expiryYymmdd: expiry, name: name || undefined };
    }
  }
  return null;
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DATE_RE = /(20\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})|(\d{1,2})[\s-]+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?[\s-]+(20\d{2})|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})/gi;
const PERIOD_LABEL = /보\s*험\s*기\s*간|보\s*장\s*기\s*간|계\s*약\s*기\s*간|여\s*행\s*기\s*간|period\s+of\s+(insurance|cover)|(insurance|coverage|policy)\s+period/i;
const RANGE_MARK = /[~∼〜–—-]|부터|\bto\b/i;

function isoDate(y: string, m: number, d: string): string | null {
  const dd = Number(d);
  if (m < 1 || m > 12 || dd < 1 || dd > 31) return null;
  return `${y}-${String(m).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
}

function datesIn(line: string): { iso: string; start: number; end: number }[] {
  const out: { iso: string; start: number; end: number }[] = [];
  for (const m of line.matchAll(DATE_RE)) {
    const month = (s: string) => MONTHS.indexOf(s.toLowerCase()) + 1;
    const iso = m[1] ? isoDate(m[1], Number(m[2]), m[3]) : m[4] ? isoDate(m[6], month(m[5]), m[4]) : isoDate(m[9], month(m[7]), m[8]);
    if (iso) out.push({ iso, start: m.index, end: m.index + m[0].length });
  }
  return out;
}

export type InsurancePeriod = { start: string; end: string };

/**
 * 보험 증권 글자에서 보장 기간 찾기. 생년월일 등을 잘못 집지 않도록
 * "보험기간" 같은 이름이 붙은 줄(다음 두 줄까지)이나, 물결표로 이어진 날짜 두 개만 인정.
 */
export function findInsurancePeriod(text: string): InsurancePeriod | null {
  const lines = text.split(/\r?\n/);
  const pick = (a: string, b: string) => (a <= b ? { start: a, end: b } : null);
  for (let i = 0; i < lines.length; i++) {
    if (!PERIOD_LABEL.test(lines[i])) continue;
    const dates = datesIn(lines.slice(i, i + 3).join(' '));
    if (dates.length >= 2) {
      const found = pick(dates[0].iso, dates[1].iso);
      if (found) return found;
    }
  }
  for (const line of lines) {
    const dates = datesIn(line);
    for (let i = 0; i + 1 < dates.length; i++) {
      if (RANGE_MARK.test(line.slice(dates[i].end, dates[i + 1].start))) {
        const found = pick(dates[i].iso, dates[i + 1].iso);
        if (found) return found;
      }
    }
  }
  return null;
}

export type LabelCapacity ={ mAh?: number; wh?: number; voltage?: number; ml?: number };

const num = (s: string) => Number(s.replace(/,/g, ''));

/** 보조배터리·화장품 라벨에서 용량 읽기 (예: "20000mAh 3.7V 74Wh", "150 mL") */
export function extractCapacity(text: string): LabelCapacity {
  const t = text.replace(/\s+/g, ' ');
  const out: LabelCapacity = {};
  const mAh = [...t.matchAll(/(\d{1,3}(?:,\d{3})+|\d{3,6})\s*m\s*A\s*h/gi)].map((m) => num(m[1]));
  if (mAh.length) out.mAh = Math.max(...mAh);
  const wh = [...t.matchAll(/(\d{1,3}(?:\.\d{1,2})?)\s*W\s*h\b/gi)].map((m) => num(m[1]));
  if (wh.length) out.wh = Math.max(...wh);
  const v = [...t.matchAll(/(\d(?:\.\d{1,2})?)\s*V\b/g)].map((m) => num(m[1])).filter((x) => x >= 3 && x <= 4.5);
  if (v.length) out.voltage = v[0];
  const ml = [...t.matchAll(/(\d{1,4}(?:\.\d)?)\s*m\s*[lL]\b/g)].map((m) => num(m[1]));
  if (ml.length) out.ml = Math.max(...ml);
  return out;
}
