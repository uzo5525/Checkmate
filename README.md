# Checkmate

해외여행 출발 전 D-day 준비를 동행자와 함께 관리하고, AI 준비 에이전트가 오늘 할 일을 정리해 주는 Android 앱입니다.
SVC Seoul AI 해커톤 "출발 전, D-day 점검 에이전트" 과제 · 팀 **여행의 숲**

## 기능

- **D-day 체크리스트**: 여행지(일본·베트남·태국·대만·미국)·국적·일정·인원으로 D-30 ~ D-1 시점별 체크리스트 생성. 필수 6개(비자, 입국신고, eSIM, 환전, 여행자보험, 반입 금지 품목) 포함. 내 항목 추가·수정, 놓친 할 일 강조
- **AI 준비 에이전트** (홈): 규칙으로 상황 감지(놓친 일·D-day 단계·여행 날 비 예보·동행 정체) → 상황이 바뀔 때만 AI가 "오늘 할 일 3가지"·할 일 제안·역할 분담 팁과 **바로 실행할 행동**(담당 지정, 비 오는 날 일정 옮기기, 짐 추가)을 제안 → 승인하면 앱이 실행. AI를 못 쓰면 규칙 기반으로 대체
- **AI에게 물어보기**: Checkmate 데이터(체크리스트·반입 규정·나라 정보) 안에서만 쉬운 말로 답변 + 출처 + 체크리스트 추가 제안 (여행당 하루 20회)
- **함께 준비**: 6자리 방 코드로 닉네임만 입력해 참여(익명 로그인), 개인/공유 체크리스트, 담당자 지정, 진행률만 공유, 방장 권한(편집 권한·내보내기·방장 넘기기), 실시간 반영
- **여행 코스**: 지도에서 장소 제안·투표 (구글맵 앱 공유 → Checkmate, 링크 붙여넣기, 지도 길게 눌러 핀) → **AI 일정 정리**(좌표로 묶기는 코드, 날짜별 테마·순서는 AI) → 날짜별 동선 지도, 구글맵 길찾기 연결
- **여권·보험 확인** (체크리스트 항목 안): 여권 사진 → 폰 안에서 MRZ 읽기(여권번호·사진 저장 안 함) → 나라별 유효기간 요건 대조 / 보험 보장 기간 ↔ 여행 일정 대조. 문제가 있으면 해결 전까지 완료 불가 + 후속 조치 안내
- **짐**: 기간·나라 기준 짐 리스트(수량·챙김 체크), 반입 규정 판정(보조배터리 Wh 계산·액체류·스프레이·날카로운 물품·식품), 라벨 사진으로 용량 읽기
- **알림**: D-30·14·7·3·1·D-DAY 오전 9시 로컬 알림
- **D-day 시뮬레이터** (MY): 오늘 날짜를 바꿔 시점별 화면 변화를 시연

> ⚠️ 체크리스트·수하물 규정 데이터는 전부 **검증 전 초안**입니다. [DATA_TODO.md](DATA_TODO.md) 참고.

## 비용 원칙 (API 최소 사용)

| 영역 | 방식 | 비용 |
|---|---|---|
| 체크리스트·판정·대조·일정 묶기 | 규칙 코드 (폰 안) | 0 |
| 여권·라벨 문자 인식 | Google ML Kit (폰 안) | 0 |
| 지도 | Google Maps SDK, **맵 ID 없이** (무료 SKU), 장소 검색·지오코딩·길찾기 API 미사용 | 0 |
| AI 브리핑·일정 정리 | Claude API, Supabase Edge Function 경유, 여행당·전체 일일 상한 + 캐시 | 선불 충전 범위 |
| DB | Supabase 무료 플랜 | 0 |

- 구글 클라우드: 지도 SDK 일일 상한(지도 300회/일 등) + 예산 1원 감지 시 결제 자동 차단 함수([infra/billing-killswitch](infra/billing-killswitch))
- Anthropic: 선불 크레딧 + 자동 충전 꺼짐. 키는 Supabase Secrets(`ANTHROPIC_API_KEY`)에만 있음

## 실행

```bash
npm install
npm run web        # 브라우저에서 확인 (지도·문자 인식·알림·공유는 앱에서만)
npm start          # 개발 서버 (지도 등 네이티브 모듈이 있어 Expo Go 대신 개발 빌드 필요)
```

- 첫 화면의 **샘플 여행 만들기**로 "오사카 4박 5일 · 4명" 방이 만들어집니다 (가상 동행자 3명, 진행 상황, 투표 장소 6곳 포함).

### 검사

