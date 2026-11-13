// 로컬 모드: Supabase 키가 없을 때 AsyncStorage 에 저장. 같은 기기 안에서만 공유됩니다.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { getCountry, templateKey } from '@/data/countries';
import { adaptForPackage, generateChecklist } from '@/lib/checklist';
import { uuid, roomCode } from '@/lib/id';
import type { ChecklistItem, ItemStatus, ItineraryItem, Member, Place, Trip } from '@/types';

import { defaultTripTitle } from './shared';
import type { TripRepo } from './types';

const KEY = 'readygo-db-v1';

type Db = {
  trips: Trip[];
  members: Member[];
  items: ChecklistItem[];
  statuses: ItemStatus[];
  places: Place[];
  itinerary: ItineraryItem[];
};

const empty = (): Db => ({ trips: [], members: [], items: [], statuses: [], places: [], itinerary: [] });

let cache: Db | null = null;
const listeners = new Map<string, Set<() => void>>();

async function load(): Promise<Db> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? { ...empty(), ...JSON.parse(raw) } : empty();
    // 이전 버전 데이터 보정
    parsed.items = parsed.items.map((i: Partial<ChecklistItem>) => ({ ownerMemberId: null, createdByAi: false, providedBy: null, ...i }));
    parsed.trips = parsed.trips.map((t: Partial<Trip>) => ({ kind: 'free', packageInfo: null, ...t }));
    parsed.places = parsed.places.map((p: Partial<Place>) => ({ lat: null, lng: null, address: null, sourceUrl: null, ...p }));
    cache = parsed;
  } catch {
    cache = empty();
  }
  return cache!;
}

async function save(db: Db, tripId?: string) {
  cache = db;
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
  const notify = (set?: Set<() => void>) => set?.forEach((fn) => fn());
  if (tripId) notify(listeners.get(tripId));
  else listeners.forEach(notify);
}

function tripIdOfItem(db: Db, itemId: string) {
  return db.items.find((i) => i.id === itemId)?.tripId;
}

