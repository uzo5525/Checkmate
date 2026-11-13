import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { fontFor } from '@/theme/fonts';
import { colors, spacing } from '@/theme/tokens';

import { Text } from './Text';

export type InputProps = Omit<TextInputProps, 'style'> & {
  label?: string;
  hint?: string;
  error?: string;
  suffix?: string;
};

export function Input({ label, hint, error, suffix, multiline, ...rest }: InputProps) {
  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="small" color="textMuted" bold>
          {label}
        </Text>
      ) : null}
      <View style={[styles.field, multiline && styles.multiline, error ? styles.fieldError : null]}>
        <TextInput
          placeholderTextColor={colors.textSubtle}
          style={[styles.input, multiline && styles.inputMultiline]}
          multiline={multiline}
          {...rest}
        />
        {suffix ? (
          <Text variant="small" color="textMuted">
            {suffix}
          </Text>
        ) : null}
      </View>
      {error ? (
        <Text variant="caption" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textSubtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.xs },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
  },
  multiline: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  fieldError: { borderColor: colors.danger },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: spacing.sm, ...fontFor('400') },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
});
