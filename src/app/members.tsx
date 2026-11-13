import { Avatar, Badge, Button, Card, Divider, Grow, Notice, PageHeader, ProgressBar, Row, Screen, Stack, Text, Loading } from '@/components/ui';
import { useMembers } from '@/hooks/useTrip';
import { useShareInvite } from '@/hooks/useTripViews';
import { confirm } from '@/lib/confirm';

export default function MembersTab() {
  const m = useMembers();
  const share = useShareInvite();
  if (!m.trip) return <Screen><Loading /></Screen>;
  const trip = m.trip;

  return (
    <Screen>
      <PageHeader title="동행" subtitle={`${m.progress.length}명 참여 · 예정 ${trip.partySize}명`} />

      <Card tone="brand">
        <Row justify="space-between">
          <Stack gap="xxs">
            <Text variant="small" color="textMuted" bold>
              방 코드
            </Text>
            <Text variant="title" color="brand" selectable>
              {trip.code}
            </Text>
          </Stack>
          <Button title="초대하기" icon="share" onPress={share} />
        </Row>
        <Text variant="caption" color="textMuted">
          받은 사람은 Checkmate 앱에서 &quot;방 코드로 참여&quot;에 코드를 입력하면 돼요.
        </Text>
      </Card>

      {m.progress.map(({ member, done, total, pending }) => {
        const isMe = member.id === m.me?.id;
        // 개인 항목은 진행률만 공유 (무엇이 남았는지는 본인만 봄)
        const status = pending.length === 0 ? '모두 완료했어요' : isMe ? `${pending.length}개 남음 · ${pending[0].title} 등` : `${pending.length}개 남음`;
        return (
          <Card key={member.id}>
            <Row gap="md">
              <Avatar name={member.nickname} size={40} />
              <Grow>
                <Row gap="xs" wrap>
                  <Text variant="label">{member.nickname}</Text>
                  {member.isOwner ? <Badge label="방장" tone="strong" icon="crown" /> : null}
                  {isMe ? <Badge label="나" tone="brand" /> : null}
                  {!member.isOwner && member.canEditShared ? <Badge label="공유 편집" /> : null}
                </Row>
                <Text variant="small" color={pending.length ? 'textMuted' : 'brand'} numberOfLines={1}>
                  {status}
                </Text>
              </Grow>
              <Text variant="label" color={done === total ? 'brand' : 'text'}>
                {done}/{total}
              </Text>
            </Row>
            <ProgressBar value={total ? done / total : 0} />
            {m.canManage || isMe ? (
              <Row gap="xs" wrap>
                {m.docsOf(member).map((d) => (
                  <Badge key={d.label} label={`${d.label} ${d.done ? '체크함' : '아직'}`} tone={d.done ? 'brand' : 'neutral'} icon={d.done ? 'check' : undefined} />
                ))}
              </Row>
            ) : null}
            {m.canManage && !member.isOwner ? (
              <>
                <Divider />
                <Row gap="sm" wrap>
                  <Button
                    size="sm"
                    variant="soft"
                    title={member.canEditShared ? '편집 권한 해제' : '편집 권한 주기'}
                    onPress={() => m.setPermission(member.id, !member.canEditShared)}
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    title="방장 넘기기"
                    onPress={async () => {
                      if (await confirm('방장 넘기기', `${member.nickname}님에게 방장을 넘길까요? 나는 일반 멤버가 돼요.`, '넘기기', false)) m.transferOwner(member.id);
                    }}
                  />
                  <Button
                    size="sm"
                    variant="danger"
                    icon="trash"
                    title="내보내기"
                    onPress={async () => {
                      if (await confirm('멤버 내보내기', `${member.nickname}님을 이 여행에서 내보낼까요?`, '내보내기')) m.removeMember(member.id);
                    }}
                  />
                </Row>
              </>
            ) : null}
          </Card>
        );
      })}
      <Notice icon="lock">동행에게는 진행률만 보여요. 방장은 여권·보험·비자·입국 서류를 체크했는지만 볼 수 있고, 서류 내용은 이 휴대폰 밖으로 나가지 않아요.</Notice>
    </Screen>
  );
}
