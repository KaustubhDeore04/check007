import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const container = document.getElementById('three-canvas');
const loadingEl = document.querySelector('.render-loading');
if (!container) {
  // Collection page not present on this document.
} else {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const INK = 0x201710;
  const FABRIC = 0x53624a; // sage velvet
  const FABRIC_DARK = 0x3d4838;
  const BRASS = 0xb8813c;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(INK);
  scene.fog = new THREE.Fog(INK, 8, 16);

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(4.3, 2.3, 5.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // ---- Lighting ----
  const hemi = new THREE.HemisphereLight(0xffe9cf, 0x1a130d, 0.55);
  scene.add(hemi);

  const key = new THREE.DirectionalLight(0xfff2e0, 2.1);
  key.position.set(4, 6, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.left = -5;
  key.shadow.camera.right = 5;
  key.shadow.camera.top = 5;
  key.shadow.camera.bottom = -5;
  key.shadow.bias = -0.0015;
  scene.add(key);

  const rim = new THREE.PointLight(BRASS, 6, 12);
  rim.position.set(-3.2, 2.4, -2.5);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0x9db3ff, 0.25);
  fill.position.set(-4, 2, 3);
  scene.add(fill);

  // ---- Ground (shadow catcher) ----
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(9, 64),
    new THREE.ShadowMaterial({ opacity: 0.38 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // ---- Sofa ----
  const sofa = new THREE.Group();

  const fabricMat = new THREE.MeshPhysicalMaterial({
    color: FABRIC,
    roughness: 0.85,
    sheen: 1,
    sheenRoughness: 0.7,
    sheenColor: new THREE.Color(0x8a9a78),
  });
  const fabricDarkMat = new THREE.MeshPhysicalMaterial({
    color: FABRIC_DARK,
    roughness: 0.9,
    sheen: 0.8,
    sheenRoughness: 0.8,
    sheenColor: new THREE.Color(0x6c7a5c),
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: BRASS,
    metalness: 0.9,
    roughness: 0.32,
  });

  function box(w, h, d, mat, radius = 0.07) {
    const geo = new RoundedBoxGeometry(w, h, d, 3, radius);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  // Base
  const base = box(3.5, 0.5, 1.35, fabricDarkMat, 0.08);
  base.position.y = 0.58;
  sofa.add(base);

  // Backrest
  const back = box(3.5, 1.05, 0.32, fabricDarkMat, 0.09);
  back.position.set(0, 1.28, -0.52);
  back.rotation.x = -0.06;
  sofa.add(back);

  // Armrests
  [-1.66, 1.66].forEach((x) => {
    const arm = box(0.42, 0.78, 1.35, fabricDarkMat, 0.1);
    arm.position.set(x, 0.85, 0);
    sofa.add(arm);
  });

  // Seat cushions
  [-1.05, 0, 1.05].forEach((x) => {
    const cushion = box(1.02, 0.32, 1.1, fabricMat, 0.12);
    cushion.position.set(x, 0.9, 0.02);
    sofa.add(cushion);
  });

  // Back cushions
  [-1.0, 0, 1.0].forEach((x) => {
    const cushion = box(1.0, 0.62, 0.3, fabricMat, 0.15);
    cushion.position.set(x, 1.28, -0.28);
    cushion.rotation.x = -0.12;
    sofa.add(cushion);
  });

  // Legs
  const legGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.36, 16);
  [
    [-1.55, -0.5],
    [1.55, -0.5],
    [-1.55, 0.5],
    [1.55, 0.5],
  ].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, metalMat);
    leg.position.set(x, 0.18, z);
    leg.castShadow = true;
    sofa.add(leg);
  });

  scene.add(sofa);
  sofa.position.y = -0.55;

  // ---- Controls ----
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.45, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 3.2;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.7;
  controls.enablePan = false;

  let idleTimer = null;
  controls.addEventListener('start', () => {
    controls.autoRotate = false;
    clearTimeout(idleTimer);
  });
  controls.addEventListener('end', () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      controls.autoRotate = !reduceMotion;
    }, 2200);
  });

  function resize() {
    const { clientWidth, clientHeight } = container;
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(clientWidth, clientHeight);
  }
  window.addEventListener('resize', resize);
  resize();

  let framed = false;
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    if (!framed) {
      framed = true;
      requestAnimationFrame(() => {
        if (loadingEl) loadingEl.classList.add('is-hidden');
      });
    }
  }
  animate();
}