export const localRepo: TripRepo = {
  mode: 'local',

  async ready() {},

  async createTrip(input) {
    const db = await load();
    const country = getCountry(input.countryCode);
    if (!country) throw new Error('지원하지 않는 국가입니다.');
    let code = roomCode();
    while (db.trips.some((t) => t.code === code)) code = roomCode();
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
      code,
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
    const base = generateChecklist(country, trip, uuid);
    const items = trip.packageInfo ? adaptForPackage(base, trip.packageInfo.provider, templateKey) : base;
    await save({ ...db, trips: [...db.trips, trip], members: [...db.members, member], items: [...db.items, ...items] }, tripId);
    return { trip, member };
  },

  async findTripByCode(code) {
    const db = await load();
    return db.trips.find((t) => t.code === code) ?? null;
  },

  // 로컬 모드: 같은 기기에서 다른 멤버로 참여 (시연용)
  async joinByCode(code, nickname) {
    const db = await load();
    const trip = db.trips.find((t) => t.code === code);
    if (!trip) throw new Error('방을 찾을 수 없어요.');
    const member: Member = {
      id: uuid(),
      tripId: trip.id,
      nickname,
      isOwner: false,
      canEditShared: false,
      joinedAt: new Date().toISOString(),
    };
    await save({ ...db, members: [...db.members, member] }, trip.id);
    return member;
  },

  async getSnapshot(tripId) {
    const db = await load();
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) return null;
    return {
      trip,
      members: db.members.filter((m) => m.tripId === tripId),
      items: db.items.filter((i) => i.tripId === tripId),
      statuses: db.statuses.filter((s) => s.tripId === tripId),
      places: db.places.filter((p) => p.tripId === tripId),
      itinerary: db.itinerary.filter((i) => i.tripId === tripId),
    };
  },

  async listMyTrips(knownTripIds) {
    const db = await load();
    return db.trips.filter((t) => knownTripIds.includes(t.id)).map((trip) => ({ trip, memberId: null }));
  },

  async updateTrip(tripId, patch) {
    const db = await load();
    await save({ ...db, trips: db.trips.map((t) => (t.id === tripId ? { ...t, ...patch } : t)) }, tripId);
  },

  async deleteTrip(tripId) {
    const db = await load();
    await save(
      {
        trips: db.trips.filter((t) => t.id !== tripId),
        members: db.members.filter((m) => m.tripId !== tripId),
        items: db.items.filter((i) => i.tripId !== tripId),
        statuses: db.statuses.filter((s) => s.tripId !== tripId),
        places: db.places.filter((p) => p.tripId !== tripId),
        itinerary: db.itinerary.filter((i) => i.tripId !== tripId),
      },
      tripId,
    );
  },

  async setDone({ tripId, itemId, ownerKey, done, by }) {
    const db = await load();
    const rest = db.statuses.filter((s) => !(s.itemId === itemId && s.ownerKey === ownerKey));
    const status: ItemStatus = { tripId, itemId, ownerKey, done, updatedBy: by, updatedAt: new Date().toISOString() };
    await save({ ...db, statuses: [...rest, status] }, tripId);
  },

  async assignItem(itemId, assigneeId) {
    const db = await load();
    await save({ ...db, items: db.items.map((i) => (i.id === itemId ? { ...i, assigneeId } : i)) }, tripIdOfItem(db, itemId));
  },

  async addItem(tripId, input) {
    const db = await load();
    const maxOrder = Math.max(0, ...db.items.filter((i) => i.tripId === tripId).map((i) => i.sortOrder));
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
      sortOrder: maxOrder + 1,
      ownerMemberId: input.scope === 'personal' ? (input.ownerMemberId ?? null) : null,
      createdByAi: !!input.createdByAi,
      providedBy: input.providedBy ?? null,
    };
    await save({ ...db, items: [...db.items, item] }, tripId);
    return item;
  },

  async updateItem(itemId, patch) {
    const db = await load();
    await save({ ...db, items: db.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }, tripIdOfItem(db, itemId));
  },

  async deleteItem(itemId) {
    const db = await load();
    const tripId = tripIdOfItem(db, itemId);
    await save(
      { ...db, items: db.items.filter((i) => i.id !== itemId), statuses: db.statuses.filter((s) => s.itemId !== itemId) },
      tripId,
    );
  },

  async addPlace(tripId, input, by) {
    const db = await load();
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
    await save({ ...db, places: [...db.places, place] }, tripId);
    return place;
  },

  async toggleVote(placeId, memberId) {
    const db = await load();
    const place = db.places.find((p) => p.id === placeId);
    if (!place) return;
    const voterIds = place.voterIds.includes(memberId) ? place.voterIds.filter((v) => v !== memberId) : [...place.voterIds, memberId];
    await save({ ...db, places: db.places.map((p) => (p.id === placeId ? { ...p, voterIds } : p)) }, place.tripId);
  },

  async deletePlace(placeId) {
    const db = await load();
    const tripId = db.places.find((p) => p.id === placeId)?.tripId;
    await save(
      { ...db, places: db.places.filter((p) => p.id !== placeId), itinerary: db.itinerary.filter((i) => i.placeId !== placeId) },
      tripId,
    );
  },

  async setItinerary(tripId, items) {
    const db = await load();
    const next: ItineraryItem[] = items.map((i) => ({ id: uuid(), tripId, placeId: i.placeId, dayIndex: i.dayIndex, position: i.position, note: i.note ?? '' }));
    await save({ ...db, itinerary: [...db.itinerary.filter((i) => i.tripId !== tripId), ...next] }, tripId);
  },

  async setMemberPermission(memberId, canEditShared) {
    const db = await load();
    const tripId = db.members.find((m) => m.id === memberId)?.tripId;
    await save({ ...db, members: db.members.map((m) => (m.id === memberId ? { ...m, canEditShared } : m)) }, tripId);
  },

  async removeMember(memberId) {
    const db = await load();
    const tripId = db.members.find((m) => m.id === memberId)?.tripId;
    await save(
      {
        ...db,
        members: db.members.filter((m) => m.id !== memberId),
        statuses: db.statuses.filter((s) => s.ownerKey !== memberId),
        places: db.places.map((p) => ({ ...p, voterIds: p.voterIds.filter((v) => v !== memberId) })),
        items: db.items
          .filter((i) => i.ownerMemberId !== memberId)
          .map((i) => (i.assigneeId === memberId ? { ...i, assigneeId: null } : i)),
      },
      tripId,
    );
  },

  async transferOwner(tripId, toMemberId) {
    const db = await load();
    await save(
      {
        ...db,
        members: db.members.map((m) =>
          m.tripId !== tripId ? m : m.id === toMemberId ? { ...m, isOwner: true, canEditShared: true } : { ...m, isOwner: false },
        ),
        trips: db.trips.map((t) => (t.id === tripId ? { ...t, ownerMemberId: toMemberId } : t)),
      },
      tripId,
    );
  },

  async seedDemo(tripId, names, places) {
    const db = await load();
    const owner = db.members.find((m) => m.tripId === tripId && m.isOwner);
    if (!owner) return;
    const others: Member[] = names.map((nickname, k) => ({
      id: uuid(),
      tripId,
      nickname,
      isOwner: false,
      canEditShared: k === 0,
      joinedAt: new Date().toISOString(),
    }));
    const people = [owner, ...others];
    const tripItems = db.items.filter((i) => i.tripId === tripId).sort((a, b) => b.dueOffset - a.dueOffset || a.sortOrder - b.sortOrder);
    const personal = tripItems.filter((i) => i.scope === 'personal' && i.ownerMemberId === null);
    const shared = tripItems.filter((i) => i.scope === 'shared');
    const now = new Date().toISOString();
    const statuses: ItemStatus[] = [];
    others.forEach((m, k) => {
      for (const it of personal.slice(0, [4, 2, 6][k % 3])) statuses.push({ tripId, itemId: it.id, ownerKey: m.id, done: true, updatedBy: m.id, updatedAt: now });
    });
    if (personal[0]) statuses.push({ tripId, itemId: personal[0].id, ownerKey: owner.id, done: true, updatedBy: owner.id, updatedAt: now });
    if (shared[0]) statuses.push({ tripId, itemId: shared[0].id, ownerKey: 'shared', done: true, updatedBy: owner.id, updatedAt: now });
    const assign = new Map(shared.map((it, i) => [it.id, people[i % people.length].id]));
    const newPlaces: Place[] = places.map((p) => ({
      id: uuid(),
      tripId,
      name: p.name,
      note: p.note,
      createdBy: owner.id,
      voterIds: p.voters.map((v) => people[v]?.id).filter(Boolean) as string[],
      createdAt: now,
      lat: p.lat,
      lng: p.lng,
      address: null,
      sourceUrl: null,
    }));
    await save(
      {
        ...db,
        members: [...db.members, ...others],
        items: db.items.map((i) => (assign.has(i.id) ? { ...i, assigneeId: assign.get(i.id)! } : i)),
        statuses: [...db.statuses, ...statuses],
        places: [...db.places, ...newPlaces],
      },
      tripId,
    );
  },

  async invokeAi() {
    return null;
  },

  async resolveMapsLink() {
    return null;
  },

  subscribe(tripId, onChange) {
    if (!listeners.has(tripId)) listeners.set(tripId, new Set());
    listeners.get(tripId)!.add(onChange);
    return () => listeners.get(tripId)?.delete(onChange);
  },

  async resetAll() {
    await save(empty());
  },
};
