import { useState } from 'react';

import { friendlyError } from '@/lib/errors';
import { today } from '@/lib/clock';
import { addDays, diffDays, isDateStr } from '@/lib/dates';
import { repo } from '@/services/repo';
import { useSessionStore } from '@/store/session';

export function useCreateTripForm() {
  const setMembership = useSessionStore((s) => s.setMembership);
  const [countryCode, setCountryCode] = useState('JP');
  const [nationality, setNationality] = useState('KR');
  const [departDate, setDepartDate] = useState(() => addDays(today(), 30));
  const [returnDate, setReturnDate] = useState(() => addDays(today(), 34));
  const [partySize, setPartySize] = useState('2');
  const [nickname, setNickname] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errors = {
    departDate: !isDateStr(departDate) ? 'YYYY-MM-DD 형식으로 입력하세요' : undefined,
    returnDate: !isDateStr(returnDate)
      ? 'YYYY-MM-DD 형식으로 입력하세요'
      : isDateStr(departDate) && diffDays(departDate, returnDate) < 0
        ? '귀국일은 출발일 이후여야 해요'
        : undefined,
    partySize: !/^\d+$/.test(partySize) || Number(partySize) < 1 || Number(partySize) > 20 ? '1~20명' : undefined,
    nickname: nickname.trim().length === 0 ? '닉네임을 입력하세요' : undefined,
    nationality: nationality ? undefined : '국적을 골라 주세요',
  };
  const valid = Object.values(errors).every((e) => !e);

  return {
    values: { countryCode, nationality, departDate, returnDate, partySize, nickname },
    set: {
      setCountryCode,
      setNationality,
      // 출발일을 귀국일 뒤로 옮기면 여행 기간을 유지하도록 귀국일도 같이 옮김
      setDepartDate: (d: string) => {
        if (isDateStr(d) && isDateStr(departDate) && isDateStr(returnDate) && diffDays(d, returnDate) < 0) {
          setReturnDate(addDays(d, Math.max(0, diffDays(departDate, returnDate))));
        }
        setDepartDate(d);
      },
      setReturnDate,
      setPartySize,
      setNickname,
    },
    errors,
    valid,
    submitting,
    submitError,
    async submit(): Promise<string | null> {
      if (!valid) return null;
      setSubmitting(true);
      setSubmitError(null);
      try {
        const { trip, member } = await repo.createTrip({
          countryCode,
          nationality,
          departDate,
          returnDate,
          partySize: Number(partySize),
          nickname: nickname.trim(),
        });
        setMembership(trip.id, member.id);
        return trip.id;
      } catch (e) {
        setSubmitError(friendlyError(e));
        return null;
      } finally {
        setSubmitting(false);
      }
    },
  };
}
