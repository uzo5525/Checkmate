// 체크리스트 항목 안의 서류 확인 (여권 유효기간, 여행자보험 기간). 이 기기에만 저장.
import * as DocumentPicker from 'expo-document-picker';
import { useState } from 'react';

import { getCountry, templateKey } from '@/data/countries';
import { friendlyError } from '@/lib/errors';
import { isDateStr } from '@/lib/dates';
import { docGateOf, type DocGate } from '@/lib/docGate';
import { MrzError, parseTD3 } from '@/lib/mrz';
import { findInsurancePeriod, findMrzExpiry, findMrzLines } from '@/lib/ocrText';
import { checkInsurance, checkPassport, DOC_VERDICT_LABEL, type DocCheckResult } from '@/services/documentCheck';
import { captureText, OCR_AVAILABLE, readFileText, type OcrSource } from '@/services/ocr';
import { useDocsStore, type DocFields, type DocKind } from '@/store/docs';
import type { VaultFile } from '@/store/vault';
import { useTripStore } from '@/store/trip';
import type { ChecklistItem, Trip } from '@/types';

export function docKindOf(item: ChecklistItem): DocKind | null {
  const key = templateKey(item.templateId);
  if (key === 'passport_validity') return 'passport';
  if (key === 'insurance') return 'insurance';
  return null;
}

/** 입력값을 여행 일정과 비교한 결과. 값이 덜 채워졌으면 null */
export function docResultOf(kind: DocKind, fields: DocFields, trip: Trip): (DocCheckResult & { label: string }) | null {
  const country = getCountry(trip.countryCode)?.country;
  let r: DocCheckResult | null = null;
  if (kind === 'passport' && isDateStr(fields.expiryDate ?? '') && country) r = checkPassport(fields.expiryDate, trip, country.passport);
  if (kind === 'insurance' && isDateStr(fields.coverageStart ?? '') && isDateStr(fields.coverageEnd ?? '')) r = checkInsurance(fields.coverageStart, fields.coverageEnd, trip);
  return r ? { ...r, label: DOC_VERDICT_LABEL[r.verdict] } : null;
}

/** 이 항목의 완료 조건. 서류 확인이 없는 항목과 여행사가 처리한 항목은 null */
export function itemDocGate(item: ChecklistItem, trip: Trip | null, docs: Pick<ReturnType<typeof useDocsStore.getState>, 'byTrip' | 'waived'>): DocGate | null {
  const kind = docKindOf(item);
  if (!kind || !trip || item.providedBy) return null;
  const result = docResultOf(kind, docs.byTrip[item.tripId]?.[kind] ?? {}, trip);
  return docGateOf(result?.verdict ?? null, !!docs.waived[item.tripId]?.[item.templateId!]);
}

export function useItemCheck(item: ChecklistItem) {
  const trip = useTripStore((s) => s.trip);
  const kind = docKindOf(item);
  const fields = useDocsStore((s) => (kind ? s.byTrip[item.tripId]?.[kind] : undefined)) ?? {};
  const setFields = useDocsStore((s) => s.setFields);
  const clearKind = useDocsStore((s) => s.clearKind);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [readDone, setReadDone] = useState(false);

  const country = trip ? getCountry(trip.countryCode)?.country : undefined;

  const result = trip && kind ? docResultOf(kind, fields, trip) : null;

  /** 두 줄이 온전하면 전체 검증, 아니면 2번째 줄의 만료일만 (체크 디지트로 검증) */
  const applyMrzText = (text: string): boolean => {
    const lines = findMrzLines(text);
    if (lines) {
      try {
        const p = parseTD3(lines[0], lines[1]);
        if (p.valid) {
          // 여권번호·생년월일은 저장하지 않음
          setFields(item.tripId, 'passport', { name: `${p.surname} ${p.givenNames}`.trim(), expiryDate: p.expiryDate });
          return true;
        }
      } catch {
        // 아래 만료일만 읽기로
      }
    }
    const e = findMrzExpiry(text);
    if (!e) return false;
    const y = e.expiryYymmdd;
    setFields(item.tripId, 'passport', { ...(e.name ? { name: e.name } : {}), expiryDate: `20${y.slice(0, 2)}-${y.slice(2, 4)}-${y.slice(4, 6)}` });
    return true;
  };

  const script = kind === 'insurance' ? 'korean' : 'mrz';

  const applyRead = (text: string) => {
    if (kind === 'passport') {
      if (!applyMrzText(text)) {
        throw new MrzError('여권 사진면 맨 아래 "<<<"가 들어간 두 줄(PMKOR…)이 화면에 꽉 차게, 빛 반사 없이 다시 찍어 주세요. 안 되면 만료일을 직접 골라 주세요.');
      }
      return;
    }
    const period = findInsurancePeriod(text);
    if (!period) throw new Error('보장 기간을 찾지 못했어요. "보험기간"이 보이는 면인지 확인하거나 날짜를 직접 골라 주세요.');
    setFields(item.tripId, 'insurance', { coverageStart: period.start, coverageEnd: period.end });
  };

  /** 글자를 읽어 값을 채움. 사용자가 취소하면 아무것도 하지 않음 */
  const runRead = async (read: () => Promise<string | null>) => {
    setScanError(null);
    setScanning(true);
    setReadDone(false);
    try {
      const text = await read();
      if (text === null) return;
      applyRead(text);
      setReadDone(true);
    } catch (e) {
      setScanError(friendlyError(e));
    } finally {
      setScanning(false);
    }
  };

  return {
    kind,
    trip,
    readDone,
    country,
    fields,
    result,
    ocrAvailable: OCR_AVAILABLE,
    scanning,
    scanError,
    setValue: (key: string, value: string) => kind && setFields(item.tripId, kind, { [key]: value }),
    clear: () => kind && clearKind(item.tripId, kind),

    /** 사진을 찍거나 골라서 검사 */
    scan: (source: OcrSource) => runRead(() => captureText(source, script)),
    /** 기기의 파일을 골라서 검사 (파일은 저장하지 않음) */
    scanDevice: () =>
      runRead(async () => {
        const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
        const a = res.canceled ? null : res.assets[0];
        return a ? readFileText(a.uri, a.mimeType ?? 'application/pdf', script) : null;
      }),
    /** 보관함에 있는 파일로 검사 */
    scanVault: (file: VaultFile) => runRead(() => readFileText(file.uri, file.mimeType, script)),
  };
}
