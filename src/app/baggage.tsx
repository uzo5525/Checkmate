// 짐: 짐 리스트(챙김 체크) + 반입 규정 확인(수동 입력·라벨 촬영)
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { AllowanceBadge, VerdictBadge } from '@/components/VerdictBadge';
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  Divider,
  Grow,
  Icon,
  IconBox,
  Input,
  ListItem,
  Notice,
  PageHeader,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  Select,
  Stack,
  Text,
} from '@/components/ui';
import { AIRLINE_OPTIONS, BAGGAGE_CATEGORY_OPTIONS, useBaggageCheck, usePackingList } from '@/hooks/useBaggageCheck';
import { VERDICT_LABEL, type BaggageCategory, type BaggageResult, type Verdict } from '@/lib/baggage';

function ResultBody({ result, airline }: { result: BaggageResult; airline: string | null }) {
  return (
    <Stack gap="sm">
      <Row gap="xs" wrap>
        <VerdictBadge verdict={result.verdict} />
        <AllowanceBadge prefix="기내" value={result.cabin} />
        <AllowanceBadge prefix="위탁" value={result.checked} />
      </Row>
      <Text variant="label">{result.summary}</Text>
      {result.details.map((d) => (
        <Text key={d} variant="small" color="textMuted">
          · {d}
        </Text>
      ))}
      <Text variant="caption" color="textSubtle">
        출처: {result.sourceName ?? '—'} · 확인 날짜: {result.checkedAt ?? '미확인(초안)'}
      </Text>
      <Text variant="caption" color="warning">
        {airline ?? '이용 항공사'} 공식 안내를 출발 전에 꼭 확인하세요. 노선마다 규정이 다를 수 있어요.
      </Text>
    </Stack>
  );
}

function PackingList() {
  const p = usePackingList();
  const [name, setName] = useState('');
  return (
    <>
      <Card tone="brand">
        <Row justify="space-between">
          <Text variant="label">가방에 챙긴 물건</Text>
          <Text variant="label" color="brand">
            {p.packedCount} / {p.items.length}
          </Text>
        </Row>
        <ProgressBar value={p.items.length ? p.packedCount / p.items.length : 0} />
      </Card>
      <Stack gap="sm">
        {p.items.map((i) => (
          <ListItem
            key={i.id}
            boxed
            title={i.name}
            muted={i.packed}
            left={<Checkbox checked={i.packed} onToggle={() => p.toggle(i.id)} accessibilityLabel={i.name} />}
            right={
              <Row gap="xxs">
                <Button size="sm" variant="ghost" title="−" onPress={() => p.changeQty(i.id, -1)} />
                <Text variant="label">{i.qty}</Text>
                <Button size="sm" variant="ghost" title="+" onPress={() => p.changeQty(i.id, 1)} />
                <Button size="sm" variant="ghost" title="삭제" onPress={() => p.remove(i.id)} />
              </Row>
            }
          />
        ))}
      </Stack>
      <Row gap="sm" align="flex-start">
        <Grow>
          <Input value={name} onChangeText={setName} placeholder="물건 추가 (예: 렌즈 세척액)" maxLength={30} />
        </Grow>
        <Button
          title="추가"
          icon="add"
          variant="soft"
          disabled={!name.trim()}
          onPress={() => {
            p.add(name);
            setName('');
          }}
        />
      </Row>
      <Button title="기본 목록으로 되돌리기" size="sm" variant="ghost" onPress={p.reset} />
      <Notice>짐 리스트는 이 휴대폰에만 저장돼요.</Notice>
    </>
  );
}

