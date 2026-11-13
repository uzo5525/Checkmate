// 짐 반입 판정 (순수 함수). 규정 수치는 src/data/baggage-rules.json 에서 받아옵니다.
// 입력 단계(BaggageDraft)와 판정 단계(judgeBaggage)를 분리해 두었기 때문에
// Phase 2 에서 사진 인식 결과(services/vision.ts)를 BaggageDraft 로 바꿔 넣기만 하면 됩니다.

export type BaggageCategory = 'powerbank' | 'liquid' | 'spray' | 'sharp' | 'food';

export type BaggageDraft = {
  id: string;
  category: BaggageCategory;
  subtype?: string;
  values: Record<string, string>; // 사용자가 입력한 수치 (문자열 그대로)
  label?: string; // 사진 인식 시 물품명
  source: 'manual' | 'photo';
};

/** 4단계 결과 */
export type Verdict = 'cabin' | 'checked' | 'restricted' | 'check';

export const VERDICT_LABEL: Record<Verdict, string> = {
  cabin: '기내 가능',
  checked: '위탁 가능',
  restricted: '제한·금지',
  check: '추가 확인 필요',
};

export type Allowance = 'yes' | 'no' | 'approval' | 'unknown';

export type BaggageResult = {
  verdict: Verdict;
  cabin: Allowance;
  checked: Allowance;
  summary: string;
  details: string[];
  wh?: number;
  sourceName: string | null;
  sourceUrl: string | null;
  checkedAt: string | null;
  verified: boolean;
};

type Src = { sourceName: string | null; sourceUrl: string | null; checkedAt: string | null; verified: boolean; notes?: string[] };

export type BaggageRules = {
  version: string;
  categories: {
    powerbank: Src & { cabinMaxWh: number; approvalMaxWh: number; checkedAllowed: boolean };
    liquid: Src & { cabinMaxMlPerContainer: number; cabinBagNote: string; checkedAllowed: boolean };
    spray: Src & { toiletry: { cabinMaxMl: number; checkedMaxMl: number }; otherAllowed: boolean };
    sharp: Src & { scissorsCabinMaxBladeCm: number };
    food: Src & {
      byCountry: Record<string, { meatAllowed: boolean; fruitVegNeedsCheck: boolean; sourceName: string; sourceUrl: string }>;
    };
  };
};

/** Wh = mAh × V ÷ 1000 */
export function calcWh(mAh: number, voltage: number): number {
  return Math.round(((mAh * voltage) / 1000) * 10) / 10;
}

