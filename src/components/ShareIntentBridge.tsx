// 다른 앱(구글 지도 등)에서 "공유 → Checkmate"로 들어온 텍스트를 받아 장소 추가 화면으로 보냄
import { router } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import { useEffect, type ReactNode } from 'react';

import { useShareInbox } from '@/store/shareInbox';

function Listener() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const put = useShareInbox((s) => s.put);
  useEffect(() => {
    if (!hasShareIntent) return;
    const text = [shareIntent.text, shareIntent.webUrl].filter(Boolean).join('\n');
    if (text) {
      put(text);
      router.push('/share-target');
    }
    resetShareIntent();
  }, [hasShareIntent, shareIntent, resetShareIntent, put]);
  return null;
}

export function ShareIntentBridge({ children }: { children: ReactNode }) {
  return (
    <ShareIntentProvider options={{ resetOnBackground: true }}>
      <Listener />
      {children}
    </ShareIntentProvider>
  );
}