function RulesCheck({ category }: { category?: BaggageCategory }) {
  const b = useBaggageCheck();
  // 준비 카드에서 품목을 골라 들어오면 그 품목을 바로 열기
  useEffect(() => {
    if (!category) return;
    const row = b.rows.find((r) => r.draft.category === category);
    if (!row) b.add(category);
    else if (b.selectedId !== row.draft.id) b.select(row.draft.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);
  const [summary, setSummary] = useState(false);
  const counts = b.rows.reduce<Record<Verdict, number>>((acc, r) => ({ ...acc, [r.result.verdict]: acc[r.result.verdict] + 1 }), {
    cabin: 0,
    checked: 0,
    restricted: 0,
    check: 0,
  });

  return (
    <>
      {b.airlineLocked ? (
        <Card tone="brand">
          <Row gap="sm">
            <Icon name="plane" color="brand" />
            <Text variant="label" style={{ flex: 1 }}>
              {b.airline}
            </Text>
            <Badge label="패키지 항공사" tone="info" icon="lock" />
          </Row>
        </Card>
      ) : (
        <Select icon="plane" placeholder="항공사 선택" value={b.airline} options={AIRLINE_OPTIONS} onChange={b.setAirline} />
      )}

      <SectionHeader title={`확인할 물품 ${b.rows.length}개`} />
      <Stack gap="sm">
        {b.rows.map((r) => {
          const open = b.selectedId === r.draft.id;
          return (
            <Stack key={r.draft.id} gap="xs">
              <ListItem
                boxed
                title={r.label}
                onPress={() => b.select(r.draft.id)}
                left={<IconBox icon={r.icon} />}
                right={
                  <>
                    {r.missing ? <Badge label={r.missing} tone="brand" size="md" /> : <VerdictBadge verdict={r.result.verdict} />}
                    <Icon name={open ? 'chevronDown' : 'forward'} size={16} color="textSubtle" />
                  </>
                }
              />
              {open ? (
                <Card>
                  {r.canScan ? (
                    <Row gap="sm" wrap>
                      <Button
                        title="라벨 찍어서 읽기"
                        icon="camera"
                        size="sm"
                        variant="soft"
                        loading={b.scanning === r.draft.id}
                        onPress={() => b.scanLabel(r.draft.id, 'camera')}
                      />
                      <Button title="사진에서 고르기" size="sm" variant="ghost" onPress={() => b.scanLabel(r.draft.id, 'library')} />
                    </Row>
                  ) : null}
                  {b.scanMsg && open ? (
                    <Text variant="small" color="brand">
                      {b.scanMsg}
                    </Text>
                  ) : null}
                  {r.fields.subtypes.length > 0 ? (
                    <ChipGroup options={r.fields.subtypes} value={r.draft.subtype ?? ''} onChange={(v) => b.setSubtype(r.draft.id, v)} />
                  ) : null}
                  {r.fields.inputs.map((f) => (
                    <Input
                      key={f.key}
                      label={f.label}
                      value={r.draft.values[f.key] ?? ''}
                      onChangeText={(v) => b.setValue(r.draft.id, f.key, v)}
                      keyboardType="decimal-pad"
                      placeholder={f.placeholder}
                      suffix={f.unit}
                      hint={f.hint}
                    />
                  ))}
                  {!r.missing ? (
                    <>
                      <Divider />
                      <ResultBody result={r.result} airline={b.airline} />
                    </>
                  ) : null}
                  <Button title="이 물품 삭제" variant="ghost" size="sm" icon="trash" onPress={() => b.remove(r.draft.id)} />
                </Card>
              ) : null}
            </Stack>
          );
        })}
      </Stack>

      <Stack gap="sm">
        <Text variant="small" color="textMuted" bold>
          확인할 물품 추가
        </Text>
        <Row gap="sm" wrap>
          {BAGGAGE_CATEGORY_OPTIONS.map((o) => (
            <Button key={o.value} title={o.short} icon="add" size="sm" variant="soft" onPress={() => b.add(o.value)} />
          ))}
        </Row>
      </Stack>

      <Notice>라벨 인식은 폰 안에서만 처리돼요. 읽은 용량이 맞는지 꼭 확인해 주세요.</Notice>

      {b.rows.length > 0 ? (
        <Button
          title="정보 입력 후 규정 확인"
          full
          onPress={() => {
            if (!b.focusNextMissing()) setSummary(true);
          }}
        />
      ) : null}

      {summary && b.rows.length > 0 ? (
        <Card tone="brand">
          <Text variant="label">규정 확인 결과</Text>
          <Row gap="xs" wrap>
            {(Object.keys(counts) as Verdict[])
              .filter((v) => counts[v] > 0)
              .map((v) => (
                <Badge key={v} label={`${VERDICT_LABEL[v]} ${counts[v]}`} tone={v === 'restricted' ? 'danger' : v === 'check' ? 'warning' : 'brand'} size="md" />
              ))}
          </Row>
          {counts.restricted > 0 ? (
            <Text variant="small" color="danger">
              반입할 수 없는 물품이 있어요. 짐에서 빼 주세요.
            </Text>
          ) : null}
        </Card>
      ) : null}
    </>
  );
}

export default function LuggageTab() {
  const { category } = useLocalSearchParams<{ category?: BaggageCategory }>();
  const [mode, setMode] = useState<'pack' | 'rules'>(category ? 'rules' : 'pack');
  return (
    <Screen>
      <PageHeader title="짐·반입 규정" subtitle="챙길 물건과 반입 규정을 확인해요" />
      <Segmented
        options={[
          { value: 'pack', label: '짐 리스트' },
          { value: 'rules', label: '반입 규정' },
        ]}
        value={mode}
        onChange={setMode}
      />
      {mode === 'pack' ? <PackingList /> : <RulesCheck category={category} />}
    </Screen>
  );
}
