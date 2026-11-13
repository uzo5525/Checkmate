// 날짜 선택 (안드로이드 달력 대화상자). 값은 'YYYY-MM-DD'
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { Pressable, StyleSheet, View } from 'react-native';

import { formatKDate, isDateStr, toDateStr } from '@/lib/dates';
import { colors, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

export type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  minimumDate?: string;
};

function toDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function DateField({ label, value, onChange, error, minimumDate }: DateFieldProps) {
  const open = () =>
    DateTimePickerAndroid.open({
      value: isDateStr(value) ? toDate(value) : isDateStr(minimumDate ?? '') ? toDate(minimumDate!) : new Date(),
      mode: 'date',
      minimumDate: minimumDate && isDateStr(minimumDate) ? toDate(minimumDate) : undefined,
      onChange: (event, date) => {
        if (event.type === 'set' && date) onChange(toDateStr(date));
      },
    });
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="small" color="textMuted" bold>
          {label}
        </Text>
      ) : null}
      <Pressable accessibilityRole="button" accessibilityLabel={label ?? '날짜 선택'} onPress={open} style={[styles.field, error ? styles.error : null]}>
        <Text variant="body" color={isDateStr(value) ? 'text' : 'textSubtle'} style={styles.flex}>
          {isDateStr(value) ? `${value} · ${formatKDate(value)}` : '날짜 선택'}
        </Text>
        <Icon name="calendar" size={18} color="textMuted" />
      </Pressable>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  flex: { flex: 1 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  error: { borderColor: colors.danger },
});
