'use client';
import { useEffect, useRef, FC } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import {
  latLonToVec3, vec3ToLatLon, buildBorderMesh, buildRiverMesh,
  buildCountryHighlight, findCountry, featureCentroid,
  GeoJsonFeature, GeoJsonCollection,
} from '../lib/geo';
import { generateCloudTexture } from '../lib/textures';

// ── GLSL shaders for real-texture day/night Earth ─────────────────────────────
const EARTH_VERT = /* glsl */`
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;
  void main() {
    vUv = uv;
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const EARTH_FRAG = /* glsl */`
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D specMap;
  uniform vec3 sunDir;
  varying vec2 vUv;
  varying vec3 vWorldNormal;
  varying vec3 vWorldPos;

  void main() {
    vec3 n = normalize(vWorldNormal);
    vec3 sun = normalize(sunDir);

    // Day/night terminator blend
    float cosA = dot(n, sun);
    float blend = smoothstep(-0.12, 0.22, cosA);

    vec4 dayColor   = texture2D(dayMap,   vUv);
    vec4 nightColor = texture2D(nightMap, vUv);
    // Boost city lights on the dark side
    nightColor.rgb *= 2.2;

    // Ocean specular highlight
    vec3 viewDir  = normalize(cameraPosition - vWorldPos);
    vec3 halfVec  = normalize(sun + viewDir);
    float spec    = pow(max(dot(n, halfVec), 0.0), 55.0);
    float ocean   = texture2D(specMap, vUv).r;
    vec3 specular = spec * ocean * vec3(0.25, 0.35, 0.6) * blend;

    vec3 color = mix(nightColor.rgb, dayColor.rgb, blend) + specular;
    gl_FragColor = vec4(color, 1.0);
  }
