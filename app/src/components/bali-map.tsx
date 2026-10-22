import { StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Polygon, Text as SvgText } from 'react-native-svg';

import { Radius } from '@/constants/theme';
import type { LatLng } from '@/domain/types';
import { useTheme } from '@/hooks/use-theme';

/**
 * Schematic coastline of Bali and Nusa Penida (longitude, latitude), simplified
 * to a few dozen points. It shows roughly where places are; it is not a
 * navigation map, so screens always offer "Open in Maps" alongside it.
 */
const BALI: [number, number][] = [
  [114.43, -8.17], [114.52, -8.1], [114.62, -8.12], [114.78, -8.16], [114.92, -8.17], [115.02, -8.15],
  [115.1, -8.11], [115.2, -8.08], [115.3, -8.1], [115.4, -8.15], [115.5, -8.21], [115.59, -8.28],
  [115.66, -8.33], [115.71, -8.4], [115.64, -8.47], [115.57, -8.51], [115.51, -8.53], [115.42, -8.56],
  [115.34, -8.6], [115.27, -8.67], [115.23, -8.74], [115.24, -8.8], [115.2, -8.85], [115.13, -8.85],
  [115.08, -8.83], [115.1, -8.78], [115.16, -8.77], [115.17, -8.72], [115.15, -8.68], [115.11, -8.64],
  [115.05, -8.6], [114.95, -8.54], [114.84, -8.49], [114.7, -8.43], [114.58, -8.37], [114.47, -8.29],
];
const PENIDA: [number, number][] = [
  [115.45, -8.69], [115.53, -8.66], [115.61, -8.68], [115.62, -8.74], [115.56, -8.8], [115.48, -8.78],
];

const ISLAND = { west: 114.38, east: 115.76, north: -8.03, south: -8.9 };
const WIDTH = 1000;
const HEIGHT = Math.round((WIDTH * (ISLAND.north - ISLAND.south)) / (ISLAND.east - ISLAND.west));
/** Smallest area shown when zooming to a cluster of points, in degrees of longitude. */
const MIN_SPAN = 0.12;

type Bounds = typeof ISLAND;

/** Bounds that fit the points with padding, keeping the frame's aspect ratio. */
function fitBounds(points: LatLng[]): Bounds {
  if (points.length === 0) return ISLAND;
  const lngs = points.map((p) => p.longitude);
  const lats = points.map((p) => p.latitude);
  const aspect = HEIGHT / WIDTH;
  let span = Math.max(MIN_SPAN, (Math.max(...lngs) - Math.min(...lngs)) * 1.5, ((Math.max(...lats) - Math.min(...lats)) * 1.5) / aspect);
  span = Math.min(span, ISLAND.east - ISLAND.west);
  const centreLng = (Math.max(...lngs) + Math.min(...lngs)) / 2;
  const centreLat = (Math.max(...lats) + Math.min(...lats)) / 2;
  return {
    west: centreLng - span / 2,
    east: centreLng + span / 2,
    north: centreLat + (span * aspect) / 2,
    south: centreLat - (span * aspect) / 2,
  };
}

function projector(bounds: Bounds) {
  return (longitude: number, latitude: number): [number, number] => [
    ((longitude - bounds.west) / (bounds.east - bounds.west)) * WIDTH,
    ((bounds.north - latitude) / (bounds.north - bounds.south)) * HEIGHT,
  ];
}

export type MapPoint = { id: string; coordinates: LatLng; label?: string; muted?: boolean };

type Props = {
  points: MapPoint[];
  /** Connect points in order, as a day's route, and zoom to fit them. */
  route?: boolean;
  selectedId?: string | null;
};

export function BaliMap({ points, route = false, selectedId }: Props) {
  const theme = useTheme();
  const project = projector(route ? fitBounds(points.map((p) => p.coordinates)) : ISLAND);
  const toPoints = (shape: [number, number][]) => shape.map(([lng, lat]) => project(lng, lat).join(',')).join(' ');
  const projected = points.map((point) => ({ ...point, xy: project(point.coordinates.longitude, point.coordinates.latitude) }));
  return (
    <View style={[styles.frame, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
      <Svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} width="100%" height="100%" accessibilityLabel="Schematic map of Bali">
        <Polygon points={toPoints(BALI)} fill={theme.surface} stroke={theme.border} strokeWidth={3} />
        <Polygon points={toPoints(PENIDA)} fill={theme.surface} stroke={theme.border} strokeWidth={3} />
        {route &&
          projected.slice(1).map((point, index) => {
            const from = projected[index].xy;
            return (
              <Line
                key={`leg-${point.id}`}
                x1={from[0]}
                y1={from[1]}
                x2={point.xy[0]}
                y2={point.xy[1]}
                stroke={theme.primary}
                strokeWidth={5}
                strokeDasharray="14 10"
                strokeLinecap="round"
              />
            );
          })}
        {projected.map((point, index) => {
          const selected = point.id === selectedId;
          const fill = point.muted ? theme.textMuted : selected ? theme.accent : theme.brand;
          return (
            <G key={point.id}>
              <Circle cx={point.xy[0]} cy={point.xy[1]} r={selected ? 30 : 24} fill={fill} stroke={theme.surface} strokeWidth={6} />
              {route && (
                <SvgText
                  x={point.xy[0]}
                  y={point.xy[1] + 9}
                  fontSize={26}
                  fontWeight="700"
                  fill={theme.brandText}
                  textAnchor="middle">
                  {String(index + 1)}
                </SvgText>
              )}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: WIDTH / HEIGHT,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
});
