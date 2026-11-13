// 폰 안 문자 인식 (구글 ML Kit, 무료·오프라인). 사진은 서버로 보내지 않습니다.
import TextRecognition, { TextRecognitionScript } from '@react-native-ml-kit/text-recognition';
import * as ImagePicker from 'expo-image-picker';

export const OCR_AVAILABLE = true;

export type OcrSource = 'camera' | 'library';

/** 사진을 찍거나 골라서 글자를 읽음. 취소하면 null */
export async function captureText(source: OcrSource, script: 'latin' | 'korean' | 'mrz' = 'latin'): Promise<string | null> {
  const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error(source === 'camera' ? '카메라 권한이 필요해요.' : '사진 접근 권한이 필요해요.');
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false };
  const res = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (res.canceled || !res.assets[0]) return null;
  const result = await TextRecognition.recognize(res.assets[0].uri, script === 'korean' ? TextRecognitionScript.KOREAN : TextRecognitionScript.LATIN);
  return result.text;
}

/** 이미 있는 파일(보관함·파일 선택)에서 글자를 읽음. 앱에서는 사진만 가능 */
export async function readFileText(uri: string, mimeType: string, script: 'latin' | 'korean' | 'mrz' = 'latin'): Promise<string> {
  if (!mimeType.startsWith('image/')) throw new Error('앱에서는 PDF를 아직 읽지 못해요. 화면을 캡처한 사진으로 골라 주세요.');
  const result = await TextRecognition.recognize(uri, script === 'korean' ? TextRecognitionScript.KOREAN : TextRecognitionScript.LATIN);
  return result.text;
}
