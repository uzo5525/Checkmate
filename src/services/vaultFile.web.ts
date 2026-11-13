// 웹: 파일 폴더가 없어서 브라우저 저장소에 data URL 로 보관. 저장소가 작아 크기를 제한합니다.
const MAX_BYTES = 1_500_000;

export async function keepFile(uri: string): Promise<string> {
  const blob = await (await fetch(uri)).blob();
  if (blob.size > MAX_BYTES) throw new Error('웹에서는 1.5MB 이하 파일만 보관할 수 있어요.');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽지 못했어요.'));
    reader.readAsDataURL(blob);
  });
}

export async function dropFile(): Promise<void> {}

export async function openFile(uri: string): Promise<void> {
  const blob = await (await fetch(uri)).blob();
  window.open(URL.createObjectURL(blob), '_blank');
}
