// 체크리스트 항목 안에서 바로 쓰는 연락처·링크.
// 공관 번호는 외교부 공관 홈페이지 기준 (2026-11-04 확인). 현지 번호 중 VN 113·115, TH 191·1669 는 공식 페이지 미확인 → DATA_TODO.md
export type Contact = { label: string; number: string };

export const CONSULAR_CALL_CENTER: Contact = { label: '영사콜센터 (24시간)', number: '+82-2-3210-0404' };

export const EMERGENCY_CONTACTS: Record<string, Contact[]> = {
  JP: [
    { label: '경찰', number: '110' },
    { label: '화재·구급', number: '119' },
    { label: '대사관 대표', number: '+81-3-3452-7611' },
    { label: '대사관 영사과', number: '+81-3-3455-2601' },
    { label: '대사관 야간·휴일 긴급', number: '+81-70-2153-5454' },
  ],
  VN: [
    { label: '경찰', number: '113' },
    { label: '구급', number: '115' },
    { label: '대사관 영사 업무', number: '+84-24-3771-0404' },
    { label: '대사관 긴급 (24시간)', number: '+84-90-402-6126' },
  ],
  TH: [
    { label: '경찰', number: '191' },
    { label: '관광경찰', number: '1155' },
    { label: '구급', number: '1669' },
    { label: '대사관 대표', number: '+66-2-481-6000' },
    { label: '대사관 당직 (24시간)', number: '+66-81-914-5803' },
  ],
  TW: [
    { label: '경찰', number: '110' },
    { label: '화재·구급', number: '119' },
    { label: '대표부 대표', number: '+886-2-2758-8320' },
    { label: '대표부 근무시간 외 긴급', number: '+886-912-069-230' },
  ],
  US: [
    { label: '경찰·화재·구급', number: '911' },
    { label: '대사관 대표', number: '+1-202-939-5600' },
    { label: '대사관 근무시간 외 긴급', number: '+1-202-641-8761' },
  ],
};

export type EntryLink = { title: string; url: string; saveName: string; steps: string; saveNote: string };

export const ENTRY_LINKS: Record<string, EntryLink> = {
  JP: {
    title: 'Visit Japan Web 열기',
    url: 'https://www.vjw.digital.go.jp/',
    saveName: 'Visit Japan Web QR',
    steps: '계정을 만들고 여권·항공편·숙소를 등록하면 입국심사·세관신고 QR이 나와요.',
    saveNote: '공항에서는 사이트의 QR을 바로 보여 주세요. 인터넷이 안 될 때를 대비해 캡처본도 보관함에 넣어 두면 좋아요.',
  },
  TH: {
    title: 'TDAC 작성하기',
    url: 'https://tdac.immigration.go.th/',
    saveName: 'TDAC 확인서',
    steps: '입국 전에 온라인으로 작성하면 확인서가 나와요.',
    saveNote: '확인서를 보관함에 넣어 두면 입국할 때 바로 꺼낼 수 있어요.',
  },
  TW: {
    title: '온라인 입국신고 열기',
    url: 'https://twac.immigration.gov.tw/',
    saveName: '대만 입국신고 확인',
    steps: '입국 전에 온라인으로 신고하면 확인 화면이 나와요.',
    saveNote: '확인 화면을 캡처해 보관함에 넣어 두세요.',
  },
  US: {
    title: 'ESTA 신청하기',
    url: 'https://esta.cbp.dhs.gov/',
    saveName: 'ESTA 승인 확인서',
    steps: '공식 사이트에서 신청하고 승인 결과를 확인하세요.',
    saveNote: '승인 확인서를 보관함에 넣어 두세요.',
  },
};

export type SafetyLink = { name: string; sub: string; url: string; only?: 'ios' | 'android' };
export type SafetyGuide = { hazards: string; receive: string; links: SafetyLink[]; actions: string[] };

const MOFA_LINK: SafetyLink = { name: '외교부 해외안전여행', sub: '여행경보와 안전 공지', url: 'https://www.0404.go.kr/' };

