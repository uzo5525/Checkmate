// D-day 시점별 로컬 알림 (서버·푸시 비용 없음). 여행을 열 때마다 다시 예약.
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { addDays } from '@/lib/dates';
import { REMINDER_MESSAGES, REMINDER_POINTS, reminderTitle } from '@/lib/reminders';
import type { Trip } from '@/types';

let initialized = false;

async function init(): Promise<boolean> {
  if (!initialized) {
    initialized = true;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('dday', {
        name: 'D-day 준비 알림',
        importance: AndroidImportance.DEFAULT,
      });
    }
  }
  const cur = await Notifications.getPermissionsAsync();
  if (cur.granted) return true;
  if (!cur.canAskAgain) return false;
  const req = await Notifications.requestPermissionsAsync();
  return req.granted;
}

/** 이 여행의 알림을 지우고 남은 시점만 다시 예약 (오전 9시) */
export async function scheduleTripReminders(trip: Trip): Promise<number> {
  try {
    if (!(await init())) return 0;
    const prefix = `trip-${trip.id}-`;
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(existing.filter((n) => n.identifier.startsWith(prefix)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
    let count = 0;
    for (const d of REMINDER_POINTS) {
      const [y, m, day] = addDays(trip.departDate, -d).split('-').map(Number);
      const when = new Date(y, m - 1, day, 9, 0, 0);
      if (when.getTime() <= Date.now()) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${prefix}${d}`,
        content: { title: reminderTitle(d, trip.title), body: REMINDER_MESSAGES[d], data: { tripId: trip.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: 'dday' },
      });
      count++;
    }
    return count;
  } catch {
    return 0;
  }
}

export async function cancelTripReminders(tripId: string): Promise<void> {
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      existing.filter((n) => n.identifier.startsWith(`trip-${tripId}-`)).map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    // 무시
  }
}
