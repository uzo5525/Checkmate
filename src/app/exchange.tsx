// 여행지 통화 환율 + 간단 계산기 (원화 ↔ 현지 통화)
import { useState } from 'react';
import { ActivityIndicator } from 'react-native';

import { Card, Input, Notice, Screen, Stack, Text } from '@/components/ui';
import { useExchange } from '@/hooks/useTravelInfo';
import { colors } from '@/theme/tokens';

const num = (s: string) => Number(s.replace(/[^0-9.]/g, ''));
const fmt = (n: number, digits = 0) => (Number.isFinite(n) ? n.toLocaleString('ko-KR', { maximumFractionDigits: digits }) : '');

export default function ExchangeScreen() {
  const x = useExchange();
  const [local, setLocal] = useState('');
  const [krw, setKrw] = useState('');
  const rate = x.data?.krwPerUnit ?? 0;

  if (!x.country) {
    return (
      <Screen>
        <Text variant="small" color="textMuted">
          여행 방에서 열어 주세요.
        </Text>
      </Screen>
    );
  }

  return (
    <Screen>
      <Card tone="brand">
        <Text variant="small" color="textMuted" bold>
          {x.country.flag} {x.currencyName} ({x.currency}) 환율
        </Text>
        {x.loading ? (
          <ActivityIndicator color={colors.brand} />
        ) : x.error ? (
          <Text color="danger">{x.error}</Text>
        ) : (
          <>
            <Text variant="title">
              {fmt(x.unit)} {x.currency} = {fmt(rate * x.unit, 1)}원
            </Text>
            <Text variant="caption" color="textMuted">
              1,000원 = {fmt(1000 / rate, 2)} {x.currency}
            </Text>
          </>
        )}
      </Card>

      {rate > 0 ? (
        <Stack gap="md">
          <Input
            label={`현지 금액 (${x.currency})`}
            value={local}
            keyboardType="decimal-pad"
            placeholder="예: 3000"
            onChangeText={(v) => {
              setLocal(v);
              setKrw(v ? fmt(num(v) * rate) : '');
            }}
          />
          <Input
            label="원화 (KRW)"
            value={krw}
            keyboardType="number-pad"
            placeholder="예: 50000"
            onChangeText={(v) => {
              setKrw(v);
              setLocal(v ? fmt(num(v) / rate, 2) : '');
            }}
          />
        </Stack>
      ) : null}

      <Notice icon="info">하루 한 번 갱신되는 참고 환율이에요. 실제 환전·카드 결제 금액은 수수료 때문에 달라요.</Notice>
      <Text variant="caption" color="textSubtle" center>
        환율 정보: ExchangeRate-API
      </Text>
    </Screen>
  );
}
