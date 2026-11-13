import { router } from 'expo-router';

import { Button, Card, ChipGroup, DateField, Input, Screen, Select, Stack, Text } from '@/components/ui';
import { COUNTRY_OPTIONS, NATIONALITY_OPTIONS, OTHER_NATIONALITIES } from '@/data/countries';
import { useCreateTripForm } from '@/hooks/useCreateTrip';
import { diffDays, isDateStr, nightsLabel } from '@/lib/dates';

export default function CreateTripScreen() {
  const { values, set, errors, valid, submit, submitting, submitError } = useCreateTripForm();
  const showNights = isDateStr(values.departDate) && isDateStr(values.returnDate) && diffDays(values.departDate, values.returnDate) >= 0;

  return (
    <Screen
      footer={
        <Button
          title="체크리스트 만들기"
          full
          disabled={!valid}
          loading={submitting}
          onPress={async () => {
            const id = await submit();
            if (id) router.replace(`/trip/${id}`);
          }}
        />
      }>
      <Stack gap="sm">
        <Text variant="small" color="textMuted" bold>
          여행지
        </Text>
        <ChipGroup options={COUNTRY_OPTIONS} value={values.countryCode} onChange={set.setCountryCode} />
        <Text variant="caption" color="textSubtle">
          입국 요건·검역 정보는 공식 출처 확인 전 초안이 포함돼 있어요. 지원 국가는 계속 늘려 갈게요.
        </Text>
      </Stack>

      <Stack gap="sm">
        <Text variant="small" color="textMuted" bold>
          국적
        </Text>
        <ChipGroup
          options={NATIONALITY_OPTIONS}
          value={values.nationality === 'KR' ? 'KR' : 'OTHER'}
          onChange={(v) => set.setNationality(v === 'KR' ? 'KR' : '')}
        />
        {values.nationality !== 'KR' ? (
          <>
            <Select icon="passport" placeholder="국적을 골라 주세요" value={values.nationality || null} options={OTHER_NATIONALITIES} onChange={set.setNationality} />
            <Text variant="caption" color="textSubtle">
              국적에 따라 비자·입국 요건이 달라요. 체크리스트에서 국적별 요건을 확인하도록 안내해 드려요.
            </Text>
          </>
        ) : null}
      </Stack>

      <DateField label="출발일" value={values.departDate} onChange={set.setDepartDate} error={errors.departDate} />
      <DateField label="귀국일" value={values.returnDate} onChange={set.setReturnDate} error={errors.returnDate} minimumDate={values.departDate} />
      {showNights ? (
        <Text variant="small" color="brand" bold>
          {nightsLabel(values.departDate, values.returnDate)}
        </Text>
      ) : null}

      <Input
        label="인원"
        value={values.partySize}
        onChangeText={set.setPartySize}
        keyboardType="number-pad"
        suffix="명"
        error={errors.partySize}
        hint="2명 이상이면 공유 체크리스트와 동행 현황이 생겨요"
      />
      <Input
        label="내 닉네임"
        value={values.nickname}
        onChangeText={set.setNickname}
        placeholder="동행자에게 보일 이름"
        maxLength={12}
      />

      {submitError ? (
        <Card tone="danger">
          <Text variant="small" color="danger">
            {submitError}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
