// 시안 02 "어디부터 가볼까요?" 투표 카드. 사진이 없으니 장소 이름 그라데이션으로 대신.
import { StyleSheet, View } from 'react-native';

import { Badge, Button, Gradient, Text } from '@/components/ui';
import { radius, spacing, colors } from '@/theme/tokens';

const PALETTE: [string, string][] = [
  ['#5AA6F2', '#2F6FD6'],
  ['#F29A6B', '#D9583A'],
  ['#7BC8B0', '#3D8F84'],
  ['#9D8CF0', '#5B4DC4'],
];

export function PlaceVoteCard({
  index,
  name,
  note,
  votes,
  mine,
  onVote,
  onRemove,
}: {
  index: number;
  name: string;
  note: string;
  votes: number;
  mine: boolean;
  onVote: () => void;
  onRemove?: () => void;
}) {
  const [from, to] = PALETTE[index % PALETTE.length];
  return (
    <View style={styles.card}>
      <Gradient from={from} to={to} height={96} rounded={false}>
        <View style={styles.top}>
          <Text variant="title" style={styles.initial}>
            {name.slice(0, 1)}
          </Text>
          <Badge label={`${votes}표`} tone="brand" />
        </View>
      </Gradient>
      <View style={styles.body}>
        <Text variant="label" numberOfLines={1}>
          {name}
        </Text>
        {note ? (
          <Text variant="caption" color="textMuted" numberOfLines={1}>
            {note}
          </Text>
        ) : null}
        <Button title={mine ? '투표 취소' : '투표하기'} size="sm" variant={mine ? 'soft' : 'secondary'} icon={mine ? 'heart' : 'heartOutline'} onPress={onVote} />
        {onRemove ? <Button title="삭제" size="sm" variant="ghost" onPress={onRemove} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 168,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  top: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: spacing.md },
  initial: { color: colors.onBrand, opacity: 0.9 },
  body: { padding: spacing.md, gap: spacing.sm },
});
