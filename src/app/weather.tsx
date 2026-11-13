// 여행지 날씨 (Open-Meteo, 최대 16일 예보). 여행 날짜는 강조
import { ActivityIndicator } from 'react-native';

import { ForecastRows } from '@/components/Forecast';
import { Card, Grow, Icon, Notice, Row, Screen, SectionHeader, Stack, Text } from '@/components/ui';
import { useWeather } from '@/hooks/useTravelInfo';
import { weatherLabel } from '@/services/travelInfo';
import { colors } from '@/theme/tokens';

export default function WeatherScreen() {
  const w = useWeather();
  if (!w.trip) {
    return (
      <Screen>
        <Text variant="small" color="textMuted">
          여행 방에서 열어 주세요.
        </Text>
      </Screen>
    );
  }
  const { departDate, returnDate } = w.trip;
  const days = w.data?.days ?? [];
  const inTrip = (d: string) => d >= departDate && d <= returnDate;
  const tripCovered = days.some((d) => inTrip(d.date));
  const now = weatherLabel(w.data?.currentCode ?? null);

  return (
    <Screen>
      <Card tone="brand">
        <Text variant="small" color="textMuted" bold>
          {w.country?.flag} {w.placeName} 지금 날씨
        </Text>
        {w.loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : w.error ? (
          <Text color="danger">{w.error}</Text>
        ) : (
          <Row gap="md">
            <Icon name={now.icon} size={44} color="brand" />
            <Grow>
              <Text variant="title">{w.data?.currentTemp !== null && w.data?.currentTemp !== undefined ? `${Math.round(w.data.currentTemp)}°` : '-'}</Text>
              <Text variant="small" color="textMuted">
                {now.text}
              </Text>
            </Grow>
          </Row>
        )}
      </Card>

      {!w.loading && !w.error && !tripCovered ? (
        <Notice icon="info">여행 날짜 예보는 출발 16일 전부터 볼 수 있어요. 지금은 앞으로 16일 날씨를 보여 드려요.</Notice>
      ) : null}

      <Stack gap="sm">
        <SectionHeader title="날짜별 예보" />
        <ForecastRows days={days} inTrip={inTrip} />
      </Stack>
      <Text variant="caption" color="textSubtle" center>
        날씨 정보: Open-Meteo
      </Text>
    </Screen>
  );
}
