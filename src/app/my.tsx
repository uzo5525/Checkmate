import { router } from 'expo-router';

import { SettingsPanel } from '@/components/SettingsPanel';
import { Avatar, Button, Card, Grow, Icon, IconBox, ListItem, Notice, PageHeader, Row, Screen, Stack, Text } from '@/components/ui';
import { useMembers, useMe, useTripAdmin } from '@/hooks/useTrip';
import { shortDate } from '@/hooks/useTripViews';
import { confirm } from '@/lib/confirm';
import { useTripStore } from '@/store/trip';

export default function MyTab() {
  const trip = useTripStore((s) => s.trip);
  const { me } = useMe();
  const m = useMembers();
  const admin = useTripAdmin();

  return (
    <Screen>
      <PageHeader title="MY" />
      <Card tone="brand">
        <Row gap="md">
          <Avatar name={me?.nickname} size={48} />
          <Grow>
            <Text variant="label">{me?.nickname ?? '—'}</Text>
            <Text variant="small" color="textMuted">
              {trip ? `${trip.title} · ${shortDate(trip.departDate)} - ${shortDate(trip.returnDate)}` : ''}
              {me?.isOwner ? ' · 방장' : ''}
            </Text>
          </Grow>
        </Row>
      </Card>

      <Stack gap="sm">
        {me?.isOwner ? (
          <ListItem
            boxed
            title="여행 정보 수정"
            subtitle="이름 · 날짜 · 인원 · 여행 삭제"
            left={<IconBox icon="calendar" />}
            right={<Icon name="forward" size={16} color="textSubtle" />}
            onPress={() => router.push('/trip-edit')}
          />
        ) : null}
        <ListItem
          boxed
          title="동행"
          subtitle="방 코드 · 진행률 · 권한"
          left={<IconBox icon="people" />}
          right={<Icon name="forward" size={16} color="textSubtle" />}
          onPress={() => router.push('/members')}
        />
        <ListItem
          boxed
          title="다른 여행 보기"
          subtitle="새 여행 만들기 · 방 코드로 참여"
          left={<IconBox icon="plane" />}
          right={<Icon name="forward" size={16} color="textSubtle" />}
          onPress={() => router.dismissTo('/')}
        />
      </Stack>

      <Notice icon="lock">여권·보험 정보는 체크리스트의 해당 항목에서 확인하고, 이 휴대폰에만 저장돼요.</Notice>

      <SettingsPanel />

      {me && !me.isOwner ? (
        <Button
          title="이 여행에서 나가기"
          variant="danger"
          onPress={async () => {
            if (await confirm('여행 나가기', '내 체크 기록이 삭제되고, 다시 들어오려면 방 코드가 필요해요.', '나가기')) {
              await m.leave();
              router.dismissAll();
              router.replace('/');
            }
          }}
        />
      ) : null}
      {me?.isOwner ? (
        <Stack gap="sm">
          <Button
            title="이 여행 삭제"
            icon="trash"
            variant="danger"
            onPress={async () => {
              if (await confirm('여행 삭제', `"${trip?.title}"을(를) 삭제할까요? 모든 멤버의 체크리스트가 함께 삭제되고 되돌릴 수 없어요.`, '삭제')) {
                await admin.remove();
                router.dismissAll();
                router.replace('/');
              }
            }}
          />
          <Text variant="caption" color="textSubtle" center>
            방장은 동행 화면에서 다른 멤버에게 방장을 넘긴 뒤 나갈 수 있어요.
          </Text>
        </Stack>
      ) : null}
    </Screen>
  );
}
