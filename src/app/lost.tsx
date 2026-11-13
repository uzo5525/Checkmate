// 분실·도난 대응: 무엇을 잃어버렸는지 고르면 할 일을 순서대로 안내. 인터넷 없이 볼 수 있음
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Contacts } from '@/components/ItemTools';
import { ChipGroup, Notice, PageHeader, Row, Screen, Stack, Text } from '@/components/ui';
import { LOST_GUIDES } from '@/data/itemTools';
import { useTripStore } from '@/store/trip';
import { colors, fontWeight, radius } from '@/theme/tokens';

export default function LostScreen() {
  const countryCode = useTripStore((s) => s.trip?.countryCode);
  const [key, setKey] = useState(LOST_GUIDES[0].key);
  const guide = LOST_GUIDES.find((g) => g.key === key) ?? LOST_GUIDES[0];
  return (
    <Screen>
      <PageHeader title="무엇을 잃어버렸나요?" />
      <ChipGroup options={LOST_GUIDES.map((g) => ({ value: g.key, label: g.label }))} value={key} onChange={setKey} />
      <Stack gap="md">
        {guide.steps.map((step, i) => (
          <Row key={step} gap="md" align="flex-start">
            <View style={styles.step}>
              <Text style={styles.stepText}>{i + 1}</Text>
            </View>
            <View style={styles.flex}>
              <Text variant="body">{step}</Text>
            </View>
          </Row>
        ))}
      </Stack>
      {guide.note ? <Notice>{guide.note}</Notice> : null}
      {countryCode ? <Contacts countryCode={countryCode} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  step: { width: 24, height: 24, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.brandSoft },
  stepText: { fontSize: 13, lineHeight: 18, fontWeight: fontWeight.bold, color: colors.brand },
});
