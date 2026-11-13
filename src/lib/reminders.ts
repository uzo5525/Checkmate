// D-day 알림 문구·시점 (폰 알림 예약과 알림 화면이 같이 씀)
import { addDays } from './dates';

export const REMINDER_POINTS = [30, 14, 7, 3, 1, 0];

export const REMINDER_MESSAGES: Record<number, string> = {
  30: '여권 유효기간·비자·여행자보험부터 확인해요.',
  14: 'eSIM·환전, 공항에서 숙소 가는 길을 정할 때예요.',
  7: '입국신고 준비와 반입 금지 품목을 확인해요.',
  3: '날씨를 보고 짐을 싸기 시작해요.',
  1: '서류 최종 확인과 온라인 체크인을 해요.',
  0: '오늘 출발이에요. 여권과 보조배터리를 챙기세요.',
};

export const reminderTitle = (point: number, tripTitle: string) => `${point === 0 ? 'D-DAY' : `D-${point}`} · ${tripTitle}`;

export type Reminder = { point: number; date: string; title: string; body: string };

/** 출발일 기준 알림 목록 (오전 9시). today 기준으로 이미 온 것 / 올 것 구분 */
export function tripReminders(departDate: string, tripTitle: string, today: string): { received: Reminder[]; upcoming: Reminder[] } {
  const all = REMINDER_POINTS.map((point) => ({
    point,
    date: addDays(departDate, -point),
    title: reminderTitle(point, tripTitle),
    body: REMINDER_MESSAGES[point],
  }));
  return {
    received: all.filter((r) => r.date <= today).reverse(), // 최근 것이 위로
    upcoming: all.filter((r) => r.date > today),
  };
}