```bash
npm run typecheck  # tsc
npm run lint       # eslint
npm test           # MRZ·OCR 파서, 짐 판정, D-day 분류, 지도 링크 해석, 일정 묶기 (Node 22.6+)
```

## 환경변수 (`.env`, EAS 환경변수에도 등록됨)

| 변수 | 설명 |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable(anon) 키 — 앱에 들어가도 되는 공개 키 |
| `GOOGLE_MAPS_ANDROID_API_KEY` | 안드로이드 지도 키 (패키지+서명 제한, Maps SDK 전용) |

Supabase Edge Function 쪽: `ANTHROPIC_API_KEY` (Secrets), 선택 `AI_MODEL` (기본 `claude-haiku-5-5`).
해커톤 기간에는 `ANTHROPIC_API_KEY_HACKATHON`(운영진 지급 키)이 있으면 그걸 먼저 씀 — 행사 후 이 Secret 을 지우면 우리 키로 돌아감.
Supabase 키가 없으면 **로컬 모드**(이 기기에만 저장)로 동작합니다.

## 서버 설정 (Supabase)

1. `supabase/schema.sql` → `supabase/migrations/002_places.sql` → `003_auth_rls.sql` → `004_demo_seed.sql` → `005_ai_usage.sql` 순서로 실행
2. Authentication에서 **Anonymous sign-ins** 켜기
3. Edge Functions 배포
   ```bash
   npx supabase functions deploy ai-briefing --project-ref <ref> --use-api
   ```
   ```bash
   npx supabase functions deploy ai-itinerary --project-ref <ref> --use-api
   ```
   ```bash
   npx supabase functions deploy ai-ask --project-ref <ref> --use-api
   ```

## APK / AAB 빌드 (EAS)

```bash
npx eas-cli@latest build -p android --profile preview
```

- `preview` = 설치용 APK, `production` = 플레이스토어 업로드용 AAB
- 플레이스토어 업로드 후에는 **Play 앱 서명 인증서의 SHA-1**을 구글 클라우드 지도 키 제한에 추가해야 지도가 보입니다

## 구조

```
src/
  app/                 화면 (expo-router)
    index.tsx          내 여행 / 생성 / 참여 / 샘플
    trip/[id]/         여행 방 하단 탭: 홈 · 준비 · 짐 · 동행 · MY
    course.tsx         여행 코스 (지도 투표 · 날짜별 일정)
    share-target.tsx   다른 앱에서 공유받은 장소 → 여행 선택
    item/[itemId].tsx  항목 상세 (여권·보험 확인 포함)
    trip-edit.tsx      여행 정보 수정·삭제
  components/ui/       기본 UI 컴포넌트 (디자인 교체 시 여기와 theme/tokens.ts 만 수정)
  components/          기능 컴포넌트 (BriefingCard, TripMap, ItemCheckCard, HomeHero, DdayTimeline …)
  hooks/               화면별 데이터/로직 훅
  lib/                 순수 로직: checklist, agentSignals, itinerary, mapsLink, ocrText, mrz, baggage, dates, clock
  services/            repo(로컬/Supabase), documentCheck, ocr(ML Kit), notifications, sample
  store/               zustand (세션, 여행, 서류·짐·브리핑은 기기에만)
  data/countries/      나라별 규칙 데이터 + 공통 항목
supabase/              schema, migrations, functions(ai-briefing, ai-itinerary)
infra/                 구글 클라우드 결제 차단 함수
docs/                  개인정보처리방침 초안, 기획 프롬프트
```

## 남은 TODO

**데이터**
- [ ] [DATA_TODO.md](DATA_TODO.md) 의 모든 항목을 공식 출처로 확인하고 `verified: true` 로 변경

**출시**
- [ ] 개인정보처리방침([docs/privacy-policy.md](docs/privacy-policy.md)) 빈칸 채워 공개 페이지에 게시
- [ ] 앱 아이콘·스플래시를 디자인 결과물로 교체 (지금은 임시 아이콘)
- [ ] Play Console: 비공개 테스트 트랙에 AAB 업로드, 테스터 12명 × 14일, 데이터 보안 양식
- [ ] 업로드 후 Play 앱 서명 SHA-1 을 지도 키에 추가
- [ ] 출시 시 지도 일일 상한(현재 300회) 상향 검토 (맵 ID 없는 지도는 무료 SKU)

**기능**
- [ ] 수익화 (프리미엄·제휴 등) — 지금 AI 기능은 하루 상한 내 무료
- [ ] 제휴 링크 (eSIM·환전 등)
- [ ] AI 결과 보관 기간 정책과 자동 삭제
