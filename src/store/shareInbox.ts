// 공유로 받은 텍스트를 잠시 보관 (여행을 고른 뒤 장소 추가 화면에 넘김)
import { create } from 'zustand';

type ShareInbox = {
  text: string | null;
  put: (text: string) => void;
  take: () => string | null;
};

export const useShareInbox = create<ShareInbox>()((set, get) => ({
  text: null,
  put: (text) => set({ text }),
  take: () => {
    const t = get().text;
    set({ text: null });
    return t;
  },
}));
