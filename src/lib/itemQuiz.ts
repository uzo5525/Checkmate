// 항목별 질문과 결과 규칙 (순수 함수). 답에 따라 결과와 새 할 일이 달라집니다.
// 무비자 기간은 대한민국 여권 기준 초안. 공식 확인 전이라 결과 문구에 항상 재확인을 안내합니다 → DATA_TODO.md
export type QuizOption = { value: string; label: string };
export type QuizQuestion = { id: string; text: string; options: QuizOption[]; initial?: string };
export type QuizCard = { title: string; description: string; dueOffset: number; category: string; sourceUrl?: string; sourceName?: string };
export type QuizResult = {
  tone: 'match' | 'check' | 'mismatch';
  title: string;
  message: string;
  cards: QuizCard[];
  /** 답한 것만으로 이 항목이 끝나는지 (아직 할 일이 남았으면 false) */
  finishes: boolean;
};
export type QuizAnswers = Record<string, string>;
export type Quiz = { questions: QuizQuestion[]; evaluate: (a: QuizAnswers) => QuizResult };

export type QuizContext = {
  key: string;
  countryCode: string;
  countryName: string;
  nationality: string;
  stayDays: number;
  sourceUrl: string | null;
  sourceName: string | null;
};

const VISA_FREE_DAYS: Record<string, number> = { JP: 90, TW: 90, TH: 90, VN: 45, US: 90 };
const VERIFY = '출발 전에 공식 안내에서 한 번 더 확인하세요.';
const YES_NO: QuizOption[] = [
  { value: 'yes', label: '네' },
  { value: 'no', label: '아니요' },
];

function visaQuiz(c: QuizContext): Quiz {
  const source = { sourceUrl: c.sourceUrl ?? undefined, sourceName: c.sourceName ?? undefined };
  const applyCard = (title: string, description: string, extra: Partial<QuizCard> = {}): QuizCard => ({ title, description, dueOffset: 30, category: 'entry', ...source, ...extra });
  const limit = VISA_FREE_DAYS[c.countryCode];
  const purpose: QuizQuestion = {
    id: 'purpose',
    text: '여행 목적이 무엇인가요?',
    options: [
      { value: 'short', label: '관광·출장·친지 방문' },
      { value: 'long', label: '취업·유학·장기 체류' },
    ],
  };

  if (c.nationality !== 'KR' || !limit) {
    return {
      questions: [purpose],
      evaluate: () => ({
        tone: 'check',
        title: '국적별 요건을 직접 확인해야 해요',
        message: `이 앱에는 대한민국 여권 기준 규칙만 있어요. 내 국적의 ${c.countryName} 입국 요건을 공식 안내에서 확인하세요.`,
        cards: [applyCard(`${c.countryName} 비자 요건 확인 (내 국적)`, '국적과 체류 목적에 맞는 비자가 필요한지 공식 안내에서 확인하세요.')],
        finishes: false,
      }),
    };
  }

  const stay: QuizQuestion = {
    id: 'stay',
    text: `얼마나 머무나요? (이 여행은 ${c.stayDays}일)`,
    options: [
      { value: 'within', label: `${limit}일 이내` },
      { value: 'over', label: `${limit}일 넘게` },
    ],
    initial: c.stayDays <= limit ? 'within' : 'over',
  };
  const questions = [purpose, stay];
  if (c.countryCode === 'US') {
    questions.push({ id: 'history', text: '이란·이라크·시리아·북한·쿠바 등 ESTA 제한 국가에 다녀온 적이 있나요?', options: YES_NO });
  }

  return {
    questions,
    evaluate(a) {
      if (a.purpose === 'long') {
        return {
          tone: 'mismatch',
          title: '비자가 필요해 보여요',
          message: `취업·유학·장기 체류는 무비자 대상이 아니에요. 목적에 맞는 비자를 확인하세요. ${VERIFY}`,
          cards: [applyCard(`${c.countryName} 비자 신청`, '체류 목적에 맞는 비자 종류와 준비 서류, 처리 기간을 확인하고 신청하세요.')],
          finishes: true,
        };
      }
      if (a.stay === 'over') {
        const vietnam = c.countryCode === 'VN';
        return {
          tone: 'mismatch',
          title: `무비자 ${limit}일을 넘어요`,
          message: `${limit}일을 넘게 머물려면 비자가 필요해 보여요. ${VERIFY}`,
          cards: [
            vietnam
              ? applyCard('베트남 전자비자(e-Visa) 신청', '공식 사이트에서 신청하세요. 비공식 대행 사이트에 주의하세요.', { sourceUrl: 'https://evisa.gov.vn/', sourceName: '베트남 출입국관리국 전자비자' })
              : applyCard(`${c.countryName} 비자 신청`, '체류 기간에 맞는 비자 종류와 처리 기간을 확인하고 신청하세요.'),
          ],
          finishes: true,
        };
      }
      if (c.countryCode === 'US') {
        if (a.history === 'yes') {
          return {
            tone: 'mismatch',
            title: 'ESTA가 안 될 수 있어요',
            message: `제한 국가 방문 이력이 있으면 ESTA 대신 비자가 필요할 수 있어요. ${VERIFY}`,
            cards: [applyCard('미국 비자 신청', 'ESTA를 쓸 수 없다면 주한 미국대사관에서 비자를 신청하세요. 인터뷰 일정에 시간이 걸릴 수 있어요.')],
            finishes: true,
          };
        }
        return { tone: 'check', title: '비자 대신 ESTA가 필요해요', message: `${limit}일 이내 관광·출장은 ESTA 승인으로 입국하는 것으로 알려져 있어요. 입국 서류 항목에서 신청하세요. ${VERIFY}`, cards: [], finishes: true };
      }
      return { tone: 'match', title: '비자 없이 갈 수 있어 보여요', message: `대한민국 여권, ${limit}일 이내 단기 체류 기준이에요. ${VERIFY}`, cards: [], finishes: true };
    },
  };
}

