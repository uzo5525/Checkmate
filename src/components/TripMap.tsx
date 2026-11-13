// 여행 지도 (안드로이드: 구글 지도 SDK, 맵 ID 없이 사용 → 무료 SKU).
// 핀 = 제안 장소 / 일정 순서, 선 = 하루 동선, 길게 누르기 = 새 장소 핀 찍기
import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, type LatLng } from 'react-native-maps';

import { colors, radius } from '@/theme/tokens';

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  title: string;
  description?: string;
  color?: string;
};

type Props = {
  pins: MapPin[];
  route?: LatLng[];
  draft?: LatLng | null;
  center: { lat: number; lng: number };
  height?: number;
  onPinPress?: (id: string) => void;
  onLongPress?: (c: LatLng) => void;
};

export function TripMap({ pins, route, draft, center, height = 280, onPinPress, onLongPress }: Props) {
  const ref = useRef<MapView>(null);
  const key = pins.map((p) => p.id).join(',') + (draft ? `|${draft.latitude},${draft.longitude}` : '');

  useEffect(() => {
    const coords: LatLng[] = pins.map((p) => ({ latitude: p.lat, longitude: p.lng }));
    if (draft) coords.push(draft);
    if (coords.length >= 2) {
      ref.current?.fitToCoordinates(coords, { edgePadding: { top: 60, right: 60, bottom: 60, left: 60 }, animated: true });
    } else if (coords.length === 1) {
      ref.current?.animateToRegion({ ...coords[0], latitudeDelta: 0.03, longitudeDelta: 0.03 }, 300);
    }
    // key 가 바뀔 때만 맞춤
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <View style={[styles.wrap, { height }]}>
      <MapView
        ref={ref}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: center.lat, longitude: center.lng, latitudeDelta: 0.15, longitudeDelta: 0.15 }}
        toolbarEnabled={false}
        onLongPress={onLongPress ? (e) => onLongPress(e.nativeEvent.coordinate) : undefined}>
        {pins.map((p) => (
          <Marker
            key={p.id}
            coordinate={{ latitude: p.lat, longitude: p.lng }}
            title={p.title}
            description={p.description}
            pinColor={p.color ?? colors.brand}
            onPress={onPinPress ? () => onPinPress(p.id) : undefined}
          />
        ))}
        {route && route.length >= 2 ? <Polyline coordinates={route} strokeColor={colors.brand} strokeWidth={4} lineDashPattern={[8, 6]} /> : null}
        {draft ? <Marker coordinate={draft} pinColor={colors.warning} title="새 장소" /> : null}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', borderRadius: radius.xl, overflow: 'hidden', backgroundColor: colors.brandSoft },
});
