import { Pressable, StyleSheet } from 'react-native';

import { colors, layout, radius } from '@/theme/tokens';

import { Icon } from './Icon';

export type CheckboxProps = {
  checked: boolean;
  onToggle?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

// 시안: 원형 체크 (미완료 = 테두리 원, 완료 = 파란 원 + 흰 체크)
export function Checkbox({ checked, onToggle, disabled, accessibilityLabel }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      onPress={onToggle}
      disabled={disabled || !onToggle}
      hitSlop={layout.hitSlop}
      style={[styles.box, checked && styles.checked, disabled && styles.disabled]}>
      {checked ? <Icon name="check" size={17} color="onBrand" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    width: layout.checkboxSize,
    height: layout.checkboxSize,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: colors.textSubtle,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.brand, borderColor: colors.brand },
  disabled: { opacity: 0.4 },
});
