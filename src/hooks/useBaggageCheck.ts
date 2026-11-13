import { useMemo, useState } from 'react';

import type { IconName } from '@/components/ui';
import rulesJson from '@/data/baggage-rules.json';
import { getCountry } from '@/data/countries';
import { judgeBaggage, type BaggageCategory, type BaggageDraft, type BaggageRules } from '@/lib/baggage';
import { diffDays } from '@/lib/dates';
import { uuid } from '@/lib/id';
import { extractCapacity } from '@/lib/ocrText';
import { defaultPacking } from '@/lib/packing';
import { captureText, OCR_AVAILABLE, type OcrSource } from '@/services/ocr';
import { EMPTY_LUGGAGE, useLuggageStore } from '@/store/luggage';
import { useTripStore } from '@/store/trip';

const rules = rulesJson as unknown as BaggageRules;

type InputField = { key: string; label: string; unit: string; placeholder?: string; hint?: string; default?: number; onlyFor?: string };
type CategoryMeta = { label: string; inputs?: InputField[]; subtypes?: { value: string; label: string }[] };

const meta = rulesJson.categories as unknown as Record<BaggageCategory, CategoryMeta>;

export const BAGGAGE_ICONS: Record<BaggageCategory, IconName> = {
  powerbank: 'battery',
  liquid: 'liquid',
  spray: 'spray',
  sharp: 'sharp',
  food: 'food',
};

const SHORT: Record<BaggageCategory, string> = {
  powerbank: '보조배터리',
  liquid: '액체류',
  spray: '스프레이',
  sharp: '날카로운 물품',
  food: '식품',
};

export const BAGGAGE_CATEGORY_OPTIONS = (Object.keys(meta) as BaggageCategory[]).map((value) => ({
  value,
  label: meta[value].label,
  short: SHORT[value],
}));

// 항공사 선택은 안내 문구에만 쓰입니다 (항공사별 규정 데이터는 아직 없음)
export const AIRLINE_OPTIONS = ['대한항공', '아시아나항공', '제주항공', '진에어', '티웨이항공', '에어부산', '피치항공', '기타 항공사'].map((a) => ({
  value: a,
  label: a,
}));

function fieldsFor(d: BaggageDraft) {
  const m = meta[d.category];
  return {
    subtypes: m.subtypes ?? [],
    inputs: (m.inputs ?? []).filter((f) => !f.onlyFor || f.onlyFor === d.subtype),
  };
}

/** 판정에 필요한 값이 비었으면 무엇을 받아야 하는지 */
function missingInput(d: BaggageDraft): string | null {
  const f = fieldsFor(d);
  if (f.subtypes.length > 0 && !d.subtype) return '종류 선택';
  if (d.category === 'spray' && d.subtype === 'other') return null;
  if (f.inputs.some((i) => !(d.values[i.key] ?? '').trim())) return d.category === 'liquid' || d.category === 'spray' ? '용기 용량 확인' : '용량 입력';
  return null;
}

