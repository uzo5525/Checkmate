// 웹: 필요한 글자만 내려받는 Pretendard 가변 글꼴을 CDN 에서 불러옵니다 (앱용 OTF 는 너무 큼).
import type { TextStyle } from 'react-native';

const CSS = 'https://cdn.jsdelivr.net/npm/pretendard@1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css';
const FAMILY = "'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export async function loadFonts(): Promise<void> {
  if (document.querySelector(`link[href="${CSS}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = CSS;
  document.head.appendChild(link);
}

export function fontFor(weight: TextStyle['fontWeight']): TextStyle {
  return { fontFamily: FAMILY, fontWeight: weight ?? '400' };
}
