// 항목 질문: 답을 저장하고, 결과에 따라 새 할 일을 추가·정리하고, 끝난 항목은 체크합니다. 답은 이 기기에만 저장.
import { useState } from 'react';

import { getCountry, templateKey } from '@/data/countries';
import { isDone, statusKey, ownerKeyFor } from '@/lib/checklist';
import { diffDays } from '@/lib/dates';
import { diffCards, quizFor, type QuizAnswers } from '@/lib/itemQuiz';
import { repo } from '@/services/repo';
import { useDocsStore } from '@/store/docs';
import { useTripStore } from '@/store/trip';
import type { ChecklistItem } from '@/types';

import { useAddItem, useMe, useToggleItem } from './useTrip';

export function useItemQuiz(item: ChecklistItem) {
  const trip = useTripStore((s) => s.trip);
  const items = useTripStore((s) => s.items);
  const statuses = useTripStore((s) => s.statuses);
  const load = useTripStore((s) => s.load);
  const saved = useDocsStore((s) => (item.templateId ? s.quizzes[item.tripId]?.[item.templateId] : undefined));
  const saveQuiz = useDocsStore((s) => s.saveQuiz);
  const addItem = useAddItem();
  const toggle = useToggleItem();
  const { me } = useMe();
  const [draft, setDraft] = useState<QuizAnswers>({});
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const key = templateKey(item.templateId);
  const country = trip ? getCountry(trip.countryCode)?.country : undefined;
  const quiz =
    key && trip && country && !item.providedBy
      ? quizFor({
          key,
          countryCode: trip.countryCode,
          countryName: country.name,
          nationality: trip.nationality,
          stayDays: diffDays(trip.departDate, trip.returnDate) + 1,
          sourceUrl: item.sourceUrl,
          sourceName: item.sourceName,
        })
      : null;
  if (!quiz) return null;

  const answers: QuizAnswers = { ...Object.fromEntries(quiz.questions.filter((q) => q.initial).map((q) => [q.id, q.initial!])), ...(editing ? saved?.answers : null), ...draft };
  const complete = quiz.questions.every((q) => answers[q.id]);
  const showResult = !!saved && !editing;

  return {
    questions: quiz.questions,
    answers,
    complete,
    busy,
    showResult,
    result: saved ? quiz.evaluate(saved.answers) : null,
    choose: (id: string, value: string) => setDraft((d) => ({ ...d, [id]: value })),
    edit: () => {
      setDraft({});
      setEditing(true);
    },
    async submit() {
      if (!complete || !me || !item.templateId) return;
      setBusy(true);
      try {
        const result = quiz.evaluate(answers);
        const { add, remove } = diffCards(saved?.added ?? [], result.cards, items.map((i) => i.title));
        const scope = item.scope === 'shared' && addItem.canAddShared ? 'shared' : 'personal';
        for (const card of add) await addItem.add({ ...card, scope });
        // 내가 전에 답해서 생긴 카드 중 아직 안 끝낸 것만 지움
        for (const title of remove) {
          const old = items.find((i) => i.title === title && i.templateId === null);
          if (old && !isDone(statuses, old, me.id)) await repo.deleteItem(old.id);
        }
        saveQuiz(item.tripId, item.templateId, { answers, added: result.cards.map((c) => c.title) });
        if (remove.length) await load(item.tripId);
        const doneNow = !!statuses[statusKey(item.id, ownerKeyFor(item, me.id))]?.done;
        if (result.finishes && !doneNow) await toggle(item);
        setDraft({});
        setEditing(false);
      } finally {
        setBusy(false);
      }
    },
  };
}