function transferQuiz(): Quiz {
  return {
    questions: [
      {
        id: 'arrive',
        text: '현지에 언제 도착하나요?',
        options: [
          { value: 'day', label: '밤 10시 전' },
          { value: 'late', label: '밤 10시 이후' },
        ],
      },
      {
        id: 'decided',
        text: '공항에서 숙소까지 갈 방법을 정했나요?',
        options: [
          { value: 'yes', label: '정했어요' },
          { value: 'no', label: '아직이요' },
        ],
      },
    ],
    evaluate(a) {
      const late = a.arrive === 'late';
      const cards: QuizCard[] = late
        ? [{ title: '심야 이동 수단 정하기', description: '늦게 도착하면 대중교통이 끊길 수 있어요. 막차 시간을 확인하고 심야 버스·택시·공항 근처 숙소 중에서 정하세요.', dueOffset: 7, category: 'transport' }]
        : [];
      if (a.decided === 'no') return { tone: 'check', title: '이동 방법을 정해 주세요', message: '교통편과 소요 시간, 막차 시간을 확인한 뒤 체크하세요.', cards, finishes: false };
      return late
        ? { tone: 'check', title: '늦은 도착을 대비해요', message: '정한 방법이 그 시간에도 운행하는지 확인하세요.', cards, finishes: true }
        : { tone: 'match', title: '이동 준비가 됐어요', message: '출발 전에 운행 시간만 한 번 더 확인하세요.', cards, finishes: true };
    },
  };
}

