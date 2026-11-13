// 환경변수에 Supabase 키가 있으면 Supabase, 없으면 로컬 모드.
import { localRepo } from './local';
import { createSupabaseRepo } from './supabase';
import type { TripRepo } from './types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const repo: TripRepo = url && anonKey ? createSupabaseRepo(url, anonKey) : localRepo;

export type { AiKind, AiResult, CreateTripInput, ItemPatch, ItineraryInput, NewItem, NewPlace, TripPatch, TripRepo } from './types';
