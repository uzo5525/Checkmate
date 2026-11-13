import { Badge } from '@/components/ui';
import { VERDICT_LABEL, type Allowance, type Verdict } from '@/lib/baggage';
import type { Tone } from '@/theme/tokens';

const VERDICT_TONE: Record<Verdict, Tone> = {
  cabin: 'success',
  checked: 'info',
  restricted: 'danger',
  check: 'warning',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <Badge label={VERDICT_LABEL[verdict]} tone={VERDICT_TONE[verdict]} />;
}

const ALLOW: Record<Allowance, { label: string; tone: Tone }> = {
  yes: { label: '가능', tone: 'success' },
  no: { label: '불가', tone: 'danger' },
  approval: { label: '승인 필요', tone: 'warning' },
  unknown: { label: '확인 필요', tone: 'warning' },
};

export function AllowanceBadge({ prefix, value }: { prefix: string; value: Allowance }) {
  return <Badge label={`${prefix} ${ALLOW[value].label}`} tone={ALLOW[value].tone} />;
}
