// 준비 목록: 둥근 2열 카드 (내 준비 / 함께 준비). D-day 순서로도 볼 수 있음
import { router } from 'expo-router';
import { useState } from 'react';

import { DdayTimeline } from '@/components/DdayTimeline';
import { PrepGrid, PrepTile, PREP_INFO, ScopeSwitch } from '@/components/Prep';
import { Avatar, Badge, Button, Card, Checkbox, Icon, ListItem, PageHeader, Row, Screen, SectionHeader, Stack, Text, Loading } from '@/components/ui';
import { itemDocGate } from '@/hooks/useItemCheck';
import { useChecklist } from '@/hooks/useTrip';
import { usePrepareView, useReadyView, useShareInvite } from '@/hooks/useTripViews';
import { useDocsStore } from '@/store/docs';
import type { ChecklistItem, Scope } from '@/types';

export default function PrepareTab() {
  const [scope, setScope] = useState<Scope>('personal');
  const [byDate, setByDate] = useState(false);
  const r = useReadyView(scope);
  const v = usePrepareView(scope);
  const c = useChecklist(scope);
  const share = useShareInvite();
  const docs = useDocsStore();
  if (!r || !v.trip) return <Screen edges={['top']}><Loading /></Screen>;
  const shared = scope === 'shared';
  const firstOpen = r.cards.find((x) => !x.finished)?.key;
  const openItem = (i: ChecklistItem) => router.push(`/item/${i.id}`);
  const dueText = (i: ChecklistItem) => `D-${i.dueOffset}까지 · 눌러서 관리`;

  const row = (item: ChecklistItem, overdue = false) => {
    const who = v.assignee(item);
    return (
      <ListItem
        key={item.id}
        boxed
        title={item.title}
        muted={v.done(item)}
        onPress={() => openItem(item)}
        left={<Checkbox checked={v.done(item)} onToggle={() => c.toggle(item)} disabled={!c.perms.canToggle(item)} accessibilityLabel={item.title} />}
        right={
          <>
            {shared ? (
              <Row gap="xs">
                <Avatar name={who?.nickname} />
                <Text variant="small" bold color={who ? 'text' : 'textSubtle'}>
                  {who?.nickname ?? '미정'}
                </Text>
              </Row>
            ) : item.providedBy ? (
              <Badge label={`${item.providedBy} 완료`} tone="info" size="md" />
            ) : v.done(item) && itemDocGate(item, v.trip, docs) === 'waived' ? (
              <Badge label="미확인" tone="warning" size="md" />
            ) : overdue ? (
              <Badge label="확인 필요" tone="warning" size="md" />
            ) : item.required ? (
              <Badge label="필수" tone="brand" size="md" />
            ) : null}
            <Icon name="forward" size={16} color="textSubtle" />
          </>
        }
      />
    );
  };

  return (
    <Screen edges={['top']}>
      <Row justify="space-between">
        <Text variant="heading">준비 목록</Text>
        <Text variant="caption" color="textMuted">
          {r.trip.title}
        </Text>
      </Row>
      <PageHeader title={shared ? '함께 나눠서 준비해요' : '무엇부터 준비할까요?'} />

      {r.hasShared ? <ScopeSwitch value={scope} onChange={setScope} /> : null}

      {byDate ? (
        <>
          <DdayTimeline points={v.timeline} selected={v.selected} onSelect={v.select} />
          {v.overdue.length > 0 ? (
            <Stack gap="sm">
              <SectionHeader title="놓친 할 일" right={<Badge label={`${v.overdue.length}개`} tone="warning" size="md" />} />
              {v.overdue.map((i) => row(i, true))}
            </Stack>
          ) : null}
          <Stack gap="sm">
            <SectionHeader
              title={v.isCurrent ? '이번 주 할 일' : `D-${v.selected} 할 일`}
              right={
                <Text variant="label" color="textMuted">
                  {v.listDone} / {v.list.length}
                </Text>
              }
            />
            {v.pending.length === 0 ? (
              <Card tone="brand">
                <Text variant="small" color="textMuted">
                  {v.list.length === 0 ? '이 시점에 할 일은 없어요.' : '이 시점 할 일을 모두 끝냈어요.'}
                </Text>
              </Card>
            ) : (
              v.pending.map((i) => row(i))
            )}
          </Stack>
          {v.completed.length > 0 ? (
            <Stack gap="sm">
              <SectionHeader title={`완료한 일 ${v.completed.length}개`} />
              {v.completed.map((i) => row(i))}
            </Stack>
          ) : null}
        </>
      ) : shared ? (
        <PrepGrid>
          {r.list.map((i) => (
            <PrepTile
              key={i.id}
              icon={i.category === 'packing' ? 'luggage' : r.done(i) ? 'check' : 'people'}
              title={i.title}
              desc={dueText(i)}
              state={r.done(i) ? '완료' : (r.assignee(i)?.nickname ?? '담당 미정')}
              finished={r.done(i)}
              onPress={() => openItem(i)}
            />
          ))}
        </PrepGrid>
      ) : (
        <PrepGrid>
          {r.cards.map((x) => (
            <PrepTile
              key={x.key}
              icon={x.finished ? 'check' : PREP_INFO[x.key].icon}
              title={PREP_INFO[x.key].title}
              desc={PREP_INFO[x.key].desc}
              state={x.finished ? '완료' : x.key === firstOpen ? '먼저 확인' : '미완료'}
              finished={x.finished}
              onPress={() => router.push(`/prep/${x.key}`)}
            />
          ))}
          {r.extras.map((i) => (
            <PrepTile
              key={i.id}
              icon={r.done(i) ? 'check' : 'documentOutline'}
              title={i.title}
              desc={dueText(i)}
              state={r.done(i) ? '완료' : '미완료'}
              finished={r.done(i)}
              onPress={() => openItem(i)}
            />
          ))}
        </PrepGrid>
      )}

      <Button
        title={shared ? '함께 할 일 추가' : '내 할 일 추가'}
        icon="add"
        variant="secondary"
        full
        onPress={() => router.push({ pathname: '/add-item', params: { scope: shared ? 'shared' : 'personal' } })}
      />
      <Button title={byDate ? '카드로 보기' : 'D-day 순서로 보기'} icon="calendar" variant="ghost" onPress={() => setByDate((x) => !x)} />
      {shared ? null : <Button title="출발 전 최종 점검" icon="check" variant="ghost" onPress={() => router.push('/final-check')} />}
      {shared ? <Button title="동행 초대하기" icon="share" variant="soft" full onPress={share} /> : null}
    </Screen>
  );
}
