// 홈·준비 목록·준비 카드 화면에서 함께 쓰는 블록: 로고, 여행 머리말, 내 준비/함께 준비 전환, 둥근 2열 카드
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Icon, Segmented, Text, type IconName } from '@/components/ui';
import { nightsLabel } from '@/lib/dates';
import { useDisasters, useExchange, useWeather } from '@/hooks/useTravelInfo';
import { shortDate } from '@/hooks/useTripViews';
import type { PrepKey } from '@/lib/prepCards';
import { weatherLabel } from '@/services/travelInfo';
import { colors, fontWeight, layout, radius, spacing } from '@/theme/tokens';
import type { Scope, Trip } from '@/types';

export const PREP_INFO: Record<PrepKey, { title: string; desc: string; icon: IconName; heading: string; sub: string }> = {
  entry: { title: '입국 준비', desc: '여권·비자·입국 신고', icon: 'book', heading: '나에게 필요한\n입국 서류는?', sub: '국적과 체류 기간 기준이에요.' },
  insurance: { title: '여행자보험', desc: '보장 확인부터 가입까지', icon: 'shield', heading: '보장 기간이\n여행 일정을 덮나요?', sub: '해외 의료비와 휴대품 보장도 함께 봐요.' },
  sim: { title: '인터넷', desc: 'eSIM·통신사 로밍', icon: 'phone', heading: '인터넷은\n어떻게 쓸까요?', sub: '내 휴대폰에 맞는 방법부터 확인해요.' },
  money: { title: '환전', desc: '환전 신청과 현금 수령', icon: 'money', heading: '현금은\n얼마나 바꿀까요?', sub: '오늘 환율을 보고 정해요.' },
  baggage: { title: '짐·반입 규정', desc: '반입금지 품목 확인', icon: 'luggage', heading: '이거, 가져가도\n괜찮을까요?', sub: '여행 국가 반입 규정과 항공 수하물 규정을 확인해요.' },
  flight: { title: '항공권·이동', desc: '체크인·공항 이동·숙소', icon: 'plane', heading: '공항까지\n어떻게 갈까요?', sub: '체크인과 공항 이동, 숙소 도착까지 확인해요.' },
};

export function BrandMark({ onPress }: { onPress?: () => void }) {
  const mark = (
    <Text style={styles.brand}>
      checkmate<Text color="brand" style={styles.brand}>.</Text>
    </Text>
  );
  if (!onPress) return mark;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="처음 화면으로" hitSlop={layout.hitSlop} onPress={onPress}>
      {mark}
    </Pressable>
  );
}

export function TripHead({ trip, dday }: { trip: Trip; dday: string }) {
  return (
    <View style={styles.head}>
      <View style={styles.headRow}>
        <Text variant="heading" style={styles.flex}>
          {trip.title}
        </Text>
        <Badge label={dday} tone="brand" size="md" />
      </View>
      <Text variant="small" color="textMuted" style={styles.headSub}>
        {shortDate(trip.departDate)} – {shortDate(trip.returnDate)} · {nightsLabel(trip.departDate, trip.returnDate)}
      </Text>
    </View>
  );
}

export function ScopeSwitch({ value, onChange }: { value: Scope; onChange: (v: Scope) => void }) {
  return (
    <Segmented
      options={[
        { value: 'personal', label: '내 준비' },
        { value: 'shared', label: '함께 준비' },
      ]}
      value={value}
      onChange={onChange}
    />
  );
}

export function PrepGrid({ children }: { children: ReactNode }) {
  return <View style={styles.grid}>{children}</View>;
}

