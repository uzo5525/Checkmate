// 앱 전체에서 쓰는 확인 대화상자 화면 (시스템 기본 창 대신)
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { useConfirmStore } from '@/lib/confirm';
import { colors, radius, spacing } from '@/theme/tokens';

export function ConfirmHost() {
  const request = useConfirmStore((s) => s.request);
  const close = useConfirmStore((s) => s.close);
  return (
    <Modal visible={!!request} transparent animationType="fade" onRequestClose={() => close(false)}>
      <Pressable accessibilityLabel="닫기" style={styles.backdrop} onPress={() => close(false)}>
        <Pressable accessibilityRole="alert" style={styles.box} onPress={() => undefined}>
          <Text variant="heading">{request?.title}</Text>
          <Text variant="small" color="textMuted" style={styles.message}>
            {request?.message}
          </Text>
          <View style={styles.buttons}>
            <View style={styles.flex}>
              <Button title="취소" variant="secondary" full onPress={() => close(false)} />
            </View>
            <View style={styles.flex}>
              <Button title={request?.okLabel ?? '확인'} variant={request?.danger ? 'danger' : 'primary'} full onPress={() => close(true)} />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, backgroundColor: 'rgba(0,0,0,0.55)' },
  box: { width: '100%', maxWidth: 340, padding: spacing.xl, borderRadius: radius.xl, backgroundColor: colors.surface },
  message: { marginTop: spacing.sm },
  buttons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
});
