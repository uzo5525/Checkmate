// 웹 미리보기: 로컬 알림 없음
import type { Trip } from '@/types';

export async function scheduleTripReminders(_trip: Trip): Promise<number> {
  return 0;
}

export async function cancelTripReminders(_tripId: string): Promise<void> {}
