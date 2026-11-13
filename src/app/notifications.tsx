// 알림: 지금까지 온 D-day 알림 + 알림 켜기/끄기 + 예정된 알림
import { Switch } from 'react-native';

import { Card, Grow, Icon, ListItem, Notice, Row, Screen, SectionHeader, Stack, Text } from '@/components/ui';
import { useNotificationsView } from '@/hooks/useTripViews';
import { formatKDate } from '@/lib/dates';
import { colors } from '@/theme/tokens';

export default function NotificationsScreen() {
  const v = useNotificationsView();
  if (!v.trip) {
    return (
      <Screen>
        <Text variant="small" color="textMuted">
          여행 방에서 열어 주세요.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card>
        <Row gap="md">
          <Icon name="bell" color="brand" />
          <Grow>
            <Text variant="label">D-day 알림</Text>
            <Text variant="small" color="textMuted">
              D-30·14·7·3·1·출발 당일 오전 9시에 할 일을 알려 드려요
            </Text>
          </Grow>
          <Switch
            value={v.enabled}
            onValueChange={v.setEnabled}
            trackColor={{ true: colors.brand, false: colors.border }}
            thumbColor={colors.surface}
            accessibilityLabel="D-day 알림 켜기"
          />
        </Row>
      </Card>

      {v.package?.meeting ? (
        <Card tone="brand">
          <Row gap="sm">
            <Icon name="plane" color="brand" />
            <Text variant="label">{v.package.provider} 공항 미팅</Text>
          </Row>
          <Text variant="small" color="textMuted">
            {v.package.meeting}
          </Text>
        </Card>
      ) : null}

      <Stack gap="sm">
        <SectionHeader title="받은 알림" />
        {v.received.length === 0 ? (
          <Card tone="brand">
            <Text variant="small" color="textMuted">
              아직 받은 알림이 없어요. 출발 30일 전부터 알림이 와요.
            </Text>
          </Card>
        ) : (
          v.received.map((r) => (
            <ListItem key={r.point} boxed title={r.title} subtitle={`${r.body} · ${formatKDate(r.date)} 오전 9시`} left={<Icon name="bell" color="brand" />} />
          ))
        )}
      </Stack>

      {v.enabled && v.upcoming.length > 0 ? (
        <Stack gap="sm">
          <SectionHeader title="예정된 알림" />
          {v.upcoming.map((r) => (
            <ListItem key={r.point} boxed title={r.title} subtitle={`${formatKDate(r.date)} 오전 9시`} left={<Icon name="time" color="textSubtle" />} />
          ))}
        </Stack>
      ) : null}
      {!v.enabled ? <Notice icon="info">알림이 꺼져 있어요. 켜면 남은 D-day 알림을 다시 예약해요.</Notice> : null}
      <Notice icon="info">폰 알림은 앱에서 받아요. 웹에서는 이 화면으로 확인하세요.</Notice>
    </Screen>
  );
}