function num(v: string | undefined): number | null {
  if (v === undefined || v.trim() === '') return null;
  const n = Number(v.replace(/,/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** 기내/위탁 허용 여부 → 4단계 결과 */
export function toVerdict(cabin: Allowance, checked: Allowance): Verdict {
  if (cabin === 'approval' || cabin === 'unknown' || checked === 'unknown') return 'check';
  if (cabin === 'yes') return 'cabin';
  if (checked === 'yes') return 'checked';
  return 'restricted';
}

export function judgeBaggage(draft: BaggageDraft, rules: BaggageRules, countryCode: string): BaggageResult {
  const r = rules.categories;
  const base = (src: Src) => ({
    sourceName: src.sourceName,
    sourceUrl: src.sourceUrl,
    checkedAt: src.checkedAt,
    verified: src.verified,
  });
  const make = (src: Src, cabin: Allowance, checked: Allowance, summary: string, details: string[], extra?: Partial<BaggageResult>): BaggageResult => ({
    verdict: toVerdict(cabin, checked),
    cabin,
    checked,
    summary,
    details: [...details, ...(src.notes ?? [])],
    ...base(src),
    ...extra,
  });

  switch (draft.category) {
    case 'powerbank': {
      const rule = r.powerbank;
      const mAh = num(draft.values.mAh);
      const v = num(draft.values.voltage) ?? 3.7;
      if (mAh === null) return make(rule, 'unknown', 'no', '용량(mAh)을 입력해 주세요.', []);
      const wh = calcWh(mAh, v);
      const checked: Allowance = rule.checkedAllowed ? 'yes' : 'no';
      const calc = `${mAh.toLocaleString()}mAh × ${v}V ÷ 1000 = ${wh}Wh`;
      if (wh <= rule.cabinMaxWh) return make(rule, 'yes', checked, `${wh}Wh — 기내 휴대 가능, 위탁 불가`, [calc], { wh });
      if (wh <= rule.approvalMaxWh)
        return make(rule, 'approval', checked, `${wh}Wh — 항공사 승인 필요 (기내 휴대만)`, [calc], { wh });
      return make(rule, 'no', 'no', `${wh}Wh — ${rule.approvalMaxWh}Wh 초과로 반입 불가`, [calc], { wh });
    }
    case 'liquid': {
      const rule = r.liquid;
      const ml = num(draft.values.ml);
      const checked: Allowance = rule.checkedAllowed ? 'yes' : 'no';
      if (ml === null) return make(rule, 'unknown', checked, '용기당 용량(ml)을 입력해 주세요.', []);
      if (ml <= rule.cabinMaxMlPerContainer) return make(rule, 'yes', checked, `${ml}ml — 기내 반입 가능`, [rule.cabinBagNote]);
      return make(rule, 'no', checked, `${ml}ml — 기내 불가, 위탁수하물로`, [
        `용기당 ${rule.cabinMaxMlPerContainer}ml 초과 (내용물이 적게 남아도 용기 기준)`,
      ]);
    }
    case 'spray': {
      const rule = r.spray;
      if (!draft.subtype) return make(rule, 'unknown', 'unknown', '스프레이 종류를 골라 주세요.', []);
      if (draft.subtype === 'other') {
        const a: Allowance = rule.otherAllowed ? 'yes' : 'no';
        return make(rule, a, a, '살충제·페인트·가스 등은 기내·위탁 모두 금지', []);
      }
      const ml = num(draft.values.ml);
      if (ml === null) return make(rule, 'unknown', 'unknown', '용기당 용량(ml)을 입력해 주세요.', []);
      const cabin: Allowance = ml <= rule.toiletry.cabinMaxMl ? 'yes' : 'no';
      const checked: Allowance = ml <= rule.toiletry.checkedMaxMl ? 'yes' : 'no';
      const summary =
        cabin === 'yes' ? `${ml}ml — 기내 반입 가능` : checked === 'yes' ? `${ml}ml — 위탁수하물만 가능` : `${ml}ml — 용기당 ${rule.toiletry.checkedMaxMl}ml 초과로 반입 불가`;
      return make(rule, cabin, checked, summary, []);
    }
    case 'sharp': {
      const rule = r.sharp;
      if (!draft.subtype) return make(rule, 'unknown', 'unknown', '물품 종류를 골라 주세요.', []);
      if (draft.subtype === 'scissors') {
        const cm = num(draft.values.bladeCm);
        if (cm === null) return make(rule, 'unknown', 'yes', '가위 날 길이(cm)를 입력해 주세요.', []);
        const cabin: Allowance = cm <= rule.scissorsCabinMaxBladeCm ? 'yes' : 'no';
        return make(rule, cabin, 'yes', cabin === 'yes' ? `날 ${cm}cm — 기내 반입 가능` : `날 ${cm}cm — 기내 불가, 위탁 가능`, [
          `기준: 날 길이 ${rule.scissorsCabinMaxBladeCm}cm 이하`,
        ]);
      }
      return make(rule, 'no', 'yes', draft.subtype === 'knife' ? '칼류 — 기내 불가, 위탁 가능' : '공구 — 기내 불가, 위탁 가능', [
        '공구는 길이에 따라 기내 허용 기준이 다를 수 있습니다.',
      ]);
    }
    case 'food': {
      const rule = r.food;
      const c = rule.byCountry[countryCode];
      const src: Src = c ? { ...rule, sourceName: c.sourceName, sourceUrl: c.sourceUrl } : rule;
      if (!draft.subtype) return make(src, 'unknown', 'unknown', '식품 종류를 골라 주세요.', []);
      if (!c) return make(src, 'unknown', 'unknown', '도착 국가 검역 규정을 확인해 주세요.', []);
      switch (draft.subtype) {
        case 'meat':
          return c.meatAllowed
            ? make(src, 'yes', 'yes', '육가공품 — 반입 가능', [])
            : make(src, 'no', 'no', '육가공품 — 도착 국가 검역 규정상 반입 금지', ['기내·위탁 구분 없이 입국 시 반입할 수 없습니다.']);
        case 'fruit_veg':
          return make(src, c.fruitVegNeedsCheck ? 'unknown' : 'yes', c.fruitVegNeedsCheck ? 'unknown' : 'yes', '생과일·채소 — 식물검역 대상, 품목별 확인 필요', []);
        case 'liquid_food':
          return make(src, 'no', 'yes', '액체·소스류 — 100ml 초과 시 기내 불가, 위탁 가능', ['밀봉 포장 권장. 육류가 들어간 제품은 검역 대상일 수 있습니다.']);
        default:
          return make(src, 'yes', 'yes', '건조·포장 식품 — 일반적으로 반입 가능', ['육류 성분(육수 분말 등)이 포함되면 검역 대상일 수 있습니다.']);
      }
    }
  }
}
