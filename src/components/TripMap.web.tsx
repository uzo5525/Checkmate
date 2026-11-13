// 웹(아이폰 사파리 등)용 지도: OpenFreeMap + MapLibre. API 키·비용 없음. 지명은 한국어 → 영어 → 현지어 순.
// 앱(안드로이드)은 TripMap.tsx 의 구글 지도 SDK. 웹에서는 길게 누르기 대신 탭하면 새 장소 핀.
import 'maplibre-gl/dist/maplibre-gl.css';

import type { Map as MapLibreMap, Marker } from 'maplibre-gl';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { colors, radius } from '@/theme/tokens';

import type { MapPin } from './TripMap';

export type { MapPin } from './TripMap';

type LatLng = { latitude: number; longitude: number };

type Props = {
  pins: MapPin[];
  route?: LatLng[];
  draft?: LatLng | null;
  center: { lat: number; lng: number };
  height?: number;
  onPinPress?: (id: string) => void;
  onLongPress?: (c: LatLng) => void;
};

const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';
const LABEL = ['coalesce', ['get', 'name:ko'], ['get', 'name:en'], ['get', 'name']];
const ROUTE = 'trip-route';

/** 지명 글자를 한국어 우선으로 (도로 번호 등 이름이 아닌 글자는 그대로) */
function useKoreanLabels(m: MapLibreMap) {
  for (const layer of m.getStyle().layers) {
    if (layer.type !== 'symbol') continue;
    const field = m.getLayoutProperty(layer.id, 'text-field');
    if (field && JSON.stringify(field).includes('name')) m.setLayoutProperty(layer.id, 'text-field', LABEL);
  }
}

function dot(color: string, size: number, title: string): HTMLElement {
  const el = document.createElement('div');
  el.title = title;
  el.style.cssText = `width:${size}px;height:${size}px;border-radius:50%;border:2px solid #fff;box-sizing:border-box;cursor:pointer;background:${color};`;
  return el;
}

export function TripMap({ pins, route, draft, center, height = 280, onPinPress, onLongPress }: Props) {
  const box = useRef<HTMLElement | null>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const lib = useRef<typeof import('maplibre-gl') | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  // 최신 콜백을 지도 이벤트에서 쓰기 위해 보관
  const handlers = useRef({ onPinPress, onLongPress });
  useEffect(() => {
    handlers.current = { onPinPress, onLongPress };
  });

  // 지도 생성 (한 번). 라이브러리가 커서 지도를 볼 때만 내려받음
  useEffect(() => {
    let cancelled = false;
    let created: MapLibreMap | null = null;
    import('maplibre-gl')
      .then((ml) => {
        const el = box.current;
        if (cancelled || !el) return;
        lib.current = ml;
        const m = new ml.Map({ container: el, style: STYLE_URL, center: [center.lng, center.lat], zoom: 11, attributionControl: { compact: true } });
        created = m;
        m.addControl(new ml.NavigationControl({ showCompass: false }));
        m.on('click', (e) => handlers.current.onLongPress?.({ latitude: e.lngLat.lat, longitude: e.lngLat.lng }));
        m.on('load', () => {
          useKoreanLabels(m);
          m.addSource(ROUTE, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
          m.addLayer({ id: ROUTE, type: 'line', source: ROUTE, paint: { 'line-color': colors.brand, 'line-width': 4, 'line-dasharray': [2, 1.5] } });
          map.current = m;
          setReady(true);
        });
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      created?.remove();
      map.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 핀·동선 다시 그리기 + 화면 맞춤
  const key = pins.map((p) => `${p.id}:${p.lat},${p.lng}`).join('|') + (draft ? `|d${draft.latitude},${draft.longitude}` : '') + `|r${route?.length ?? 0}`;
  useEffect(() => {
    const m = map.current;
    const ml = lib.current;
    if (!m || !ml || !ready) return;
    markers.current.forEach((x) => x.remove());
    const coords: [number, number][] = [];
    const add = (lng: number, lat: number, el: HTMLElement) => {
      markers.current.push(new ml.Marker({ element: el }).setLngLat([lng, lat]).addTo(m));
      coords.push([lng, lat]);
    };
    markers.current = [];
    for (const p of pins) {
      const el = dot(p.color ?? colors.brand, 18, p.title);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        handlers.current.onPinPress?.(p.id);
      });
      add(p.lng, p.lat, el);
    }
    if (draft) add(draft.longitude, draft.latitude, dot(colors.warning, 20, '새 장소'));
    const line = route && route.length >= 2 ? route.map((r) => [r.longitude, r.latitude]) : [];
    (m.getSource(ROUTE) as import('maplibre-gl').GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: line.length ? [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: line } }] : [],
    });
    if (coords.length >= 2) {
      const bounds = coords.reduce((b, c) => b.extend(c), new ml.LngLatBounds(coords[0], coords[0]));
      m.fitBounds(bounds, { padding: 40, maxZoom: 15, duration: 0 });
    } else if (coords.length === 1) {
      m.jumpTo({ center: coords[0], zoom: 14 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ready]);

  // 높이가 바뀌면 지도 크기 다시 계산
  useEffect(() => {
    map.current?.resize();
  }, [height]);

  return (
    <View
      ref={(n) => {
        box.current = n as unknown as HTMLElement | null;
      }}
      style={[styles.wrap, { height }]}>
      {failed ? (
        <Text variant="small" color="textMuted" center style={styles.failed}>
          지도를 불러오지 못했어요. 링크로 장소를 추가할 수 있어요.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.brandSoft },
  failed: { padding: 24 },
});
