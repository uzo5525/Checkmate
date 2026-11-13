// 화면 설정 저장 (이 기기에만). 글자 크기는 바로 반영, 색 설정은 다음 실행 때 적용
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_DISPLAY, DISPLAY_STORAGE_KEY, type DisplaySettings } from '@/theme/display';

type DisplayState = DisplaySettings & {
  set: (patch: Partial<DisplaySettings>) => void;
};

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      ...DEFAULT_DISPLAY,
      set: (patch) => set(patch),
    }),
    { name: DISPLAY_STORAGE_KEY, storage: createJSONStorage(() => AsyncStorage) },
  ),
);
