import type { IconName } from '@/components/ui';

// 여행 방 하단 탭 (홈 · 준비 목록 · 여행 코스 · 보관함).
// 새 탭은 src/app/trip/[id]/<name>.tsx 를 만들고 여기에 추가하세요. highlight = 가운데 원형 강조.
export const TRIP_TABS: { name: string; title: string; icon: IconName; activeIcon: IconName; highlight?: boolean }[] = [
  { name: 'index', title: '홈', icon: 'home', activeIcon: 'homeActive' },
  { name: 'prepare', title: '준비 목록', icon: 'checklist', activeIcon: 'checklistActive' },
  { name: 'course', title: '여행 코스', icon: 'map', activeIcon: 'map' },
  { name: 'saved', title: '보관함', icon: 'folder', activeIcon: 'folderActive' },
];
