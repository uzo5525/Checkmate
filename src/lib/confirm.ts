// 확인 대화상자. 화면은 ConfirmHost 가 앱 디자인으로 그립니다.
import { create } from 'zustand';

type ConfirmRequest = { title: string; message: string; okLabel: string; danger: boolean; resolve: (ok: boolean) => void };

type ConfirmState = { request: ConfirmRequest | null; close: (ok: boolean) => void };

export const useConfirmStore = create<ConfirmState>()((set, get) => ({
  request: null,
  close(ok) {
    get().request?.resolve(ok);
    set({ request: null });
  },
}));

/** danger: 삭제처럼 되돌릴 수 없는 동작이면 빨간 버튼 */
export function confirm(title: string, message: string, okLabel = '확인', danger = true): Promise<boolean> {
  useConfirmStore.getState().request?.resolve(false);
  return new Promise((resolve) => useConfirmStore.setState({ request: { title, message, okLabel, danger, resolve } }));
}
