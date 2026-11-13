// 서류 확인 입력값. 개인정보라서 이 기기(AsyncStorage)에만 저장하고 서버·동행자에게 보내지 않습니다.
// 여권번호·생년월일은 저장 대상에 넣지 않습니다.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type DocKind = 'passport' | 'insurance';
export type DocFields = Record<string, string>;
export type QuizRecord = { answers: Record<string, string>; added: string[] };
export type StayInfo = { name: string; address: string };

type DocsState = {
  byTrip: Record<string, Partial<Record<DocKind, DocFields>>>;
  /** 확인을 못 하고 일단 체크한 항목: tripId → templateId */
  waived: Record<string, Record<string, boolean>>;
  /** 항목 질문의 답과 그 답으로 추가한 할 일 제목: tripId → templateId */
  quizzes: Record<string, Record<string, QuizRecord>>;
  saveQuiz: (tripId: string, templateId: string, record: QuizRecord) => void;
  /** 여행 중 화면에 보여 줄 숙소 (이 기기에만 저장) */
  stays: Record<string, StayInfo>;
  saveStay: (tripId: string, stay: StayInfo) => void;
  setFields: (tripId: string, kind: DocKind, fields: DocFields) => void;
  setWaived: (tripId: string, templateId: string, waived: boolean) => void;
  clearKind: (tripId: string, kind: DocKind) => void;
  clearTrip: (tripId: string) => void;
};

export const useDocsStore = create<DocsState>()(
  persist(
    (set) => ({
      byTrip: {},
      waived: {},
      quizzes: {},
      stays: {},
      saveStay: (tripId, stay) => set((s) => ({ stays: { ...s.stays, [tripId]: stay } })),
      saveQuiz: (tripId, templateId, record) => set((s) => ({ quizzes: { ...s.quizzes, [tripId]: { ...s.quizzes[tripId], [templateId]: record } } })),
      setFields: (tripId, kind, fields) =>
        set((s) => ({
          byTrip: { ...s.byTrip, [tripId]: { ...s.byTrip[tripId], [kind]: { ...s.byTrip[tripId]?.[kind], ...fields } } },
        })),
      setWaived: (tripId, templateId, waived) =>
        set((s) => {
          const cur = { ...(s.waived[tripId] ?? {}) };
          if (waived) cur[templateId] = true;
          else delete cur[templateId];
          return { waived: { ...s.waived, [tripId]: cur } };
        }),
      clearKind: (tripId, kind) =>
        set((s) => {
          const trip = { ...(s.byTrip[tripId] ?? {}) };
          delete trip[kind];
          return { byTrip: { ...s.byTrip, [tripId]: trip } };
        }),
      clearTrip: (tripId) =>
        set((s) => {
          const byTrip = { ...s.byTrip };
          const waived = { ...s.waived };
          delete byTrip[tripId];
          delete waived[tripId];
          const quizzes = { ...s.quizzes };
          delete quizzes[tripId];
          const stays = { ...s.stays };
          delete stays[tripId];
          return { byTrip, waived, quizzes, stays };
        }),
    }),
    { name: 'readygo-docs-v2', storage: createJSONStorage(() => AsyncStorage) },
  ),
);
