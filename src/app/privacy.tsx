// 개인정보처리방침. 웹 주소(/privacy)가 Google Play 등록용 공개 페이지입니다. docs/privacy-policy.md 와 내용을 맞춰 주세요.
import { Screen, SectionHeader, Stack, Text } from '@/components/ui';
import { APP_CONFIG } from '@/config/app';

const contact = APP_CONFIG.contactEmail || 'Google Play 앱 정보에 있는 개발자 연락처';

const SECTIONS: { title: string; lines: string[] }[] = [
  {
    title: '1. 처리하는 정보',
    lines: [
      '서버에 저장: 기기별 익명 식별자, 닉네임, 여행지·국적·날짜·인원, 방 코드, 체크 여부, 직접 추가한 할 일, 담당자, 제안한 장소와 투표, 날짜별 일정.',
      '이 기기에만 저장: 여권 영문 성명과 만료일, 보험 보장 기간, 보관함 파일, 질문 답변, 숙소 주소, 짐 리스트, 오프라인용 여행 사본.',
      '회원가입이 없으며 이메일, 전화번호, 위치(GPS), 연락처, 결제 정보를 수집하지 않습니다.',
      '여권번호와 생년월일은 저장하지 않습니다. 서류 사진은 기기 안에서 글자만 읽으며, 직접 보관함에 넣은 파일만 기기에 남습니다.',
    ],
  },
  {
    title: '2. 동행자에게 보이는 정보',
    lines: [
      '닉네임, 개인 체크리스트 진행률, 공유 항목과 담당자, 제안한 장소와 투표가 보입니다.',
      '방장에게는 여권·보험·비자·입국 서류 항목의 체크 여부도 보입니다. 서류 내용은 보이지 않습니다.',
    ],
  },
  {
    title: '3. 외부 서비스',
    lines: [
      'Supabase (일본 도쿄 리전): 서버 데이터 저장과 동기화.',
      'Anthropic (Claude API): AI 브리핑·일정·질문 답변을 위해 남은 날짜, 할 일 제목과 완료 여부, 동행 진행률 수치, 장소 이름, 질문 내용을 보냅니다. 지도 링크를 넣으면 장소 이름과 주소도 보냅니다. 서류 정보와 사진은 보내지 않습니다.',
      'OpenStreetMap Nominatim: 지도 링크의 영어 장소 이름과 주소로 위치를 찾습니다.',
      'Google Maps SDK(앱), OpenFreeMap(웹): 지도 표시. Google ML Kit(앱), Tesseract(웹): 기기 안에서 글자 인식.',
      'Open-Meteo, ExchangeRate-API, P2P지진정보, GDACS, USGS: 날씨, 환율, 재난 정보 조회. 여행지 정보만 사용합니다.',
      '위 서비스에 요청할 때 기기의 인터넷 주소(IP)가 전달될 수 있습니다.',
    ],
  },
  {
    title: '4. 보관과 삭제',
    lines: [
      '서버 정보는 방장이 여행을 삭제하거나 멤버가 여행에서 나가면 삭제됩니다. AI 결과도 여행을 삭제할 때 함께 삭제됩니다.',
      '기기에 저장한 정보는 앱에서 지우거나 앱을 삭제하면 사라집니다.',
      '앱을 삭제하면 익명 식별자가 사라져 이전 여행에 다시 접근할 수 없으니, 먼저 앱에서 여행을 삭제하거나 나가 주세요. 그러지 못했다면 아래 연락처로 방 코드와 함께 삭제를 요청할 수 있습니다.',
    ],
  },
  { title: '5. 아동', lines: ['만 14세 미만 아동을 대상으로 하지 않습니다.'] },
  { title: '6. 문의', lines: [`운영: ${APP_CONFIG.teamName}`, `연락처: ${contact}`, '방침이 바뀌면 이 페이지에서 알려 드립니다.'] },
];

export default function PrivacyScreen() {
  return (
    <Screen>
      <Text variant="small" color="textMuted">
        {APP_CONFIG.name} · 시행일 2026년 11월 6일
      </Text>
      {SECTIONS.map((s) => (
        <Stack key={s.title} gap="sm">
          <SectionHeader title={s.title} />
          {s.lines.map((line) => (
            <Text key={line} variant="small">
              {line}
            </Text>
          ))}
        </Stack>
      ))}
    </Screen>
  );
}
