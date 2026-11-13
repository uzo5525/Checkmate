// 지원 국가 레지스트리. 국가를 추가하려면 같은 스키마로 <code>.json 을 만들고 아래 RAW 에 등록하세요.
// 체크리스트 = 나라별 고유 항목(<code>.json) + 공통 항목(common.ts)
import type { Scope } from '@/types';

import { commonItems } from './common';
import jp from './jp.json';
import th from './th.json';
import tw from './tw.json';
import us from './us.json';
import vn from './vn.json';

export type ChecklistTemplate = {
  id: string;
  title: string;
  description: string;
  byNationality?: Record<string, { title?: string; description?: string }>;
  dueOffset: number;
  scope: Scope;
  category: string;
  sourceUrl: string | null;
  sourceName: string | null;
  verified: boolean;
  required?: boolean;
};

export type CountryInfo = {
  code: string;
  name: string;
  flag: string;
  currency: string;
  currencyName: string;
  plug: string;
  voltage: string;
  sampleCity: string;
  center: { lat: number; lng: number };
  entryDocName: string;
  /** 여권 잔여 유효기간 요건: minMonths 개월, 기준일 entry(입국일) | exit(출국·귀국일) */
  passport: { minMonths: number; from: 'entry' | 'exit'; sourceName: string; sourceUrl: string };
  embassyName: string;
  embassyUrl: string;
  weatherName: string;
  weatherUrl: string;
};

export type CountryData = {
  country: CountryInfo;
  items: ChecklistTemplate[];
};

type RawCountry = { country: CountryInfo; items: ChecklistTemplate[] };
const RAW: RawCountry[] = [jp, vn, th, tw, us] as RawCountry[];

export const COUNTRIES: Record<string, CountryData> = Object.fromEntries(
  RAW.map((r) => {
    const items = [...r.items, ...commonItems(r.country)].sort((a, b) => b.dueOffset - a.dueOffset);
    return [r.country.code, { country: r.country, items }];
  }),
);

export function getCountry(code: string): CountryData | undefined {
  return COUNTRIES[code];
}

export const COUNTRY_OPTIONS = RAW.map((r) => ({
  value: r.country.code,
  label: `${r.country.flag} ${r.country.name}`,
}));

export const NATIONALITY_OPTIONS = [
  { value: 'KR', label: '대한민국' },
  { value: 'OTHER', label: '기타 국적' },
];

/** 기타 국적 목록 (ISO 3166-1 alpha-2). 나라별 비자 요건은 각 국가 데이터의 byNationality 로 추가 */
export const OTHER_NATIONALITIES = [
  { value: 'US', label: '미국' },
  { value: 'CN', label: '중국' },
  { value: 'JP', label: '일본' },
  { value: 'TW', label: '대만' },
  { value: 'HK', label: '홍콩' },
  { value: 'VN', label: '베트남' },
  { value: 'TH', label: '태국' },
  { value: 'PH', label: '필리핀' },
  { value: 'ID', label: '인도네시아' },
  { value: 'MY', label: '말레이시아' },
  { value: 'SG', label: '싱가포르' },
  { value: 'IN', label: '인도' },
  { value: 'MN', label: '몽골' },
  { value: 'UZ', label: '우즈베키스탄' },
  { value: 'RU', label: '러시아' },
  { value: 'GB', label: '영국' },
  { value: 'FR', label: '프랑스' },
  { value: 'DE', label: '독일' },
  { value: 'CA', label: '캐나다' },
  { value: 'AU', label: '호주' },
  { value: 'NZ', label: '뉴질랜드' },
  { value: 'OTHER', label: '그 밖의 국적' },
];

export const nationalityLabel = (code: string) =>
  code === 'KR' ? '대한민국' : (OTHER_NATIONALITIES.find((n) => n.value === code)?.label ?? '기타 국적');

/** templateId 'jp.passport_validity' → 'passport_validity' */
export function templateKey(templateId: string | null): string | null {
  if (!templateId) return null;
  const i = templateId.indexOf('.');
  return i >= 0 ? templateId.slice(i + 1) : templateId;
}
