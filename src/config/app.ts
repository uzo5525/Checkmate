// 앱 이름·패키지명·브랜드 색상. 팀명/앱명이 바뀌면 여기만 수정하세요.
// app.config.ts 에서도 import 하므로 RN 전용 코드를 넣지 마세요.

export const APP_CONFIG = {
  name: 'Checkmate',
  nameEn: 'Checkmate',
  slug: 'readygo',
  scheme: 'readygo',
  androidPackage: 'com.yeohaengsup.readygo',
  iosBundleId: 'com.yeohaengsup.readygo',
  teamName: '여행의 숲',
  version: '1.0.0',
  // Play 에 새로 올릴 때마다 1씩 올림
  versionCode: 2,
  // 발표용 도구(D-day 시뮬레이터, 패키지 모드, 시연용 방 코드). 시연할 때만 true
  demoTools: false as boolean,
  // 공개 문의 메일. 비어 있으면 개인정보처리방침이 Play 개발자 연락처로 안내
  contactEmail: '' as string,
  colors: {
    brand: '#7952D6',
    brandSoft: '#F3EEFC',
    splashBackground: '#7952D6',
  },
} as const;

// 공유 링크: readygo://join/<code>
export function joinDeepLink(code: string): string {
  return `${APP_CONFIG.scheme}://join/${code}`;
}
