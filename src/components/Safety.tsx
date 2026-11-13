// 재난 대비 안내: 경보를 받는 방법, 공식 앱, 행동 요령
import { Linking, Platform, View } from 'react-native';

import { Icon, ListItem, SectionHeader, Stack, Text } from '@/components/ui';
import { SAFETY_GUIDES } from '@/data/itemTools';

export function SafetyGuideBlock({ countryCode }: { countryCode: string }) {
  const g = SAFETY_GUIDES[countryCode];
  if (!g) return null;
  const links = g.links.filter((l) => !l.only || Platform.OS === 'web' || l.only === Platform.OS);
  return (
    <Stack gap="sm">
      <SectionHeader title="경보 받을 준비" />
      <Text variant="small" color="textMuted">
        주의할 재난: {g.hazards}
      </Text>
      <Text variant="small">{g.receive}</Text>
      <View>
        {links.map((l) => (
          <ListItem key={l.url} boxed title={l.name} subtitle={l.sub} right={<Icon name="external" size={16} color="textSubtle" />} onPress={() => Linking.openURL(l.url)} />
        ))}
      </View>
      <SectionHeader title="이럴 땐 이렇게" />
      {g.actions.map((a) => (
        <Text key={a} variant="small">
          · {a}
        </Text>
      ))}
    </Stack>
  );
}
