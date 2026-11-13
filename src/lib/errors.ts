// 화면에 보여 줄 오류 문구. 우리가 쓴 한글 안내는 그대로, 라이브러리·서버의 영문 오류는 쉬운 말로 바꿉니다.
const HANGUL = /[가-힣]/;

export function friendlyError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  return HANGUL.test(message) ? message : '문제가 생겼어요. 인터넷 연결을 확인하고 다시 시도해 주세요.';
}
