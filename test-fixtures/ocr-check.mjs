// 시험용 보험 문서를 앱과 같은 엔진(Tesseract)으로 읽어 보장 기간을 찾는지 확인
import { readFileSync } from 'node:fs';
import { createWorker } from 'tesseract.js';

import { findInsurancePeriod } from '../src/lib/ocrText.ts';

const worker = await createWorker('kor+eng');
for (const name of ['시험용_보험증권_통과.png', '시험용_보험증권_실패.png']) {
  const { data } = await worker.recognize(readFileSync(new URL(`./insurance/${name}`, import.meta.url)));
  const line = data.text.split('\n').find((l) => /기\s*간/.test(l));
  console.log(name, JSON.stringify(findInsurancePeriod(data.text)), '| line:', line);
}
await worker.terminate();
