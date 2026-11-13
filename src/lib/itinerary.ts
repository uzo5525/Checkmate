// 투표된 장소 → 날짜별 동선 초안 (순수 함수, API 미사용).
// 1) 좌표로 가까운 장소끼리 날짜 수만큼 묶고 (k-means, 결정적 초기값)
// 2) 묶음 안에서는 가장 가까운 다음 장소 순서로 정렬
// 3) 표가 많은 장소가 든 묶음을 앞쪽 날짜에

export type PlanPlace = { id: string; lat: number | null; lng: number | null; votes: number };
export type DayPlan = { dayIndex: number; placeIds: string[] };

const R = 6371; // km

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

type Pt = { id: string; lat: number; lng: number; votes: number };

function centroid(pts: Pt[]): { lat: number; lng: number } {
  return { lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length, lng: pts.reduce((s, p) => s + p.lng, 0) / pts.length };
}

/** 가장 먼 점부터 고르는 결정적 초기값 */
function seeds(pts: Pt[], k: number): { lat: number; lng: number }[] {
  const sorted = [...pts].sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id));
  const chosen: Pt[] = [sorted[0]];
  while (chosen.length < k) {
    let best = sorted[0];
    let bestD = -1;
    for (const p of sorted) {
      const d = Math.min(...chosen.map((c) => distanceKm(c, p)));
      if (d > bestD) {
        bestD = d;
        best = p;
      }
    }
    chosen.push(best);
  }
  return chosen.map((c) => ({ lat: c.lat, lng: c.lng }));
}

function cluster(pts: Pt[], k: number): Pt[][] {
  let centers = seeds(pts, k);
  let groups: Pt[][] = [];
  for (let iter = 0; iter < 20; iter++) {
    groups = centers.map(() => []);
    for (const p of pts) {
      let bi = 0;
      let bd = Infinity;
      centers.forEach((c, i) => {
        const d = distanceKm(c, p);
        if (d < bd) {
          bd = d;
          bi = i;
        }
      });
      groups[bi].push(p);
    }
    const next = groups.map((g, i) => (g.length ? centroid(g) : centers[i]));
    const moved = next.some((c, i) => distanceKm(c, centers[i]) > 0.01);
    centers = next;
    if (!moved) break;
  }
  return groups;
}

/** 가까운 순서로 방문 (표가 가장 많은 곳에서 출발) */
export function orderNearest(pts: Pt[]): Pt[] {
  if (pts.length <= 2) return [...pts].sort((a, b) => b.votes - a.votes);
  const rest = [...pts].sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id));
  const route = [rest.shift()!];
  while (rest.length) {
    const last = route[route.length - 1];
    let bi = 0;
    rest.forEach((p, i) => {
      if (distanceKm(last, p) < distanceKm(last, rest[bi])) bi = i;
    });
    route.push(rest.splice(bi, 1)[0]);
  }
  return route;
}

export function planItinerary(places: PlanPlace[], days: number): DayPlan[] {
  const n = Math.max(1, days);
  const withCoords: Pt[] = places.filter((p): p is Pt => p.lat !== null && p.lng !== null) as Pt[];
  const without = places.filter((p) => p.lat === null || p.lng === null);
  const plan: DayPlan[] = Array.from({ length: n }, (_, i) => ({ dayIndex: i, placeIds: [] }));
  if (withCoords.length) {
    const k = Math.min(n, withCoords.length);
    const groups = cluster(withCoords, k)
      .filter((g) => g.length)
      .sort((a, b) => b.reduce((s, p) => s + p.votes, 0) - a.reduce((s, p) => s + p.votes, 0));
    groups.forEach((g, i) => {
      plan[i].placeIds = orderNearest(g).map((p) => p.id);
    });
  }
  // 좌표 없는 장소는 장소가 적은 날부터 채움
  for (const p of [...without].sort((a, b) => b.votes - a.votes)) {
    const target = [...plan].sort((a, b) => a.placeIds.length - b.placeIds.length)[0];
    target.placeIds.push(p.id);
  }
  return plan;
}

/** 하루 동선 총 거리 (직선 거리 합, km) */
export function routeKm(points: { lat: number; lng: number }[]): number {
  let sum = 0;
  for (let i = 1; i < points.length; i++) sum += distanceKm(points[i - 1], points[i]);
  return Math.round(sum * 10) / 10;
}
