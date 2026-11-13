import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ConfirmHost } from '@/components/ConfirmHost';
import { ShareIntentBridge } from '@/components/ShareIntentBridge';
import { Button, Text } from '@/components/ui';
import { APP_CONFIG } from '@/config/app';
import { useClockStore } from '@/lib/clock';
import { repo } from '@/services/repo';
import { useBriefingStore } from '@/store/briefing';
import { useDocsStore } from '@/store/docs';
import { useLuggageStore } from '@/store/luggage';
import { useNotifyStore } from '@/store/notify';
import { useDisplayStore } from '@/store/display';
import { useOfflineStore } from '@/store/offline';
import { useSessionStore } from '@/store/session';
import { useTripStore } from '@/store/trip';
import { useVaultStore } from '@/store/vault';
import { fontFor } from '@/theme/fonts';
import { colors, spacing } from '@/theme/tokens';

const stores = [useSessionStore, useClockStore, useDocsStore, useBriefingStore, useLuggageStore, useNotifyStore, useDisplayStore, useVaultStore, useOfflineStore];

/** 저장된 상태 불러오기 + (온라인 모드) 익명 로그인 */
function useAppReady() {
  const [hydrated, setHydrated] = useState(() => stores.every((s) => s.persist.hasHydrated()));
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const check = () => setHydrated(stores.every((s) => s.persist.hasHydrated()));
    const unsubs = stores.map((s) => s.persist.onFinishHydration(check));
    check();
    return () => unsubs.forEach((u) => u());
  }, []);

  useEffect(() => {
    let alive = true;
    repo
      .ready()
      .then(() => alive && setAuthed(true))
      .catch((e) => alive && setAuthError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, [attempt]);

  // 인터넷이 없어 로그인을 못 해도, 저장해 둔 여행이 있으면 그대로 열어 줌
  const canOpenOffline = hydrated && !!authError && Object.keys(useOfflineStore.getState().byTrip).length > 0;
  return {
    ready: hydrated && (authed || canOpenOffline),
    authError,
    retry: () => {
      setAuthError(null);
      setAttempt((n) => n + 1);
    },
  };
}

/** 예기치 못한 오류 화면 (기본 개발자용 화면 대신) */
export function ErrorBoundary({ retry }: { error: Error; retry: () => Promise<void> }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background }}>
      <Text variant="label" center>
        문제가 생겼어요
      </Text>
      <Text variant="small" color="textMuted" center>
        입력한 내용은 저장되어 있어요. 다시 시도해 주세요.
      </Text>
      <Button title="다시 시도" onPress={retry} />
    </View>
  );
}

export default function RootLayout() {
  const { ready, authError, retry } = useAppReady();
  const dark = useDisplayStore((s) => s.dark);
  // 웹에서 새로고침해도 보던 여행을 이어서 보도록 마지막 여행을 다시 불러옴
  useEffect(() => {
    if (!ready) return;
    // 시연 때 바꿔 둔 날짜가 일반 사용에 남지 않게
    if (!APP_CONFIG.demoTools) useClockStore.getState().setOverride(null);
    const { tripId, load } = useTripStore.getState();
    const last = useSessionStore.getState().lastTripId;
    if (!tripId && last) load(last);
  }, [ready]);
  return (
    <SafeAreaProvider>
      <ShareIntentBridge>
        <StatusBar style={dark ? 'light' : 'dark'} />
        {ready ? (
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerShadowVisible: false,
              headerTintColor: colors.text,
              headerTitleStyle: { fontSize: 17, ...fontFor('700') } as never,
              contentStyle: { backgroundColor: colors.background },
              headerBackButtonDisplayMode: 'minimal',
            }}>
            <Stack.Screen name="index" options={{ headerShown: false, title: '내 여행' }} />
            <Stack.Screen name="trips" options={{ title: '내 여행' }} />
            <Stack.Screen name="privacy" options={{ title: '개인정보처리방침' }} />
            <Stack.Screen name="final-check" options={{ title: '' }} />
            <Stack.Screen name="lost" options={{ title: '분실·도난 대응' }} />
            <Stack.Screen name="course" options={{ title: '' }} />
            <Stack.Screen name="share-target" options={{ title: '' }} />
            <Stack.Screen name="create" options={{ title: '새 여행 만들기' }} />
            <Stack.Screen name="notifications" options={{ title: '알림' }} />
            <Stack.Screen name="weather" options={{ title: '현지 날씨' }} />
            <Stack.Screen name="exchange" options={{ title: '환율' }} />
            <Stack.Screen name="safety" options={{ title: '재난 정보' }} />
            <Stack.Screen name="join/index" options={{ title: '방 코드로 참여' }} />
            <Stack.Screen name="join/[code]" options={{ title: '여행 참여' }} />
            <Stack.Screen name="trip/[id]" options={{ headerShown: false, title: '여행' }} />
            <Stack.Screen name="item/[itemId]" options={{ title: '할 일' }} />
            <Stack.Screen name="add-item" options={{ title: '항목 추가', presentation: 'modal' }} />
            <Stack.Screen name="prep/[key]" options={{ title: '' }} />
            <Stack.Screen name="baggage" options={{ title: '' }} />
            <Stack.Screen name="members" options={{ title: '동행' }} />
            <Stack.Screen name="my" options={{ title: 'MY' }} />
            <Stack.Screen name="trip-edit" options={{ title: '여행 정보 수정' }} />
            <Stack.Screen name="settings" options={{ title: '설정' }} />
          </Stack>
        ) : (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl, backgroundColor: colors.background }}>
            {authError ? (
              <>
                <Text variant="label" center>
                  서버에 연결하지 못했어요
                </Text>
                <Text variant="small" color="textMuted" center>
                  인터넷 연결을 확인하고 다시 시도해 주세요.
                </Text>
                <Button title="다시 시도" onPress={retry} />
              </>
            ) : (
              <ActivityIndicator color={colors.brand} />
            )}
          </View>
        )}
        <ConfirmHost />
      </ShareIntentBridge>
    </SafeAreaProvider>
  );
}
