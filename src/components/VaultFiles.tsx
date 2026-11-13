// 보관함 파일 목록 + 추가 버튼 (보관함 탭과 준비 카드에서 함께 사용)
import { useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, Icon, IconBox, Input, ListItem, Row, Stack, Text } from '@/components/ui';
import { useVault } from '@/hooks/useVault';
import { confirm } from '@/lib/confirm';
import type { PrepKey } from '@/lib/prepCards';
import { spacing } from '@/theme/tokens';
import type { VaultFile } from '@/store/vault';

function NameForm({ initial, busy, onSave, onCancel }: { initial: string; busy?: boolean; onSave: (name: string) => void; onCancel: () => void }) {
  const [name, setName] = useState(initial);
  const trimmed = name.trim();
  return (
    <Card>
      <Input label="파일 이름" value={name} onChangeText={setName} maxLength={40} autoFocus selectTextOnFocus returnKeyType="done" onSubmitEditing={() => trimmed && onSave(trimmed)} />
      <Row gap="sm">
        <Button title="저장" size="sm" loading={busy} disabled={!trimmed} onPress={() => onSave(trimmed)} />
        <Button title="취소" size="sm" variant="ghost" onPress={onCancel} />
      </Row>
    </Card>
  );
}

export function VaultFiles({ card = null, suggestName }: { card?: PrepKey | null; suggestName?: string }) {
  const v = useVault(card);
  const [viewing, setViewing] = useState<VaultFile | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  return (
    <Stack gap="sm">
      {v.files.length === 0 && !v.picked ? (
        <Text variant="small" color="textMuted">
          아직 추가한 파일이 없어요.
        </Text>
      ) : null}
      {v.files.map((f) =>
        renaming === f.id ? (
          <NameForm
            key={f.id}
            initial={f.name}
            onSave={(name) => {
              v.rename(f, name);
              setRenaming(null);
            }}
            onCancel={() => setRenaming(null)}
          />
        ) : (
          <ListItem
            key={f.id}
            boxed
            title={f.name}
            subtitle={f.addedAt.slice(0, 10)}
            left={<IconBox icon={f.mimeType.startsWith('image/') ? 'camera' : 'document'} />}
            onPress={() => (f.mimeType.startsWith('image/') ? setViewing(f) : v.open(f))}
            right={
              <Row gap="md">
                <Pressable accessibilityRole="button" accessibilityLabel={`${f.name} 이름 변경`} hitSlop={8} onPress={() => setRenaming(f.id)}>
                  <Icon name="edit" size={18} color="textSubtle" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${f.name} 삭제`}
                  hitSlop={8}
                  onPress={async () => {
                    if (await confirm('파일 삭제', `"${f.name}" 파일을 삭제할까요?`, '삭제')) await v.remove(f);
                  }}>
                  <Icon name="trash" size={18} color="textSubtle" />
                </Pressable>
              </Row>
            }
          />
        ),
      )}
      {v.picked ? (
        <NameForm initial={suggestName ?? v.picked.name} busy={v.busy} onSave={v.savePicked} onCancel={v.cancelPicked} />
      ) : (
        <Row gap="sm">
          <View style={styles.flex}>
            <Button title="사진 추가" icon="camera" variant="soft" size="sm" full onPress={v.addPhoto} />
          </View>
          <View style={styles.flex}>
            <Button title="파일 추가" icon="document" variant="soft" size="sm" full onPress={v.addDocument} />
          </View>
        </Row>
      )}
      {v.error ? (
        <Text variant="small" color="danger">
          {v.error}
        </Text>
      ) : null}

      <Modal visible={!!viewing} transparent animationType="fade" onRequestClose={() => setViewing(null)}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" style={styles.viewer} onPress={() => setViewing(null)}>
          {viewing ? <Image source={{ uri: viewing.uri }} style={styles.image} resizeMode="contain" /> : null}
          <View style={styles.close}>
            <Icon name="close" color="#FFFFFF" />
          </View>
        </Pressable>
      </Modal>
    </Stack>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  viewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '90%' },
  close: { position: 'absolute', top: spacing.xl, right: spacing.lg },
});
