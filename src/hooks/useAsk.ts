// AI에게 물어보기: 질문 + Checkmate가 가진 이 여행의 정보(context)를 서버 AI에 보내 답을 받음
import { useState } from 'react';

import rulesJson from '@/data/baggage-rules.json';
import { getCountry } from '@/data/countries';
import { isDone } from '@/lib/checklist';
import { useToday } from '@/lib/clock';
import { diffDays } from '@/lib/dates';
import { repo } from '@/services/repo';
import { useTripStore } from '@/store/trip';

import { useAddItem, useMe } from './useTrip';

export type AskAnswer = { answer: string; sources: { name: string; url: string }[]; suggestTitle: string; suggestDueOffset: number };
export type AskMessage = { id: string; question: string; answer: AskAnswer | null; error: string | null; added?: boolean };

export const SAMPLE_QUESTIONS = [
  '보조배터리 몇 개까지 들고 탈 수 있어요?',
  '입국할 때 뭘 준비해야 해요?',
  '콘센트 어댑터가 필요해요?',
  '여권은 얼마나 남아 있어야 해요?',
  '화장품은 비행기에 얼마나 가져갈 수 있어요?',
];

type Rules = { categories: Record<string, { label: string; notes?: string[]; sourceName?: string; sourceUrl?: string; [k: string]: unknown }> };

export function useAsk() {
  const trip = useTripStore((s) => s.trip);
  const items = useTripStore((s) => s.items);
  const statuses = useTripStore((s) => s.statuses);
  const places = useTripStore((s) => s.places);
  const itinerary = useTripStore((s) => s.itinerary);
  const { me } = useMe();
  const addItem = useAddItem();
  const today = useToday();
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [busy, setBusy] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);

  const context = () => {
    if (!trip) return {};
    const c = getCountry(trip.countryCode)?.country;
    const rules = rulesJson as unknown as Rules;
    return {
      trip: { title: trip.title, depart: trip.departDate, return: trip.returnDate, daysLeft: diffDays(today, trip.departDate), nationality: trip.nationality },
      country: c
        ? {
            name: c.name,
            currency: `${c.currencyName} (${c.currency})`,
            plug: c.plug,
            koreaPlug: '한국 콘센트는 둥근 두 핀(C·F타입), 220V. 현지 콘센트 타입이 다르면 어댑터가 필요함',
            voltage: c.voltage,
            entryDoc: c.entryDocName,
            passportRule: c.passport.minMonths ? `${c.passport.from === 'entry' ? '입국일' : '출국일'} 기준 ${c.passport.minMonths}개월 이상` : '체류 기간 동안 유효',
            embassy: { name: c.embassyName, url: c.embassyUrl },
          }
        : null,
      checklist: items
        .filter((i) => i.ownerMemberId === null || i.ownerMemberId === me?.id)
        .map((i) => ({
          title: i.title,
          description: i.description,
          dueOffset: i.dueOffset,
          done: me ? isDone(statuses, i, me.id) : false,
          source: i.sourceUrl ? { name: i.sourceName, url: i.sourceUrl } : null,
        })),
      baggageRules: Object.values(rules.categories).map((r) => {
        const { label, notes, sourceName, sourceUrl, ...limits } = r;
        delete (limits as Record<string, unknown>).inputs;
        delete (limits as Record<string, unknown>).subtypes;
        return { label, notes, limits, source: sourceUrl ? { name: sourceName, url: sourceUrl } : null };
      }),
      itinerary: itinerary.map((x) => ({ day: x.dayIndex + 1, place: places.find((p) => p.id === x.placeId)?.name })).filter((x) => x.place),
    };
  };

  return {
    messages,
    busy,
    remaining,
    async ask(question: string) {
      const q = question.trim();
      if (!q || !trip || busy) return;
      const id = `${Date.now()}`;
      setMessages((m) => [...m, { id, question: q, answer: null, error: null }]);
      setBusy(true);
      const res = await repo.invokeAi<AskAnswer>('ask', { tripId: trip.id, question: q, context: context() });
      setBusy(false);
      if (res?.remaining !== undefined && res?.remaining !== null) setRemaining(res.remaining);
      setMessages((m) =>
        m.map((x) =>
          x.id === id
            ? res && !res.fallback && res.data
              ? { ...x, answer: res.data }
              : { ...x, error: res?.reason ?? (repo.mode === 'local' ? '온라인 모드에서만 쓸 수 있어요.' : '답변을 받지 못했어요. 잠시 뒤 다시 물어봐 주세요.') }
            : x,
        ),
      );
    },
    async addSuggestion(msg: AskMessage) {
      if (!msg.answer?.suggestTitle) return;
      await addItem.add({ title: msg.answer.suggestTitle, description: `AI 도우미 답변에서 추가: ${msg.question}`, dueOffset: msg.answer.suggestDueOffset, scope: 'personal', createdByAi: true });
      setMessages((m) => m.map((x) => (x.id === msg.id ? { ...x, added: true } : x)));
    },
  };
}
