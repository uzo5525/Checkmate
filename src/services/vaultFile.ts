// 보관함 파일을 앱 폴더로 복사 (임시 폴더는 OS가 지울 수 있음)
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { uuid } from '@/lib/id';

export async function keepFile(uri: string, name: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}vault/`;
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : '';
  const to = `${dir}${uuid()}${ext}`;
  await FileSystem.copyAsync({ from: uri, to });
  return to;
}

export async function dropFile(uri: string): Promise<void> {
  await FileSystem.deleteAsync(uri, { idempotent: true });
}

/** PDF 등 앱 안에서 못 여는 파일은 공유 시트로 다른 앱에서 열기 */
export async function openFile(uri: string, mimeType: string): Promise<void> {
  await Sharing.shareAsync(uri, { mimeType });
}