export const SAFETY_GUIDES: Record<string, SafetyGuide> = {
  JP: {
    hazards: '지진 · 쓰나미 · 태풍',
    receive: '일본의 긴급 지진 속보는 한국 유심 로밍이나 해외 eSIM으로는 받지 못할 수 있어요. 일본 관광청이 감수한 Safety Tips 앱을 설치하면 지진 긴급 속보, 쓰나미, 태풍, 대피 정보를 한국어로 받을 수 있어요.',
    links: [
      { name: 'Safety Tips 설치 (아이폰)', sub: '일본 관광청 감수 · 한국어', url: 'https://apps.apple.com/kr/app/id858357174', only: 'ios' },
      { name: 'Safety Tips 설치 (안드로이드)', sub: '일본 관광청 감수 · 한국어', url: 'https://play.google.com/store/apps/details?id=jp.co.rcsc.safetyTips.android', only: 'android' },
      MOFA_LINK,
    ],
    actions: [
      '흔들리면 머리를 보호하고 탁자 아래로 들어가요. 멈춘 뒤 출구를 확보해요.',
      '바다나 강 근처에서 쓰나미 경보가 나오면 바로 높은 곳으로 걸어서 대피해요.',
      '경보가 풀릴 때까지 해안으로 돌아가지 않아요.',
    ],
  },
  TW: {
    hazards: '지진 · 태풍',
    receive: '대만은 재난 문자(PWS)를 현지 통신망으로 보내요. 로밍이나 해외 eSIM에서 받을 수 있는지는 확인되지 않아, 대만 기상서 안내를 직접 확인하는 게 안전해요.',
    links: [{ name: '대만 중앙기상서', sub: '지진·태풍 정보 (영문)', url: 'https://www.cwa.gov.tw/V8/E/' }, MOFA_LINK],
    actions: ['흔들리면 머리를 보호하고 탁자 아래로 들어가요.', '태풍 특보가 나오면 항공·페리 운항과 산간 지역 통제를 확인해요.'],
  },
  TH: {
    hazards: '홍수·폭우 · 남부 해안 쓰나미',
    receive: '태국은 휴대폰 재난 문자(Cell Broadcast)를 도입하고 있어요. 앱 없이 받는 방식이지만 로밍에서 받을 수 있는지는 확인되지 않았어요.',
    links: [{ name: '태국 기상청', sub: '기상 특보 (영문)', url: 'https://www.tmd.go.th/en' }, MOFA_LINK],
    actions: ['해안에서 쓰나미 경보가 나오면 바로 높은 곳으로 대피해요.', '도움이 필요하면 관광경찰 1155에 연락해요.'],
  },
  VN: {
    hazards: '태풍 · 홍수',
    receive: '여행자용 공식 경보 앱은 찾지 못했어요. 출발 전과 여행 중에 외교부 안전 공지와 현지 일기예보를 확인하세요.',
    links: [MOFA_LINK],
    actions: ['태풍이 예보되면 중부 해안·산간 이동을 미루고 항공편을 확인해요.', '침수된 길은 걸어서 건너지 않아요.'],
  },
  US: {
    hazards: '허리케인 · 산불 · 토네이도 · 지진 (지역마다 달라요)',
    receive: '미국은 휴대폰 재난 문자(WEA)를 보내지만 해외 통신사 로밍에서 받을 수 있는지는 확인되지 않았어요. FEMA 앱에서 머무는 지역을 등록해 두면 기상 경보를 받을 수 있어요.',
    links: [
      { name: 'FEMA 앱 설치 (아이폰)', sub: '미국 연방재난관리청', url: 'https://apps.apple.com/us/app/fema/id474807486', only: 'ios' },
      { name: 'FEMA 앱 설치 (안드로이드)', sub: '미국 연방재난관리청', url: 'https://play.google.com/store/apps/details?id=gov.fema.mobile.android', only: 'android' },
      { name: '미국 기상청', sub: '지역별 특보', url: 'https://www.weather.gov/' },
      MOFA_LINK,
    ],
    actions: ['대피 명령이 나오면 망설이지 말고 바로 따라요.', '토네이도 경보 때는 창문 없는 안쪽 방이나 지하로 가요.', '긴급 상황은 911에 연락해요.'],
  },
};

export type LostGuide = { key: string; label: string; steps: string[]; note?: string };

// 여권: 재외공관 공지 기준, 카드: 금융당국 안내 기준. 서류와 수수료는 공관·회사마다 다름
export const LOST_GUIDES: LostGuide[] = [
  {
    key: 'passport',
    label: '여권',
    steps: [
      '가까운 경찰서에 분실 신고를 하고 접수증을 받아요.',
      '아래 공관에 연락해 필요한 서류와 업무 시간을 확인해요.',
      '접수증, 신분증이나 사본, 귀국 항공권 사본, 사진, 수수료를 준비해요. 사진 매수는 공관마다 달라요.',
      '공관에서 긴급여권이나 여행증명서를 신청해요. 며칠 걸릴 수 있어요.',
      '귀국일에 영향이 있으면 항공사와 숙소에 미리 알려요.',
    ],
    note: '여권 사진면을 보관함에 저장해 두면 신고할 때 도움이 돼요.',
  },
  {
    key: 'card',
    label: '카드',
    steps: [
      '카드사 앱이나 24시간 고객센터에서 바로 정지해요.',
      '모르는 결제가 있으면 카드사에 이의를 제기해요.',
      '도난이면 현지 경찰에 신고하고 확인서(Police Report)를 받아요. 도난이라고 적혀 있어야 해요.',
      '귀국 후 카드사에 보상 신청서와 증빙을 내요.',
    ],
    note: '트래블카드는 신고 전 부정 사용을 보상받지 못할 수 있어요. 더 빨리 신고하세요.',
  },
  {
    key: 'baggage',
    label: '위탁 수하물',
    steps: [
      '공항을 나가기 전에 수하물 분실 신고소로 가요.',
      '수하물표를 보여 주고 가방의 모양, 색, 크기를 설명해요.',
      '신고서(PIR)와 접수 번호를 받아 사진으로 저장해요.',
      '숙소 주소를 알려 주고, 찾으면 보내 달라고 요청해요.',
      '항공사와 여행자보험에 보상을 문의해요.',
    ],
  },
  {
    key: 'stolen',
    label: '휴대폰·소지품',
    steps: [
      '휴대폰이면 다른 기기에서 위치를 찾고 원격으로 잠가요.',
      '통신사에 분실 신고를 하고, 금융 앱 비밀번호를 바꿔요.',
      '현지 경찰에 신고하고 확인서(Police Report)를 받아요.',
      '여행자보험에 청구 서류를 문의해요. 영수증이 있으면 함께 챙겨요.',
    ],
  },
];

export const ESIM_SHOPS: { name: string; sub: string; url: string }[] = [
  { name: '유심사', sub: '국내 판매처', url: 'https://www.usimsa.com/' },
  { name: '로밍도깨비', sub: '국내 판매처', url: 'https://www.rokebi.com/' },
  { name: 'Airalo', sub: '용량·기간별 요금제', url: 'https://www.airalo.com/ko' },
  { name: 'Holafly', sub: '무제한 요금제 중심', url: 'https://esim.holafly.com/ko/' },
];
