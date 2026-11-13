// 기본 짐 리스트 (여행 기간·나라 기준, 순수 함수 — API 미사용)
export type PackTemplate = { name: string; qty: number };

export function defaultPacking(nights: number, plug: string): PackTemplate[] {
  const days = Math.max(1, nights + 1);
  return [
    { name: '여권', qty: 1 },
    { name: '항공권(e-티켓)·보험 증명서 저장', qty: 1 },
    { name: '현지 통화 현금·해외결제 카드', qty: 1 },
    { name: '휴대폰 충전기·케이블', qty: 1 },
    { name: '보조배터리 (기내용)', qty: 1 },
    { name: `멀티어댑터 (${plug})`, qty: 1 },
    { name: '상의', qty: days },
    { name: '하의', qty: Math.ceil(days / 2) },
    { name: '속옷·양말', qty: days },
    { name: '잠옷', qty: 1 },
    { name: '세면도구 (100ml 이하 용기)', qty: 1 },
    { name: '상비약 (소화제·진통제·밴드)', qty: 1 },
    { name: '선크림', qty: 1 },
    { name: '우산·우비', qty: 1 },
    { name: '편한 신발', qty: 1 },
  ];
}
