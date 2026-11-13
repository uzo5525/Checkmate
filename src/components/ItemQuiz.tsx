// 항목 안의 질문 카드: 답하면 결과와 새 할 일이 나옴. 답하지 않아도 항목은 체크할 수 있음
import { AlertBox, Button, Card, ChipGroup, Stack, Text } from '@/components/ui';
import { useItemQuiz } from '@/hooks/useItemQuiz';
import type { ChecklistItem } from '@/types';

const TONE = { match: 'brand', check: 'warning', mismatch: 'danger' } as const;

export function ItemQuiz({ item }: { item: ChecklistItem }) {
  const q = useItemQuiz(item);
  if (!q) return null;

  if (q.showResult && q.result) {
    return (
      <Stack gap="sm">
        <AlertBox tone={TONE[q.result.tone]} title={q.result.title}>
          <Text variant="small" color="textMuted">
            {q.result.message}
          </Text>
          {q.result.cards.map((c) => (
            <Text key={c.title} variant="small" bold>
              할 일 추가: {c.title}
            </Text>
          ))}
        </AlertBox>
        <Button title="다시 답하기" size="sm" variant="ghost" onPress={q.edit} />
      </Stack>
    );
  }

  return (
    <Card>
      <Text variant="label">내 상황 확인하기</Text>
      {q.questions.map((question) => (
        <Stack key={question.id} gap="sm">
          <Text variant="small">{question.text}</Text>
          <ChipGroup options={question.options} value={q.answers[question.id] ?? ''} onChange={(v) => q.choose(question.id, v)} />
        </Stack>
      ))}
      <Button title="결과 보기" full loading={q.busy} disabled={!q.complete} onPress={q.submit} />
    </Card>
  );
}
