import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { Button, ChipGroup, Input, Notice, Screen, Segmented, Stack, Text } from '@/components/ui';
import { useAddItem } from '@/hooks/useTrip';
import { BUCKETS } from '@/lib/checklist';
import type { Scope } from '@/types';

export default function AddItemScreen() {
  const params = useLocalSearchParams<{ scope?: string }>();
  const a = useAddItem();
  const [scope, setScope] = useState<Scope>(params.scope === 'shared' && a.canAddShared ? 'shared' : 'personal');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [due, setDue] = useState('7');
  const [saving, setSaving] = useState(false);

  return (
    <Screen
      footer={
        <Button
          title="추가"
          full
          loading={saving}
          disabled={!title.trim()}
          onPress={async () => {
            setSaving(true);
            await a.add({ title: title.trim(), description: description.trim(), dueOffset: Number(due), scope });
            setSaving(false);
            router.back();
          }}
        />
      }>
      {a.canAddShared ? (
        <Segmented
          options={[
            { value: 'personal', label: '나만 보는 항목' },
            { value: 'shared', label: '함께 준비 항목' },
          ]}
          value={scope}
          onChange={setScope}
        />
      ) : null}
      <Notice icon={scope === 'personal' ? 'lock' : 'people'}>
        {scope === 'personal' ? '내 체크리스트에만 추가되고 동행자에게는 보이지 않아요.' : '모든 멤버의 함께 준비 목록에 추가돼요.'}
      </Notice>
      <Input
        label="항목 이름"
        value={title}
        onChangeText={setTitle}
        placeholder={scope === 'personal' ? '예: 렌즈 세척액 사기' : '예: 유니버설 스튜디오 티켓 예매'}
        maxLength={40}
      />
      <Input label="설명 (선택)" value={description} onChangeText={setDescription} multiline />
      <Stack gap="sm">
        <Text variant="small" color="textMuted" bold>
          언제까지
        </Text>
        <ChipGroup options={BUCKETS.map((b) => ({ value: String(b), label: `D-${b}` }))} value={due} onChange={setDue} />
      </Stack>
    </Screen>
  );
}