function esimQuiz(): Quiz {
  return {
    questions: [
      {
        id: 'support',
        text: '내 휴대폰이 eSIM을 지원하나요?',
        options: [
          { value: 'yes', label: '네' },
          { value: 'no', label: '아니요' },
          { value: 'unknown', label: '모르겠어요' },
        ],
      },
    ],
    evaluate(a) {
      if (a.support === 'no') {
        return {
          tone: 'check',
          title: 'eSIM 말고 다른 방법이 필요해요',
          message: '통신사 로밍이나 유심, 포켓 와이파이 중에서 골라요.',
          cards: [{ title: '로밍·유심 중 인터넷 방법 정하기', description: '통신사 로밍 요금제나 현지 유심, 포켓 와이파이를 비교해 정하세요.', dueOffset: 14, category: 'telecom' }],
          finishes: true,
        };
      }
      if (a.support === 'unknown') {
        return {
          tone: 'check',
          title: '먼저 휴대폰 설정을 확인해요',
          message: '같은 기종도 판매 지역과 잠금 상태에 따라 다를 수 있어요.',
          cards: [{ title: '휴대폰 eSIM 지원 확인', description: '휴대폰 설정의 모바일 데이터 메뉴에서 eSIM 추가 항목이 있는지 확인하세요.', dueOffset: 14, category: 'telecom' }],
          finishes: false,
        };
      }
      return {
        tone: 'match',
        title: 'eSIM을 쓸 수 있어요',
        message: '아래 판매처에서 일정에 맞는 상품을 고르세요.',
        cards: [{ title: 'eSIM QR 출국 전 등록', description: '구매한 eSIM의 설치 QR을 출국 전에 와이파이에서 미리 등록해 두세요.', dueOffset: 3, category: 'telecom' }],
        finishes: true,
      };
    },
  };
}

function packingQuiz(c: QuizContext): Quiz {
  return {
    questions: [
      { id: 'medicine', text: '처방받은 약을 가져가나요?', options: YES_NO },
      { id: 'food', text: '음식(김치, 육포, 과일 등)을 가져가나요?', options: YES_NO },
      { id: 'liquid', text: '기내 가방에 100ml 넘는 액체가 있나요?', options: YES_NO },
    ],
    evaluate(a) {
      const cards: QuizCard[] = [];
      if (a.medicine === 'yes') cards.push({ title: '처방약 영문 처방전 챙기기', description: `약은 원래 포장 그대로 챙기고 영문 처방전을 준비하세요. ${c.countryName} 반입 제한 성분이 있는지도 확인하세요.`, dueOffset: 7, category: 'customs' });
      if (a.food === 'yes') cards.push({ title: '가져갈 음식 반입 규정 확인', description: `${c.countryName}은(는) 육가공품·과일 등 음식 반입을 제한할 수 있어요. 검역 규정을 확인하세요.`, dueOffset: 7, category: 'customs' });
      if (a.liquid === 'yes') cards.push({ title: '100ml 넘는 액체 위탁수하물로 옮기기', description: '100ml 넘는 액체는 기내에 가져갈 수 없어요. 위탁수하물에 넣으세요.', dueOffset: 1, category: 'packing' });
      return cards.length
        ? { tone: 'check', title: `확인할 것 ${cards.length}개를 추가했어요`, message: '추가된 할 일을 끝내고 짐을 마무리하세요.', cards, finishes: false }
        : { tone: 'match', title: '따로 확인할 물건은 없어요', message: '보조배터리는 기내 가방에 넣으세요.', cards, finishes: false };
    },
  };
}

export function quizFor(c: QuizContext): Quiz | null {
  if (c.key === 'visa') return visaQuiz(c);
  if (c.key === 'airport_transfer') return transferQuiz();
  if (c.key === 'esim') return esimQuiz();
  if (c.key === 'packing') return packingQuiz(c);
  return null;
}

/** 답을 바꿨을 때: 새로 추가할 카드와 더는 필요 없는 카드 제목 */
export function diffCards(previous: string[], next: QuizCard[], existingTitles: string[]): { add: QuizCard[]; remove: string[] } {
  const nextTitles = new Set(next.map((c) => c.title));
  return {
    add: next.filter((c) => !existingTitles.includes(c.title)),
    remove: previous.filter((t) => !nextTitles.has(t)),
  };
}