export function PrepTile({
  title,
  desc,
  state,
  icon,
  finished,
  onPress,
}: {
  title: string;
  desc: string;
  state: string;
  icon: IconName;
  finished?: boolean;
  onPress: () => void;
}) {
  // 미완료는 연한 색, 완료는 진한 색으로 진행 상태가 한눈에 보이게 함
  const bg = finished ? colors.brand : colors.brandSoft;
  const fg = finished ? colors.onBrand : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${state}`}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, { backgroundColor: bg }, pressed && styles.pressed]}>
      <View style={styles.tileTop}>
        <Icon name={icon} size={25} color={fg} />
        <View style={styles.tileState}>
          <Text style={[styles.tileStateText, { color: fg }]}>{state}</Text>
        </View>
      </View>
      <Text variant="label" style={[styles.tileTitle, { color: fg }]}>
        {title}
      </Text>
      <Text variant="caption" style={[styles.tileDesc, { color: fg }]}>
        {desc}
      </Text>
    </Pressable>
  );
}

/** 아이콘 + 두 줄 글 + 화살표 띠 */
export function MiniBanner({ icon, title, sub, onPress }: { icon: IconName; title: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => [styles.banner, pressed && styles.pressed]}>
      <Icon name={icon} color="brand" />
      <View style={styles.flex}>
        <Text variant="small" bold>
          {title}
        </Text>
        <Text variant="caption" color="textMuted" style={styles.bannerSub}>
          {sub}
        </Text>
      </View>
      <Icon name="forward" size={16} color="textSubtle" />
    </Pressable>
  );
}

export function ExchangeBanner() {
  const x = useExchange();
  const sub = x.data ? `${x.unit.toLocaleString()} ${x.currency} = ${Math.round(x.data.krwPerUnit * x.unit).toLocaleString()}원` : x.loading ? '불러오는 중…' : '환율 화면에서 다시 확인해요';
  return <MiniBanner icon="money" title="오늘 환율 보기" sub={sub} onPress={() => router.push('/exchange')} />;
}

/** 여행지 재난 정보 띠. 큰 재난이 있으면 첫 줄에 바로 보여 줌 */
export function DisasterBanner() {
  const d = useDisasters();
  const top = d.events[0];
  const sub = top ? `${top.title}${d.events.length > 1 ? ` 외 ${d.events.length - 1}건` : ''}` : d.loading ? '불러오는 중…' : d.failed.length === 0 ? '최근 7일 큰 재난 없음 · 경보 받을 준비' : `${d.failed.join('·')} 자료를 불러오지 못했어요`;
  return <MiniBanner icon="alert" title={top ? '최근 재난 정보 있음' : '재난 정보'} sub={sub} onPress={() => router.push('/safety')} />;
}

function InfoTile({ icon, title, value, sub, onPress }: { icon: IconName; title: string; value: string; sub: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title} ${value}, ${sub}`} onPress={onPress} style={({ pressed }) => [styles.info, pressed && styles.pressed]}>
      <View style={styles.infoHead}>
        <Icon name={icon} size={18} color="textMuted" />
        <Text variant="small" color="textMuted">
          {title}
        </Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
      <Text variant="caption" color="textMuted" numberOfLines={1}>
        {sub}
      </Text>
    </Pressable>
  );
}

/** 현지 날씨와 환율을 나란히 놓은 네모 두 개 */
export function TravelInfoTiles() {
  const w = useWeather();
  const x = useExchange();
  const temp = w.data?.currentTemp;
  const place = w.placeName || w.country?.name || '현지';
  return (
    <View style={styles.infoRow}>
      <InfoTile
        icon="weather"
        title="현지 날씨"
        value={temp === null || temp === undefined ? '-' : `${Math.round(temp)}°`}
        sub={w.data ? `${place} · ${weatherLabel(w.data.currentCode).text}` : w.loading ? '불러오는 중' : place}
        onPress={() => router.push('/weather')}
      />
      <InfoTile
        icon="money"
        title="환율"
        value={x.data ? `${Math.round(x.data.krwPerUnit * x.unit).toLocaleString()}원` : '-'}
        sub={x.data ? `${x.unit.toLocaleString()} ${x.currency} 기준` : x.loading ? '불러오는 중' : x.currencyName}
        onPress={() => router.push('/exchange')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  infoRow: { flexDirection: 'row', gap: spacing.md },
  info: { flex: 1, minHeight: 120, gap: spacing.sm, padding: 17, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
  infoHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  infoValue: { fontSize: 25, lineHeight: 32, letterSpacing: -0.6, fontWeight: fontWeight.bold, color: colors.text },
  flex: { flex: 1 },
  brand: { fontSize: 20, lineHeight: 26, fontWeight: fontWeight.heavy, letterSpacing: -0.8 },
  head: {},
  headSub: { marginTop: spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexBasis: '47%', flexGrow: 1, minHeight: 158, borderRadius: radius.xl, padding: 18 },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs, marginBottom: 29 },
  tileState: { paddingHorizontal: 7, paddingVertical: 5, borderRadius: 20, backgroundColor: colors.tileChip },
  tileStateText: { fontSize: 10, lineHeight: 13, fontWeight: fontWeight.semibold },
  tileTitle: { fontSize: 17, lineHeight: 24, fontWeight: fontWeight.bold, letterSpacing: -0.5 },
  tileDesc: { fontSize: 11, lineHeight: 16, marginTop: 7, opacity: 0.85 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: 17, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
  bannerSub: { fontSize: 11, lineHeight: 15, marginTop: 5 },
  pressed: { opacity: 0.8 },
});
