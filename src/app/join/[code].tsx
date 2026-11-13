// 딥링크 readygo://join/<code> 로 열리는 화면
import { router, useLocalSearchParams } from 'expo-router';

import { Button, Card, Input, Screen, Stack, Text } from '@/components/ui';
import { getCountry } from '@/data/countries';
import { useJoinTrip } from '@/hooks/useJoin';
import { formatKDate } from '@/lib/dates';

export default function JoinScreen() {
  const { code: raw } = useLocalSearchParams<{ code: string }>();
  const j = useJoinTrip(raw ?? '');
  const c = j.trip ? getCountry(j.trip.countryCode)?.country : undefined;

  return (
    <Screen
      footer={
        j.status === 'found' ? (
          j.alreadyMember ? (
            <Button title="여행 방으로 이동" full onPress={() => router.replace(`/trip/${j.trip!.id}`)} />
          ) : (
            <Button
              title="참여하기"
              full
              disabled={!j.nickname.trim()}
              loading={j.joining}
              onPress={async () => {
                const id = await j.join();
                if (id) router.replace(`/trip/${id}`);
              }}
            />
          )
        ) : undefined
      }>
      {j.status === 'loading' ? <Text color="textMuted">방 코드 {j.code} 확인 중…</Text> : null}
      {j.status === 'notfound' ? (
        <Card tone="warning">
          <Text variant="label" bold>
            {j.code} 방을 찾을 수 없어요
          </Text>
          <Text variant="small" color="textMuted">
            코드를 다시 확인해 주세요.
          </Text>
        </Card>
      ) : null}
      {j.status === 'error' ? (
        <Card tone="danger">
          <Text variant="small" color="danger">
            {j.error}
          </Text>
        </Card>
      ) : null}
      {j.trip ? (
        <>
          <Card tone="brand">
            <Text variant="small" color="brand" bold>
              {c?.flag} {c?.name} · {j.trip.partySize}명
            </Text>
            <Text variant="title">{j.trip.title}</Text>
            <Text variant="small" color="textMuted">
              {formatKDate(j.trip.departDate)} → {formatKDate(j.trip.returnDate)}
            </Text>
          </Card>
          {j.alreadyMember ? (
            <Text color="textMuted">이미 이 여행에 참여 중이에요.</Text>
          ) : (
            <Stack gap="sm">
              <Input label="닉네임" value={j.nickname} onChangeText={j.setNickname} placeholder="동행자에게 보일 이름" maxLength={12} />
              <Text variant="caption" color="textSubtle">
                회원가입 없이 닉네임만으로 참여해요.
              </Text>
            </Stack>
          )}
        </>
      ) : null}
    </Screen>
  );
}
