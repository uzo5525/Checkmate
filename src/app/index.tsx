import { router } from 'expo-router';
import { useState } from 'react';

import { Pressable, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/Prep';
import { Badge, Button, Card, Grow, Icon, Row, Screen, Spacer, Stack, Text, type IconName } from '@/components/ui';
import type { TripKind } from '@/types';
import { APP_CONFIG } from '@/config/app';
import { getCountry } from '@/data/countries';
import { useMyTrips } from '@/hooks/useHome';
import { DEMO_PACKAGE_ROOM } from '@/services/sample';
import { useIsClockOverridden, useToday } from '@/lib/clock';
import { ddayLabel, diffDays, formatKDate } from '@/lib/dates';
import { colors, radius, spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const { trips, loading, error, offline, mode, createSample, creatingSample } = useMyTrips();
  const simulated = useIsClockOverridden();
  const today = useToday();
  const [kind, setKind] = useState<TripKind>('free');

  return (
    <Screen edges={['top', 'bottom']}>
      <Spacer size="lg" />
      <Row justify="space-between">
        <Stack gap="xxs">
          <BrandMark />
          <Text variant="small" color="textMuted">
            해외여행 출발 전 할 일 체크리스트
          </Text>
        </Stack>
        <Button title="설정" icon="settings" variant="ghost" size="sm" onPress={() => router.push('/settings')} />
      </Row>

      <Row gap="xs" wrap>
        {mode === 'supabase' ? null : <Badge label="로컬 모드 · 이 기기에만 저장" tone="neutral" />}
        {offline ? <Badge label="오프라인 · 마지막으로 저장한 내용" tone="warning" /> : null}
        {simulated ? <Badge tone="warning" icon="time" label={`시뮬레이션 · 오늘 = ${today}`} /> : null}
      </Row>

      {APP_CONFIG.demoTools ? (
        <Row gap="md" align="stretch">
          <ModeCard icon="map" label="자유 여행" selected={kind === 'free'} onPress={() => setKind('free')} />
          <ModeCard icon="luggage" label="패키지 여행" selected={kind === 'package'} onPress={() => setKind('package')} />
        </Row>
      ) : null}

      {kind === 'free' ? (
        <Stack gap="sm">
          <Text variant="small" color="textMuted">
            직접 여행 방을 만들고, 동행자와 할 일을 나눠 함께 준비해요.
          </Text>
          <Button title="새 여행 만들기" icon="add" onPress={() => router.push('/create')} full />
          <Button title="방 코드로 참여" icon="enter" variant="secondary" onPress={() => router.push('/join')} full />
          <Button
            title="샘플 여행으로 둘러보기"
            variant="ghost"
            loading={creatingSample}
            onPress={async () => {
              const id = await createSample();
              if (id) router.push(`/trip/${id}`);
            }}
          />
        </Stack>
      ) : (
        <Stack gap="sm">
          <Text variant="small" color="textMuted">
            여행사에서 예약할 때 받은 방 코드로 들어가요. 항공·숙소·일정은 이미 준비돼 있고, 내가 할 일만 챙기면 돼요. 같은 코드로 가족도 함께 들어올 수 있어요.
          </Text>
          <Button title="방 코드로 패키지 여행 참여" icon="enter" onPress={() => router.push('/join')} full />
          {APP_CONFIG.demoTools ? (
            <Text variant="caption" color="textSubtle" center>
              {`시연용 방 코드: ${DEMO_PACKAGE_ROOM}`}
            </Text>
          ) : null}
        </Stack>
      )}

      {error ? (
        <Card tone="danger">
          <Text variant="small" color="danger">
            {error}
          </Text>
        </Card>
      ) : null}

      <Text variant="heading">내 여행</Text>
      {!loading && trips.length === 0 ? (
        <Card>
          <Text variant="small" color="textMuted">
            아직 여행이 없어요. 새 여행을 만들거나 받은 방 코드로 참여하세요.
          </Text>
        </Card>
      ) : null}
      {trips.map(({ trip, daysLeft }) => {
        const c = getCountry(trip.countryCode)?.country;
        return (
          <Card key={trip.id} onPress={() => router.push(`/trip/${trip.id}`)}>
            <Row gap="md">
              <Text variant="title">{c?.flag}</Text>
              <Grow>
                <Row gap="xs" wrap>
                  <Text variant="label" bold>
                    {trip.title}
                  </Text>
                  {trip.packageInfo ? <Badge label={`${trip.packageInfo.provider} 패키지`} tone="info" /> : null}
                </Row>
                <Text variant="small" color="textMuted">
                  {formatKDate(trip.departDate)} 출발 · {trip.partySize}명 · 코드 {trip.code}
                </Text>
              </Grow>
              <Text variant="heading" color="brand">
                {ddayLabel(daysLeft, diffDays(trip.departDate, trip.returnDate))}
              </Text>
              <Icon name="forward" color="textSubtle" />
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}

/** 시작 화면의 큰 선택 카드 (자유 / 패키지) */
function ModeCard({ icon, label, selected, onPress }: { icon: IconName; label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.mode, selected && styles.modeOn, pressed && styles.modePressed]}>
      {selected ? (
        <View style={styles.check}>
          <Icon name="check" size={18} color="brand" />
        </View>
      ) : null}
      <Icon name={icon} size={72} color={selected ? 'onBrand' : 'brand'} />
      <Text variant="heading" style={{ color: selected ? colors.onBrand : colors.brand }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  mode: {
    flex: 1,
    aspectRatio: 0.9,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  modeOn: { backgroundColor: colors.brand },
  modePressed: { transform: [{ scale: 0.97 }] },
  check: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