`;

// ── Continent anchors ─────────────────────────────────────────────────────────
const CONTINENTS = [
  { name: 'NORTH AMERICA', lat: 48, lon: -100 },
  { name: 'SOUTH AMERICA', lat: -14, lon: -57 },
  { name: 'EUROPE', lat: 54, lon: 15 },
  { name: 'AFRICA', lat: 0, lon: 22 },
  { name: 'ASIA', lat: 42, lon: 90 },
  { name: 'AUSTRALIA', lat: -24, lon: 134 },
  { name: 'ANTARCTICA', lat: -80, lon: 0 },
];

// ── Label factory ─────────────────────────────────────────────────────────────
type LabelType = 'continent' | 'country' | 'city' | 'mountain';

const LABEL_STYLES: Record<LabelType, string> = {
  continent: 'font:700 13px Inter,Arial,sans-serif;color:rgba(255,255,255,0.95);letter-spacing:3px;text-shadow:0 0 10px rgba(0,0,0,1),0 0 4px rgba(0,0,0,1);pointer-events:none;white-space:nowrap',
  country:   'font:600 11px Inter,Arial,sans-serif;color:rgba(255,255,255,0.8);text-shadow:0 0 8px rgba(0,0,0,1),0 0 3px rgba(0,0,0,1);pointer-events:none;white-space:nowrap',
  city:      'font:500 9px Inter,Arial,sans-serif;color:rgba(255,240,160,0.9);text-shadow:0 0 6px rgba(0,0,0,1);pointer-events:none;white-space:nowrap',
  mountain:  'font:400 8px Inter,Arial,sans-serif;color:rgba(190,210,255,0.85);text-shadow:0 0 5px rgba(0,0,0,1);pointer-events:none;white-space:nowrap',
};

function makeLabel(text: string, type: LabelType, lat: number, lon: number, r = 1.065): CSS2DObject {
  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = LABEL_STYLES[type];
  const obj = new CSS2DObject(el);
  obj.position.copy(latLonToVec3(lat, lon, r));
  return obj;
}

// ── LOD thresholds ────────────────────────────────────────────────────────────
function getLod(dist: number): number {
  if (dist > 4.0) return 0;
  if (dist > 2.5) return 1;
  if (dist > 1.7) return 2;
  if (dist > 1.25) return 3;
  return 4;
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface CountryInfo {
  name: string;
  continent: string;
  population: number;
  iso: string;
}

export interface EarthGlobeProps {
  showClouds: boolean;
  showAtmosphere: boolean;
  showLabels: boolean;
  autoRotate: boolean;
  onCountrySelect: (info: CountryInfo | null) => void;
  onReady: () => void;
  onApiReady: (api: { resetView: () => void }) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
const EarthGlobe: FC<EarthGlobeProps> = (props) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    const container = mountRef.current!;
    let animId = 0;

    // ── WebGL renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);

    // ── CSS2D label renderer ──
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(container.clientWidth, container.clientHeight);
    Object.assign(labelRenderer.domElement.style, {
      position: 'absolute', top: '0', left: '0',
      width: '100%', height: '100%',
      pointerEvents: 'none', zIndex: '10',
    });
    container.appendChild(labelRenderer.domElement);

    // ── Scene + Camera ──
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 1000,
    );
    camera.position.set(0, 0, 2.8);

    // ── Lights ──
    scene.add(new THREE.AmbientLight(0x223355, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    // ── Stars ──
    const starPositions: number[] = [];
    for (let i = 0; i < 8000; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 250 + Math.random() * 150;
      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi),
        r * Math.sin(phi) * Math.sin(theta),
      );
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, sizeAttenuation: true })));

    // ── Earth sphere with custom day/night shader ──
    const sunDir = new THREE.Vector3(5, 3, 5).normalize();
    const earthGeo = new THREE.SphereGeometry(1, 64, 64);
    const earthShader = new THREE.ShaderMaterial({
      uniforms: {
        dayMap:   { value: null },
        nightMap: { value: null },
        specMap:  { value: null },
        sunDir:   { value: sunDir },
      },
      vertexShader: EARTH_VERT,
      fragmentShader: EARTH_FRAG,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthShader);
    scene.add(earthMesh);

    // ── Clouds ──
    const cloudGeo = new THREE.SphereGeometry(1.016, 48, 48);
    const cloudMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.38, depthWrite: false });
    const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
    scene.add(cloudMesh);

    // ── Atmosphere glow ──
    const atmGeo = new THREE.SphereGeometry(1.058, 32, 32);
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x0066ff, transparent: true, opacity: 0.11,
      side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    scene.add(new THREE.Mesh(atmGeo, atmMat));

    // ── Controls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    Object.assign(controls, {
      enableDamping: true, dampingFactor: 0.06,
      minDistance: 1.08, maxDistance: 7,
      enablePan: false, autoRotate: true, autoRotateSpeed: 0.4,
    });

    // ── Label groups ──
    const continentGroup = new THREE.Group();
    const countryLabelGroup = new THREE.Group();
    const cityLabelGroup = new THREE.Group();
    const mountainLabelGroup = new THREE.Group();
    scene.add(continentGroup, countryLabelGroup, cityLabelGroup, mountainLabelGroup);

    // All label CSS2DObjects — for back-face culling each frame
    const allLabels: CSS2DObject[] = [];

    // Continent labels (immediate, no data needed)
    for (const c of CONTINENTS) {
      const obj = makeLabel(c.name, 'continent', c.lat, c.lon);
      continentGroup.add(obj);
      allLabels.push(obj);
    }

    // ── Geo layer refs ──
    let borderMesh: THREE.LineSegments | null = null;
    let riverMesh: THREE.LineSegments | null = null;
    let cityPoints: THREE.Points | null = null;
    let mountainPoints: THREE.Points | null = null;
    let highlightGroup: THREE.Group | null = null;
    let countriesData: GeoJsonCollection | null = null;

    // ── Async: load real NASA textures ──
    function loadTex(path: string): Promise<THREE.Texture> {
      return new Promise((res, rej) => new THREE.TextureLoader().load(path, res, undefined, rej));
    }

    async function buildTextures() {
      const [dayTex, nightTex, specTex] = await Promise.all([
        loadTex('/textures/earth_day.jpg'),
        loadTex('/textures/earth_night.png'),
        loadTex('/textures/earth_specular.jpg'),
      ]);
      dayTex.colorSpace   = THREE.SRGBColorSpace;
      nightTex.colorSpace = THREE.SRGBColorSpace;
      earthShader.uniforms.dayMap.value   = dayTex;
      earthShader.uniforms.nightMap.value = nightTex;
      earthShader.uniforms.specMap.value  = specTex;
      // Procedural cloud layer
      cloudMat.map = generateCloudTexture();
      cloudMat.needsUpdate = true;
    }

    // ── Async: geo data ──
    async function loadGeoData() {
      try {
        const [countries, cities, rivers, mountains] = await Promise.all([
          fetch('/geo/countries.geojson').then(r => r.json()),
          fetch('/geo/cities.geojson').then(r => r.json()),
          fetch('/geo/rivers.geojson').then(r => r.json()),
          fetch('/geo/mountains.json').then(r => r.json()),
        ]);

        countriesData = countries as GeoJsonCollection;

        // Country borders
        borderMesh = buildBorderMesh(countries, 0x667799, 1.003);
        borderMesh.visible = false;
        scene.add(borderMesh);

        // Country name labels
        for (const feature of countriesData.features) {
          const name = ((feature.properties.NAME || feature.properties.ADMIN || '') as string).trim();
          if (!name) continue;
          const c = featureCentroid(feature);
          const obj = makeLabel(name, 'country', c.lat, c.lon);
          obj.visible = false;
          countryLabelGroup.add(obj);
          allLabels.push(obj);
        }

        // Rivers
        riverMesh = buildRiverMesh(rivers, 1.003);
        riverMesh.visible = false;
        scene.add(riverMesh);

        // City dots (all) + labels (capitals + large cities only)
        const citiesGeo = cities as GeoJsonCollection;
        const cityPositions: number[] = [];
        for (const f of citiesGeo.features) {
          const coords = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
          const v = latLonToVec3(coords[1], coords[0], 1.003);
          cityPositions.push(v.x, v.y, v.z);
        }
        const cityBufGeo = new THREE.BufferGeometry();
        cityBufGeo.setAttribute('position', new THREE.Float32BufferAttribute(cityPositions, 3));
        cityPoints = new THREE.Points(cityBufGeo, new THREE.PointsMaterial({
          color: 0xffee99, size: 0.005, sizeAttenuation: true, transparent: true, opacity: 0.85,
        }));
        cityPoints.visible = false;
        scene.add(cityPoints);

        // Labels for notable cities
        const labelCities = citiesGeo.features
          .filter(f => {
            const cls = ((f.properties.FEATURECLA as string) || '').toLowerCase();
            const pop = (f.properties.POP_MAX as number) || 0;
            return cls.includes('capital') || pop > 2000000;
          })
          .slice(0, 100);

        for (const f of labelCities) {
          const name = ((f.properties.NAME || f.properties.name || '') as string).trim();
          if (!name) continue;
          const coords = (f.geometry as unknown as { coordinates: [number, number] }).coordinates;
          const obj = makeLabel(name, 'city', coords[1], coords[0], 1.068);
          obj.visible = false;
          cityLabelGroup.add(obj);
          allLabels.push(obj);
        }

        // Mountain points + labels
        const mtnPositions: number[] = [];
        for (const m of mountains as Array<{ name: string; lat: number; lon: number; elevation: number }>) {
          const v = latLonToVec3(m.lat, m.lon, 1.003);
          mtnPositions.push(v.x, v.y, v.z);
          const obj = makeLabel(`▲ ${m.name} ${(m.elevation / 1000).toFixed(1)}km`, 'mountain', m.lat, m.lon, 1.07);
          obj.visible = false;
          mountainLabelGroup.add(obj);
          allLabels.push(obj);
        }
        const mtnBufGeo = new THREE.BufferGeometry();
        mtnBufGeo.setAttribute('position', new THREE.Float32BufferAttribute(mtnPositions, 3));
        mountainPoints = new THREE.Points(mtnBufGeo, new THREE.PointsMaterial({
          color: 0xaabbff, size: 0.006, sizeAttenuation: true, transparent: true, opacity: 0.9,
        }));
        mountainPoints.visible = false;
        scene.add(mountainPoints);

      } catch (err) {
        console.warn('Geo data failed:', err);
      }
    }

    Promise.all([buildTextures(), loadGeoData()]).then(() => propsRef.current.onReady());

    // ── Expose reset API ──
    propsRef.current.onApiReady({
      resetView() {
        camera.position.set(0, 0, 2.8);
        controls.target.set(0, 0, 0);
        controls.update();
      },
    });

    // ── Click / selection ──
    const raycaster = new THREE.Raycaster();
    let pointerDownPos = new THREE.Vector2();

    function onPointerDown(e: PointerEvent) {
      pointerDownPos = new THREE.Vector2(
        (e.clientX / container.clientWidth) * 2 - 1,
        -(e.clientY / container.clientHeight) * 2 + 1,
      );
    }

    function onPointerUp(e: PointerEvent) {
      const up = new THREE.Vector2(
        (e.clientX / container.clientWidth) * 2 - 1,
        -(e.clientY / container.clientHeight) * 2 + 1,
      );
      if (up.distanceTo(pointerDownPos) > 0.012) return; // was a drag

      raycaster.setFromCamera(up, camera);
      const hits = raycaster.intersectObject(earthMesh);
      if (!hits.length) {
        if (highlightGroup) { scene.remove(highlightGroup); highlightGroup = null; }
        propsRef.current.onCountrySelect(null);
        return;
      }

      const { lat, lon } = vec3ToLatLon(hits[0].point);
      if (!countriesData) return;

      const feature = findCountry(lon, lat, countriesData.features);
      if (!feature) {
        if (highlightGroup) { scene.remove(highlightGroup); highlightGroup = null; }
        propsRef.current.onCountrySelect(null);
        return;
      }

      if (highlightGroup) scene.remove(highlightGroup);
      highlightGroup = buildCountryHighlight(feature);
      scene.add(highlightGroup);

      const centroid = featureCentroid(feature);
      const targetPos = latLonToVec3(centroid.lat, centroid.lon, 2.1);
      zoomAnim = { from: camera.position.clone(), to: targetPos, t: 0 };

      const p = feature.properties;
      propsRef.current.onCountrySelect({
        name: ((p.NAME || p.ADMIN || 'Unknown') as string),
        continent: ((p.CONTINENT || '') as string),
        population: ((p.POP_EST || 0) as number),
        iso: ((p.ISO_A2 || '') as string),
      });
    }

    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointerup', onPointerUp);

    // ── Zoom animation state ──
    let zoomAnim: { from: THREE.Vector3; to: THREE.Vector3; t: number } | null = null;
    controls.addEventListener('start', () => { zoomAnim = null; });

    // ── LOD state ──
    let currentLod = -1;

    // ── RAF loop ──
    function animate() {
      animId = requestAnimationFrame(animate);

      // Zoom-to-country animation
      if (zoomAnim) {
        zoomAnim.t = Math.min(1, zoomAnim.t + 0.018);
        const e = zoomAnim.t < 0.5
          ? 2 * zoomAnim.t * zoomAnim.t
          : 1 - Math.pow(-2 * zoomAnim.t + 2, 2) / 2;
        camera.position.lerpVectors(zoomAnim.from, zoomAnim.to, e);
        controls.target.set(0, 0, 0);
        if (zoomAnim.t >= 1) zoomAnim = null;
      }

      const p = propsRef.current;
      controls.autoRotate = p.autoRotate && !zoomAnim;
      cloudMesh.visible = p.showClouds;
      cloudMesh.rotation.y += 0.00015;

      // LOD transitions
      const dist = camera.position.length();
      const lod = getLod(dist);
      if (lod !== currentLod) {
        currentLod = lod;
        if (borderMesh) borderMesh.visible = lod >= 1;
        if (cityPoints) cityPoints.visible = lod >= 2;
        if (riverMesh) riverMesh.visible = lod >= 3;
        if (mountainPoints) mountainPoints.visible = lod >= 4;
      }

      // Label group visibility (also reacts to showLabels toggle)
      continentGroup.visible = p.showLabels;
      countryLabelGroup.visible = p.showLabels && lod >= 1;
      cityLabelGroup.visible = p.showLabels && lod >= 2;
      mountainLabelGroup.visible = p.showLabels && lod >= 4;

      // Back-face cull labels via dot product
      if (p.showLabels) {
        const camNorm = camera.position.clone().normalize();
        for (const obj of allLabels) {
          const dot = obj.position.clone().normalize().dot(camNorm);
          (obj.element as HTMLElement).style.opacity = dot > 0.1 ? '1' : '0';
        }
      }

      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    }
    animate();

    // ── Resize ──
    const onResize = () => {
      const w = container.clientWidth, h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      labelRenderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── Cleanup ──
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      if (container.contains(labelRenderer.domElement)) container.removeChild(labelRenderer.domElement);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={mountRef} className="absolute inset-0" />;
};

export default EarthGlobe;