/** 반입 규정 확인 목록 (여행별로 기기에 저장) */
export function useBaggageCheck() {
  const trip = useTripStore((s) => s.trip);
  const tripId = trip?.id ?? '_';
  const countryCode = trip?.countryCode ?? 'JP';
  const packageAirline = trip?.packageInfo?.airline ?? null;
  const data = useLuggageStore((s) => s.byTrip[tripId]) ?? EMPTY_LUGGAGE;
  const updateStore = useLuggageStore((s) => s.update);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [scanMsg, setScanMsg] = useState<string | null>(null);

  const setDrafts = (fn: (ds: BaggageDraft[]) => BaggageDraft[]) => updateStore(tripId, (cur) => ({ drafts: fn(cur.drafts) }));
  const update = (id: string, fn: (d: BaggageDraft) => BaggageDraft) => setDrafts((ds) => ds.map((d) => (d.id === id ? fn(d) : d)));

  const rows = useMemo(
    () =>
      data.drafts.map((d) => ({
        draft: d,
        label: d.label ?? SHORT[d.category],
        icon: BAGGAGE_ICONS[d.category],
        fields: fieldsFor(d),
        missing: missingInput(d),
        result: judgeBaggage(d, rules, countryCode),
        canScan: OCR_AVAILABLE && (d.category === 'powerbank' || d.category === 'liquid' || d.category === 'spray'),
      })),
    [data.drafts, countryCode],
  );

  return {
    rows,
    selectedId,
    select: (id: string | null) => setSelectedId((cur) => (cur === id ? null : id)),
    // 패키지 여행은 여행사가 정한 항공사로 고정
    airline: packageAirline ?? data.airline,
    airlineLocked: !!packageAirline,
    setAirline: (airline: string) => updateStore(tripId, () => ({ airline })),
    add(category: BaggageCategory) {
      const d = newDraft(category);
      setDrafts((ds) => [...ds, d]);
      setSelectedId(d.id);
    },
    remove: (id: string) => setDrafts((ds) => ds.filter((d) => d.id !== id)),
    setSubtype: (id: string, subtype: string) => update(id, (d) => ({ ...d, subtype })),
    setValue: (id: string, key: string, value: string) => update(id, (d) => ({ ...d, values: { ...d.values, [key]: value } })),
    scanning,
    scanMsg,
    /** 라벨을 찍어 용량 읽기 (폰 안 문자 인식, 무료) */
    async scanLabel(id: string, source: OcrSource) {
      const draft = data.drafts.find((d) => d.id === id);
      if (!draft) return;
      setScanMsg(null);
      setScanning(id);
      try {
        const text = await captureText(source, 'latin');
        if (!text) return;
        const cap = extractCapacity(text);
        if (draft.category === 'powerbank') {
          const v = cap.voltage ?? Number(draft.values.voltage || 3.7);
          const mAh = cap.mAh ?? (cap.wh ? Math.round((cap.wh * 1000) / v) : undefined);
          if (!mAh) throw new Error('라벨에서 mAh·Wh 숫자를 찾지 못했어요. 직접 입력해 주세요.');
          update(id, (d) => ({ ...d, values: { ...d.values, mAh: String(mAh), voltage: String(v) } }));
          setScanMsg(`${mAh.toLocaleString()}mAh${cap.wh ? ` · ${cap.wh}Wh` : ''}로 읽었어요. 맞는지 확인해 주세요.`);
        } else {
          if (!cap.ml) throw new Error('라벨에서 ml 숫자를 찾지 못했어요. 직접 입력해 주세요.');
          update(id, (d) => ({ ...d, values: { ...d.values, ml: String(cap.ml) } }));
          setScanMsg(`${cap.ml}ml로 읽었어요. 맞는지 확인해 주세요.`);
        }
      } catch (e) {
        setScanMsg(e instanceof Error ? e.message : String(e));
      } finally {
        setScanning(null);
      }
    },
    /** 입력이 덜 된 첫 물품을 열기. 모두 입력됐으면 false */
    focusNextMissing(): boolean {
      const next = rows.find((r) => r.missing);
      if (next) setSelectedId(next.draft.id);
      return !!next;
    },
  };
}

/** 짐 리스트: 기간·나라 기준 기본 목록 + 추가·삭제·수량·챙김 체크 */
export function usePackingList() {
  const trip = useTripStore((s) => s.trip);
  const tripId = trip?.id ?? '_';
  const data = useLuggageStore((s) => s.byTrip[tripId]) ?? EMPTY_LUGGAGE;
  const updateStore = useLuggageStore((s) => s.update);
  const plug = trip ? (getCountry(trip.countryCode)?.country.plug ?? '현지 콘센트') : '현지 콘센트';
  const nights = trip ? diffDays(trip.departDate, trip.returnDate) : 3;
  const list = data.packing ?? defaultPacking(nights, plug).map((p) => ({ id: p.name, name: p.name, qty: p.qty, packed: false }));
  const set = (fn: (l: typeof list) => typeof list) => updateStore(tripId, () => ({ packing: fn(list) }));

  return {
    items: list,
    packedCount: list.filter((i) => i.packed).length,
    toggle: (id: string) => set((l) => l.map((i) => (i.id === id ? { ...i, packed: !i.packed } : i))),
    changeQty: (id: string, delta: number) => set((l) => l.map((i) => (i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))),
    add: (name: string) => name.trim() && set((l) => [...l, { id: uuid(), name: name.trim(), qty: 1, packed: false }]),
    remove: (id: string) => set((l) => l.filter((i) => i.id !== id)),
    reset: () => updateStore(tripId, () => ({ packing: null })),
  };
}

function newDraft(category: BaggageCategory): BaggageDraft {
  const defaults: Record<string, string> = {};
  for (const f of meta[category].inputs ?? []) if (f.default !== undefined) defaults[f.key] = String(f.default);
  return { id: uuid(), category, values: defaults, source: 'manual' };
}
