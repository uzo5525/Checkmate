// 여행지 재난 정보: 최근 큰 재난 + 경보 받을 준비
import { ActivityIndicator, Linking } from 'react-native';

import { SafetyGuideBlock } from '@/components/Safety';
import { AlertBox, Notice, Screen, SectionHeader, Stack, Text } from '@/components/ui';
import { useDisasters } from '@/hooks/useTravelInfo';
import { RECENT_DAYS } from '@/lib/disaster';
import { useTripStore } from '@/store/trip';
import { colors } from '@/theme/tokens';

export default function SafetyScreen() {
  const trip = useTripStore((s) => s.trip);
  const d = useDisasters();
  if (!trip) {
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
      <Notice>이 화면은 실시간 경보가 아니에요. 지진 경보는 몇 초를 다투니 아래 공식 앱이나 재난 문자로 받으세요.</Notice>

      <Stack gap="sm">
        <SectionHeader title={`최근 ${RECENT_DAYS}일 큰 재난`} />
        {d.loading ? <ActivityIndicator color={colors.brand} /> : null}
        {d.events.map((e) => (
          <AlertBox
            key={e.id}
            tone={e.severe ? 'danger' : 'warning'}
            title={e.title}
            actionLabel={e.url ? '자세히 보기' : undefined}
            onAction={e.url ? () => Linking.openURL(e.url!) : undefined}>
            <Text variant="small" color="textMuted">
              {e.detail}
            </Text>
            <Text variant="caption" color="textMuted">
              {new Date(e.at).toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
            </Text>
          </AlertBox>
        ))}
        {!d.loading && d.events.length === 0 ? (
          <Text variant="small" color="textMuted">
            불러온 자료에 큰 재난은 없어요. 작은 지진이나 지역 특보는 포함되지 않아요.
          </Text>
        ) : null}
        {!d.loading && d.failed.length > 0 ? (
          <Text variant="small" color="danger">
            {d.failed.join('·')} 자료를 지금 불러오지 못했어요. 재난이 없다는 뜻이 아니니 공식 안내를 확인하세요.
          </Text>
        ) : null}
      </Stack>

      <SafetyGuideBlock countryCode={trip.countryCode} />

      <Text variant="caption" color="textSubtle" center>
        {trip.countryCode === 'JP' ? '자료: 일본 기상청(P2P지진정보 경유), GDACS' : '자료: USGS, GDACS'}
      </Text>
    </Screen>
  );
}
