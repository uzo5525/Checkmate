// 홈: 준비율을 크게 보여주고 다음 할 일 하나만 강조 + AI 에이전트. 여백·글자 크기는 시안 값
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { HomeAgent } from '@/components/HomeAgent';
import { TripDayHome } from '@/components/TripDayHome';
import { BrandMark, DisasterBanner, MiniBanner, ScopeSwitch, TravelInfoTiles, TripHead } from '@/components/Prep';
import { Avatar, Badge, Button, Card, Icon, ProgressBar, Row, Screen, Text, type IconName, Loading } from '@/components/ui';
import { useUrgentItem } from '@/hooks/useFinalCheck';
import { useReadyView, useShareInvite } from '@/hooks/useTripViews';
import { useIsClockOverridden, useToday } from '@/lib/clock';
import { tripPhase } from '@/lib/finalCheck';
import { useTripStore } from '@/store/trip';
import { colors, fontWeight, layout, radius, spacing } from '@/theme/tokens';
import type { Scope } from '@/types';

/** 홈에 최종 점검을 띄우는 시점 (출발 며칠 전부터). 그 전에는 준비 목록에서 열 수 있음 */
const FINAL_CHECK_DAYS = 7;

function TopIcon({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={layout.hitSlop} onPress={onPress} style={styles.topIcon}>
      <Icon name={icon} />
    </Pressable>
  );
}

export default function TripHome() {
  const [picked, setPicked] = useState<Scope>('personal');
  const r = useReadyView(picked);
  const share = useShareInvite();
  const simulated = useIsClockOverridden();
  const today = useToday();
  const offline = useTripStore((s) => s.offline);
  const [showPrep, setShowPrep] = useState(false);
  const urgent = useUrgentItem(picked);
  if (!r) return <Screen edges={['top']}><Loading /></Screen>;
  const { trip } = r;
  const during = tripPhase(today, trip.departDate, trip.returnDate) === 'during';
  if (during && !showPrep) return <TripDayHome trip={trip} onShowPrep={() => setShowPrep(true)} />;
  const team = picked === 'shared';
  const finished = r.total > 0 && r.pct === 100;

  return (
    <Screen edges={['top']} gap={false}>
      <Row justify="space-between">
        <BrandMark onPress={() => router.dismissTo('/')} />
        <Row gap="sm">
          <Button title="내 여행" variant="ghost" size="sm" onPress={() => router.push('/trips')} />
          <TopIcon icon="bell" label="알림" onPress={() => router.push('/notifications')} />
          <TopIcon icon="person" label="MY" onPress={() => router.push('/my')} />
        </Row>
      </Row>

      <View style={styles.tripHead}>
        <TripHead trip={trip} dday={r.dday} />
      </View>
      {simulated ? (
        <View style={styles.block}>
          <Badge tone="warning" icon="time" label="D-day 시뮬레이션 중 (MY에서 해제)" />
        </View>
      ) : null}
      {offline ? (
        <View style={styles.block}>
          <Badge tone="warning" label="오프라인 · 체크 변경은 저장되지 않아요" />
        </View>
      ) : null}
      {during ? (
        <View style={styles.block}>
          <Button title="여행 중 화면으로" variant="secondary" size="sm" onPress={() => setShowPrep(false)} />
        </View>
      ) : null}

      {trip.packageInfo ? (
        <View style={styles.block}>
          <Card>
            <Row gap="sm">
              <Badge label={`${trip.packageInfo.provider} 패키지`} tone="info" icon="lock" />
              <Text variant="caption" color="textMuted">
                방 코드 {trip.code}
              </Text>
            </Row>
            <Text variant="label">{trip.packageInfo.productName}</Text>
            <Text variant="caption" color="textMuted">
              항공·숙소·일정·보험은 여행사가 준비했어요{trip.packageInfo.guide ? ` · ${trip.packageInfo.guide}` : ''}
            </Text>
          </Card>
        </View>
      ) : null}

      {r.hasShared ? (
        <View style={styles.block}>
          <ScopeSwitch value={picked} onChange={setPicked} />
        </View>
      ) : null}

      {team ? (
        <Row gap="xs" >
          <View style={styles.members}>
            {r.members.slice(0, 4).map((m) => (
              <Avatar key={m.id} name={m.nickname} size={27} />
            ))}
          </View>
          <Text variant="caption" color="textMuted" style={styles.flex}>
            {r.members.length}명이 함께 준비 중
          </Text>
          <Button title="초대" iconRight="add" variant="ghost" size="sm" onPress={share} />
        </Row>
      ) : null}

      <View style={[styles.hero, team && styles.heroTeam]} accessibilityLabel={`${team ? '함께' : '내'} 준비율 ${r.pct}%`}>
        <Row justify="space-between">
          <Text style={styles.percent}>
            {r.pct}
            <Text color="textMuted" style={styles.percentUnit}>
              {' %'}
            </Text>
          </Text>
          <Text variant="caption" color="textMuted">
            {finished ? '출발 준비를 마쳤어요' : `${r.total}개 중 ${r.doneCount}개 완료`}
          </Text>
        </Row>
        <View style={styles.meter}>
          <ProgressBar value={r.pct / 100} height={8} onTint />
        </View>
      </View>

      {urgent ? <MiniBanner icon="alert" title={urgent.title} sub={urgent.reason} onPress={() => router.push(`/item/${urgent.id}`)} /> : null}
      {r.daysLeft <= FINAL_CHECK_DAYS ? (
        <View style={urgent ? styles.agent : null}>
          <MiniBanner icon="check" title="출발 전 최종 점검" sub="체크와 서류 검사 결과를 모아서 판정해요" onPress={() => router.push('/final-check')} />
        </View>
      ) : null}

      <View style={styles.info}>
        <TravelInfoTiles />
      </View>
      <View style={styles.agent}>
        <DisasterBanner />
      </View>

      <View style={styles.agent}>
        <HomeAgent />
      </View>

      {team ? (
        <View style={styles.summary}>
          <Text variant="caption" color="textMuted" style={styles.flex}>
            동행 {r.members.length}명
          </Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/members')}>
            <Text variant="caption" color="textMuted">
              동행 보기
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topIcon: { width: 32, height: 36, alignItems: 'center', justifyContent: 'center' },
  tripHead: { marginTop: spacing.xl },
  block: { marginTop: 20 },
  members: { flexDirection: 'row', gap: 7, marginTop: 18 },
  hero: { marginTop: 20, marginBottom: spacing.md, paddingHorizontal: 20, paddingVertical: 20, borderRadius: radius.lg, backgroundColor: colors.brandSoft },
  heroTeam: { marginTop: spacing.md },
  percent: { fontSize: 56, lineHeight: 62, letterSpacing: -3, fontWeight: fontWeight.heavy, color: colors.brand },
  percentUnit: { fontSize: 24, letterSpacing: -0.5, fontWeight: fontWeight.heavy },
  meter: { marginTop: spacing.sm },
  info: { marginTop: spacing.xl },
  agent: { marginTop: spacing.md },
  summary: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: colors.border },
});
