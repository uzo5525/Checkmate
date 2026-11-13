// 여행 코스: 지도 위 장소 제안·투표 → 날짜별 일정 (AI 일정 정리)
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';

import { TripMap, type MapPin } from '@/components/TripMap';
import {
  AlertBox,
  Badge,
  Button,
  Card,
  ChipGroup,
  Divider,
  Grow,
  Icon,
  IconBox,
  Input,
  ListItem,
  Notice,
  PageHeader,
  Row,
  Screen,
  SectionHeader,
  Segmented,
  Stack,
  Text,
} from '@/components/ui';
import { useCourse } from '@/hooks/useCourse';
import { useEnsureTrip } from '@/hooks/useTrip';
import { confirm } from '@/lib/confirm';
import { googleDirectionsUrl, googleMapsUrl } from '@/lib/mapsLink';
import { colors } from '@/theme/tokens';

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];

type Draft = { name: string; note: string; lat: number | null; lng: number | null; sourceUrl: string | null };
const EMPTY: Draft = { name: '', note: '', lat: null, lng: null, sourceUrl: null };

export default function CourseRoute() {
  return <CourseScreen />;
}

export function CourseScreen({ edges }: { edges?: Edge[] }) {
  const params = useLocalSearchParams<{ mode?: string; shared?: string; tripId?: string }>();
  useEnsureTrip(params.tripId);
  const c = useCourse();
  const [mode, setMode] = useState<'vote' | 'plan'>(params.mode === 'plan' ? 'plan' : 'vote');
  const [day, setDay] = useState(0);
  const [link, setLink] = useState('');
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [parsing, setParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState<string | null>(null);

  const applyText = async (text: string) => {
    setParsing(true);
    setParseMsg(null);
    const r = await c.parse(text);
    setParsing(false);
    setDraft((d) => ({ ...d, name: r.name ?? d.name, lat: r.lat, lng: r.lng, sourceUrl: r.url }));
    setParseMsg(
      r.approx
        ? `${r.outside ? `여행지(${c.country?.name ?? ''}) 밖의 장소예요. ` : ''}대략적인 위치예요. 지도를 ${Platform.OS === 'web' ? '눌러' : '길게 눌러'} 정확한 곳에 핀을 옮겨 주세요.`
        : r.byName
          ? `${r.outside ? `여행지(${c.country?.name ?? ''}) 밖의 장소예요. ` : ''}이름으로 찾은 위치예요. 지도에서 맞는지 확인해 주세요.`
        : r.lat !== null
          ? '위치를 찾았어요. 이름을 확인하고 투표에 올려 주세요.'
          : `${r.name ? '이름은 채웠지만 위치는 찾지 못했어요' : '링크에서 위치를 찾지 못했어요'}. 지도를 ${Platform.OS === 'web' ? '눌러' : '길게 눌러'} 핀을 찍어 주세요.`,
    );
  };

  // 공유로 들어온 텍스트
  useEffect(() => {
    if (params.shared) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLink(params.shared);
      applyText(params.shared);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.shared]);

  if (!c.trip) {
    return (
      <Screen edges={edges}>
        <Text color="textMuted">여행 방에서 열어 주세요.</Text>
      </Screen>
    );
  }

  const votePins: MapPin[] = c.places
    .filter(({ place }) => place.lat !== null && place.lng !== null)
    .map(({ place, votes }) => ({
      id: place.id,
      lat: place.lat!,
      lng: place.lng!,
      title: `${place.name} · ${votes}표`,
      description: place.note || undefined,
      color: votes >= 2 ? colors.brand : votes === 1 ? colors.heroFrom : colors.textSubtle,
    }));

  const view = c.locked ? 'plan' : mode;
  const plan = c.dayPlans[Math.min(day, c.dayPlans.length - 1)];
  const planPins: MapPin[] = plan.stops
    .filter((p) => p.lat !== null && p.lng !== null)
    .map((p) => ({ id: p.id, lat: p.lat!, lng: p.lng!, title: `${CIRCLED[plan.stops.indexOf(p)] ?? ''} ${p.name}` }));
  const route = planPins.map((p) => ({ latitude: p.lat, longitude: p.lng }));
  const directions = googleDirectionsUrl(planPins.map((p) => ({ lat: p.lat, lng: p.lng })));

  return (
    <Screen edges={edges}>
      <PageHeader title="여행 코스" subtitle={`${c.trip.title} · ${c.days}일`} />
      {c.locked ? (
        <AlertBox tone="brand" title={`${c.provider}가 확정한 일정이에요`}>
          <Text variant="small" color="textMuted">
            패키지 일정은 바꿀 수 없어요. 변경이 필요하면 여행사에 문의해 주세요.
          </Text>
        </AlertBox>
      ) : null}
      {c.locked ? null : (
      <Segmented
        options={[
          { value: 'vote', label: '장소 투표' },
          { value: 'plan', label: '날짜별 일정' },
        ]}
        value={mode}
        onChange={setMode}
      />
      )}

      {c.error ? (
        <AlertBox tone="danger" title="처리하지 못했어요">
          <Text variant="small" color="textMuted">
            {c.error}
          </Text>
        </AlertBox>
      ) : null}
      {c.notice ? <AlertBox tone="brand" title={c.notice} /> : null}

      {view === 'vote' ? (
        <>
          <TripMap
            pins={votePins}
            center={c.center}
            draft={draft.lat !== null && draft.lng !== null ? { latitude: draft.lat, longitude: draft.lng } : null}
            onLongPress={(coord) => {
              setDraft((d) => ({ ...d, lat: coord.latitude, lng: coord.longitude }));
              setParseMsg('핀을 찍었어요. 장소 이름을 입력해 주세요.');
            }}
          />
          <Notice icon="info">
            {Platform.OS === 'web'
              ? '지도를 누르면 그 자리에 핀을 찍을 수 있어요. 구글맵 링크를 붙여 넣어도 돼요.'
              : '지도를 길게 누르면 핀을 찍을 수 있어요. 구글맵 앱에서 공유 → Checkmate로 바로 올릴 수도 있어요.'}
          </Notice>

          <Card>
            <Text variant="label">장소 제안하기</Text>
            <Row gap="sm" align="flex-start">
              <Grow>
                <Input value={link} onChangeText={setLink} placeholder="구글맵 링크 붙여넣기" autoCapitalize="none" autoCorrect={false} />
              </Grow>
              <Button title="확인" variant="soft" loading={parsing} disabled={!link.trim()} onPress={() => applyText(link)} />
            </Row>
            {parseMsg ? (
              <Text variant="small" color={draft.lat !== null ? 'brand' : 'warning'}>
                {parseMsg}
              </Text>
            ) : null}
            <Input label="장소 이름" value={draft.name} onChangeText={(name) => setDraft((d) => ({ ...d, name }))} placeholder="예: 도톤보리" maxLength={40} />
            <Input label="메모 (선택)" value={draft.note} onChangeText={(note) => setDraft((d) => ({ ...d, note }))} placeholder="예: 타코야키 먹기" maxLength={60} />
            <Button
              title="투표에 올리기"
              icon="add"
              disabled={!draft.name.trim() || c.busy}
              loading={c.busy}
              onPress={async () => {
                await c.addPlace({ name: draft.name.trim(), note: draft.note.trim(), lat: draft.lat, lng: draft.lng, sourceUrl: draft.sourceUrl });
                setDraft(EMPTY);
                setLink('');
                setParseMsg(null);
              }}
            />
          </Card>

          <SectionHeader title={`제안된 장소 ${c.places.length}곳`} />
          {c.places.length === 0 ? (
            <Card tone="brand">
              <Text variant="small" color="textMuted">
                아직 제안된 장소가 없어요. 가고 싶은 곳을 먼저 올려 보세요.
              </Text>
            </Card>
          ) : null}
          {c.places.map(({ place, votes, mine }) => (
            <Card key={place.id} padded="sm">
              <Row gap="md">
                <IconBox icon="location" tone={votes >= 2 ? 'brand' : 'neutral'} />
                <Grow>
                  <Text variant="label">{place.name}</Text>
                  <Text variant="caption" color="textMuted">
                    {place.note || (place.lat === null ? '위치 없음 · 지도에 표시 안 됨' : '지도에 표시됨')}
                  </Text>
                </Grow>
                <Badge label={`${votes}표`} tone={votes ? 'brand' : 'neutral'} size="md" />
              </Row>
              <Row gap="sm" wrap>
                <Button size="sm" title={mine ? '투표 취소' : '투표하기'} icon={mine ? 'heart' : 'heartOutline'} variant={mine ? 'soft' : 'secondary'} onPress={() => c.toggleVote(place.id)} />
                {place.lat !== null && place.lng !== null ? (
                  <Button size="sm" title="구글맵" icon="link" variant="ghost" onPress={() => Linking.openURL(googleMapsUrl(place.lat!, place.lng!))} />
                ) : null}
                {c.canRemove(place) ? (
                  <Button
                    size="sm"
                    title="삭제"
                    variant="ghost"
                    onPress={async () => {
                      if (await confirm('장소 삭제', `"${place.name}"을(를) 지울까요? 일정에서도 빠져요.`, '삭제')) c.removePlace(place.id);
                    }}
                  />
                ) : null}
              </Row>
            </Card>
          ))}
          {c.places.length > 0 ? <Button title="날짜별 일정 짜러 가기" iconRight="forward" variant="soft" onPress={() => setMode('plan')} full /> : null}
        </>
      ) : (
        <>
          <ChipGroup
            options={c.dayPlans.map((d) => ({ value: String(d.dayIndex), label: `${d.dayIndex + 1}일차 (${d.stops.length})` }))}
            value={String(plan.dayIndex)}
            onChange={(v) => setDay(Number(v))}
          />
          <TripMap pins={planPins} route={route} center={c.center} height={240} />

          <Card tone="brand">
            <Text variant="small" color="brand" bold>
              {plan.label}
            </Text>
            <Text variant="heading">{plan.title ?? (plan.stops.length ? `${plan.stops.length}곳 방문` : '아직 일정이 없어요')}</Text>
            {plan.summary ? (
              <Text variant="small" color="textMuted">
                {plan.summary}
              </Text>
            ) : null}
            {plan.stops.length >= 2 ? (
              <Text variant="caption" color="textMuted">
                직선거리 합계 약 {plan.km}km
              </Text>
            ) : null}
            {directions ? <Button size="sm" title="구글맵에서 동선 보기" icon="link" variant="secondary" onPress={() => Linking.openURL(directions)} /> : null}
          </Card>

          <Stack gap="sm">
            {plan.stops.map((p, i) => (
              <ListItem
                key={p.id}
                boxed
                title={`${CIRCLED[i] ?? i + 1} ${p.name}`}
                subtitle={p.note || undefined}
                right={
                  c.canEdit ? (
                    <Row gap="xxs">
                      <Button size="sm" title="↑" variant="ghost" disabled={i === 0} onPress={() => c.move(p.id, plan.dayIndex, -1)} />
                      <Button size="sm" title="↓" variant="ghost" disabled={i === plan.stops.length - 1} onPress={() => c.move(p.id, plan.dayIndex, 1)} />
                      <Button size="sm" title="빼기" variant="ghost" onPress={() => c.move(p.id, null)} />
                    </Row>
                  ) : undefined
                }
              />
            ))}
          </Stack>

          {c.canEdit && c.unscheduled.length > 0 ? (
            <Card>
              <Text variant="label">일정에 없는 장소</Text>
              {c.unscheduled.map((p) => (
                <Row key={p.id} gap="sm">
                  <Grow>
                    <Text variant="body">{p.name}</Text>
                    <Text variant="caption" color="textMuted">
                      {p.voterIds.length}표
                    </Text>
                  </Grow>
                  <Button size="sm" title={`${plan.dayIndex + 1}일차에 추가`} icon="add" variant="soft" onPress={() => c.move(p.id, plan.dayIndex)} />
                </Row>
              ))}
            </Card>
          ) : null}

          {c.canEdit ? (
            <Card>
              <Row gap="sm">
                <Text variant="label">일정 자동으로 짜기</Text>
                <Badge label="AI" tone="strong" />
              </Row>
              <Text variant="small" color="textMuted">
                투표한 장소를 가까운 곳끼리 날짜별로 묶고, AI가 날짜별 테마와 동선을 정리해요. 지금 일정은 바뀌어요.
              </Text>
              <Divider />
              <Button
                title="AI로 일정 짜기"
                loading={c.busy}
                disabled={c.places.length === 0}
                onPress={async () => {
                  if (c.dayPlans.some((d) => d.stops.length) && !(await confirm('일정 다시 짜기', '지금 일정을 새로 짠 일정으로 바꿀까요?', '바꾸기', false))) return;
                  c.aiPlan();
                }}
              />
              <Button
                title="AI 없이 거리로만 묶기 (무료)"
                variant="ghost"
                disabled={c.places.length === 0 || c.busy}
                onPress={async () => {
                  if (c.dayPlans.some((d) => d.stops.length) && !(await confirm('일정 다시 짜기', '지금 일정을 새로 짠 일정으로 바꿀까요?', '바꾸기', false))) return;
                  c.autoPlan();
                }}
              />
            </Card>
          ) : c.locked ? null : (
            <Notice icon="lock">일정은 방장과 편집 권한이 있는 멤버가 정해요.</Notice>
          )}
        </>
      )}
    </Screen>
  );
}
