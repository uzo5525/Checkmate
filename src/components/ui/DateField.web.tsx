// 웹(아이폰 사파리 등): 브라우저 기본 달력으로 날짜 선택. 값은 'YYYY-MM-DD'
import { createElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatKDate, isDateStr } from '@/lib/dates';
import { fontFor } from '@/theme/fonts';
import { colors, spacing } from '@/theme/tokens';

import { Text } from './Text';

export type DateFieldProps = {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  minimumDate?: string;
};

export function DateField({ label, value, onChange, error, minimumDate }: DateFieldProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="small" color="textMuted" bold>
          {label}
        </Text>
      ) : null}
      {createElement('input', {
        type: 'date',
        value: isDateStr(value) ? value : '',
        min: minimumDate && isDateStr(minimumDate) ? minimumDate : undefined,
        'aria-label': label,
        onChange: (e: { target: { value: string } }) => {
          if (e.target.value) onChange(e.target.value);
        },
        style: {
          width: '100%',
          boxSizing: 'border-box',
          minHeight: 48,
          padding: '0 13px',
          borderRadius: 12,
          border: `1px solid ${error ? colors.danger : colors.border}`,
          backgroundColor: colors.surfaceMuted,
          color: colors.text,
          fontSize: 16,
          ...fontFor('400'),
          appearance: 'none',
          WebkitAppearance: 'none',
        },
      })}
      {isDateStr(value) ? (
        <Text variant="caption" color="textSubtle">
          {formatKDate(value)}
        </Text>
      ) : null}
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
});
