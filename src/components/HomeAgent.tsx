// 홈 "AI 준비 에이전트": 오늘의 브리핑·바로 처리할 행동·제안 + 바로 물어보기 (답은 이 앱 데이터 안에서만)
import { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { Badge, Button, Card, Chip, Divider, Grow, Icon, Input, Row, Stack, Text, type IconName } from '@/components/ui';
import { useAsk, SAMPLE_QUESTIONS } from '@/hooks/useAsk';
import { useBriefing } from '@/hooks/useBriefing';
import type { AgentAction } from '@/lib/agentSignals';
import { colors, radius, spacing } from '@/theme/tokens';

const ACTION_ICON: Record<AgentAction['type'], IconName> = { assign: 'people', move_stop: 'calendar', add_packing: 'luggage' };
const ACTION_BUTTON: Record<AgentAction['type'], string> = { assign: '담당 지정하기', move_stop: '일정 옮기기', add_packing: '짐에 추가' };

export function HomeAgent() {
  const b = useBriefing();
  const a = useAsk();
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const send = (text: string) => {
    if (!text.trim() || a.busy) return;
    a.ask(text);
    setQ('');
  };
  const br = b.briefing;
  const more = br ? br.tasks.length + br.suggestions.length + br.roleTips.length : 0;

  return (
    <Card gap="md">
      <Row gap="sm">
        <Grow>
          <Text variant="small" color="textMuted" bold>
            {b.ai ? 'AI 에이전트' : '오늘의 브리핑'}
          </Text>
        </Grow>
        <Button title={b.loading ? '정리 중' : '새로고침'} size="sm" variant="ghost" loading={b.loading} onPress={b.refresh} />
      </Row>
      {br ? <Text variant="label">{br.headline}</Text> : null}

      {br?.actions.map((act) => (
        <View key={act.title} style={styles.box}>
          <Row gap="sm" align="flex-start">
            <Icon name={ACTION_ICON[act.type]} color="brand" />
            <Grow>
              <Text variant="body" bold>
                {act.title}
              </Text>
              <Text variant="caption" color="textMuted">
                {act.reason}
              </Text>
            </Grow>
          </Row>
          <Row gap="sm">
            <Button
              title={ACTION_BUTTON[act.type]}
              size="sm"
              loading={busy === act.title}
              onPress={async () => {
                setBusy(act.title);
                try {
                  await b.act(act);
                } finally {
                  setBusy(null);
                }
              }}
            />
            <Button title="괜찮아요" size="sm" variant="ghost" onPress={() => b.dismiss(act.title)} />
          </Row>
        </View>
      ))}

      {more > 0 ? (
        <Pressable accessibilityRole="button" accessibilityLabel={open ? '브리핑 접기' : '브리핑 더 보기'} onPress={() => setOpen((x) => !x)} style={styles.more}>
          <Text variant="small" color="brand" bold>
            {open ? '브리핑 접기' : '브리핑 더 보기'}
          </Text>
          <Icon name={open ? 'chevronUp' : 'chevronDown'} size={14} color="brand" />
        </Pressable>
      ) : null}

      {open && br ? (
        <Stack gap="sm">
          {br.tasks.map((t, i) => (
            <Pressable key={`${t.title}-${i}`} style={styles.box} disabled={!t.itemId} onPress={() => router.push(`/item/${t.itemId}`)}>
              <Text variant="body" bold>
                {i + 1}. {t.title}
              </Text>
              <Text variant="caption" color="textMuted">
                {t.reason}
              </Text>
            </Pressable>
          ))}
          {br.suggestions.map((s) => (
            <View key={s.title} style={styles.box}>
              <Row gap="xs" wrap>
                <Text variant="body" bold>
                  {s.title}
                </Text>
                <Badge label={s.scope === 'shared' ? '함께' : '개인'} tone="info" />
                <Badge label={`D-${s.dueOffset}`} />
              </Row>
              <Text variant="caption" color="textMuted">
                {s.reason}
              </Text>
              <Row gap="sm">
                <Button title="체크리스트에 추가" size="sm" variant="soft" icon="add" onPress={() => b.accept(s)} />
                <Button title="괜찮아요" size="sm" variant="ghost" onPress={() => b.dismiss(s.title)} />
              </Row>
            </View>
          ))}
          {br.roleTips.map((t) => (
            <Text key={t} variant="small" color="textMuted">
              · {t}
            </Text>
          ))}
        </Stack>
      ) : null}

      {b.note ? (
        <Text variant="caption" color="textSubtle">
          {b.note}
        </Text>
      ) : null}

      <Divider />

      {a.messages.map((m) => (
        <Stack key={m.id} gap="xs">
          <Text variant="small" bold>
            Q. {m.question}
          </Text>
          <View style={styles.box}>
            {m.answer ? (
              <>
                <Text variant="body">{m.answer.answer}</Text>
                {m.answer.sources.filter((s) => /^https?:\/\//.test(s.url)).map((s) => (
                  <Text key={s.url} variant="caption" color="brand" onPress={() => Linking.openURL(s.url)}>
                    출처: {s.name}
                  </Text>
                ))}
                {m.answer.suggestTitle ? (
                  <Button
                    title={m.added ? '체크리스트에 추가했어요' : `"${m.answer.suggestTitle}" 체크리스트에 추가`}
                    size="sm"
                    variant="soft"
                    icon={m.added ? 'check' : 'add'}
                    disabled={m.added}
                    onPress={() => a.addSuggestion(m)}
                  />
                ) : null}
              </>
            ) : m.error ? (
              <Text variant="small" color="danger">
                {m.error}
              </Text>
            ) : (
              <Row gap="sm">
                <ActivityIndicator color={colors.brand} />
                <Text variant="small" color="textMuted">
                  답을 찾고 있어요…
                </Text>
              </Row>
            )}
          </View>
        </Stack>
      ))}

      {a.messages.length === 0 ? (
        <Row gap="sm" wrap>
          {SAMPLE_QUESTIONS.slice(0, 3).map((s) => (
            <Chip key={s} label={s} onPress={() => send(s)} />
          ))}
        </Row>
      ) : null}

      <Row gap="sm" align="flex-start">
        <Grow>
          <Input value={q} onChangeText={setQ} placeholder="여행 준비 중 궁금한 점" maxLength={200} onSubmitEditing={() => send(q)} returnKeyType="send" />
        </Grow>
        <Button title="묻기" onPress={() => send(q)} disabled={!q.trim() || a.busy} />
      </Row>
      <Text variant="caption" color="textSubtle">
        {`AI 답변은 참고용이에요. 입국 요건 같은 중요한 정보는 출처를 꼭 확인하세요.${a.remaining !== null ? ` (오늘 남은 질문 ${a.remaining}개)` : ''}`}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  box: { gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  more: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, alignSelf: 'flex-start' },
});
