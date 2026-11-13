// 체크리스트 항목 안에서 바로 하는 서류 확인 카드 (여권·보험)
import { useState } from 'react';
import { Linking } from 'react-native';

import { AlertBox, Button, Card, DateField, KeyValueRow, ListItem, Notice, Row, Stack, Text } from '@/components/ui';
import { useItemCheck } from '@/hooks/useItemCheck';
import { useVault } from '@/hooks/useVault';
import type { ChecklistItem } from '@/types';

export function ItemCheckCard({ item, onCleared }: { item: ChecklistItem; onCleared?: () => void }) {
  const c = useItemCheck(item);
  const vault = useVault();
  const [fromVault, setFromVault] = useState(false);
  if (!c.kind || !c.trip) return null;
  const passport = c.kind === 'passport';
  const r = c.result;
  const tone = r?.verdict === 'match' ? 'brand' : r?.verdict === 'check' ? 'warning' : 'danger';

  return (
    <Card>
      <Text variant="label">{c.kind === 'passport' ? '내 여권으로 확인하기' : '내 보험으로 확인하기'}</Text>
      <Notice icon="lock">입력한 정보는 이 휴대폰에만 저장되고 동행자에게 보이지 않아요.</Notice>

      {c.ocrAvailable ? (
        <Stack gap="sm">
          <Row gap="sm" wrap>
            <Button title={passport ? '여권 찍어서 읽기' : '증권 찍어서 읽기'} icon="camera" size="sm" loading={c.scanning} onPress={() => c.scan('camera')} />
            <Button title="사진에서 고르기" size="sm" variant="secondary" disabled={c.scanning} onPress={() => c.scan('library')} />
            <Button title="파일에서 찾기" size="sm" variant="secondary" disabled={c.scanning} onPress={c.scanDevice} />
            <Button title="보관함에서 고르기" size="sm" variant="secondary" disabled={c.scanning} onPress={() => setFromVault((x) => !x)} />
          </Row>
          {fromVault ? (
            vault.files.length === 0 ? (
              <Text variant="small" color="textMuted">
                보관함에 파일이 없어요. 보관함 탭에서 먼저 추가해 주세요.
              </Text>
            ) : (
              vault.files.map((f) => (
                <ListItem
                  key={f.id}
                  boxed
                  title={f.name}
                  subtitle="눌러서 이 파일로 검사"
                  onPress={() => {
                    setFromVault(false);
                    c.scanVault(f);
                  }}
                />
              ))
            )
          ) : null}
          {c.scanning ? (
            <Text variant="small" color="textMuted">
              파일을 읽고 있어요. 처음에는 글자 인식 자료를 받느라 조금 걸려요.
            </Text>
          ) : null}
          <Text variant="caption" color="textSubtle">
            {passport
              ? `사진면(얼굴 사진 있는 면) 맨 아래 "<<<" 두 줄을 가까이 찍어 주세요. 기기 안에서만 읽어요. 사진·여권번호·생년월일은 저장하지 않아요.`
              : '"보험기간"이 보이는 면을 골라 주세요. 기기 안에서만 읽고 보장 기간만 저장해요.'}
          </Text>
        </Stack>
      ) : null}

      {passport ? (
        <Stack gap="sm">
          {c.fields.name ? <KeyValueRow label="영문 성명" value={c.fields.name} /> : null}
          <DateField label="여권 만료일" value={c.fields.expiryDate ?? ''} onChange={(v) => c.setValue('expiryDate', v)} />
          <KeyValueRow
            label={c.country?.passport.minMonths ? '입국 예정일' : '귀국 예정일'}
            value={c.country?.passport.from === 'entry' ? c.trip.departDate : c.trip.returnDate}
          />
        </Stack>
      ) : (
        <Stack gap="sm">
          <DateField label="보장 시작일" value={c.fields.coverageStart ?? ''} onChange={(v) => c.setValue('coverageStart', v)} />
          <DateField label="보장 종료일" value={c.fields.coverageEnd ?? ''} onChange={(v) => c.setValue('coverageEnd', v)} />
          <KeyValueRow label="출국 예정일" value={c.trip.departDate} />
          <KeyValueRow label="귀국 예정일" value={c.trip.returnDate} />
        </Stack>
      )}

      {c.scanError ? (
        <Text variant="small" color="danger">
          {c.scanError}
        </Text>
      ) : null}
      {c.readDone && !c.scanError ? (
        <Text variant="small" color="textMuted">
          파일에서 읽은 날짜를 넣었어요. 실제 서류와 같은지 한 번 봐 주세요.
        </Text>
      ) : null}

      {r ? (
        <AlertBox
          tone={tone}
          title={r.title}
          actionLabel={r.followUp?.url ? '공식 안내 보기' : undefined}
          onAction={r.followUp?.url ? () => Linking.openURL(r.followUp!.url!) : undefined}>
          {r.messages.map((m) => (
            <Text key={m} variant="small" color="textMuted">
              {m}
            </Text>
          ))}
          {r.followUp ? <Text variant="small">{r.followUp.text}</Text> : null}
          {r.verdict === 'mismatch' ? (
            <Text variant="caption" color="danger">
              문제가 해결될 때까지 이 항목은 완료로 표시할 수 없어요.
            </Text>
          ) : null}
        </AlertBox>
      ) : (
        <Notice>정보를 입력하면 여행 일정과 바로 비교해요.</Notice>
      )}

      {Object.keys(c.fields).length ? <Button title="입력한 정보 지우기" size="sm" variant="ghost" icon="trash" onPress={() => { c.clear(); onCleared?.(); }} /> : null}
    </Card>
  );
}
