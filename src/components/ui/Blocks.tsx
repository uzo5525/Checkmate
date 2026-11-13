// 시안에서 반복되는 블록들: 페이지 제목, 섹션 제목, 아이콘 타일, 안내 문구, 경고 박스, 키-값 행, 그라데이션, 선택 상자
import { LinearGradient } from 'expo-linear-gradient';
import { useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { colors, layout, radius, spacing, toneColors, type ColorToken, type Tone } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <View style={styles.pageHeader}>
      <View style={styles.flex}>
        <Text variant="title">{title}</Text>
        {subtitle ? (
          <Text variant="small" color="textMuted" style={styles.pageSub}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function SectionHeader({
  title,
  right,
  actionLabel,
  onAction,
}: {
  title: string;
  right?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="heading">{title}</Text>
      {right}
      {actionLabel ? (
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={styles.action} hitSlop={layout.hitSlop}>
          <Text variant="small" bold color="brand">
            {actionLabel}
          </Text>
          <Icon name="forward" size={14} color="brand" />
        </Pressable>
      ) : null}
    </View>
  );
}

/** 아이콘 + 라벨 세로 타일 (빠른 메뉴, 서류 종류 선택) */
export function IconTile({
  icon,
  label,
  onPress,
  selected,
}: {
  icon: IconName;
  label: string;
  onPress?: () => void;
  selected?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.tileOn, pressed && styles.pressed]}>
      <Icon name={icon} size={layout.tileIconSize} color="brand" />
      <Text variant="small" bold>
        {label}
      </Text>
    </Pressable>
  );
}

/** 목록 왼쪽 아이콘. 배경 상자 없이 선 아이콘만 둠 */
export function IconBox({ icon, tone = 'brand' }: { icon: IconName; tone?: Tone }) {
  return <Icon name={icon} color={tone === 'brand' ? 'textMuted' : toneColors[tone].fg} />;
}

/** 불러오는 동안 빈 화면 대신 */
export function Loading() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.brand} />
    </View>
  );
}

export function Notice({ children, color = 'textMuted' }: { icon?: IconName; children: ReactNode; color?: ColorToken }) {
  return (
    <View style={styles.notice}>
      <Text variant="caption" color={color} style={styles.noticeText}>
        {children}
      </Text>
    </View>
  );
}

/** 경고/결과 박스 (시안 04의 "귀국일의 보장이 빠져 있어요") */
export function AlertBox({
  tone = 'danger',
  title,
  children,
  actionLabel,
  onAction,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const t = toneColors[tone];
  return (
    <View style={[styles.alert, { backgroundColor: t.bg }]}>
      <Icon name={tone === 'danger' || tone === 'warning' ? 'alert' : 'check'} size={22} color={t.fg} />
      <View style={[styles.flex, styles.alertBody]}>
        <Text variant="label" style={{ color: t.fg }}>
          {title}
        </Text>
        {children}
        {actionLabel ? (
          <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={styles.action}>
            <Text variant="small" bold color="brand">
              {actionLabel}
            </Text>
            <Icon name="forward" size={14} color="brand" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export function KeyValueRow({ label, value, right }: { label: string; value?: string; right?: ReactNode }) {
  return (
    <View style={styles.kv}>
      <Text variant="small" color="textMuted">
        {label}
      </Text>
      {right ?? (
        <Text variant="small" bold style={styles.kvValue}>
          {value}
        </Text>
      )}
    </View>
  );
}

export function Gradient({
  from = colors.heroFrom,
  to = colors.heroTo,
  children,
  height,
  rounded = true,
}: {
  from?: string;
  to?: string;
  children?: ReactNode;
  height?: number;
  rounded?: boolean;
}) {
  return (
    <LinearGradient
      colors={[from, to]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, rounded && styles.gradientRounded, height ? { height } : null]}>
      {children}
    </LinearGradient>
  );
}

/** 접히는 선택 상자 (시안 03의 "항공사 선택") */
export function Select<T extends string>({
  icon,
  placeholder,
  value,
  options,
  onChange,
}: {
  icon?: IconName;
  placeholder: string;
  value: T | null;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={styles.select}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={current?.label ?? placeholder}
        onPress={() => setOpen((o) => !o)}
        style={styles.selectRow}>
        {icon ? <Icon name={icon} color="brand" /> : null}
        <Text variant="label" color={current ? 'text' : 'textMuted'} style={styles.flex}>
          {current?.label ?? placeholder}
        </Text>
        <Icon name="chevronDown" size={18} color="textMuted" />
      </Pressable>
      {open
        ? options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="button"
              accessibilityLabel={o.label}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              style={[styles.selectOption, o.value === value && styles.tileOn]}>
              <Text variant="body" color={o.value === value ? 'brand' : 'text'}>
                {o.label}
              </Text>
            </Pressable>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { paddingVertical: 64, alignItems: 'center' },
  flex: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.7 },
  pageHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, },
  pageSub: { marginTop: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  action: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs },
  tile: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
  },
  tileOn: { backgroundColor: colors.brandSoft },
  notice: { padding: 15, borderRadius: radius.md, backgroundColor: colors.surfaceMuted },
  noticeText: { lineHeight: 20 },
  alert: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderRadius: radius.lg },
  alertBody: { gap: spacing.xs },
  kv: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kvValue: { flexShrink: 1, textAlign: 'right' },
  gradient: { overflow: 'hidden', justifyContent: 'flex-end' },
  gradientRounded: { borderRadius: radius.xl },
  select: { borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, overflow: 'hidden' },
  selectRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.lg },
  selectOption: { paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
});
