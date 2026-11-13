// 여행 정보 수정·삭제 (방장)
import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Card, DateField, Input, Notice, Screen, Text } from '@/components/ui';
import { useTripAdmin } from '@/hooks/useTrip';
import { confirm } from '@/lib/confirm';
import { diffDays, isDateStr } from '@/lib/dates';

export default function TripEditScreen() {
  const a = useTripAdmin();
  const [title, setTitle] = useState(a.trip?.title ?? '');
  const [departDate, setDepart] = useState(a.trip?.departDate ?? '');
  const [returnDate, setReturn] = useState(a.trip?.returnDate ?? '');
  const [party, setParty] = useState(String(a.trip?.partySize ?? 1));
  const [saving, setSaving] = useState(false);

  if (!a.trip) {
    return (
      <Screen>
        <Text color="textMuted">여행 방에서 열어 주세요.</Text>
      </Screen>
    );
  }
  if (!a.canEdit) {
    return (
      <Screen>
        <Notice icon="lock">여행 정보는 방장만 바꿀 수 있어요.</Notice>
      </Screen>
    );
  }

  const dateError = isDateStr(departDate) && isDateStr(returnDate) && diffDays(departDate, returnDate) < 0 ? '귀국일은 출발일 이후여야 해요' : undefined;
  const partyError = !/^\d+$/.test(party) || Number(party) < 1 || Number(party) > 20 ? '1~20명' : undefined;
  const valid = title.trim() && isDateStr(departDate) && isDateStr(returnDate) && !dateError && !partyError;

  return (
    <Screen
      footer={
        <Button
          title="저장"
          full
          loading={saving}
          disabled={!valid}
          onPress={async () => {
            setSaving(true);
            await a.update({ title: title.trim(), departDate, returnDate, partySize: Number(party) });
            setSaving(false);
            router.back();
          }}
        />
      }>
      <Input label="여행 이름" value={title} onChangeText={setTitle} maxLength={30} />
      <DateField label="출발일" value={departDate} onChange={setDepart} />
      <DateField label="귀국일" value={returnDate} onChange={setReturn} error={dateError} minimumDate={departDate} />
      <Input label="인원" value={party} onChangeText={setParty} keyboardType="number-pad" suffix="명" error={partyError} />
      <Notice>날짜를 바꾸면 체크리스트 마감일(D-30 등)도 새 출발일 기준으로 다시 계산돼요.</Notice>

      <Card tone="danger">
        <Text variant="label" color="danger">
          여행 삭제
        </Text>
        <Text variant="small" color="textMuted">
          모든 멤버의 체크리스트가 함께 삭제되고 되돌릴 수 없어요.
        </Text>
        <Button
          title="이 여행 삭제"
          icon="trash"
          variant="danger"
          onPress={async () => {
            if (await confirm('여행 삭제', `"${a.trip!.title}"을(를) 삭제할까요? 되돌릴 수 없어요.`, '삭제')) {
              await a.remove();
              router.dismissAll();
              router.replace('/');
            }
          }}
        />
      </Card>
    </Screen>
  );
}
