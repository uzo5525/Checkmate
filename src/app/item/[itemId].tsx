import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking } from 'react-native';

import { ItemCheckCard } from '@/components/ItemCheckCard';
import { ItemQuiz } from '@/components/ItemQuiz';
import { hasDirectLink, ItemTools } from '@/components/ItemTools';
import { Badge, Button, Card, Chip, ChipGroup, Divider, Input, Loading, Notice, Row, Screen, Stack, Text } from '@/components/ui';
import { categoryLabel } from '@/data/categories';
import { useItemDetail } from '@/hooks/useTrip';
import { BUCKETS, bucketOf } from '@/lib/checklist';
import { confirm } from '@/lib/confirm';
import { useTripStore } from '@/store/trip';

export default function ItemDetailScreen() {
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const d = useItemDetail(itemId);
  const countryCode = useTripStore((s) => s.trip?.countryCode);
  const tripLoading = useTripStore((s) => s.loading);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [due, setDue] = useState('7');

  // 체크해 둔 서류가 다시 확인해 보니 요건 미달이면 체크를 풂
  const failedWhileDone = !!d?.done && d.docGate === 'failed' && d.canToggle;
  const untick = d?.toggle;
  useEffect(() => {
    if (failedWhileDone) untick?.();
  }, [failedWhileDone, untick]);

  if (!d) {
    if (tripLoading) return <Screen><Loading /></Screen>;
    return (
      <Screen>
        <Text color="textMuted">항목을 찾을 수 없어요.</Text>
        <Button title="처음 화면으로" variant="secondary" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const { item } = d;
  const direct = hasDirectLink(item, countryCode);

  return (
    <Screen
      footer={
        <Stack gap="xs">
          {d.blockedReason && !d.done ? (
            <Text variant="caption" color="danger" center>
              {d.blockedReason} — 해결 후 완료할 수 있어요
            </Text>
          ) : null}
          {d.canWaive ? (
            <Text variant="caption" color="textMuted" center>
              위에서 확인을 마치면 완료할 수 있어요
            </Text>
          ) : null}
          <Button
            title={d.done ? '완료 취소' : '완료로 표시'}
            variant={d.done ? 'secondary' : 'primary'}
            icon="check"
            full
            disabled={!d.canToggle}
            onPress={d.toggle}
          />
          {d.canWaive ? (
            <Button
              title={d.docKind === 'passport' ? '카메라를 쓸 수 없어 일단 체크' : '증권을 지금 볼 수 없어 일단 체크'}
              variant="ghost"
              full
              onPress={async () => {
                if (await confirm('확인 없이 체크할까요?', '이 항목은 미확인으로 표시돼요. 출발 전에 다시 확인해 주세요.', '일단 체크', false)) await d.waive();
              }}
            />
          ) : null}
        </Stack>
      }>
      <Stack gap="sm">
        <Row gap="xs" wrap>
          <Badge label={`D-${item.dueOffset}까지`} tone={d.overdue ? 'warning' : 'neutral'} />
          <Badge label={categoryLabel(item.category)} />
          <Badge label={item.scope === 'shared' ? '함께 준비' : item.ownerMemberId ? '나만 보는 항목' : '개인'} tone="info" />
          {item.required ? <Badge label="필수" tone="brand" /> : null}
          {item.createdByAi ? <Badge label="AI 제안" tone="strong" /> : null}
          {item.providedBy ? <Badge label={`${item.providedBy} 준비 완료`} tone="info" icon="lock" /> : null}
          {d.done && d.docGate === 'waived' ? <Badge label="미확인" tone="warning" /> : null}
          {d.done && d.docGate !== 'waived' ? <Badge label={d.doneBy ? `완료 · ${d.doneBy}` : '완료'} tone="success" icon="check" /> : null}
        </Row>
        <Text variant="title">{item.title}</Text>
        {item.description ? <Text>{item.description}</Text> : null}
        {item.providedBy ? <Notice icon="lock">{`${item.providedBy}가 이미 처리한 항목이라 바꿀 수 없어요.`}</Notice> : null}
      </Stack>

      <ItemQuiz item={item} />

      <ItemTools item={item} />

      <ItemCheckCard item={item} onCleared={() => d.done && d.toggle()} />

      {item.templateId || item.sourceUrl ? (
        <Card>
          <Text variant="small" color="textMuted" bold>
            출처
          </Text>
          <Text variant="small">{item.sourceName ?? '출처 없음'}</Text>
          {item.sourceUrl && !direct ? <Button title="공식 안내 열기" icon="link" size="sm" variant="secondary" onPress={() => Linking.openURL(item.sourceUrl!)} /> : null}
          <Divider />
          {item.verified ? (
            <Badge label="공식 출처 확인됨" tone="success" icon="check" />
          ) : (
            <Text variant="caption" color="warning">
              아직 공식 출처로 검증하지 못한 초안이에요. 출발 전 공식 안내를 확인하세요.
            </Text>
          )}
        </Card>
      ) : null}

      {item.scope === 'shared' ? (
        <Card>
          <Text variant="small" color="textMuted" bold>
            담당자
          </Text>
          {d.canAssign ? (
            <Row gap="sm" wrap>
              <Chip label="없음" selected={!item.assigneeId} onPress={() => d.assign(null)} />
              {d.members.map((m) => (
                <Chip key={m.id} label={m.nickname} selected={item.assigneeId === m.id} onPress={() => d.assign(m.id)} />
              ))}
            </Row>
          ) : (
            <Text>{d.assignee?.nickname ?? '아직 정하지 않았어요'}</Text>
          )}
          {!d.canToggle && !d.blockedReason ? (
            <Text variant="caption" color="textSubtle">
              담당자 또는 방장이 허용한 멤버만 완료 여부를 바꿀 수 있어요.
            </Text>
          ) : null}
        </Card>
      ) : null}

      {d.canEdit ? (
        editing ? (
          <Card>
            <Input label="항목 이름" value={title} onChangeText={setTitle} maxLength={40} />
            <Input label="설명" value={desc} onChangeText={setDesc} multiline />
            <ChipGroup options={BUCKETS.map((b) => ({ value: String(b), label: `D-${b}` }))} value={due} onChange={setDue} />
            <Row gap="sm">
              <Button
                title="저장"
                size="sm"
                disabled={!title.trim()}
                onPress={async () => {
                  await d.edit({ title: title.trim(), description: desc.trim(), dueOffset: Number(due) });
                  setEditing(false);
                }}
              />
              <Button title="취소" size="sm" variant="ghost" onPress={() => setEditing(false)} />
            </Row>
          </Card>
        ) : (
          <Row gap="sm">
            <Button
              title="수정"
              size="sm"
              variant="soft"
              onPress={() => {
                setTitle(item.title);
                setDesc(item.description);
                setDue(String(bucketOf(item.dueOffset)));
                setEditing(true);
              }}
            />
            <Button
              title="삭제"
              size="sm"
              icon="trash"
              variant="danger"
              onPress={async () => {
                if (await confirm('항목 삭제', `"${item.title}" 항목을 삭제할까요?`, '삭제')) {
                  await d.remove();
                  router.back();
                }
              }}
            />
          </Row>
        )
      ) : null}
    </Screen>
  );
}
