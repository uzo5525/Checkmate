// 웹 문자 인식 (Tesseract.js, 무료). 사진은 브라우저 안에서만 읽고 서버로 보내지 않습니다.
// 처음 쓸 때 인식 모델만 CDN에서 내려받습니다.
import type { Worker } from 'tesseract.js';

export const OCR_AVAILABLE = true;

export type OcrSource = 'camera' | 'library';
type OcrScript = 'latin' | 'korean' | 'mrz';

const MRZ_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';
const MAX_SIDE = 2000;

const workers = new Map<string, Promise<Worker>>();

function workerFor(langs: string): Promise<Worker> {
  let w = workers.get(langs);
  if (!w) {
    w = import('tesseract.js').then(({ createWorker }) => createWorker(langs));
    workers.set(langs, w);
  }
  return w;
}

/** 파일 선택(폰에서는 카메라)을 열어 고른 파일을 돌려줌. 취소하면 null */
function pickFile(source: OcrSource): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (source === 'camera') input.setAttribute('capture', 'environment');
    input.style.display = 'none';
    document.body.appendChild(input);
    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('focus', onFocus);
      input.remove();
      resolve(file);
    };
    // cancel 이벤트가 없는 브라우저: 창으로 돌아온 뒤에도 파일이 없으면 취소로 봄
    const onFocus = () => setTimeout(() => finish(input.files?.[0] ?? null), 1000);
    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    input.addEventListener('cancel', () => finish(null));
    window.addEventListener('focus', onFocus);
    input.click();
  });
}

/** 큰 사진은 줄이고 흑백으로 바꿔 인식률을 높임 */
async function prepare(file: Blob): Promise<HTMLCanvasElement> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('사진을 읽지 못했어요.');
  ctx.filter = 'grayscale(1) contrast(1.3)';
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas;
}

/** 사진을 찍거나 골라서 글자를 읽음. 취소하면 null */
export async function captureText(source: OcrSource, script: OcrScript = 'latin'): Promise<string | null> {
  const file = await pickFile(source);
  if (!file) return null;
  return recognize(await prepare(file), script);
}

async function recognize(canvas: HTMLCanvasElement, script: OcrScript): Promise<string> {
  const worker = await workerFor(script === 'korean' ? 'kor+eng' : 'eng');
  await worker.setParameters({ tessedit_char_whitelist: script === 'mrz' ? MRZ_CHARS : '' });
  const { data } = await worker.recognize(canvas);
  return data.text;
}

type PdfPage = {
  getTextContent(): Promise<{ items: { str?: string; hasEOL?: boolean }[] }>;
  getViewport(o: { scale: number }): { width: number; height: number };
  render(o: { canvasContext: CanvasRenderingContext2D; viewport: unknown }): { promise: Promise<void> };
};
type PdfDoc = { numPages: number; getPage(n: number): Promise<PdfPage> };
type PdfJs = { GlobalWorkerOptions: { workerSrc: string }; getDocument(o: { data: ArrayBuffer }): { promise: Promise<PdfDoc> } };

const PDFJS_BASE = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';
const MAX_PDF_PAGES = 3;
let pdfjs: Promise<PdfJs> | null = null;

function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = `${PDFJS_BASE}/pdf.min.js`;
    s.onload = () => {
      const lib = (window as unknown as { pdfjsLib: PdfJs }).pdfjsLib;
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}/pdf.worker.min.js`;
      resolve(lib);
    };
    s.onerror = () => {
      pdfjs = null;
      reject(new Error('PDF 읽기 도구를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.'));
    };
    document.head.appendChild(s);
  });
  return pdfjs;
}

/** PDF 글자를 바로 꺼내고, 스캔본이라 글자가 없으면 페이지를 그려서 문자 인식 */
async function pdfText(blob: Blob, script: OcrScript): Promise<string> {
  const lib = await loadPdfJs();
  let doc: PdfDoc;
  try {
    doc = await lib.getDocument({ data: await blob.arrayBuffer() }).promise;
  } catch (e) {
    if (e instanceof Error && e.name === 'PasswordException') throw new Error('암호가 걸린 PDF는 읽지 못해요. 화면을 캡처한 사진으로 골라 주세요.');
    throw new Error('PDF를 열지 못했어요.');
  }
  const pages = await Promise.all(Array.from({ length: Math.min(doc.numPages, MAX_PDF_PAGES) }, (_, i) => doc.getPage(i + 1)));
  const contents = await Promise.all(pages.map((p) => p.getTextContent()));
  const text = contents.map((c) => c.items.map((it) => `${it.str ?? ''}${it.hasEOL ? '\n' : ' '}`).join('')).join('\n');
  if (text.replace(/\s/g, '').length >= 20) return text;

  const out: string[] = [];
  for (const page of pages) {
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('PDF를 읽지 못했어요.');
    await page.render({ canvasContext: ctx, viewport }).promise;
    out.push(await recognize(canvas, script));
  }
  return out.join('\n');
}

/** 이미 있는 파일(보관함·파일 선택)에서 글자를 읽음. 파일은 브라우저 밖으로 나가지 않음 */
export async function readFileText(uri: string, mimeType: string, script: OcrScript = 'latin'): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  if (mimeType === 'application/pdf' || blob.type === 'application/pdf') return pdfText(blob, script);
  return recognize(await prepare(blob), script);
}
