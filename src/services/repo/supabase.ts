// Supabase 구현. 테이블·보안 규칙은 supabase/schema.sql + supabase/migrations 참고.
// 회원가입 없이 기기마다 익명 로그인 → 보안 규칙(RLS)으로 "내가 참여한 여행"만 읽고 쓸 수 있음.
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { getCountry, templateKey } from '@/data/countries';
import { adaptForPackage, generateChecklist } from '@/lib/checklist';
import { uuid, roomCode } from '@/lib/id';
import type { ChecklistItem, ItemStatus, ItineraryItem, Member, Place, Trip } from '@/types';

import { defaultTripTitle } from './shared';
import type { AiResult, TripRepo } from './types';

const POLL_MS = 3000;

// --- row <-> model 매핑 (DB는 snake_case) ---
const tripFromRow = (r: any): Trip => ({
  id: r.id,
  code: r.code,
  countryCode: r.country_code,
  nationality: r.nationality,
  departDate: r.depart_date,
  returnDate: r.return_date,
  partySize: r.party_size,
  title: r.title,
  ownerMemberId: r.owner_member_id,
  createdAt: r.created_at,
  kind: r.kind ?? 'free',
  packageInfo: r.package_info ?? null,
});
const tripToRow = (t: Trip) => ({
  id: t.id,
  code: t.code,
  country_code: t.countryCode,
  nationality: t.nationality,
  depart_date: t.departDate,
  return_date: t.returnDate,
  party_size: t.partySize,
  title: t.title,
  owner_member_id: t.ownerMemberId,
  created_at: t.createdAt,
  kind: t.kind,
  package_info: t.packageInfo,
});
const memberFromRow = (r: any): Member => ({
  id: r.id,
  tripId: r.trip_id,
  nickname: r.nickname,
  isOwner: r.is_owner,
  canEditShared: r.can_edit_shared,
  joinedAt: r.joined_at,
});
const itemFromRow = (r: any): ChecklistItem => ({
  id: r.id,
  tripId: r.trip_id,
  templateId: r.template_id,
  title: r.title,
  description: r.description,
  dueOffset: r.due_offset,
  scope: r.scope,
  category: r.category,
  sourceUrl: r.source_url,
  sourceName: r.source_name,
  verified: r.verified,
  required: r.required,
  assigneeId: r.assignee_id,
  sortOrder: r.sort_order,
  ownerMemberId: r.owner_member_id ?? null,
  createdByAi: !!r.created_by_ai,
  providedBy: r.provided_by ?? null,
});
const itemToRow = (i: ChecklistItem) => ({
  id: i.id,
  trip_id: i.tripId,
  template_id: i.templateId,
  title: i.title,
  description: i.description,
  due_offset: i.dueOffset,
  scope: i.scope,
  category: i.category,
  source_url: i.sourceUrl,
  source_name: i.sourceName,
  verified: i.verified,
  required: i.required,
  assignee_id: i.assigneeId,
  sort_order: i.sortOrder,
  owner_member_id: i.ownerMemberId,
  created_by_ai: i.createdByAi,
  provided_by: i.providedBy,
});
const statusFromRow = (r: any): ItemStatus => ({
  tripId: r.trip_id,
  itemId: r.item_id,
  ownerKey: r.owner_key,
  done: r.done,
  updatedBy: r.updated_by,
  updatedAt: r.updated_at,
});
const placeFromRow = (r: any): Place => ({
  id: r.id,
  tripId: r.trip_id,
  name: r.name,
  note: r.note ?? '',
  createdBy: r.created_by,
  voterIds: r.voter_ids ?? [],
  createdAt: r.created_at,
  lat: r.lat ?? null,
  lng: r.lng ?? null,
  address: r.address ?? null,
  sourceUrl: r.source_url ?? null,
});
const itinFromRow = (r: any): ItineraryItem => ({
  id: r.id,
  tripId: r.trip_id,
  placeId: r.place_id,
  dayIndex: r.day_index,
  position: r.position,
  note: r.note ?? '',
});

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function createSupabaseRepo(url: string, anonKey: string): TripRepo {
  const sb: SupabaseClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });

  let readyPromise: Promise<void> | null = null;
  const ready = () => {
    if (!readyPromise) {
      readyPromise = (async () => {
        const { data } = await sb.auth.getSession();
        if (!data.session) must(await sb.auth.signInAnonymously());
      })().catch((e) => {
        readyPromise = null;
        throw e;
      });
    }
    return readyPromise;
  };
  const uid = async () => {
    await ready();
    const { data } = await sb.auth.getUser();
    return data.user?.id ?? null;
  };

  return {
    mode: 'supabase',
    ready,

    async createTrip(input) {
      const userId = await uid();
      const country = getCountry(input.countryCode);
      if (!country) throw new Error('지원하지 않는 국가입니다.');
      const tripId = uuid();
      const member: Member = {
        id: uuid(),
        tripId,
        nickname: input.nickname,
        isOwner: true,
        canEditShared: true,
        joinedAt: new Date().toISOString(),
      };
      const trip: Trip = {
        id: tripId,
        code: roomCode(),
        countryCode: input.countryCode,
        nationality: input.nationality,
        departDate: input.departDate,
        returnDate: input.returnDate,
        partySize: input.partySize,
        title: input.title || defaultTripTitle(input),
        ownerMemberId: member.id,
        createdAt: new Date().toISOString(),
        kind: input.kind ?? 'free',
        packageInfo: input.packageInfo ?? null,
      };
      must(await sb.from('trips').insert(tripToRow(trip)));
      must(
        await sb.from('members').insert({
          id: member.id,
          trip_id: tripId,
          nickname: member.nickname,
          is_owner: true,
          can_edit_shared: true,
          joined_at: member.joinedAt,
          user_id: userId,
        }),
      );
      const base = generateChecklist(country, trip, uuid);
      const items = trip.packageInfo ? adaptForPackage(base, trip.packageInfo.provider, templateKey) : base;
      must(await sb.from('checklist_items').insert(items.map(itemToRow)));
      return { trip, member };
    },

    async findTripByCode(code) {
      await ready();
      const rows = must(await sb.rpc('find_trip_by_code', { p_code: code })) as any[] | null;
      return rows && rows[0] ? tripFromRow(rows[0]) : null;
    },

    async joinByCode(code, nickname) {
      await ready();
      const rows = must(await sb.rpc('join_trip', { p_code: code, p_nickname: nickname })) as any[] | null;
      if (!rows?.[0]) throw new Error('참여하지 못했어요.');
      return memberFromRow(rows[0]);
    },

    async getSnapshot(tripId) {
      await ready();
      const [t, m, i, s, p, it] = await Promise.all([
        sb.from('trips').select('*').eq('id', tripId).maybeSingle(),
        sb.from('members').select('*').eq('trip_id', tripId).order('joined_at'),
        sb.from('checklist_items').select('*').eq('trip_id', tripId).order('sort_order'),
        sb.from('item_status').select('*').eq('trip_id', tripId),
        sb.from('places').select('*').eq('trip_id', tripId).order('created_at'),
        sb.from('itinerary_items').select('*').eq('trip_id', tripId).order('day_index').order('position'),
      ]);
      const trip = must(t);
      if (!trip) return null;
      return {
        trip: tripFromRow(trip),
        members: (must(m) ?? []).map(memberFromRow),
        items: (must(i) ?? []).map(itemFromRow),
        statuses: (must(s) ?? []).map(statusFromRow),
        places: (must(p) ?? []).map(placeFromRow),
        itinerary: (must(it) ?? []).map(itinFromRow),
      };
    },

    async listMyTrips() {
      const userId = await uid();
      if (!userId) return [];
      const rows = (must(await sb.from('members').select('id, trips(*)').eq('user_id', userId)) ?? []) as any[];
      return rows
        .filter((r) => r.trips)
        .map((r) => ({ trip: tripFromRow(r.trips), memberId: r.id as string }))
        .sort((a, b) => a.trip.departDate.localeCompare(b.trip.departDate));
    },

    async updateTrip(tripId, patch) {
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.departDate !== undefined) row.depart_date = patch.departDate;
      if (patch.returnDate !== undefined) row.return_date = patch.returnDate;
      if (patch.partySize !== undefined) row.party_size = patch.partySize;
      must(await sb.from('trips').update(row).eq('id', tripId));
    },

    async deleteTrip(tripId) {
      must(await sb.from('trips').delete().eq('id', tripId));
    },

    async setDone({ tripId, itemId, ownerKey, done, by }) {
      must(
        await sb.from('item_status').upsert(
          { trip_id: tripId, item_id: itemId, owner_key: ownerKey, done, updated_by: by, updated_at: new Date().toISOString() },
          { onConflict: 'item_id,owner_key' },
        ),
      );
    },

    async assignItem(itemId, assigneeId) {
      must(await sb.from('checklist_items').update({ assignee_id: assigneeId }).eq('id', itemId));
    },

    async addItem(tripId, input) {
      const item: ChecklistItem = {
        id: uuid(),
        tripId,
        templateId: null,
        title: input.title,
        description: input.description,
        dueOffset: input.dueOffset,
        scope: input.scope,
        category: input.category ?? 'custom',
        sourceUrl: input.sourceUrl ?? null,
        sourceName: input.sourceName ?? null,
        verified: false,
        required: false,
        assigneeId: null,
        sortOrder: 1000 + (Math.floor(Date.now() / 1000) % 100000),
        ownerMemberId: input.scope === 'personal' ? (input.ownerMemberId ?? null) : null,
        createdByAi: !!input.createdByAi,
        providedBy: input.providedBy ?? null,
      };
      must(await sb.from('checklist_items').insert(itemToRow(item)));
      return item;
    },

    async updateItem(itemId, patch) {
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.description !== undefined) row.description = patch.description;
      if (patch.dueOffset !== undefined) row.due_offset = patch.dueOffset;
      must(await sb.from('checklist_items').update(row).eq('id', itemId));
    },

    async deleteItem(itemId) {
      must(await sb.from('checklist_items').delete().eq('id', itemId));
    },

    async addPlace(tripId, input, by) {
      const place: Place = {
        id: uuid(),
        tripId,
        name: input.name,
        note: input.note,
        createdBy: by,
        voterIds: [],
        createdAt: new Date().toISOString(),
        lat: input.lat,
        lng: input.lng,
        address: input.address ?? null,
        sourceUrl: input.sourceUrl ?? null,
      };
      must(
        await sb.from('places').insert({
          id: place.id,
          trip_id: tripId,
          name: place.name,
          note: place.note,
          created_by: by,
          voter_ids: [],
          created_at: place.createdAt,
          lat: place.lat,
          lng: place.lng,
          address: place.address,
          source_url: place.sourceUrl,
        }),
      );
      return place;
    },

    async toggleVote(placeId) {
      must(await sb.rpc('toggle_vote', { p_place: placeId }));
    },

    async deletePlace(placeId) {
      must(await sb.from('places').delete().eq('id', placeId));
    },

    async setItinerary(tripId, items) {
      must(await sb.from('itinerary_items').delete().eq('trip_id', tripId));
      if (items.length === 0) return;
      must(
        await sb.from('itinerary_items').insert(
          items.map((i) => ({ id: uuid(), trip_id: tripId, place_id: i.placeId, day_index: i.dayIndex, position: i.position, note: i.note ?? '' })),
        ),
      );
    },

    async setMemberPermission(memberId, canEditShared) {
      must(await sb.from('members').update({ can_edit_shared: canEditShared }).eq('id', memberId));
    },

    async removeMember(memberId) {
      must(await sb.from('members').delete().eq('id', memberId));
    },

    async transferOwner(tripId, toMemberId) {
      must(await sb.rpc('transfer_owner', { p_trip: tripId, p_to: toMemberId }));
    },

    async invokeAi<T>(kind: string, payload: unknown): Promise<AiResult<T> | null> {
      await ready();
      const { data, error } = await sb.functions.invoke(`ai-${kind}`, { body: payload as Record<string, unknown> });
      if (error) {
        // 함수가 없거나(배포 전) 네트워크 오류 → 규칙 기반으로 대체
        return null;
      }
      return data as AiResult<T>;
    },

    async resolveMapsLink(tripId, url) {
      await ready();
      const { data, error } = await sb.functions.invoke('maps-resolve', { body: { tripId, url } });
      const out = data as { url: string | null; englishName: string | null } | null;
      return error || !out?.url ? null : { url: out.url, englishName: out.englishName };
    },

    async seedDemo(tripId, names, places) {
      must(await sb.rpc('seed_demo', { p_trip: tripId, p_names: names, p_places: places }));
    },

    // Realtime 구독. 연결이 실패하면 3초 폴링으로 대체.
    subscribe(tripId, onChange) {
      let poll: ReturnType<typeof setInterval> | null = null;
      let channel: ReturnType<SupabaseClient['channel']> | null = null;
      let closed = false;
      // 구독을 끊을 때 채널이 CLOSED 를 알려 오므로, 끊긴 뒤에는 폴링을 다시 시작하지 않음
      // (안 그러면 이전 여행을 3초마다 다시 불러와 화면이 다른 여행으로 바뀜)
      const startPolling = () => {
        if (!closed && !poll) poll = setInterval(onChange, POLL_MS);
      };
      ready()
        .then(() => {
          if (closed) return;
          const filter = `trip_id=eq.${tripId}`;
          channel = sb.channel(`trip-${tripId}`);
          for (const table of ['item_status', 'checklist_items', 'members', 'places', 'itinerary_items']) {
            channel.on('postgres_changes', { event: '*', schema: 'public', table, filter }, onChange);
          }
          channel.subscribe((status) => {
            if (status === 'SUBSCRIBED' && poll) {
              clearInterval(poll);
              poll = null;
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') startPolling();
          });
        })
        .catch(startPolling);
      return () => {
        closed = true;
        if (poll) clearInterval(poll);
        if (channel) sb.removeChannel(channel);
      };
    },
  };
}
