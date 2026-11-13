// ICAO 9303 TD3 (여권) MRZ 파서.
// 개인정보 보호: 여권번호는 체크 디지트 검증에만 쓰고 반환 객체에 넣지 않습니다. 어디에도 저장하지 마세요.

export type MrzChecks = {
  documentNumber: boolean;
  birthDate: boolean;
  expiryDate: boolean;
  personalNumber: boolean;
  composite: boolean;
};

export type PassportMrz = {
  documentType: string; // 'P' 등
  issuingCountry: string; // 3자리 코드
  surname: string;
  givenNames: string;
  nationality: string;
  birthDate: string; // YYYY-MM-DD
  sex: 'M' | 'F' | 'X';
  expiryDate: string; // YYYY-MM-DD
  checks: MrzChecks;
  valid: boolean; // 모든 체크 디지트 통과
};

export class MrzError extends Error {}

const WEIGHTS = [7, 3, 1];

function charValue(c: string): number {
  if (c === '<') return 0;
  const code = c.charCodeAt(0);
  if (code >= 48 && code <= 57) return code - 48; // 0-9
  if (code >= 65 && code <= 90) return code - 55; // A=10 … Z=35
  throw new MrzError(`MRZ에 허용되지 않는 문자: ${c}`);
}

export function checkDigit(field: string): number {
  let sum = 0;
  for (let i = 0; i < field.length; i++) sum += charValue(field[i]) * WEIGHTS[i % 3];
  return sum % 10;
}

function verify(field: string, digit: string): boolean {
  // 선택 필드가 전부 '<' 이면 체크 디지트도 '<' 또는 0 이 허용됨
  if (digit === '<') return /^<*$/.test(field);
  return checkDigit(field) === Number(digit);
}

function yymmdd(s: string, kind: 'birth' | 'expiry', nowYear: number): string {
  if (!/^\d{6}$/.test(s)) throw new MrzError(`날짜 형식 오류: ${s}`);
  const yy = Number(s.slice(0, 2));
  let year: number;
  if (kind === 'expiry') {
    year = 2000 + yy; // 여권 유효기간은 최대 10년
    if (year > nowYear + 20) year -= 100;
  } else {
    year = 2000 + yy > nowYear ? 1900 + yy : 2000 + yy;
  }
  return `${year}-${s.slice(2, 4)}-${s.slice(4, 6)}`;
}

function name(field: string): { surname: string; givenNames: string } {
  const [sur, ...rest] = field.split('<<');
  const clean = (s: string) => s.replace(/<+/g, ' ').trim();
  return { surname: clean(sur ?? ''), givenNames: clean(rest.join('<<')) };
}

/** OCR 결과의 공백/소문자 등 정리 */
export function normalizeMrzLine(line: string): string {
  return line.toUpperCase().replace(/\s/g, '').replace(/«/g, '<');
}

export function parseTD3(line1Raw: string, line2Raw: string, nowYear = new Date().getFullYear()): PassportMrz {
  const line1 = normalizeMrzLine(line1Raw);
  const line2 = normalizeMrzLine(line2Raw);
  if (line1.length !== 44 || line2.length !== 44) throw new MrzError('TD3 MRZ는 44자 2줄이어야 합니다.');
  if (line1[0] !== 'P') throw new MrzError('여권(P) MRZ가 아닙니다.');

  const documentType = line1.slice(0, 2).replace(/</g, '');
  const issuingCountry = line1.slice(2, 5).replace(/</g, '');
  const { surname, givenNames } = name(line1.slice(5));

  const docNo = line2.slice(0, 9);
  const docNoCd = line2[9];
  const nationality = line2.slice(10, 13).replace(/</g, '');
  const birth = line2.slice(13, 19);
  const birthCd = line2[19];
  const sexRaw = line2[20];
  const expiry = line2.slice(21, 27);
  const expiryCd = line2[27];
  const personal = line2.slice(28, 42);
  const personalCd = line2[42];
  const compositeCd = line2[43];

  const composite = line2.slice(0, 10) + line2.slice(13, 20) + line2.slice(21, 43);

  const checks: MrzChecks = {
    documentNumber: verify(docNo, docNoCd),
    birthDate: verify(birth, birthCd),
    expiryDate: verify(expiry, expiryCd),
    personalNumber: verify(personal, personalCd),
    composite: verify(composite, compositeCd),
  };

  return {
    documentType,
    issuingCountry,
    surname,
    givenNames,
    nationality,
    birthDate: yymmdd(birth, 'birth', nowYear),
    sex: sexRaw === 'M' || sexRaw === 'F' ? sexRaw : 'X',
    expiryDate: yymmdd(expiry, 'expiry', nowYear),
    checks,
    valid: Object.values(checks).every(Boolean),
  };
}
