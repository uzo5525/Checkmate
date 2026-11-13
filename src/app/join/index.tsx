import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Input, Screen, Text } from '@/components/ui';
import { normalizeRoomCode } from '@/lib/id';

export default function JoinByCodeScreen() {
  const [code, setCode] = useState('');
  const normalized = normalizeRoomCode(code);
  return (
    <Screen
      footer={<Button title="다음" full disabled={normalized.length !== 6} onPress={() => router.push(`/join/${normalized}`)} />}>
      <Text variant="body" color="textMuted">
        동행자에게 받은 6자리 방 코드를 입력하세요. 초대 링크를 눌렀다면 이 단계는 건너뜁니다.
      </Text>
      <Input
        label="방 코드"
        value={normalized}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
        placeholder="예: K7P2QX"
        maxLength={6}
      />
    </Screen>
  );
}
