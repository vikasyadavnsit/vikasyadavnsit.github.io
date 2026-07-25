import * as THREE from 'three';

export function latLonToVec3(lat: number, lon: number, r = 1.001): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export function vec3ToLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const n = v.clone().normalize();
  const lat = 90 - Math.acos(Math.max(-1, Math.min(1, n.y))) * (180 / Math.PI);
  const lon = (Math.atan2(n.z, -n.x) * (180 / Math.PI)) - 180;
  return { lat, lon: lon < -180 ? lon + 360 : lon };
}

export function buildBorderMesh(geojson: GeoJsonCollection, color: number, r = 1.002): THREE.LineSegments {
  const pts: THREE.Vector3[] = [];
  for (const feature of geojson.features) {
    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    for (const polygon of polygons) {
      for (const ring of polygon) {
        for (let i = 0; i < ring.length - 1; i++) {
          pts.push(latLonToVec3(ring[i][1], ring[i][0], r));
          pts.push(latLonToVec3(ring[i + 1][1], ring[i + 1][0], r));
        }
      }
    }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 });
  return new THREE.LineSegments(geo, mat);
}

export function buildRiverMesh(geojson: GeoJsonCollection, r = 1.002): THREE.LineSegments {
  const pts: THREE.Vector3[] = [];
  for (const feature of geojson.features) {
    const lines = feature.geometry.type === 'LineString'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        pts.push(latLonToVec3(line[i][1], line[i][0], r));
        pts.push(latLonToVec3(line[i + 1][1], line[i + 1][0], r));
      }
    }
  }
  const geo = new THREE.BufferGeometry().setFromPoints(pts);
  const mat = new THREE.LineBasicMaterial({ color: 0x4499ff, transparent: true, opacity: 0.55 });
  return new THREE.LineSegments(geo, mat);
}

function pointInRing(lon: number, lat: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > lat) !== (yj > lat)) && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

export function findCountry(lon: number, lat: number, features: GeoJsonFeature[]): GeoJsonFeature | null {
  for (const feature of features) {
    const polygons = feature.geometry.type === 'Polygon'
      ? [feature.geometry.coordinates]
      : feature.geometry.coordinates;
    for (const polygon of polygons) {
      if (!pointInRing(lon, lat, polygon[0])) continue;
      let inHole = false;
      for (let h = 1; h < polygon.length; h++) {
        if (pointInRing(lon, lat, polygon[h])) { inHole = true; break; }
      }
      if (!inHole) return feature;
    }
  }
  return null;
}

export function featureCentroid(feature: GeoJsonFeature): { lat: number; lon: number } {
  const polygons = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;
  let bestRing = polygons[0][0];
  for (const poly of polygons) {
    if (poly[0].length > bestRing.length) bestRing = poly[0];
  }
  let sumLon = 0, sumLat = 0;
  for (const [lon, lat] of bestRing) { sumLon += lon; sumLat += lat; }
  return { lon: sumLon / bestRing.length, lat: sumLat / bestRing.length };
}

export function buildCountryHighlight(feature: GeoJsonFeature, r = 1.003): THREE.Group {
  const group = new THREE.Group();
  const polygons = feature.geometry.type === 'Polygon'
    ? [feature.geometry.coordinates]
    : feature.geometry.coordinates;

  for (const polygon of polygons) {
    const outer = polygon[0];
    if (outer.length < 3) continue;

    const shape = new THREE.Shape();
    shape.moveTo(outer[0][0], outer[0][1]);
    for (let i = 1; i < outer.length - 1; i++) shape.lineTo(outer[i][0], outer[i][1]);
    shape.closePath();

    for (let h = 1; h < polygon.length; h++) {
      const hole = new THREE.Path();
      hole.moveTo(polygon[h][0][0], polygon[h][0][1]);
      for (let i = 1; i < polygon[h].length - 1; i++) hole.lineTo(polygon[h][i][0], polygon[h][i][1]);
      hole.closePath();
      shape.holes.push(hole);
    }

    const shapeGeo = new THREE.ShapeGeometry(shape, 1);
    const pos = shapeGeo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const v = latLonToVec3(pos.getY(i), pos.getX(i), r);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    shapeGeo.computeVertexNormals();

    const mesh = new THREE.Mesh(shapeGeo, new THREE.MeshBasicMaterial({
      color: 0x3388ff,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
      side: THREE.DoubleSide,
    }));
    group.add(mesh);
  }
  return group;
}

// ---- Types ----

// Use a flexible coordinate type that covers Point/Line/Polygon/MultiPolygon
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Coords = any;

export interface GeoJsonFeature {
  type: 'Feature';
  properties: Record<string, unknown>;
  geometry: {
    type: 'Polygon' | 'MultiPolygon' | 'LineString' | 'MultiLineString' | 'Point';
    coordinates: Coords;
  };
}

export interface GeoJsonCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}
