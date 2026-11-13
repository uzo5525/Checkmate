# HANDOFF — Checkmate

> 마지막 정리: 2026-11-02 · 브랜치 `master` (최신 커밋 `37a366e`)
> ⚠️ 이 문서에는 API 키, `.env` 값, 비밀번호를 적지 않는다. 키는 Supabase Secrets와 EAS 환경변수에만 있다.

## 2026-11-04 화면 개편 (디자인 시안 반영)

- 앱 이름 Checkmate, 보라 테마, 글꼴 Pretendard(앱은 assets/fonts, 웹은 CDN), 아이콘 Lucide. 글자 크기·여백은 시안 CSS 값
- 하단 탭: 홈 / 준비 목록 / 보관함. 짐(`/baggage`)·동행(`/members`)·MY(`/my`)는 탭에서 빠지고 일반 화면으로 이동
- 홈: 준비율 %, 다음 할 일 하나, AI 에이전트+질문(`HomeAgent`). 기기 설정이 다크면 다크로 시작
- 준비 목록: 체크리스트를 6개 카드로 묶음(`lib/prepCards.ts`), 카드 상세 `/prep/[key]`, D-day 순서 보기 유지
- 보관함: 사진·PDF를 이 기기에만 저장(`store/vault.ts`)
- 지도·여정은 진입점만 뺌. `course.tsx` 등 코드는 남겨 둠, 되살리려면 진입 버튼과 일정 옮기기(`useBriefing`)만 복구
- 웹 여권 OCR: Tesseract.js(`services/ocr.web.ts`). 예시 글자 이미지로만 확인, 실제 여권 사진은 미확인
- APK는 네이티브 패키지 추가(svg, file-system, document-picker, sharing)로 재빌드 필요

## 1. 프로젝트 한 줄 요약
해외여행 출발 전 D-day 준비를 동행자와 함께 관리하고, AI 준비 에이전트가 오늘 할 일을 정리해 주는 Android 앱.
SVC Seoul AI 해커톤 본선 진출 · 팀 **여행의 숲** · 과제 "출발 전 D-day 점검 에이전트".
기능·구조·실행 방법은 [README.md](../../README.md) 참고.

## 2. 일정 (해커톤 본선)
| 날짜 | 내용 |
|---|---|
| 11/2 (월) 12:30 | 현장 킥오프, 멘토링(AI 멘토 + 하나투어), 15:40 그룹별 기획안 발표·피드백 — 팀원 전원 참석 |
| 11/3~5 | 온라인 팀별 개발 (11/3 09:00 시작) |
| **11/5 (목)** | **산출물 이메일 제출** (마감 시각·주소는 별도 공지) |
| **11/6 (금) 12:30** | **최종 발표 7분 + 질의응답 3분**, 20팀 중 3팀 시상 — 팀원 전원 참석 |

- AI 생성물·외부 자료는 출처 표시 필요 (예: "Claude로 개발, AI 기능은 Claude API 사용")
- 해커톤 목표: Google Play **비공개 테스트 링크**. 장기 목표: 정식 출시.

## 3. 주요 결정사항
**범위**
- 지원 국가 5개: 일본·베트남·태국·대만·미국 (국가 데이터는 전부 검증 전 초안)
- 서류 확인은 여권(폰 안 MRZ 읽기)·여행자보험(날짜 대조)만, 체크리스트 항목 안에서
- 짐 사진 비전 판정은 제외. 짐 리스트 + 반입 규정(규칙) + 라벨 문자 인식만
- 앱 이름은 Checkmate로 변경 (이전 이름 레디고). 패키지명 `com.yeohaengsup.readygo`, 스킴·저장소 키·웹 주소의 readygo는 유지

