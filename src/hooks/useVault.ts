// 보관함: 사진·파일 추가(이름 정하기), 열기, 이름 변경, 삭제 (이 기기에만 저장)
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import { friendlyError } from '@/lib/errors';
import { uuid } from '@/lib/id';
import type { PrepKey } from '@/lib/prepCards';
import { dropFile, keepFile, openFile } from '@/services/vaultFile';
import { EMPTY_VAULT, useVaultStore, type VaultFile } from '@/store/vault';
import { useTripStore } from '@/store/trip';

type Picked = { uri: string; name: string; ext: string; mimeType: string };

/** "보험증권.pdf" → 이름 "보험증권", 확장자 ".pdf" */
function pickedFrom(uri: string, fileName: string, mimeType: string): Picked {
  const dot = fileName.lastIndexOf('.');
  return dot > 0 ? { uri, name: fileName.slice(0, dot), ext: fileName.slice(dot), mimeType } : { uri, name: fileName, ext: '', mimeType };
}

export function useVault(card: PrepKey | null = null) {
  const tripId = useTripStore((s) => s.tripId) ?? '_';
  const all = useVaultStore((s) => s.byTrip[tripId]) ?? EMPTY_VAULT;
  const addFile = useVaultStore((s) => s.add);
  const removeFile = useVaultStore((s) => s.remove);
  const renameFile = useVaultStore((s) => s.rename);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Picked | null>(null);

  return {
    files: card ? all.filter((f) => f.card === card) : all,
    busy,
    error,
    /** 골랐지만 아직 이름을 정하지 않은 파일 */
    picked,
    cancelPicked: () => setPicked(null),
    async savePicked(name: string) {
      if (!picked) return;
      setBusy(true);
      setError(null);
      try {
        const kept = await keepFile(picked.uri, `${name}${picked.ext}`);
        addFile(tripId, { id: uuid(), name, uri: kept, mimeType: picked.mimeType, card, addedAt: new Date().toISOString() });
        setPicked(null);
      } catch (e) {
        setError(friendlyError(e));
      } finally {
        setBusy(false);
      }
    },
    async addPhoto() {
      setError(null);
      const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.6, exif: false });
      const a = res.canceled ? null : res.assets[0];
      if (a) setPicked(pickedFrom(a.uri, a.fileName ?? `사진 ${new Date().toISOString().slice(0, 10)}.jpg`, a.mimeType ?? 'image/jpeg'));
    },
    async addDocument() {
      setError(null);
      const res = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'], copyToCacheDirectory: true });
      const a = res.canceled ? null : res.assets[0];
      if (a) setPicked(pickedFrom(a.uri, a.name, a.mimeType ?? 'application/pdf'));
    },
    open: (f: VaultFile) => openFile(f.uri, f.mimeType),
    rename: (f: VaultFile, name: string) => renameFile(tripId, f.id, name),
    async remove(f: VaultFile) {
      removeFile(tripId, f.id);
      await dropFile(f.uri).catch(() => undefined);
    },
  };
}
