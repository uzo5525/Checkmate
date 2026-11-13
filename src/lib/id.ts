// 프로토타입용 ID 생성 (암호학적 용도 아님). Supabase uuid 컬럼과 호환되는 v4 형식.
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

// 헷갈리는 문자(0/O, 1/I/L) 제외
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function roomCode(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