**AI (API 최소 사용)**
- AI는 두 곳만: ① 홈 "AI 준비 에이전트" 브리핑 ② 여행 코스 "AI로 일정 짜기"
- 모델: **Claude Haiku 5.5** (`claude-haiku-5-5`, 2026-10-31 Opus에서 변경). Supabase Secret `AI_MODEL`로 바꿀 수 있음
- 호출 경로: 앱 → Supabase Edge Function(`ai-briefing`, `ai-itinerary`) → Claude. 키는 서버에만
- 상한: 브리핑 여행당 하루 12회·전체 150회 / 일정 여행당 하루 3회·전체 40회. 같은 날 결과는 캐시
- 브리핑 자동 호출은 동행자마다 하루 1회. (출시 전 "중요한 날만 호출"로 줄이는 안은 **보류 — 출시 때 결정**)
- AI 실패 시 규칙 기반 브리핑 / 거리 기반 일정으로 대체
- **해커톤 기간에는 운영진 지급 키 사용**: Secret `ANTHROPIC_API_KEY_HACKATHON`이 있으면 먼저 씀(설정 완료, 동작 확인). 없으면 우리 선불 키 `ANTHROPIC_API_KEY`
- 우리 Anthropic 계정: 선불 크레딧, 자동 충전 꺼짐

**지도 (무조건 무료)**
- 과거 요금 폭탄 경험 → 앱 안 장소 검색·지오코딩·길찾기 API **사용 안 함**, 맵 ID 없음
- 장소 추가: 구글맵 앱 "공유 → Checkmate", 링크 붙여넣기, 지도 길게 눌러 핀
- 구글 클라우드: 지도 SDK 일일 상한 + 예산 1원 감지 시 결제 자동 차단 함수 ([infra/billing-killswitch](../../infra/billing-killswitch))

**수익화**
- 해커톤 기간에는 결제·제휴·광고 없음, 모든 기능 개방
- 이후 계획(손해 없는 구조만, 개인 데이터 판매 금지, 광고는 배너·보상형 정도): [docs/revenue-plan.md](../revenue-plan.md)
- 가격안: 여행 1회권 4,900원 + 연간 19,900원, 결제자 = 부모님 여행을 챙기는 자녀
- 제휴(CPS/CPA)·B2B 정리와 연락 메일은 **해커톤 끝난 뒤** 진행. 메일은 초안 → 사용자 확인 → 발송

## 4. 현재 상태
**배포·인프라**
- Supabase: 스키마·마이그레이션(002~005) 적용, 익명 로그인 켜짐, Edge Functions 2개 배포(최신)
- EAS: preview(APK)·production(AAB) 프로필, 환경변수 등록됨
- 최신 APK 빌드: `e1f5d57f` (여권 인식 수정 포함). 다운로드는 EAS 빌드 페이지에서

**최근 해결한 문제**
- 앱 시작 즉시 크래시 → R8이 WorkManager(알림)의 Room 클래스를 지움 → `expo-build-properties`로 keep 규칙 추가 (실기기에서 실행 확인)
- 갤럭시 하단 내비게이션 바와 탭 바 겹침 → safe-area 적용
- 여권 인식 실패 → 한국 여권은 `PMKOR…`로 시작. 안내 문구 수정 + MRZ 2번째 줄만으로 만료일 읽기(체크 디지트 검증, 0/O 오인식·줄 조각 보정)

**검증된 것 (웹)**: 익명 로그인, 샘플 여행, 실시간 공유·투표, AI 브리핑, AI 일정(Haiku), 여권 기한 부족 시 완료 차단
**실기기 확인된 것**: 앱 실행(크래시 없음)
**실기기 미확인**: 지도 표시·핀, 실제 여권 사진 인식, 라벨 인식, 알림, 구글맵 공유 → Checkmate, 탭 바 수정

**테스트**: `npm test` 26개 통과, `tsc`·`eslint` 통과

**디버깅 도구**: adb를 `%LOCALAPPDATA%\Android\platform-tools-dl\platform-tools\adb.exe`에 설치해 둠 (폰 USB 디버깅 연결 시 `adb logcat -b crash`로 크래시 확인)

