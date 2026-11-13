// 웹에는 안드로이드 공유 시트가 없으므로 그대로 통과
import type { ReactNode } from 'react';

export function ShareIntentBridge({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
