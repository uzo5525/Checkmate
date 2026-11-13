// 날짜별 예보 줄 (날씨 화면과 날씨 확인 항목에서 함께 사용)
import { Badge, Icon, ListItem, Row, Text } from '@/components/ui';
import { formatKDate } from '@/lib/dates';
import { weatherLabel, type WeatherData } from '@/services/travelInfo';

export function ForecastRows({ days, inTrip }: { days: WeatherData['days']; inTrip: (date: string) => boolean }) {
  return (
    <>
      {days.map((d) => {
        const l = weatherLabel(d.code);
        return (
          <ListItem
            key={d.date}
            boxed
            left={<Icon name={l.icon} color="textMuted" />}
            title={formatKDate(d.date)}
            subtitle={`${l.text}${d.rain !== null ? ` · 비 올 확률 ${d.rain}%` : ''}`}
            right={
              <Row gap="xs">
                {inTrip(d.date) ? <Badge label="여행" tone="strong" /> : null}
                <Text variant="label">
                  {d.max}° <Text color="textMuted">/ {d.min}°</Text>
                </Text>
              </Row>
            }
          />
        );
      })}
    </>
  );
}