## 5. 남은 할 일
**해커톤 (11/5 제출 전)**
- [ ] 실기기에서 미확인 기능 전부 테스트 (특히 여권 사진, 지도, 공유)
- [ ] "프리미엄 체험" → "AI" 배지 문구 변경이 들어간 APK 다시 빌드 (현재 APK에는 미포함)
- [ ] 7분 발표 흐름 + 시연 순서 (D-day 시뮬레이터 활용), 발표 자료에 AI 사용 출처 표시
- [ ] 11/5 제출물 준비 (제출 공지 확인)
- [ ] 현장에서 운영진에게 확인: 행사 키 사용 한도, 행사 후 사용 가능 기간

**출시 준비**
- [ ] 데이터 검증: [DATA_TODO.md](../../DATA_TODO.md) 전 항목 공식 출처 확인 후 `verified: true`
- [ ] 개인정보처리방침([docs/privacy-policy.md](../privacy-policy.md)) 빈칸 채워 공개 페이지 게시
- [ ] Play Console 본인 확인 → AAB 비공개 테스트 업로드 → 테스터 12명 × 14일
- [ ] 업로드 후 Play 앱 서명 SHA-1을 지도 키 제한에 추가
- [ ] 앱 아이콘을 디자이너 결과물로 교체 (지금은 임시)

**행사 후 (11/6 이후)**
- [ ] Supabase Secret `ANTHROPIC_API_KEY_HACKATHON` 삭제 → 우리 키로 복귀 (우리 키 값을 따로 보관하지 않았다면 Anthropic 콘솔에서 새 키 발급 후 `ANTHROPIC_API_KEY`에 넣기)
- [ ] 브리핑 자동 호출 줄이기(중요한 날만) 검토
- [ ] 수익화: 제휴 조건 조사·메일 초안, B2B 소개서, 유료 이용권(RevenueCat), 가족 대신 챙기기 기능
- [ ] 지도 일일 상한(300회) 상향 검토

## 6. 주의사항
- 키·비밀값은 채팅, GitHub, 발표 자료에 절대 올리지 않는다. 앱에 들어가는 값은 `EXPO_PUBLIC_*`(공개용)뿐
- Supabase 무료 플랜은 1주 넘게 사용이 없으면 일시 정지될 수 있음
- EAS 무료 플랜은 빌드 대기열이 길다 (대기 20분 + 빌드 15분 정도)
- Windows에서는 `npx.cmd`·`npm.cmd` 사용 (PowerShell 실행 정책)

## 실제 출시 전 남은 일 (2026-11-04 점검)
- `src/config/app.ts`의 `demoTools`를 false로 (D-day 시뮬레이터, 샘플 여행, 시연용 방 코드 숨김). 발표가 끝난 뒤에.
- 날씨 API Open-Meteo 무료판은 비상업용. 수익을 내면 유료 플랜이나 다른 API로 교체.
- 환율 API는 출처 표시가 필요. 환율 화면에 표시되는지 확인.
- 개인정보처리방침(`docs/privacy-policy.md`) 빈칸을 채워 공개하고 앱에 링크. 온라인 데이터 삭제 요청 경로도 필요.
- `DATA_TODO.md`의 비자·비상 번호·재난 안내를 공식 출처로 확인.
- 패키지명·웹 주소·앱 아이디에 readygo가 남아 있음. 패키지명은 Play 첫 업로드 후 못 바꿈.
- 실기기 시험: 사진·파일 고르기, OCR, 복사, 공유로 장소 받기, 구글 지도 표시, 알림.

## 2026-11-06 출시 준비
- 행사 지급 키(`ANTHROPIC_API_KEY_HACKATHON`)는 Supabase Secrets와 코드에서 제거함. 이제 `ANTHROPIC_API_KEY`(우리 선불 키)만 사용
- 버전 1.0.0 / versionCode 1. Play에 다시 올릴 때 `src/config/app.ts`의 versionCode를 올림
- `demoTools=false`: 시뮬레이터·패키지 모드·시연용 방 코드 숨김. 샘플 여행은 "둘러보기"로 유지
- 개인정보처리방침 공개 주소: https://readygo.expo.app/privacy (`src/app/privacy.tsx`)
- 서버에 시연용 패키지 방(HANA26)이 남아 있음. 공개 전 삭제 권장
