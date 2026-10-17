import * as T from "./vendor/three.module.js";
import { RoundedBoxGeometry } from "./vendor/RoundedBoxGeometry.js";
import {
  loadGame,
  saveGame,
  COSTUMES,
  LOGIN_REWARDS,
  TASKS,
  dayKey,
  dailyState,
  claimLogin,
  recordDaily,
  claimTask,
  selectCostume,
  REWARDED_ADS_ENABLED,
  showRewardedAd,
} from "./profile.js";
import { GameAudio } from "./audio.js";
import { L, LANG, setStaticText } from "./i18n.js";
import {
  Run,
  MISSIONS,
  DISTRICTS,
  CARGOS,
  COURIER_WEAPONS,
  validateSave,
  rewardRun,
  TITLE,
  objective,
  missionName,
  storyText,
} from "./core.js";
const UPPER = LANG === "en" ? "en" : "tr",
  NUMBERS = LANG === "en" ? "en-US" : "tr-TR";
const mapRecords = () =>
  settings.landscape === "trail" ? settings.trailRecords : settings.records;
const stageName = (m) => missionName(m, settings.landscape);
const $ = (s) => document.querySelector(s),
  view = $("#view");
let renderer;
try {
  renderer = new T.WebGLRenderer({
    antialias: true,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });
} catch (e) {
  $("#loading").hidden = true;
  view.innerHTML =
    L('<div class="error"><h2>3D görüntü açılamadı</h2><p>WebGL destekleyen Safari veya Chrome ile açmayı dene.</p></div>');
  throw e;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputColorSpace = T.SRGBColorSpace;
view.append(renderer.domElement);
// Observe readbacks without issuing one. Captures a bounded, local-only trace
// when the canvas is read by game/library code or an external integration.
const renderAudit = {
  webglReads: 0,
  canvasExports: 0,
  traces: [],
  installed: [],
};
function monitorReadback(target, method, counter) {
  if (!target || typeof target[method] !== "function") return;
  const original = target[method];
  try {
    target[method] = function (...args) {
      renderAudit[counter]++;
      if (renderAudit.traces.length < 4)
        renderAudit.traces.push({
          method,
          stack: new Error().stack?.split("\n").slice(2).join("\n"),
        });
      return Reflect.apply(original, this, args);
    };
    renderAudit.installed.push(method);
  } catch {
    /* A read-only platform method can still be audited statically. */
  }
}
monitorReadback(renderer.getContext?.(), "readPixels", "webglReads");
monitorReadback(renderer.domElement, "toDataURL", "canvasExports");
monitorReadback(renderer.domElement, "toBlob", "canvasExports");
window.KULHAT_RENDER_AUDIT = renderAudit;
const scene = new T.Scene();
scene.background = new T.Color("#263443");
scene.fog = new T.FogExp2("#263443", 0.012);
const camera = new T.PerspectiveCamera(57, innerWidth / innerHeight, 0.1, 250);
camera.position.set(0, 5.5, 13);
const hemi = new T.HemisphereLight("#b5d5ee", "#283641", 2.3);
scene.add(hemi);
const sun = new T.DirectionalLight("#ffceb2", 3.2);
sun.position.set(-12, 24, -35);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, {
  left: -22,
  right: 22,
  top: 25,
  bottom: -25,
  near: 1,
  far: 90,
});
sun.shadow.bias = -0.0005;
scene.add(sun);
scene.add(sun.target);
const fill = new T.PointLight("#55e5ec", 25, 24);
fill.position.set(0, 5, 5);
scene.add(fill);
const mats = {};
function mat(color, rough = 0.6, metal = 0.1, emissive = null) {
  let key = [color, rough, metal, emissive].join();
  return (mats[key] ??= new T.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: metal,
    emissive: emissive || 0,
    emissiveIntensity: emissive ? 1.7 : 0,
  }));
}
const geo = {};
function box(w, h, d, m, x = 0, y = 0, z = 0, parent = scene) {
  let key = [w, h, d].join(),
    o = new T.Mesh(
      (geo[key] ??=
        w < 1.4 && h < 1.5 && d < 1.4
          ? new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.12)
          : new T.BoxGeometry(w, h, d)),
      m,
    );
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function orb(r, m, x, y, z, parent = scene) {
  let o = new T.Mesh(
    (geo["sphere" + r] ??= new T.SphereGeometry(r, 12, 10)),
    m,
  );
  o.position.set(x, y, z);
  parent.add(o);
  return o;
}
function tex(draw, w = 128, h = 128) {
  let cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d"), w, h);
  let t = new T.CanvasTexture(cv);
  t.colorSpace = T.SRGBColorSpace;
  return t;
}
const glowTex = tex((c, w, h) => {
  let a = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  a.addColorStop(0, "#ffffff");
  a.addColorStop(0.15, "#ffffff99");
  a.addColorStop(1, "#ffffff00");
  c.fillStyle = a;
  c.fillRect(0, 0, w, h);
});
function glow(color, x, y, z, size, parent = scene) {
  let s = new T.Sprite(
    new T.SpriteMaterial({
      map: glowTex,
      color,
      transparent: true,
      blending: T.AdditiveBlending,
      depthWrite: false,
    }),
  );
  s.position.set(x, y, z);
  s.scale.set(size, size, 1);
  parent.add(s);
  return s;
}
const buildingTex = tex(
  (c, w, h) => {
    c.fillStyle = "#a0b4bf";
    c.fillRect(0, 0, w, h);
    for (let y = 8; y < h; y += 19)
      for (let x = 5; x < w; x += 19) {
        c.fillStyle = Math.random() < 0.5 ? "#e2c19b" : "#243b4a";
        c.fillRect(x, y, 8, 10);
        c.fillStyle = "#152635";
        c.fillRect(x + 4, y, 1, 10);
      }
  },
  128,
  256,
);
buildingTex.wrapS = buildingTex.wrapT = T.RepeatWrapping;
const roadTex = tex(
  (c, w, h) => {
    c.fillStyle = "#b6966d";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      let v = Math.random() * 50 + 70;
      c.fillStyle = "rgba(" + v + "," + v + "," + v + ",.1)";
      c.fillRect(Math.random() * w, Math.random() * h, 1, 2);
    }
    c.strokeStyle = "#8b704f";
    c.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.moveTo(Math.random() * w, 0);
      c.lineTo(Math.random() * w, h);
      c.stroke();
    }
  },
  256,
  256,
);
roadTex.wrapS = roadTex.wrapT = T.RepeatWrapping;
roadTex.repeat.set(2, 5);
const roadMat = new T.MeshStandardMaterial({
  map: roadTex,
  color: "#e7c798",
  roughness: 0.98,
  metalness: 0,
  bumpMap: roadTex,
  bumpScale: 0.12,
});
const skyline = new T.Group();
for (let i = 0; i < 45; i++) {
  let side = i % 2 ? 1 : -1,
    x = side * (25 + Math.random() * 70),
    h = 18 + Math.random() * 34,
    z = -70 - Math.random() * 130;
  let peak = new T.Mesh(
    (geo.mountainPeak ??= new T.ConeGeometry(1, 1, 6)),
    mat(i % 2 ? "#927e65" : "#b09a7b", 0, 1),
  );
  peak.scale.set(14 + (i % 5) * 3, h, 18);
  peak.position.set(x, h / 2 - 4, z);
  skyline.add(peak);
}
scene.add(skyline);
orb(12, new T.MeshBasicMaterial({ color: "#f3bd9e" }), -55, 50, -190);
glow("#ffd1ae", -55, 50, -180, 70);
let segments = [];
const SEG = 28;
function sign(text, color, parent, x, y, z) {
  if (text !== L("KAPI")) return null;
  let t = tex(
    (c, w, h) => {
      c.fillStyle = "#0b1e2b";
      c.fillRect(0, 0, w, h);
      c.fillStyle = color;
      let size = 31;
      c.font = "bold " + size + "px system-ui";
      let measured = c.measureText?.(text)?.width;
      if (Number.isFinite(measured) && measured > w - 24) {
        size = Math.max(12, Math.floor((size * (w - 24)) / measured));
        c.font = "bold " + size + "px system-ui";
      }
      c.textAlign = "center";
      c.fillText(text, w / 2, 43, w - 24);
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(3, 3, w - 6, h - 6);
    },
    256,
    64,
  );
  let o = new T.Mesh(
    new T.PlaneGeometry(3.6, 0.9),
    new T.MeshBasicMaterial({ map: t }),
  );
  o.position.set(x, text === L("KAPI") ? y : y + 2.2, z);
  if (parent.userData.rooftop) {
    o.scale.setScalar(1.4);
    o.position.x = x < 0 ? -7.8 : 7.8;
    o.position.y = Math.max(7.8, o.position.y);
    o.visible = false;
  }
  o.userData.ownMat = true;
  o.userData.signText = text;
  if (text === L("KAPI")) parent.add(o);
  else {
    o.material.map.dispose();
    o.material.dispose();
    o.geometry.dispose();
  }
  return o;
}
for (let i = 0; i < 8; i++) {
  const g = new T.Group();
  g.position.z = 12 - i * SEG;
  box(11, 0.25, SEG, roadMat, 0, -0.18, -SEG / 2, g);
  g.userData.streetChildren = [...g.children];
  scene.add(g);
  segments.push(g);
}
const runner = new T.Group();
scene.add(runner);
runner.position.set(0, 0, 3);
let body = new T.Group();
runner.add(body);
// Masked courier with sculpted hood, coat and luminous cargo harness.
const suit = mat("#174c5c", 0.5, 0.15).clone(),
  armor = mat("#66d7cb", 0.35, 0.25).clone(),
  accent = mat("#ff9b62", 0.3, 0.35, "#9d4327"),
  boot = mat("#253040");
let torso = orb(0.58, suit, 0, 1.52, 0, body);
torso.scale.set(0.9, 1.2, 0.72);
orb(0.38, mat("#d7f1d5"), 0, 1.48, -0.35, body).scale.set(0.9, 1.15, 0.45);
// Cargo harness gives the rear silhouette depth instead of a flat backpack.
box(0.62, 0.5, 0.34, mat("#c76f4b"), 0, 1.52, 0.48, body);
box(0.08, 0.58, 0.08, accent, -0.23, 1.5, 0.68, body).rotation.z = -0.25;
box(0.08, 0.58, 0.08, accent, 0.23, 1.5, 0.68, body).rotation.z = 0.25;
const head = orb(0.43, armor, 0.08, 2.18, -0.05, body);
head.scale.set(0.92, 1.08, 0.9);
let hood = orb(0.49, suit, 0.08, 2.18, 0.03, body);
hood.scale.set(1, 1.08, 0.92);
box(
  0.61,
  0.16,
  0.13,
  mat("#a1fff0", 0.2, 0.5, "#3a9c94"),
  0.08,
  2.26,
  -0.4,
  body,
);
for (let s of [-1, 1])
  orb(
    0.075,
    mat("#142535", 0.25, 0.2, "#83eade"),
    s * 0.22 + 0.08,
    2.3,
    -0.33,
    body,
  );
for (let s of [-1, 1]) {
  let tail = box(
    0.2,
    0.18,
    0.3,
    s < 0 ? armor : accent,
    s * 0.18,
    0.95,
    0.25,
    body,
  );
  tail.scale.y = 3;
  tail.rotation.x = -0.18;
  tail.rotation.z = s * 0.18;
}
const arms = [],
  legs = [];
for (let s of [-1, 1]) {
  let leg = new T.Group();
  leg.position.set(s * 0.24, 1.05, 0);
  box(0.16, 0.56, 0.18, accent, 0, -0.26, 0, leg);
  box(0.18, 0.5, 0.2, armor, 0, -0.72, 0.02, leg);
  box(0.3, 0.14, 0.62, boot, 0, -1, -0.13, leg);
  body.add(leg);
  legs.push(leg);
  let arm = new T.Group();
  arm.position.set(s * 0.53, 1.82, 0);
  let wing = box(0.32, 0.62, 0.22, s < 0 ? armor : suit, 0, -0.27, 0, arm);
  wing.rotation.z = s * 0.12;
  box(0.2, 0.42, 0.18, accent, 0, -0.72, -0.03, arm);
  body.add(arm);
  arms.push(arm);
}
let weapon = box(
  0.18,
  0.21,
  0.6,
  mat("#516775", 0.25, 0.7),
  0.55,
  1.27,
  -0.48,
  body,
);
box(0.08, 0.08, 0.25, accent, 0.55, 1.27, -0.85, body);
const muzzleFlash = glow("#ffce6c", 0.55, 1.27, -1.05, 1.7, body);
muzzleFlash.visible = false;
let shieldBubble = new T.Mesh(
  new T.SphereGeometry(1.5, 20, 16),
  new T.MeshBasicMaterial({
    color: "#6ae5eb",
    transparent: true,
    opacity: 0.09,
    wireframe: true,
  }),
);
shieldBubble.position.y = 1.3;
runner.add(shieldBubble);
let rainCount = 450,
  rainGeo = new T.BufferGeometry(),
  rainPos = new Float32Array(rainCount * 3);
for (let i = 0; i < rainCount; i++) {
  rainPos[i * 3] = (Math.random() - 0.5) * 38;
  rainPos[i * 3 + 1] = Math.random() * 22;
  rainPos[i * 3 + 2] = -Math.random() * 70 + 12;
}
rainGeo.setAttribute("position", new T.BufferAttribute(rainPos, 3));
let rain = new T.Points(
  rainGeo,
  new T.PointsMaterial({
    color: "#bedbe9",
    size: 0.035,
    transparent: true,
    opacity: 0.5,
  }),
);
scene.add(rain);
const dust = new T.Group();
const dustMaterial = new T.SpriteMaterial({
  map: glowTex,
  color: "#d9bd92",
  transparent: true,
  opacity: 0.16,
  depthWrite: false,
});
for (let i = 0; i < 28; i++) {
  let cloud = new T.Sprite(dustMaterial);
  cloud.position.set(
    (i % 2 ? 1 : -1) * (6 + (i % 8)),
    0.6 + (i % 4) * 0.25,
    -i * 6,
  );
  cloud.scale.set(5 + (i % 4), 1.8 + (i % 3), 1);
  dust.add(cloud);
}
scene.add(dust);
const clamp = T.MathUtils.clamp;
// platform.js (YouTube Playables cloud save or localStorage) when present.
const platform = globalThis.KULHAT_PLATFORM || null,
  inPlayables = !!platform?.inPlayables;
const storageAdapter = platform?.storage || {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};
let ytAudio = platform ? platform.isAudioEnabled() : true,
  systemPaused = false;
let { settings, profile } = loadGame(storageAdapter, validateSave);
const TRANSMISSIONS = [
  L("Yayın henüz kilitli. İlk bölge finaline ulaş."),
  L("01 · Biri şehrin tahliye yollarını içeriden kapattı."),
  L("02 · Külhat bir isim değil; kayıp kuryelerin ortak çağrı kodu."),
  L("03 · Takipçi yükün peşinde değil, taşıdığın şehir hafızasının peşinde."),
  L("04 · Altı röle aynı gece susturuldu. İçlerinden biri hâlâ cevap veriyor."),
  L("05 · Son teslimat bir paket değil; şehrin yeniden başlatma anahtarı."),
  L("06 · Yayın tamamlandı: sıradaki hedef, sessizliğin merkezindeki Çekirdek."),
  L("07 · Kızıl Maden'in vinçleri kaçış raylarına vagon bırakıyor."),
  L("08 · Kartal Geçidi açıldı. Kasabanın son konvoyu artık özgür."),
];
const DAILY_CONTRACTS = [
  { text: L("Bir teslimatı başarıyla tamamla"), met: (r) => r.success },
  { text: L("Tek koşuda en az 3 dron düşür"), met: (r) => r.kills >= 3 },
  {
    text: L("Bir kestirme kullanarak teslimatı tamamla"),
    met: (r) => r.success && r.routes.includes("risk"),
  },
];
function todayKey(d = new Date()) {
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
function dailyContract() {
  let key = todayKey(),
    index =
      Math.floor(new Date(key + "T12:00:00").getTime() / 86400000) %
      DAILY_CONTRACTS.length;
  return { ...DAILY_CONTRACTS[index], key };
}
function transmissionCount() {
  return MISSIONS.filter((m) => m.boss && mapRecords()[m.id]).length;
}
function masteryLevel(value) {
  return value >= 120
    ? 4
    : value >= 60
      ? 3
      : value >= 25
        ? 2
        : value >= 8
          ? 1
          : 0;
}
let selected = Math.min(MISSIONS.length - 1, settings.unlocked - 1),
  page = Math.floor(selected / 5),
  run = null,
  mode = "menu",
  time = 0,
  last = 0,
  holding = false,
  pointer = null,
  paused = false,
  sessionRewarded = false,
  shake = 0,
  alertTimer = 0,
  flashTimer = 0,
  visuals = new Map(),
  bulletMeshes = new Map(),
  particles = [],
  effects = [],
  regionMeshes = [],
  currentDistrict = -1,
  quality = "high",
  frameCount = 0,
  fpsTime = 0,
  slowTime = 0,
  armoryOpen = false,
  muted = !settings.sound;
const gameAudio = new GameAudio(window);
gameAudio.setMuted(muted || !ytAudio);
// Inside YouTube only the SDK pause state is used, never the Page Visibility API.
const audioAllowed = () =>
  !muted && ytAudio && !(inPlayables ? systemPaused : document.hidden);
function save() {
  if (!saveGame(storageAdapter, settings, profile)) {
    const el = $("#storage");
    if (el)
      el.textContent = L("Kayıt kullanılamıyor; bu oturumdaki ilerleme bellekte.");
    else notice(L("Kayıt kullanılamıyor; ilerleme bu oturumda bellekte."), 4);
  }
}
function sound(f = 400, d = 0.1, type = "sine") {
  if (audioAllowed()) gameAudio.effect(f, d, type);
}
function initAmbient() {
  if (audioAllowed()) gameAudio.start(settings.landscape);
}
function setQuality(q) {
  quality = q;
  let low = q === "low";
  renderer.setPixelRatio(low ? 0.7 : Math.min(devicePixelRatio, 1.6));
  renderer.shadowMap.enabled = !low;
  camera.far = low ? 105 : 250;
  camera.updateProjectionMatrix();
  sun.castShadow = !low;
  fill.visible = !low;
  skyline.visible = !low;
  dust.children.forEach((cloud, i) => (cloud.visible = !low || i < 2));
  rain.material.opacity = low ? 0 : 0.5;
  $("#quality").textContent = low ? L("GÖRÜNTÜ: EKONOMİK") : L("GÖRÜNTÜ: YÜKSEK");
}
function cleanup(group) {
  group.parent?.remove(group);
  group.traverse?.((o) => {
    if (o.userData.ownedInstances) o.dispose();
    if (o.isSprite) o.material.dispose();
    if (o.userData.ownMat) {
      o.material.map?.dispose();
      o.material.dispose();
      o.geometry?.dispose();
    }
    if (o.userData.ownGeo) o.geometry?.dispose();
  });
}
function batchStaticDecor(group) {
  if (!group || group.userData.batched) return;
  const buckets = new Map();
  for (let mesh of [...group.children]) {
    if (
      !mesh.isMesh ||
      mesh.isInstancedMesh ||
      !mesh.visible ||
      mesh.userData.signText ||
      mesh.userData.lane !== undefined ||
      Array.isArray(mesh.material)
    )
      continue;
    const key = mesh.geometry.uuid + ":" + mesh.material.uuid;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(mesh);
  }
  for (const meshes of buckets.values()) {
    if (meshes.length < 4) continue;
    const first = meshes[0],
      instances = new T.InstancedMesh(
        first.geometry,
        first.material,
        meshes.length,
      );
    instances.userData.ownedInstances = true;
    instances.castShadow = first.castShadow;
    instances.receiveShadow = first.receiveShadow;
    meshes.forEach((mesh, i) => {
      mesh.updateMatrix();
      instances.setMatrixAt(i, mesh.matrix);
      group.remove(mesh);
    });
    instances.instanceMatrix.needsUpdate = true;
    group.add(instances);
  }
  group.userData.batched = true;
}
function burst(position, color, count = 16) {
  if (quality === "low") count = Math.min(2, Math.ceil(count / 6));
  for (
    let i = 0;
    i < count && particles.length < (quality === "low" ? 12 : 120);
    i++
  ) {
    let mesh = box(
      0.08,
      0.08,
      0.08,
      mat(color, 0.3, 0.3, color),
      position.x,
      position.y,
      position.z,
    );
    mesh.castShadow = false;
    particles.push({
      mesh,
      v: new T.Vector3(
        (Math.random() - 0.5) * 7,
        Math.random() * 5,
        (Math.random() - 0.5) * 7,
      ),
      life: 0.6,
    });
  }
}
function westernText(text) {
  if (settings.landscape !== "western" || typeof text !== "string") return text;
  const pairs =
    LANG === "en"
      ? [
          ["disables drones", "stops wagons"],
          ["Shooting drones", "Stopping wagons"],
          ["Shoot down", "Stop"],
          ["a drone", "a wagon"],
          ["DRONES DISABLED", "WAGONS STOPPED"],
          ["DRONES", "WAGONS"],
          ["drones", "wagons"],
          ["slide under lasers", "slide under low beams"],
          ["slide under the laser", "slide under low beams"],
          ["covered metro", "mine shaft"],
          ["METRO", "MINE"],
          ["metro", "mine"],
        ]
      : [
          ["dron düşür", "at arabası durdur"],
          ["Drona", "At arabasına"],
          ["Dronları vurmak", "Arabaları durdurmak"],
          ["dronları devre dışı bırakır", "arabaları durdurur"],
          ["DRONLARI", "ARABALARI"],
          [L("DRONLAR DEVRE DIŞI"), "ARABALAR DURDURULDU"],
          ["lazerlerin altından", "alçak kirişlerin altından"],
          ["lazerin altından", "alçak kirişlerin altından"],
          ["kapalı metroya", "maden ocağına"],
          ["METRO", "MADEN"],
          ["metro", "maden"],
        ];
  for (const [from, to] of pairs) text = text.replaceAll(from, to);
  return text;
}
function routeLabels() {
  return settings.landscape === "western"
    ? { left: L("MADEN OCAĞI"), middle: L("ANA CADDE"), right: L("ÇATILAR") }
    : { left: L("MAĞARA"), middle: L("PATİKA"), right: L("SIRT YOLU") };
}
function routeHint() {
  const names = routeLabels();
  return (
    L("SOL: ") + names.left + L(" · ORTA: ") + names.middle + L(" · SAĞ: ") + names.right
  );
}
function cargoLabel(kind) {
  return (
    {
      data: L("Standart paket"),
      heavy: L("Ağır paket"),
      fragile: L("Kırılgan yük"),
      medical: L("Tıbbi malzeme"),
      volatile: L("Hassas yük"),
      core: L("Özel emanet"),
    }[kind] || L("Paket")
  );
}
function notice(text, duration = 2) {
  $("#callout").textContent = westernText(text);
  alertTimer = duration;
}
function pathX(ahead) {
  if (!run) return 0;
  return (
    run.offset + (run.targetOffset - run.offset) * clamp(ahead / 100, 0, 1)
  );
}
function terrainAt(distance) {
  return run?.routeSections?.find(
    (s) => distance >= s.start && distance <= s.end,
  );
}
function groundAt(distance) {
  let s = terrainAt(distance);
  if (!s) return 0;
  if (s.kind === "street") return 0;
  let t = Math.min(1, (distance - s.start) / 65, (s.end - distance) / 65);
  return (s.kind === "roof" ? 9 : -3) * t * t * (3 - 2 * t);
}
function dressRoute(g, kind, variant = 0, district = 0) {
  let routeKey =
    kind +
    "-" +
    variant +
    "-" +
    district +
    "-" +
    settings.landscape +
    "-" +
    quality;
  if (g.userData.routeKey === routeKey) return;
  if (g.userData.routeDecor) cleanup(g.userData.routeDecor);
  g.userData.routeKind = kind;
  g.userData.routeKey = routeKey;
  g.userData.streetChildren.forEach(
    (c, i) => (c.visible = kind === "street" && i === 0),
  );
  g.userData.decor?.forEach((c) => (c.visible = false));
  let d = new T.Group();
  g.add(d);
  g.userData.routeDecor = d;
  g.userData.tiles = [];
  d.name = routeKey + "-architecture";
  if (kind === "street") {
    let trail = settings.landscape === "trail";
    d.userData.landscape = trail ? "trail" : "western";
    for (let side of [-1, 1]) {
      box(7, 0.2, 28, mat("#bda078", 0, 1), side * 8.8, -0.12, -14, d);
      for (let z of quality === "low" ? [-14] : [-6, -20]) {
        if (trail) {
          let cliff = new T.Mesh(
            (geo.trailCliff ??= new T.IcosahedronGeometry(1, 1)),
            mat(variant % 2 ? "#9d8a71" : "#b5a083", 0, 1),
          );
          cliff.scale.set(5 + (variant % 3), 8 + (variant % 4) * 2, 7);
          cliff.position.set(side * 13, 4, z);
          d.add(cliff);
          box(0.15, 1.2, 0.15, mat("#796548"), side * 5.8, 0.6, z, d);
          box(0.12, 0.12, 12, mat("#b39a70"), side * 5.8, 1.1, z - 2, d);
        } else {
          let wood = mat(
            ["#a66d3d", "#ba8150", "#85522f", "#b46d3d"][variant % 4],
            0.95,
            0,
          );
          box(6, 4.2, 9.5, wood, side * 10, 2.1, z, d);
          box(6.3, 0.3, 10, mat("#604b38"), side * 10, 4.35, z, d);
          box(6.3, 1.1, 0.3, wood, side * 10, 4.75, z + 4.9, d);
          box(1.25, 2.3, 0.12, mat("#40342a"), side * 10, 1.2, z + 4.82, d);
          for (let dx of [-1.9, 1.9]) {
            box(
              1.1,
              1.3,
              0.14,
              mat("#d0b17c"),
              side * 10 + dx,
              1.9,
              z + 4.87,
              d,
            );
            box(0.8, 1, 0.17, mat("#3b463e"), side * 10 + dx, 1.9, z + 4.95, d);
            box(0.06, 1.1, 0.19, wood, side * 10 + dx, 1.9, z + 5, d);
          }
          box(0.25, 1.25, 9.8, wood, side * 6.9, 4.7, z, d);
          box(2.7, 0.18, 10.6, mat("#6f5236"), side * 6, 3.25, z, d).rotation.z =
            side * 0.22;
          box(2.8, 0.22, 10.6, mat("#8c6d4d"), side * 6, 0.1, z, d);
          for (let dz of quality === "low" ? [-3.8, 3.8] : [-3.8, 0, 3.8]) {
            box(0.16, 3.05, 0.16, mat("#73573c"), side * 5.5, 1.52, z + dz, d);
            box(0.1, 1.3, 1.1, mat("#352e28"), side * 6.94, 1.5, z + dz, d);
            box(0.13, 0.1, 1.35, mat("#c5a575"), side * 6.88, 2.2, z + dz, d);
          }
          for (let y of quality === "low" ? [] : [0.6, 1.2, 1.8, 2.4, 3, 3.6])
            box(0.04, 0.035, 9.4, mat("#614a35"), side * 6.96, y, z, d);
          let barrel = new T.Mesh(
            (geo.westernBarrel ??= new T.CylinderGeometry(0.43, 0.4, 1.05, 10)),
            mat("#9d663c", 0.98, 0),
          );
          barrel.position.set(side * 5.7, 0.55, z + 4);
          d.add(barrel);
          for (let y of [0.25, 0.8])
            box(0.86, 0.07, 0.86, mat("#544431"), side * 5.7, y, z + 4, d);
          box(0.18, 1.9, 0.18, mat("#85542f"), side * 6.3, 0.9, z - 5, d);
          for (let y of [0.6, 1.25])
            box(0.15, 0.12, 7, mat("#ad774a"), side * 6.3, y, z - 5, d);
          sign(
            [
              L("SALOON"),
              L("ŞERİF"),
              L("GENEL MAĞAZA"),
              L("POSTA"),
              L("AHIR"),
              L("DEMİRCİ"),
              L("İSTASYON"),
              L("ESKİ HAN"),
            ][variant],
            "#eacb91",
            d,
            side * 8.2,
            3,
            z,
          );
        }
      }
      for (let z of [-3, -13, -24]) {
        orb(0.38, mat("#8a7863", 0, 1), side * 5.8, 0.25, z, d);
        let cactus = mat("#667d43", 0.95, 0);
        box(0.28, 1.9, 0.3, cactus, side * 6.2, 0.9, z - 2, d);
        if (!trail) {
          box(0.9, 0.23, 0.25, cactus, side * 6.2, 1.25, z - 2, d);
          box(0.22, 0.75, 0.24, cactus, side * 6.2 + 0.4, 1.55, z - 2, d);
        }
      }
    }
    // Wheel ruts replace road paint; the playable centre stays unobstructed.
    for (let x of [-2, 2])
      box(0.2, 0.015, 28, mat("#94764f", 0, 1), x, 0.015, -14, d);
    return;
  }
  if (kind === "legacy-street") {
    if (variant >= 4) {
      let name = [
        L("LİMAN CADDESİ"),
        L("TRAMVAY BULVARI"),
        L("SANAT SOKAĞI"),
        L("ESKİ ŞEHİR"),
      ][variant - 4];
      for (let side of [-1, 1]) {
        box(
          1.2,
          0.35,
          28,
          mat(variant === 4 ? "#4c7a89" : "#ad936b"),
          side * 5.6,
          0.2,
          -14,
          d,
        );
        for (let z of [-5, -14, -23]) {
          if (variant === 4) {
            box(
              3,
              2.5,
              5,
              mat(side < 0 ? "#2f8da1" : "#bb6d48"),
              side * 7.5,
              1.3,
              z,
              d,
            );
          } else if (variant === 5) {
            box(0.1, 5.2, 0.1, mat("#b1c5cb"), side * 6, 2.6, z, d);
            orb(0.25, mat("#ffe9a5", 0.2, 0.2, "#aa7535"), side * 6, 5.1, z, d);
          } else if (variant === 6) {
            box(
              0.2,
              3.4,
              4.5,
              mat(side < 0 ? "#a65ab3" : "#3caeaa"),
              side * 5.9,
              2,
              z,
              d,
            );
          } else {
            box(0.8, 5.4, 1, mat("#cbb291"), side * 6.2, 2.7, z, d);
            box(2.6, 0.3, 1.2, mat("#e5c590"), side * 6.2, 5.4, z, d);
          }
        }
      }
      sign(name, "#ffe1a0", d, 0, 6.5, -18);
      return;
    }
    if (variant === 0) {
      for (let side of [-1, 1]) {
        for (let z of [-4, -12, -20])
          box(
            2.4,
            0.12,
            2.8,
            mat(side < 0 ? "#ef9b5b" : "#5bc8bd"),
            side * 6.1,
            3.5,
            z,
            d,
          ).rotation.z = side * 0.12;
        sign(
          side < 0 ? L("BAKIR PAZAR") : L("GECE ÇARŞISI"),
          "#ffd28e",
          d,
          side * 6.2,
          4.8,
          -13,
        );
      }
    } else if (variant === 1) {
      for (let z of [-3, -11, -19]) {
        box(11.5, 0.18, 0.2, mat("#e2aa62", 0.3, 0.1, "#8f5b2d"), 0, 5.4, z, d);
        for (let side of [-1, 1])
          box(0.22, 5.4, 0.22, mat("#65737b"), side * 5.6, 2.7, z, d);
      }
      sign(L("İNŞA HATTI · 04"), "#ffb35f", d, 0, 6.2, -11);
    } else if (variant === 2) {
      for (let side of [-1, 1])
        for (let z of [-4, -10, -16, -22]) {
          box(0.5, 1.4, 0.5, mat("#8a684d"), side * 5.8, 0.7, z, d);
          orb(
            0.8,
            mat(side < 0 ? "#3e9b83" : "#65ad69"),
            side * 5.8,
            2.2,
            z,
            d,
          );
        }
      box(
        10.5,
        0.08,
        0.08,
        mat("#a9fff0", 0.2, 0.1, "#4cb9aa"),
        0,
        5.7,
        -14,
        d,
      );
    } else {
      for (let side of [-1, 1]) {
        box(0.7, 5, 25, mat("#405466"), side * 5.7, 2.5, -14, d);
        for (let z of [-4, -12, -20])
          box(1.1, 1.1, 2.4, mat("#bf7254", 0.35, 0.3), side * 5.2, 2.8, z, d);
      }
      sign(L("TÜRBİN SOKAĞI"), "#ff8b6d", d, 0, 5.5, -20);
    }
    return;
  }
  if (kind === "metro") {
    if (settings.landscape === "western") {
      d.name = "mine-" + variant;
      box(11, 0.3, 28, mat("#68513a", 0.95, 0), 0, -0.18, -14, d);
      box(13, 0.8, 28, mat("#3e382f", 1, 0), 0, 7, -14, d);
      for (let side of [-1, 1]) {
        box(1, 7, 28, mat("#67533e", 1, 0), side * 6.2, 3.2, -14, d);
        for (let z of [-4, -12, -20]) {
          box(0.45, 6.4, 0.5, mat("#8c673f", 0.95, 0), side * 5.5, 3.1, z, d);
          orb(0.25, mat("#ffc56d", 0.4, 0.1, "#b36d22"), side * 5.2, 4.5, z, d);
          box(
            1.2,
            1.4,
            2.8,
            mat(variant % 2 ? "#776958" : "#504f48", 1, 0),
            side * 6,
            0.7,
            z - 2,
            d,
          );
        }
      }
      for (let lane of [-1, 0, 1]) {
        for (let side of [-1, 1])
          box(
            0.12,
            0.12,
            28,
            mat("#8a8e8c", 0.8, 0.75),
            lane * 3.2 + side * 0.65,
            0.1,
            -14,
            d,
          );
        for (let z = -1; z > -28; z -= 2)
          box(1.8, 0.1, 0.32, mat("#60452f", 0.98, 0), lane * 3.2, 0.02, z, d);
      }
      for (let z of [-4, -12, -20])
        box(11.5, 0.45, 0.55, mat("#765638"), 0, 6.3, z, d);
      sign(
        [
          L("KÖMÜR DAMARI"),
          L("VİNÇ KUYUSU"),
          L("KIZIL TÜNEL"),
          L("ÜÇ RAY"),
          L("CEVHER HATTI"),
          L("ESKİ ŞAFT"),
          L("VAGON DEPOSU"),
          L("DERİN MADEN"),
        ][variant],
        "#ffd18a",
        d,
        7.8,
        4.4,
        -16,
      );
      return;
    }
    box(11, 0.3, 28, mat("#264b59"), 0, -0.18, -14, d);
    box(13, 0.5, 28, mat("#19313f"), 0, 7, -14, d);
    for (let side of [-1, 1]) {
      box(0.5, 7, 28, mat("#266c78"), side * 6, 3.3, -14, d);
      box(
        0.12,
        0.35,
        28,
        mat("#ffca56", 0.4, 0.2, "#b3721a"),
        side * 5.72,
        1,
        -14,
        d,
      );
      box(
        0.15,
        0.12,
        28,
        mat("#71fff1", 0.2, 0.3, "#32cbbf"),
        side * 5.65,
        5.8,
        -14,
        d,
      );
      for (let z of [-4, -12, -20]) {
        box(0.7, 6.3, 0.7, mat("#456778"), side * 5.6, 3.1, z, d);
        box(2, 0.12, 3.8, mat("#f7cf48"), side * 4.7, 0.03, z, d);
        box(0.12, 1, 3, mat("#eb806a"), side * 5.68, 3, z - 2, d);
      }
      sign(
        side < 0 ? L("M2 · SON İSTASYON") : L("ÇIKIŞ →"),
        "#78ffdc",
        d,
        side * 3.9,
        4.5,
        -9,
      );
    }
    for (let z of [-6, -20])
      box(7, 0.1, 0.4, mat("#d8fffa", 0.3, 0.1, "#8bded5"), 0, 6.65, z, d);
    if (variant >= 4) {
      let names = [
        L("M4 · AKTARMA İSTASYONU"),
        L("ESKİ TAŞ TÜNEL"),
        L("KARGO METROSU"),
        L("M7 · MAVİ HAT"),
      ];
      for (let side of [-1, 1]) {
        for (let z of [-5, -13, -21]) {
          box(
            0.5,
            5.8,
            variant === 6 ? 4 : 0.8,
            mat(["#8858a4", "#b7a285", "#ba8052", "#388cb2"][variant - 4]),
            side * 5.3,
            2.9,
            z,
            d,
          );
          if (variant === 6)
            box(2, 1.6, 2.5, mat("#77836c"), side * 7.2, 0.8, z, d);
        }
        box(
          0.1,
          0.12,
          26,
          mat("#bbe9ff", 0.2, 0.2, "#4095aa"),
          side * 5.4,
          4.9,
          -14,
          d,
        );
      }
      sign(names[variant - 4], "#aeefff", d, 0, 6.1, -17);
    } else if (variant === 1) {
      for (let z of [-3, -8, -13, -18, -23])
        box(
          10.8,
          0.16,
          0.16,
          mat("#ef985c", 0.3, 0.2, "#9c452c"),
          0,
          5.4,
          z,
          d,
        );
      for (let side of [-1, 1])
        box(0.34, 0.34, 25, mat("#cf704e"), side * 4.9, 4.7, -14, d);
      sign(L("BAKIM TÜNELİ"), "#ffad67", d, 0, 4.3, -17);
    } else if (variant === 2) {
      for (let side of [-1, 1]) {
        box(
          1.25,
          0.08,
          26,
          mat("#2b657b", 0.25, 0.3, "#174b61"),
          side * 4.8,
          0.12,
          -14,
          d,
        );
        for (let z of [-4, -11, -18, -25])
          orb(0.2, mat("#8bf4e2", 0.2, 0.1, "#45aa9e"), side * 4.8, 0.35, z, d);
      }
      sign(L("SU SERVİS GALERİSİ"), "#8beee5", d, 0, 5, -12);
    } else if (variant === 3) {
      for (let side of [-1, 1])
        for (let z of [-4, -10, -16, -22])
          box(
            0.12,
            3.2,
            2.7,
            mat(
              side < 0 ? "#e465ac" : "#55ded2",
              0.2,
              0.2,
              side < 0 ? "#9d2f71" : "#257e78",
            ),
            side * 5.45,
            3.4,
            z,
            d,
          );
      sign(L("NEON TERMİNAL"), "#ff8bd0", d, 0, 4.7, -18);
    }
  } else {
    d.userData.rooftop = true;
    // Individual roof slabs: danger gaps remove real floor geometry.
    for (let lane of [-1, 0, 1])
      for (let n = 0; n < 14; n++) {
        let tile = box(
          3.2,
          0.45,
          2,
          mat(n % 2 ? "#d68a67" : "#bd755d"),
          lane * 3.2,
          -0.25,
          -1 - n * 2,
          d,
        );
        tile.userData.lane = lane;
        g.userData.tiles.push(tile);
      }
    for (let side of [-1, 1]) {
      box(0.3, 0.65, 28, mat("#f2ba7d"), side * 5, 0.2, -14, d);
      box(
        1.8,
        9,
        28,
        mat(side < 0 ? "#277b8c" : "#a95479"),
        side * 7,
        -4.6,
        -14,
        d,
      );
      for (let z of [-5, -19]) {
        box(1.1, 0.6, 3, mat("#375f61"), side * 5.8, 0.3, z, d);
        for (let k = 0; k < 3; k++)
          orb(
            0.48,
            mat(k % 2 ? "#73b66a" : "#36977e"),
            side * 5.8,
            1,
            z + k * 0.6,
            d,
          );
        box(1.1, 1.2, 1.5, mat("#76a2ac"), side * 6.2, 0.65, z - 5, d);
        box(0.08, 3.5, 0.08, mat("#f3bd82"), side * 6, 1.7, z - 3, d);
        orb(0.48, mat("#ffd48c", 0.3, 0.1, "#ffb76b"), side * 6, 3.4, z - 3, d);
      }
      for (let z of [-3, -11, -23])
        box(
          0.05,
          1.4,
          2,
          mat("#ffd98b", 0.3, 0.1, "#c3894e"),
          side * 6.08,
          -2,
          z,
          d,
        );
    }
    sign(L("GÖKYÜZÜ BAHÇELERİ"), "#ffe1a0", d, 0, 4.6, -23);
    box(10, 0.12, 0.12, mat("#395262"), 0, 5, -23, d);
    for (let x = -4; x <= 4; x += 2)
      orb(
        0.28,
        mat(
          x % 4 ? "#fc8bcb" : "#78ffdf",
          0.2,
          0.1,
          x % 4 ? "#ea65ad" : "#50cdb4",
        ),
        x,
        4.8,
        -23,
        d,
      );
    if (variant >= 4) {
      let names = [
        L("ANTEN ÇATILARI"),
        L("SU KULELERİ"),
        L("RENKLİ TERASLAR"),
        L("YÜKSEK KÖPRÜLER"),
      ];
      for (let side of [-1, 1]) {
        for (let z of [-5, -18]) {
          if (variant === 4) {
            box(0.15, 6, 0.15, mat("#b0c3c6"), side * 6.5, 3, z, d);
            for (let y of [3, 4.5, 5.8])
              box(2.5, 0.12, 0.12, mat("#d2e3de"), side * 6.5, y, z, d);
          } else if (variant === 5) {
            orb(1.25, mat("#80a3a9", 0.2, 0.6), side * 7, 2, z, d);
            box(0.8, 2, 0.8, mat("#455e6d"), side * 7, 1, z, d);
          } else if (variant === 6) {
            box(
              3,
              0.5,
              6,
              mat(side < 0 ? "#ae5c96" : "#4faca5"),
              side * 7.2,
              0.4,
              z,
              d,
            );
            orb(0.9, mat("#71b881"), side * 7.2, 1.4, z, d);
          } else {
            box(3.5, 0.35, 7, mat("#d6b079"), side * 6.8, -0.1, z, d);
            box(
              0.12,
              1,
              7,
              mat("#5ee6dc", 0.2, 0.3, "#348d8d"),
              side * 8.3,
              0.5,
              z,
              d,
            );
          }
        }
      }
      sign(names[variant - 4], "#ffd8aa", d, 0, 6, -21);
    } else if (variant === 1) {
      for (let z of [-5, -12, -19]) {
        for (let side of [-1, 1])
          box(1.1, 0.65, 2.2, mat("#55ac93"), side * 5.6, 0.4, z, d);
      }
      sign(L("AÇIK BAHÇELER"), "#91fff0", d, 0, 5.3, -19);
    } else if (variant === 2) {
      for (let side of [-1, 1])
        for (let z of [-5, -12, -19]) {
          let panel = box(
            2.8,
            0.12,
            2,
            mat("#304f78", 0.2, 0.55, "#152746"),
            side * 2.7,
            0.75,
            z,
            d,
          );
          panel.rotation.x = -0.35;
        }
      for (let side of [-1, 1]) {
        let fan = new T.Mesh(
          (geo.roofFan ??= new T.CylinderGeometry(0.65, 0.65, 0.5, 12)),
          mat("#71848b"),
        );
        fan.position.set(side * 4.2, 0.35, -14);
        d.add(fan);
      }
      sign(L("GÜNEŞ TERASI"), "#ffd074", d, 0, 4.8, -22);
    } else if (variant === 3) {
      for (let z of [-4, -10, -16, -22]) {
        box(9, 0.08, 0.08, mat("#5b506f"), 0, 4.1, z, d);
        for (let x of [-4, -2, 0, 2, 4])
          orb(
            0.28,
            mat(
              x % 4 ? "#ff92c8" : "#77f3e0",
              0.2,
              0.1,
              x % 4 ? "#a84377" : "#318b82",
            ),
            x,
            3.9,
            z,
            d,
          );
      }
      sign(L("GÖK PAZARI"), "#ff9bcf", d, 0, 5.2, -16);
    }
    for (let o of d.children) {
      let shape = o.geometry?.parameters;
      if (shape?.width > 6 && o.position.y > 3 && Math.abs(o.position.x) < 5)
        o.visible = false;
      if (
        shape?.radius < 0.6 &&
        o.position.y > 3 &&
        Math.abs(o.position.x) < 7
      ) {
        o.position.x = o.position.x < 0 ? -7.5 : 7.5;
        o.position.y = Math.max(7.8, o.position.y);
      }
    }
  }
}
function positionOf(o) {
  return new T.Vector3(
    o.x + pathX(o.at - (run?.distance || 0)),
    groundAt(o.at) +
      (o.type === "drone" && o.appearance !== "wagon" ? 2.35 : o.arcY || 0),
    3 - (o.at - (run?.distance || 0)),
  );
}
function generateRegion(i) {
  if (i === currentDistrict) return;
  currentDistrict = i;
  regionMeshes.forEach(cleanup);
  regionMeshes = [];
  let d = DISTRICTS[i];
  scene.background.set(d.sky);
  scene.fog.color.set(d.fog);
  scene.fog.density = i === 4 ? 0.016 : 0.011;
  sun.color.set(d.light);
  hemi.color.set(i === 1 ? "#d8bba7" : i === 2 ? "#bddbcc" : "#b5d5ee");
  rain.visible = false;
  sun.intensity = i === 4 ? 1.7 : 3.1;
  for (let j = 0; j < segments.length; j++) {
    let g = segments[j];
    g.userData.decor?.forEach(cleanup);
    let decor = new T.Group();
    g.add(decor);
    g.userData.decor = [decor];
    if (i === 1) {
      for (let x of [-7, 7]) {
        box(0.1, 0.09, 28, mat("#a8a6a0", 0.3, 0.7), x, 0.2, -14, decor);
        box(0.1, 0.09, 28, mat("#a8a6a0", 0.3, 0.7), x + 1.2, 0.2, -14, decor);
        for (let z = -2; z > -28; z -= 3)
          box(1.8, 0.08, 0.25, mat("#705e51"), x + 0.6, 0.12, z, decor);
      }
    }
    if (i === 2) {
      for (let side of [-1, 1]) {
        box(2, 0.5, 7, mat("#687b74"), side * 6.3, 0.5, -16, decor);
        for (let k = 0; k < 5; k++) {
          let x = side * (5.8 + Math.random()),
            z = -14 - k * 0.7;
          box(0.12, 1, 0.12, mat("#6f6856"), x, 1.1, z, decor);
          orb(0.5, mat("#4e806e"), x, 1.7, z, decor);
        }
      }
    }
    if (i === 3) {
      for (let side of [-1, 1]) {
        box(3, 0.08, 27, mat("#466d83", 0.05, 0.7), side * 8, 0.08, -14, decor);
        box(0.1, 0.8, 28, mat("#526e78"), side * 5.7, 0.5, -14, decor);
      }
    }
    if (i === 4) {
      for (let side of [-1, 1]) {
        box(1.1, 2.1, 0.5, mat("#c3bda9"), side * 6.4, 1.2, -10, decor);
        sign(L("QUARANTINE"), "#f69e87", decor, side * 8, 4, -14);
      }
    }
    if (i === 5) {
      for (let side of [-1, 1]) {
        box(2.6, 14, 4, mat("#536174", 0.5, 0.6), side * 7, 7, -15, decor);
        box(
          0.12,
          12,
          4.1,
          mat("#8fdae4", 0.25, 0.4, "#36758c"),
          side * 6.7,
          7,
          -15,
          decor,
        );
      }
    }
  }
}
function createObject(o, tracked = true) {
  let g = new T.Group();
  const metal = mat("#607483", 0.45, 0.6);
  if (o.type === "rock" && settings.landscape === "western") {
    // Western: same rolling hazard, drawn as a runaway wooden barrel.
    let stone = new T.Group();
    stone.position.y = 1.15;
    let body = new T.Mesh(
      (geo.rollingBarrel ??= new T.CylinderGeometry(1.15, 1.15, 2.1, 16)),
      mat("#8a5a32", 0.05, 0.85),
    );
    body.rotation.z = Math.PI / 2;
    body.castShadow = body.receiveShadow = true;
    stone.add(body);
    for (let x of [-0.65, 0.65]) {
      let hoop = new T.Mesh(
        (geo.barrelHoop ??= new T.TorusGeometry(1.17, 0.08, 6, 20)),
        mat("#3b3430", 0.6, 0.5),
      );
      hoop.rotation.y = Math.PI / 2;
      hoop.position.x = x;
      stone.add(hoop);
    }
    g.add(stone);
    g.userData.rollingStone = stone;
    let footprint = new T.Mesh(
      (geo.rockFootprint ??= new T.RingGeometry(1.15, 1.38, 24)),
      mat("#eeb565", 0.2, 0.3, "#815121"),
    );
    footprint.rotation.x = -Math.PI / 2;
    footprint.position.y = 0.04;
    g.add(footprint);
  } else if (o.type === "rock") {
    let stone = new T.Group();
    stone.position.y = 1.3;
    let body = new T.Mesh(
      (geo.rollingRock ??= new T.IcosahedronGeometry(1.3, 2)),
      mat("#8a8c8e", 0.05, 0.95),
    );
    body.castShadow = body.receiveShadow = true;
    stone.add(body);
    for (let i = 0; i < 7; i++) {
      let angle = i * 2.4,
        chip = box(
          0.16,
          0.52,
          0.08,
          mat(i % 2 ? "#c4c7ca" : "#53585c"),
          Math.sin(angle) * 0.9,
          Math.cos(angle) * 0.9,
          0.88,
          stone,
        );
      chip.rotation.z = angle;
    }
    g.add(stone);
    g.userData.rollingStone = stone;
    let footprint = new T.Mesh(
      (geo.rockFootprint ??= new T.RingGeometry(1.15, 1.38, 24)),
      mat("#eeb565", 0.2, 0.3, "#815121"),
    );
    footprint.rotation.x = -Math.PI / 2;
    footprint.position.y = 0.04;
    g.add(footprint);
  }
  if (o.type === "cart") {
    g.userData.mineWheels = [];
    let steel = mat("#606463", 0.75, 0.65),
      rim = mat("#343a38", 0.8, 0.6);
    box(2.35, 1.3, 2.8, steel, 0, 1.12, -0.6, g);
    box(2.5, 0.14, 2.95, rim, 0, 1.8, -0.6, g);
    for (let side of [-1, 1]) {
      box(0.14, 0.2, 2.8, mat("#b79b63"), side * 1.19, 1.1, -0.6, g);
      for (let z of [-1.5, 0.3]) {
        let wheel = new T.Mesh(
          (geo.mineWheel ??= new T.CylinderGeometry(0.43, 0.43, 0.18, 12)),
          rim,
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(side * 1.1, 0.43, z);
        g.add(wheel);
        g.userData.mineWheels.push(wheel);
      }
    }
    for (let x of [-0.6, 0, 0.6])
      for (let z of [-1.3, -0.5, 0.2])
        orb(0.43, mat("#303430", 1, 0), x, 1.8, z, g);
    for (let side of [-1, 1])
      orb(0.16, mat("#ffca6e", 0.4, 0.2, "#ad681c"), side * 0.85, 1.1, 0.83, g);
    let marker = new T.Mesh(
      (geo.cartLanding ??= new T.RingGeometry(1.1, 1.35, 24)),
      mat("#ffb957", 0.5, 0.2, "#9e4319"),
    );
    marker.rotation.x = -Math.PI / 2;
    g.add(marker);
    g.userData.cartLanding = marker;
  }
  if (o.type === "barrier") {
    box(2.6, 1.05, 0.8, mat("#ae8859"), 0, 0.53, 0, g);
    for (let s of [-1, 1])
      box(0.22, 0.85, 0.9, mat("#35454b"), s * 0.8, 0.55, 0, g);
    box(2.65, 0.07, 0.9, mat("#ebd597", 0.35, 0.3, "#756137"), 0, 1.08, 0, g);
    for (let s of [-1, 1]) {
      let wheel = new T.Mesh(
        (geo.barrierWheel ??= new T.CylinderGeometry(0.24, 0.24, 0.2, 12)),
        metal,
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(s * 1.05, 0.23, 0.35);
      g.add(wheel);
      orb(0.13, mat("#ffb75c", 0.2, 0.3, "#dd6926"), s * 1.05, 1.16, 0.4, g);
    }
    for (let i = -2; i <= 2; i++)
      box(0.17, 0.68, 0.08, mat("#ffe4a3"), i * 0.4, 0.6, 0.46, g).rotation.z =
        -0.5;
  }
  if (o.type === "saw") {
    const blade = new T.Group();
    blade.position.y = 1.22;
    blade.scale.setScalar(1.25);
    g.add(blade);
    let disc = new T.Mesh(
      (geo.sawDisc ??= new T.CylinderGeometry(0.92, 0.92, 0.18, 20)),
      mat("#ff794b", 0.18, 0.65, "#8b2413"),
    );
    disc.rotation.x = Math.PI / 2;
    blade.add(disc);
    let hub = new T.Mesh(
      (geo.sawHub ??= new T.CylinderGeometry(0.25, 0.25, 0.28, 12)),
      mat("#7affef", 0.2, 0.55, "#248c92"),
    );
    hub.rotation.x = Math.PI / 2;
    blade.add(hub);
    for (let i = 0; i < 16; i++) {
      let tooth = box(
          0.23,
          0.36,
          0.2,
          mat(i % 2 ? "#fff6b5" : "#ffcd4a", 0.18, 0.75, "#a46312"),
          0,
          0,
          0,
          blade,
        ),
        a = (i / 16) * Math.PI * 2;
      tooth.position.set(Math.cos(a) * 1.02, Math.sin(a) * 1.02, 0);
      tooth.rotation.z = a + Math.PI / 2;
    }
    box(2.65, 0.16, 0.52, mat("#293e4c"), 0, 0.15, 0, g);
    for (let s of [-1, 1])
      box(
        0.2,
        1.1,
        0.3,
        mat("#ffb45e", 0.3, 0.25, "#8f4f1f"),
        s * 1.12,
        0.55,
        0,
        g,
      );
    glow("#ff8c37", 0, 1.22, 0.15, 4.5, g);
    for (let side of [-1, 1]) {
      box(
        0.24,
        1.7,
        0.24,
        mat("#ffb63f", 0.2, 0.3, "#ab4219"),
        side * 1.27,
        0.9,
        0,
        g,
      );
      orb(0.22, mat("#fff3a1", 0.2, 0.3, "#c98a18"), side * 1.27, 1.85, 0, g);
    }
    g.userData.blade = blade;
    let landing = new T.Mesh(
      (geo.sawLanding ??= new T.RingGeometry(0.85, 1.05, 24)),
      mat("#ffb45e", 0.2, 0.3, "#cb4b28"),
    );
    landing.rotation.x = -Math.PI / 2;
    landing.position.y = 0.05;
    g.add(landing);
    g.userData.landing = landing;
  }
  if (o.type === "wall" || o.type === "train") {
    let train = o.type === "train";
    box(
      2.85,
      train ? 3.4 : 3.6,
      train ? 12 : 1.6,
      mat(train ? "#889da7" : "#465c6a"),
      0,
      1.8,
      0,
      g,
    );
    box(2.5, 1, train ? 12.05 : 1.65, mat("#253d50", 0.15, 0.5), 0, 2.1, 0, g);
    box(
      2.9,
      0.1,
      train ? 12.1 : 1.7,
      mat("#d3a075", 0.3, 0.4, "#76503a"),
      0,
      1.15,
      0,
      g,
    );
    if (train) {
      for (let s of [-1, 1])
        orb(0.15, mat("#edcf9a", 0.2, 0.1, "#b99f69"), s * 0.9, 1.1, 6.1, g);
      g.userData.train = true;
    }
  }
  if (o.type === "laser" && settings.landscape === "western") {
    // Western: same slide-under hazard, drawn as a low wooden beam on posts.
    const beam = mat("#8a5a32", 0.05, 0.9);
    for (let s of [-1, 1]) box(0.3, 3.3, 0.3, mat("#5e4029", 0.05, 0.9), s * 1.4, 1.65, 0, g);
    box(3.1, 0.45, 0.4, beam, 0, 1.85, 0, g);
    box(2.6, 0.12, 0.42, mat("#f0b871", 0.3, 0.4, "#91613a"), 0, 1.55, 0, g);
  } else if (o.type === "laser") {
    for (let s of [-1, 1]) box(0.15, 3.3, 0.35, metal, s * 1.4, 1.65, 0, g);
    for (let y of [1.6, 2.05])
      box(2.8, 0.1, 0.15, mat("#eb9a85", 0.2, 0.3, "#e56150"), 0, y, 0, g);
    glow("#ff8b7a", 0, 1.8, 0, 3.4, g);
  }
  if (o.type === "gap") {
    let cover = box(2.9, 0.12, 7, mat("#05111f"), 0, 0.02, 0, g);
    g.userData.gapCover = cover;
    for (let z of [-3.4, 3.4])
      box(3, 0.1, 0.12, mat("#f0b871", 0.4, 0.2, "#91613a"), 0, 0.04, z, g);
    glow("#407b92", 0, -0.2, 0, 3, g);
  }
  if (o.appearance === "wagon") {
    const wood = mat("#987044", 0.05, 0.95),
      rim = mat("#493d30", 0.25, 0.85),
      horseCoat = mat("#79523a", 0, 0.9);
    box(2.1, 0.35, 2.8, wood, 0, 0.85, -3.5, g);
    for (let side of [-1, 1]) {
      for (let y of [1.15, 1.45, 1.75])
        box(0.13, 0.23, 2.85, wood, side * 1, y, -3.5, g);
      box(0.1, 0.12, 2.4, rim, side * 0.48, 0.8, -1.7, g);
    }
    for (let z of [-4.8, -2.2]) box(2.1, 0.7, 0.14, wood, 0, 1.4, z, g);
    g.userData.wagonWheels = [];
    for (let side of [-1, 1])
      for (let z of [-4.35, -2.65]) {
        let wheel = new T.Group();
        wheel.position.set(side * 1.12, 0.57, z);
        let ring = new T.Mesh(
          (geo.wagonRim ??= new T.TorusGeometry(0.53, 0.075, 6, 16)),
          rim,
        );
        ring.rotation.y = Math.PI / 2;
        wheel.add(ring);
        for (let j = 0; j < 6; j++) {
          let spoke = box(0.09, 1, 0.07, wood, 0, 0, 0, wheel);
          spoke.rotation.x = (j * Math.PI) / 6;
        }
        orb(0.13, rim, 0, 0, 0, wheel);
        g.add(wheel);
        g.userData.wagonWheels.push(wheel);
      }
    box(0.75, 0.85, 1.7, horseCoat, 0, 1.15, -0.9, g);
    box(0.46, 0.9, 0.48, horseCoat, 0, 1.65, -0.18, g).rotation.x = -0.3;
    box(0.5, 0.54, 0.85, horseCoat, 0, 1.98, 0.08, g);
    box(0.42, 0.25, 0.24, mat("#c3a181"), 0, 1.83, 0.54, g);
    for (let side of [-1, 1]) {
      box(0.1, 0.35, 0.16, horseCoat, side * 0.17, 2.4, -0.1, g);
      orb(0.045, mat("#181d1c"), side * 0.255, 2.07, 0.24, g);
    }
    box(0.16, 0.7, 0.14, rim, 0, 1.1, -1.84, g).rotation.x = -0.3;
    box(0.82, 0.16, 0.22, rim, 0, 1.25, -0.55, g);
    g.userData.horseLegs = [];
    for (let side of [-1, 1])
      for (let z of [-1.5, -0.3]) {
        let leg = new T.Group();
        leg.position.set(side * 0.25, 0.95, z);
        box(0.16, 0.8, 0.18, horseCoat, 0, -0.37, 0, leg);
        box(0.2, 0.12, 0.26, rim, 0, -0.79, 0.03, leg);
        g.add(leg);
        g.userData.horseLegs.push(leg);
      }
    for (let x of [-0.5, 0.5])
      box(0.65, 0.65, 0.85, mat("#c2a87d"), x, 1.35, -3.6, g);
  }
  if (o.type === "drone" && o.appearance !== "wagon") {
    g.scale.setScalar(1.28);
    box(1.35, 0.52, 1.05, metal, 0, 0, 0, g);
    orb(
      0.24,
      mat(
        o.disabled ? "#7edee0" : "#e68069",
        0.2,
        0.5,
        o.disabled ? "#347f81" : "#db4f3a",
      ),
      0,
      0,
      0.43,
      g,
    );
    box(2.75, 0.15, 0.24, mat("#314959"), 0, 0.1, 0, g);
    g.userData.rotors = [];
    for (let s of [-1, 1]) {
      let rotor = new T.Mesh(
        (geo.droneRing ??= new T.TorusGeometry(0.5, 0.075, 6, 20)),
        mat("#e8c281", 0.25, 0.65, "#76501e"),
      );
      rotor.rotation.x = Math.PI / 2;
      rotor.position.set(s * 1.2, 0.15, 0);
      g.add(rotor);
      g.userData.rotors.push(rotor);
    }
    if (o.hp >= 6) {
      box(1.3, 0.15, 1, mat("#c49b79", 0.3, 0.7), 0, 0.28, 0, g);
    }
    let warning = glow("#ff6f58", 0, 0, 0.48, 2.3, g);
    g.userData.warningGlow = warning;
  }
  if (o.type === "coin") {
    let ring = new T.Mesh(
      (geo.coinRing ??= new T.TorusGeometry(0.28, 0.09, 6, 12)),
      mat("#edd19c", 0.2, 0.7, "#8a692c"),
    );
    ring.position.y = 1;
    g.add(ring);
  }
  if (o.type === "power") {
    let core = new T.Mesh(
      (geo.powerCore ??= new T.OctahedronGeometry(0.38, 0)),
      mat("#ffb36e", 0.18, 0.55, "#d85f32"),
    );
    core.position.y = 1.2;
    g.add(core);
    for (let y of [0.72, 1.68])
      box(0.16, 0.16, 0.72, mat("#ffe1a3", 0.2, 0.3, "#a96d2f"), 0, y, 0, g);
    glow("#ffad66", 0, 1.2, 0, 2.5, g);
  }
  if (o.type === "gem") {
    let gem = new T.Mesh(
      (geo.rewardGem ??= new T.OctahedronGeometry(0.42, 0)),
      mat("#a98cff", 0.1, 0.7, "#6040ca"),
    );
    gem.position.y = 1.25;
    gem.rotation.z = 0.35;
    g.add(gem);
    glow("#bba7ff", 0, 1.25, 0, 2.8, g);
  }
  if (o.type === "shield" || o.type === "repair") {
    orb(
      0.33,
      mat(o.type === "repair" ? "#b5dd9e" : "#81dedc", 0.15, 0.4, "#3b928e"),
      0,
      1.2,
      0,
      g,
    );
    glow("#93e9d7", 0, 1.2, 0, 2, g);
  }
  if (o.type === "bolt") {
    box(0.11, 0.11, 1.1, mat("#ffa891", 0.2, 0.2, "#e8694f"), 0, 1.1, 0, g);
  }
  if (o.type === "barrel") {
    let mesh = new T.Mesh(
      (geo.barrel ??= new T.CylinderGeometry(0.45, 0.45, 1.35, 12)),
      mat("#bd6d50", 0.4, 0.4),
    );
    mesh.position.y = 0.7;
    g.add(mesh);
    box(0.92, 0.08, 0.92, mat("#f4cb89", 0.3, 0.1, "#9e6732"), 0, 1, 0, g);
    glow("#df9a56", 0, 1, 0, 1.6, g);
  }
  if (o.type === "vent") {
    box(1.2, 0.7, 1.2, mat("#678c91"), 0, 0.35, 0, g);
    for (let j = -2; j <= 2; j++)
      box(0.08, 0.03, 1, mat("#9ac7bf"), j * 0.2, 0.72, 0, g);
    glow("#72e8da", 0, 1, 0, 2.5, g);
  }
  if (o.type === "panel") {
    box(0.25, 2.6, 0.4, metal, 0, 1.3, 0, g);
    box(1, 1.1, 0.2, mat("#59babc", 0.3, 0.2, "#367e83"), 0, 1.9, 0.3, g);
    sign(L("KAPI"), "#94ece0", g, 0, 1.9, 0.42);
  }
  if (tracked) {
    scene.add(g);
    visuals.set(o.id, g);
  }
  return g;
}
const forkVisual = new T.Group();
for (let side of [-1, 1]) {
  const entry = new T.Group();
  forkVisual.add(entry);
  entry.position.x = side * 8;
  if (side < 0) {
    box(7, 0.2, 24, mat("#73583d"), 0, -0.1, -17, entry);
    box(8, 0.4, 24, mat("#40362b"), 0, 6, -17, entry);
    for (let x of [-3.8, 3.8]) {
      box(0.4, 6, 24, mat("#8b643c"), x, 3, -17, entry);
      box(
        0.1,
        0.2,
        24,
        mat("#ffd39a", 0.2, 0.3, "#a06b2e"),
        x * 0.95,
        4.7,
        -17,
        entry,
      );
    }
    sign(
      settings.landscape === "western" ? L("MADEN OCAĞI") : L("M2 · METRO"),
      "#ffd396",
      entry,
      0,
      5,
      -4.7,
    );
  } else {
    box(7, 2, 24, mat("#bb765e"), 0, 0.9, -17, entry);
    for (let x of [-3.8, 3.8]) {
      box(0.3, 0.6, 24, mat("#f2bb85"), x, 2.2, -17, entry);
      box(
        1.5,
        10,
        24,
        mat(x < 0 ? "#528ca3" : "#b45589"),
        x * 1.4,
        -3,
        -17,
        entry,
      );
      for (let z of [-9, -20]) orb(0.8, mat("#5baa83"), x, 3, z, entry);
    }
    sign(L("ÇATI BAHÇELERİ ↑"), "#ffd393", entry, 0, 5, -5);
  }
  let road = box(4, 0.08, 45, roadMat, side * 5, -0.05, -4, forkVisual);
  road.rotation.y = side * -0.22;
  sign(
    side < 0 ? L("MADEN ↓ +70m") : L("ÇATILAR ↑ −90m"),
    side < 0 ? "#8ce7d2" : "#f2b18c",
    forkVisual,
    side * 3.5,
    4,
    0,
  );
  box(0.15, 4, 0.15, mat("#667f89"), side * 3.5, 2, 0, forkVisual);
}
sign(L("SOKAK ↑ · ◆ ELMAS"), "#c9afff", forkVisual, 0, 6.7, -8);
// Directions are drawn once in the viewport-safe HTML strip, above GPU glows.
const redundantSigns = [];
forkVisual.traverse((o) => {
  if (o.userData.signText) redundantSigns.push(o);
});
redundantSigns.forEach(cleanup);
forkVisual.visible = false;
scene.add(forkVisual);
const hunter = new T.Group();
box(2.4, 0.7, 1.8, mat("#3b4c5e", 0.3, 0.6), 0, 0, 0, hunter);
for (let s of [-1, 1]) {
  box(
    0.3,
    0.2,
    2.5,
    mat("#f59c7e", 0.2, 0.3, "#c75a42"),
    s * 1.5,
    0,
    0,
    hunter,
  );
  glow("#fb9c7b", s * 1.5, 0, 0.8, 2, hunter);
}
scene.add(hunter);
const westernHunter = createObject(
  { type: "drone", appearance: "wagon", id: -1 },
  false,
);
westernHunter.rotation.y = Math.PI;
westernHunter.visible = false;
scene.add(westernHunter);
function clearVisuals() {
  $("#fork-signs").hidden = true;
  westernHunter.visible = false;
  hunter.visible = false;
  visuals.forEach(cleanup);
  visuals.clear();
  bulletMeshes.forEach(cleanup);
  bulletMeshes.clear();
  particles.forEach((p) => cleanup(p.mesh));
  particles = [];
  effects.forEach((e) => cleanup(e.mesh));
  effects = [];
  forkVisual.visible = false;
}
function openMission(id, endless = false) {
  document.body.classList.remove("menu-open");
  armoryOpen = false;
  clearVisuals();
  selected = id;
  run = new Run(id, settings, Date.now() % 100000, endless);
  let weaponScale = {
    sidearm: 1,
    burst: 1.18,
    ion: 0.92,
    rail: 1.42,
    repeater: 1.25,
    storm: 1.5,
  }[run.weapon];
  weapon.scale.set(weaponScale, weaponScale, weaponScale);
  weapon.material.color.set(
    {
      sidearm: "#516775",
      burst: "#9a6b4d",
      ion: "#735fb1",
      rail: "#b18a4e",
      repeater: "#5e9c82",
      storm: "#cb665a",
    }[run.weapon],
  );
  lastDamage = "";
  camera.position.set(0, 5.2, innerWidth < innerHeight ? 14.4 : 12);
  camera.lookAt(0, 1.8, -17);
  mode = "play";
  paused = false;
  holding = false;
  pointer = null;
  sessionRewarded = false;
  $("#menu").hidden = true;
  generateRegion(run.mission.district);
  segments.forEach((s, i) => {
    s.position.set(0, 0, 12 - i * SEG);
    s.rotation.set(0, 0, 0);
    dressRoute(
      s,
      run.mission.district === 6 ? "metro" : "street",
      i % 8,
      run.mission.district,
    );
  });
  initAmbient();
  notice(
    id === 0
      ? L("YUKARI KAYDIR: ZIPLA · SAĞ/SOL: KAÇ")
      : stageName(run.mission).toLocaleUpperCase(UPPER) +
          " · " +
          cargoLabel(run.mission.cargo),
    3,
  );
  $("#hint").textContent =
    L("KAYDIR: KAÇ / ZIPLA / KAY · HEDEFE DOKUN VEYA BASILI TUT: ATEŞ");
  updateHud();
}
function showMenu() {
  document.body.classList.add("menu-open");
  mode = "menu";
  run = null;
  $("#fork-signs").hidden = true;
  paused = false;
  holding = false;
  pointer = null;
  gameAudio.stop();
  const costume = COSTUMES.find((c) => c.id === profile.costume) || COSTUMES[0];
  suit.color.set(costume.suit);
  armor.color.set(costume.armor);
  $("#menu").hidden = false;
  generateRegion(page);
  clearVisuals();
  segments.forEach((s, i) => {
    s.position.set(0, 0, 12 - i * SEG);
    s.rotation.set(0, 0, 0);
    s.visible = quality !== "low" || s.position.z >= -75;
    dressRoute(s, "street", i % 8, page);
    if (quality === "low") batchStaticDecor(s.userData.routeDecor);
  });
  camera.position.set(0, 5.2, innerWidth < innerHeight ? 14.4 : 12);
  camera.lookAt(0, 1.8, -17);
  scene.background.set(
    settings.landscape === "western" ? "#c9b18d" : "#a8bec0",
  );
  scene.fog.color.set(settings.landscape === "western" ? "#c0a17a" : "#b8b2a0");
  let starCount = Object.values(mapRecords()).reduce(
      (a, b) => a + b.stars,
      0,
    ),
    signalCount = transmissionCount(),
    contract = dailyContract(),
    dailyDone = settings.daily.day === contract.key && settings.daily.done;
  $("#menu").innerHTML =
    L('<div class="card campaign"><div class="quick-tools"><button id="armoryShortcut">SİLAH DEPOSU ↗</button></div><div class="eyebrow">KÜLHAT · SON TESLİMAT</div><h1>Şehir sustu. <br>Sen <em>durma.</em></h1><p class="intro">Yükünü koru. Takipçiyi atlat. Kestirmeyi seç ya da güvenli yoldan git. Çevreyi silaha dönüştür.</p><div class="menu-summary"><span>◈ ') +
    settings.coins +
    L(" altın</span><span>◆ ") +
    settings.diamonds +
    L(" elmas</span><span>★ ") +
    starCount +
    " / 120</span><span>" +
    Object.keys(mapRecords()).length +
    L(' / 40 teslimat</span></div><div class="retention-grid"><div class="retention-card"><b>KAYIP YAYIN · ') +
    signalCount +
    "/8</b><span>" +
    TRANSMISSIONS[signalCount] +
    '</span><i style="width:' +
    (signalCount / 8) * 100 +
    '%"></i></div><div class="retention-card ' +
    (dailyDone ? "complete" : "") +
    L('"><b>BUGÜNÜN KONTRATI</b><span>') +
    contract.text +
    (dailyDone ? L(" · TAMAMLANDI") : L(" · ÖDÜL ◈120 + ◆1")) +
    '</span><i style="width:' +
    (dailyDone ? 100 : 0) +
    '%"></i></div></div><div class="district-tabs">' +
    DISTRICTS.map(
      (d, i) =>
        '<button data-page="' +
        i +
        '" class="' +
        (page === i ? "active" : "") +
        '" aria-label="' +
        L("Etap grubu ") +
        (i + 1) +
        '">0' +
        (i + 1) +
        "</button>",
    ).join("") +
    '</div><div class="district-name">' +
    (settings.landscape === "western" ? L("WESTERN KASABASI") : L("DAĞ PATİKASI")) +
    L(" · ETAP GRUBU ") +
    String(page + 1).padStart(2, "0") +
    '</div><div class="mission-list">' +
    MISSIONS.filter((m) => m.district === page)
      .map(
        (m) =>
          '<button data-mission="' +
          m.id +
          '" class="mission-card ' +
          (m.id === selected ? "active" : "") +
          '" ' +
          (m.id >= settings.unlocked && !settings.freePlay ? "disabled" : "") +
          "><strong>" +
          String(m.id + 1).padStart(2, "0") +
          " " +
          stageName(m) +
          "</strong><small>" +
          cargoLabel(m.cargo) +
          " · " +
          Math.round(m.length / 100) / 10 +
          " km " +
          L("· TEHDİT ") +
          m.threat +
          "/8 " +
          (m.boss ? L("· TAKİP") : "") +
          "</small><span>" +
          (mapRecords()[m.id]
            ? "★".repeat(mapRecords()[m.id].stars)
            : m.id >= settings.unlocked && !settings.freePlay
              ? L("KİLİTLİ")
              : L("HAZIR")) +
          "</span></button>",
      )
      .join("") +
    L('</div><div class="mission-objective">★ YAN HEDEF: ') +
    objective(MISSIONS[selected]).text +
    L('</div><div class="mode-groups"><div class="choice-group"><h2>ZORLUK</h2><div class="row contract-options" role="group" aria-label="Zorluk">') +
    [
      ["standard", L("STANDART · ×1")],
      ["bounty", L("AVCI · +%10 HIZ · ×1,5 ALTIN")],
      ["elite", L("ELİT · +%20 HIZ · ×2 ALTIN")],
    ]
      .map(
        ([id, label]) =>
          '<button data-contract="' +
          id +
          '" class="' +
          (settings.contract === id ? "choice-selected" : "") +
          '" aria-pressed="' +
          (settings.contract === id) +
          '">' +
          label +
          "</button>",
      )
      .join("") +
    L('</div></div><div class="choice-group"><h2>HARİTA</h2><div class="row landscape-options" role="group" aria-label="Harita">') +
    [
      ["western", L("WESTERN KASABASI")],
      ["trail", L("DAĞ PATİKASI")],
    ]
      .map(
        ([id, label]) =>
          '<button data-landscape="' +
          id +
          '" class="' +
          (settings.landscape === id ? "choice-selected" : "") +
          '" aria-pressed="' +
          (settings.landscape === id) +
          '">' +
          label +
          "</button>",
      )
      .join("") +
    '</div></div></div><div class="row"><button id="freeplay">' +
    (settings.freePlay
      ? L("SERBEST KEŞİF · 40 ETAP AÇIK")
      : L("TÜM ETAPLARI DENE · SERBEST KEŞİF")) +
    '</button></div><div class="row"><button class="primary" id="launch" ' +
    (selected >= settings.unlocked && !settings.freePlay ? "disabled" : "") +
    ">" +
    String(selected + 1).padStart(2, "0") +
    L(' · TESLİMATA BAŞLA ↗</button><button id="openArmory">SİLAH DEPOSU</button>') +
    (settings.records[39] || settings.trailRecords[39] ? L('<button id="endless">Sonsuz koşu</button>') : "") +
    L('</div><section id="armory-panel" class="armory-panel" role="dialog" aria-modal="true" aria-label="Silah deposu" ') +
    (armoryOpen ? "" : "hidden") +
    L('><div class="armory-heading"><h2>SİLAH DEPOSU</h2><button id="closeArmory">KAPAT ✕</button></div><div class="arsenal">') +
    Object.entries(COURIER_WEAPONS)
      .map(([id, w]) => {
        let owned = settings.ownedWeapons.includes(id),
          level = settings.weaponLevels[id],
          upgradeCoins = level < 2 ? 120 * (level + 1) : 0,
          upgradeDiamonds = level >= 2 ? (level - 1) * 3 : 0,
          price = w.coinCost ? "◈ " + w.coinCost : "◆ " + w.diamondCost;
        return (
          '<div class="weapon-card ' +
          (settings.weapon === id ? "selected" : "") +
          '"><b>' +
          w.name +
          L(" · SV ") +
          (level + 1) +
          L(" · USTALIK ") +
          masteryLevel(settings.weaponMastery[id]) +
          "/4</b><small>" +
          w.desc +
          '</small><div><button data-weapon="' +
          id +
          '">' +
          (owned
            ? settings.weapon === id
              ? L("KUŞANILDI")
              : L("KUŞAN")
            : L("SATIN AL · ") + price) +
          '</button><button data-weapon-upgrade="' +
          id +
          '" ' +
          (!owned || level >= 4 ? "disabled" : "") +
          ">" +
          (level >= 4
            ? L("AZAMİ SEVİYE")
            : L("GÜÇLENDİR · ") +
              (upgradeCoins ? "◈ " + upgradeCoins : "◆ " + upgradeDiamonds)) +
          "</button></div></div>"
        );
      })
      .join("") +
    L('</div><div class="district-name">ZIRH VE YÜK</div><div class="upgrade">') +
    [
      ["shield", L("Kalkan"), 40, 3],
      ["cargo", L("Yük koruması"), 60, 3],
    ]
      .map(
        ([key, title, cost, max]) =>
          '<button data-upgrade="' +
          key +
          '" ' +
          (settings.coins < cost || settings[key] >= max ? "disabled" : "") +
          ">" +
          title +
          " " +
          settings[key] +
          "/" +
          max +
          "<small>◈ " +
          cost +
          "</small></button>",
      )
      .join("") +
    L('</div></section><div class="tip">Telefonda doğrudan kaydır. Hedefe dokunarak ateş et.<br>PC: WASD / oklar · Space ateş · Esc duraklat.<br>40 görev + 120 yıldız + kampanya sonrası sonsuz koşu.</div><div class="menu-settings"><button id="sound">SES ') +
    (muted ? L("KAPALI") : L("AÇIK")) +
    '</button><button id="display">' +
    (quality === "low" ? L("GÖRÜNTÜ: EKONOMİK") : L("GÖRÜNTÜ: YÜKSEK")) +
    L('</button><button id="controls">NASIL OYNANIR?</button><button id="dailyHub">GÜNLÜK ÖDÜLLER</button><button id="costumeHub">KOSTÜMLER</button></div><div id="storage" class="storage">İlerleme bu tarayıcıda saklanır.</div><div class="build-label">Yayın adayı · Cihaz ve platform kontrolleri bekleniyor.</div></div>');
  const scorePanel =
    L('<aside class="scoreboard"><h2>PUAN TABLOSU · BU CİHAZ</h2><p>En iyi 10 koşun</p>') +
    (settings.leaderboard.length
      ? L('<table style="width:100%;text-align:left"><tr><th>#</th><th>Bölüm</th><th>Puan</th></tr>') +
        settings.leaderboard
          .map(
            (r, i) =>
              "<tr><td>" +
              (i + 1) +
              "</td><td>" +
              missionName(MISSIONS[r.mission], r.landscape || "western") +
              (r.success ? " ★" : "") +
              "</td><td>" +
              r.score.toLocaleString(NUMBERS) +
              "</td></tr>",
          )
          .join("") +
        "</table>"
      : L("<p>İlk koşunu tamamlayınca puanın burada görünecek.</p>")) +
    "</aside>";
  const panelEnd = $("#menu").innerHTML.lastIndexOf("</div>");
  $("#menu").innerHTML =
    $("#menu").innerHTML.slice(0, panelEnd) +
    scorePanel +
    $("#menu").innerHTML.slice(panelEnd);
  $("#menu").innerHTML = westernText($("#menu").innerHTML);
  const choices = $("#menu .mode-groups"),
    chapters = $("#menu .district-tabs");
  if (choices?.parentNode && choices.parentNode === chapters?.parentNode)
    choices.parentNode.insertBefore(choices, chapters);
  $("#menu")
    .querySelectorAll("[data-page]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          page = +b.dataset.page;
          selected = page * 5;
          showMenu();
        }),
    );
  $("#menu")
    .querySelectorAll("[data-mission]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          selected = +b.dataset.mission;
          showMenu();
        }),
    );
  $("#launch").onclick = () => beginMission(selected);
  $("#dailyHub").onclick = () => showProfile("daily");
  $("#costumeHub").onclick = () => showProfile("costumes");
  for (let selector of ["#armoryShortcut", "#openArmory"])
    $(selector).onclick = () => {
      armoryOpen = true;
      $("#armory-panel").hidden = false;
    };
  $("#closeArmory").onclick = () => {
    armoryOpen = false;
    $("#armory-panel").hidden = true;
  };
  $("#freeplay").onclick = () => {
    settings.freePlay = !settings.freePlay;
    save();
    showMenu();
  };
  $("#menu")
    .querySelectorAll("[data-landscape]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          settings.landscape = b.dataset.landscape;
          save();
          showMenu();
        }),
    );
  $("#menu")
    .querySelectorAll("[data-contract]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          settings.contract = b.dataset.contract;
          save();
          showMenu();
        }),
    );
  if ($("#endless")) $("#endless").onclick = () => openMission(39, true);
  $("#menu")
    .querySelectorAll("[data-weapon]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          let id = b.dataset.weapon,
            w = COURIER_WEAPONS[id];
          if (!settings.ownedWeapons.includes(id)) {
            if (
              settings.coins < w.coinCost ||
              settings.diamonds < w.diamondCost
            )
              return;
            settings.coins -= w.coinCost;
            settings.diamonds -= w.diamondCost;
            settings.ownedWeapons.push(id);
          }
          settings.weapon = id;
          save();
          sound(720);
          showMenu();
        }),
    );
  $("#menu")
    .querySelectorAll("[data-weapon-upgrade]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          let id = b.dataset.weaponUpgrade,
            level = settings.weaponLevels[id],
            coinCost = level < 2 ? 120 * (level + 1) : 0,
            diamondCost = level >= 2 ? (level - 1) * 3 : 0;
          if (
            level < 4 &&
            settings.ownedWeapons.includes(id) &&
            settings.coins >= coinCost &&
            settings.diamonds >= diamondCost
          ) {
            settings.coins -= coinCost;
            settings.diamonds -= diamondCost;
            settings.weaponLevels[id]++;
            save();
            sound(900);
            showMenu();
          }
        }),
    );
  $("#menu")
    .querySelectorAll("[data-upgrade]")
    .forEach(
      (b) =>
        (b.onclick = () => {
          let key = b.dataset.upgrade,
            cost = key === "shield" ? 40 : 60,
            max = 3;
          if (settings.coins >= cost && settings[key] < max) {
            settings.coins -= cost;
            settings[key]++;
            save();
            sound(600);
            showMenu();
          }
        }),
    );
  if (!inPlayables) {
    // Language toggle (outside YouTube only; inside, the YouTube language is used).
    $("#menu .menu-settings")?.insertAdjacentHTML(
      "beforeend",
      '<button id="langToggle" lang="' + (LANG === "en" ? "tr" : "en") + '">' +
        (LANG === "en" ? "TÜRKÇE" : "ENGLISH") + "</button>",
    );
    $("#langToggle").onclick = () => {
      try {
        localStorage.setItem("kulhat-lang", LANG === "en" ? "tr" : "en");
      } catch {}
      location.reload();
    };
  }
  if (inPlayables) {
    // YouTube's own mute control is the overall switch inside Playables.
    $("#sound").hidden = true;
    const storageNote = $("#storage");
    if (storageNote) storageNote.textContent = L("İlerleme YouTube'da saklanır.");
  }
  $("#sound").onclick = () => {
    muted = !muted;
    settings.sound = !muted;
    gameAudio.setMuted(muted || !ytAudio);
    save();
    showMenu();
  };
  $("#display").onclick = () => {
    settings.quality = quality === "low" ? "high" : "low";
    setQuality(settings.quality);
    save();
    showMenu();
  };
  $("#controls").onclick = showControls;
}
function showProfile(tab = "daily") {
  const state = dailyState(profile);
  save();
  const loginTaken = profile.login.last === dayKey();
  const currentDay = loginTaken
    ? profile.login.streak
    : (() => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        return profile.login.last === dayKey(yesterday)
          ? (profile.login.streak % 7) + 1
          : 1;
      })();
  const content =
    tab === "daily"
      ? L('<h2>7 GÜNLÜK GİRİŞ ÖDÜLÜ</h2><div class="login-calendar">') +
        LOGIN_REWARDS.map(
          (coins, i) =>
            '<div class="login-day ' +
            (i + 1 === currentDay ? "today " : "") +
            (loginTaken && i < profile.login.streak ? "claimed" : "") +
            '"><b>' +
            (LANG === "en" ? "DAY " + (i + 1) : i + 1 + ". GÜN") +
            "</b><span>◈ " +
            coins +
            "</span>" +
            (loginTaken && i + 1 === currentDay ? "✓" : "") +
            "</div>",
        ).join("") +
        '</div><button id="claimLogin" class="primary" ' +
        (loginTaken ? "disabled" : "") +
        ">" +
        (loginTaken ? L("BUGÜN ALINDI") : L("BUGÜNÜN ÖDÜLÜNÜ AL")) +
        L('</button><h2>BUGÜNÜN 3 GÖREVİ</h2><p>Koşu bitince ilerleme kaydedilir. Her gün yenilenir.</p><div class="daily-tasks">') +
        TASKS.map(
          (task, i) =>
            "<div><b>" +
            task.label +
            "</b><span>" +
            Math.min(task.target, state[task.key]) +
            " / " +
            task.target +
            " · ◈ " +
            task.reward +
            '</span><progress max="' +
            task.target +
            '" value="' +
            Math.min(task.target, state[task.key]) +
            '"></progress><button data-task="' +
            i +
            '" ' +
            (state.claimed.includes(i) || state[task.key] < task.target
              ? "disabled"
              : "") +
            ">" +
            (state.claimed.includes(i) ? L("ALINDI") : L("ÖDÜLÜ AL")) +
            "</button></div>",
        ).join("") +
        "</div>"
      : L('<h2>KURYE KOSTÜMLERİ</h2><p>Yalnızca görünüm değişir. Güç ve hız aynıdır.</p><div class="costume-grid">') +
        COSTUMES.map(
          (c) =>
            '<button data-costume="' +
            c.id +
            '" class="' +
            (profile.costume === c.id ? "choice-selected" : "") +
            '" aria-pressed="' +
            (profile.costume === c.id) +
            '" ' +
            (!profile.costumes.includes(c.id) && settings.coins < c.price
              ? "disabled"
              : "") +
            '><span class="costume-preview" style="--suit:' +
            c.suit +
            ";--armor:" +
            c.armor +
            '"><i></i></span><b>' +
            c.name +
            "</b><small>" +
            (profile.costume === c.id
              ? L("KUŞANILDI")
              : profile.costumes.includes(c.id)
                ? L("KUŞAN")
                : "◈ " + c.price) +
            "</small></button>",
        ).join("") +
        "</div>";
  const extras = $("#extras");
  extras.hidden = false;
  extras.innerHTML =
    L('<div class="card profile-card" role="dialog" aria-modal="true" aria-label="Ödüller ve kostümler"><div class="profile-heading"><b>◈ ') +
    settings.coins +
    " · ◆ " +
    settings.diamonds +
    L('</b><button id="closeProfile" aria-label="Kapat">✕</button></div><div class="row"><button id="profileDaily" class="') +
    (tab === "daily" ? "choice-selected" : "") +
    L('">GÜNLÜK ÖDÜLLER</button><button id="profileCostumes" class="') +
    (tab === "costumes" ? "choice-selected" : "") +
    L('">KOSTÜMLER</button></div>') +
    content +
    "</div>";
  $("#closeProfile").onclick = () => {
    extras.hidden = true;
    showMenu();
  };
  $("#profileDaily").onclick = () => showProfile("daily");
  $("#profileCostumes").onclick = () => showProfile("costumes");
  if (tab === "daily") {
    $("#claimLogin").onclick = () => {
      if (claimLogin(settings, profile)) {
        save();
        sound(1050);
        showProfile(tab);
      }
    };
    extras.querySelectorAll("[data-task]").forEach(
      (b) =>
        (b.onclick = () => {
          if (claimTask(settings, profile, +b.dataset.task)) {
            save();
            sound(1100);
            showProfile(tab);
          }
        }),
    );
  } else
    extras.querySelectorAll("[data-costume]").forEach(
      (b) =>
        (b.onclick = () => {
          if (selectCostume(settings, profile, b.dataset.costume)) {
            save();
            const c = COSTUMES.find((x) => x.id === profile.costume);
            suit.color.set(c.suit);
            armor.color.set(c.armor);
            sound(700);
            showProfile(tab);
          }
        }),
    );
  $("#closeProfile").focus?.();
}
let tutorialStep = -1,
  tutorialStart = null,
  tutorialPointer = null;
function beginMission(id) {
  if (profile.tutorialDone) {
    openMission(id);
    return;
  }
  tutorialStep = 0;
  tutorialStart = () => openMission(id);
  drawTutorial();
}
function finishTutorial() {
  profile.tutorialDone = true;
  save();
  tutorialStep = -1;
  $("#tutorial").hidden = true;
  const start = tutorialStart;
  tutorialStart = null;
  start?.();
}
function advanceTutorial() {
  sound(800, 0.08);
  if (++tutorialStep >= 3) finishTutorial();
  else drawTutorial();
}
function drawTutorial() {
  const overlay = $("#tutorial");
  overlay.hidden = false;
  const names = [
    L("Sağa kaydır"),
    L("Yukarı kaydırarak zıpla"),
    L("Hedefe dokunarak ateş et"),
  ];
  overlay.innerHTML =
    '<div class="tutorial-card" role="dialog" aria-modal="true" aria-label="' +
    names[tutorialStep] +
    L('"><button id="skipTutorial" aria-label="Öğreticiyi atla">✕</button><div class="gesture-scene gesture-') +
    tutorialStep +
    '"><div class="gesture-lanes"><i></i><i></i><i></i></div><div class="gesture-player"></div><div class="gesture-target">◎</div><svg class="tutorial-hand" viewBox="0 0 80 100" aria-hidden="true"><path d="M24 49V13c0-10 14-10 14 0v28-9c0-9 13-9 13 0v9-5c0-8 13-8 13 0v10-4c0-7 12-7 12 0v29c0 15-9 25-23 25H39c-9 0-14-5-18-13L7 60c-6-11 5-18 12-9l5 6Z" fill="#fff0d4" stroke="#173b48" stroke-width="4"/></svg><div class="gesture-arrow">' +
    ["↔", "↑", "◉"][tutorialStep] +
    '</div></div><div class="tutorial-dots">' +
    [0, 1, 2]
      .map(
        (i) => '<i class="' + (i === tutorialStep ? "active" : "") + '"></i>',
      )
      .join("") +
    "</div></div>";
  $("#skipTutorial").onclick = (e) => {
    e.stopPropagation?.();
    finishTutorial();
  };
  overlay.onpointerdown = (e) => {
    if (e.target?.closest?.("button")) return;
    tutorialPointer = { x: e.clientX, y: e.clientY };
    overlay.setPointerCapture?.(e.pointerId);
  };
  overlay.onpointerup = (e) => {
    if (!tutorialPointer) return;
    const dx = e.clientX - tutorialPointer.x,
      dy = e.clientY - tutorialPointer.y;
    tutorialPointer = null;
    if (
      (tutorialStep === 0 && Math.abs(dx) > 35) ||
      (tutorialStep === 1 && dy < -35) ||
      (tutorialStep === 2 && Math.abs(dx) < 25 && Math.abs(dy) < 25)
    )
      advanceTutorial();
  };
  overlay.onpointercancel = () => {
    tutorialPointer = null;
  };
}
function showControls() {
  $("#menu").innerHTML =
    L('<div class="card help-card"><div class="eyebrow">KURYE EL KİTABI</div><h1>Akıllı koş.<br><em>Sağ çık.</em></h1><div class="help-grid"><p><b>Hareket</b>Sağa/sola kaydır: şerit. Yukarı: zıpla. Aşağı: lazerin altından kay.</p><p><b>Çatışma</b>Drona veya çevre hedefine dokun. Basılı tutarak seri ateş et. Şarjör otomatik dolar.</p><p><b>Çevre</b>Turuncu varil: alan patlaması. Turkuaz ızgara: dronları devre dışı bırakır. KAPI paneli: ilerideki engeli açar.</p><p><b>Yollar</b>İlk görevde bile yol ayrımı var. Solda kal: kapalı metroya in, lazerlerin altından kay. Sağda kal: bahçeli çatılara yüksel, döşeme boşluklarından atla. Ortada kal: yeni sokaktan devam et. Her rotada elmas topla; turuncu güç çekirdekleri bu koşudaki silah hasarını artırır.</p><p><b>Yük</b>Ağır yükle zıplama alçalır. Cam yük darbede daha çok hasar alır. Hasarsız teslimat üç yıldız kazandırır.</p><p><b>Takipçi</b>Darbe aradaki mesafeyi kapatır. Dronları vurmak ve çevre hedefleri takipçiyi yavaşlatır.</p></div><button class="primary" id="backMenu">Anladım ↗</button></div>');
  $("#menu").innerHTML = westernText($("#menu").innerHTML);
  $("#menu .help-grid p:nth-child(4)").innerHTML =
    L("<b>Yollar</b>") +
    routeHint() +
    L(". Sol geçitte alçak engellere, sağ geçitte boşluklara dikkat et. Her rotada elmas ve güç çekirdeği topla.");
  $("#backMenu").onclick = showMenu;
}
function pause() {
  if (mode === "play") {
    $("#fork-signs").hidden = true;
    mode = "pause";
    paused = true;
    accumulator = 0;
    last = performance.now();
    keys = {};
    holding = false;
    pointer = null;
    if (run) run.hold = false;
    gameAudio.stop();
    $("#menu").hidden = false;
    $("#menu").innerHTML =
      L('<div class="card"><div class="eyebrow">TESLİMAT DURAKLATILDI</div><h1>Nefes al.<br><em>Devam et.</em></h1><div class="row"><button class="primary" id="resume">Devam et ↗</button><button id="base">Üsse dön</button></div><p>Üsse dönersen bu koşudaki altın ve görev ilerlemesi kaydedilmez.</p></div>');
    $("#resume").onclick = resume;
    $("#base").onclick = showMenu;
  }
}
function resume() {
  document.body.classList.remove("menu-open");
  mode = "play";
  paused = false;
  accumulator = 0;
  last = performance.now();
  $("#menu").hidden = true;
  initAmbient();
}
// Explains how the end score and stars were reached.
function resultBreakdown(r) {
  if (!r.success || !Number.isFinite(r.runScore)) return "";
  const n = (x) => x.toLocaleString(NUMBERS);
  return (
    L('<p class="score-breakdown">Koşu ') +
    n(r.runScore) +
    L(" + teslimat bonusu ") +
    n(r.deliveryBonus) +
    L(" + yıldız bonusu ") +
    n(r.starBonus) +
    " (" +
    r.stars +
    " × " +
    n(1000) +
    ") = <b>" +
    n(r.score) +
    L('</b></p><p class="star-rules">★ Teslimat ✓ · ★ Yük %75+ ') +
    (r.cargoStar ? "✓" : "✗") +
    L(" · ★ Yan hedef ") +
    (r.objective ? "✓" : "✗") +
    "</p>"
  );
}
function results(r) {
  mode = "end";
  holding = false;
  pointer = null;
  let dailyReward = false,
    newTransmission = false;
  const previousBest = Math.max(0, ...settings.leaderboard.map((x) => x.score));
  const newRecord = r.score > previousBest;
  if (!sessionRewarded) {
    let beforeSignals = transmissionCount(),
      contract = dailyContract();
    settings = rewardRun(settings, r);
    recordDaily(profile, r);
    settings.weaponMastery[run.weapon] += r.kills;
    if (
      !(settings.daily.day === contract.key && settings.daily.done) &&
      contract.met(r)
    ) {
      settings.daily = { day: contract.key, done: true };
      settings.coins += 120;
      settings.diamonds += 1;
      dailyReward = true;
    }
    newTransmission = transmissionCount() > beforeSignals;
    save();
    // YouTube shows the best score; it matches the saved leaderboard best.
    platform?.sendScore(Math.max(0, ...settings.leaderboard.map((x) => x.score)));
    sessionRewarded = true;
  }
  gameAudio.stop();
  $("#menu").hidden = false;
  let reason =
    {
      health: L("Zırhın tükendi."),
      cargo: L("Yük kurtarılamadı."),
      hunter: L("Takipçi sana ulaştı."),
    }[r.reason] || "";
  $("#menu").innerHTML =
    '<div class="card result-card"><div class="eyebrow">' +
    (r.success ? L("TESLİMAT TAMAMLANDI") : L("KOŞU SONA ERDİ")) +
    "</div><h1>" +
    (r.success
      ? L("Hat açık.<br><em>Şehir yaşıyor.</em>")
      : L("Planı değiştir.<br><em>Yeniden koş.</em>")) +
    '</h1><div class="result-stars">' +
    (r.success ? "★".repeat(r.stars) + "☆".repeat(3 - r.stars) : "") +
    "</div><p>" +
    reason +
    " " +
    (lastDamage || "") +
    '</p><div class="result-grid"><span><b>' +
    Math.floor(r.distance) +
    (LANG === "en"
      ? " m</b>distance</span><span><b>" + Math.round(r.cargo) + "%"
      : " m</b>mesafe</span><span><b>%" + Math.round(r.cargo)) +
    L("</b>yük sağlamlığı</span><span><b>") +
    r.kills +
    (settings.landscape === "western"
      ? L("</b>durdurulan araba</span><span><b>")
      : L("</b>dron</span><span><b>")) +
    r.environment +
    L("</b>çevre hedefi</span><span><b>") +
    r.coins +
    L("</b>toplanan altın</span><span><b>◆ ") +
    (r.gems || 0) +
    L("</b>toplanan elmas</span><span><b>") +
    (r.power || 0) +
    L("/5</b>silah gücü</span><span><b>") +
    r.routes.length +
    L("</b>rota seçimi</span><span><b>") +
    r.score.toLocaleString(NUMBERS) +
    L("</b>puan</span></div>") +
    resultBreakdown(r) +
    "<p>★ " +
    (r.objective ? L("Yan hedef tamamlandı.") : r.objectiveText || "") +
    "</p>" +
    (dailyReward
      ? L('<p class="reward-callout">BUGÜNÜN KONTRATI TAMAM · ◈120 + ◆1</p>')
      : "") +
    (newTransmission
      ? L('<p class="story-callout">YENİ KAYIP YAYIN: ') +
        TRANSMISSIONS[transmissionCount()] +
        "</p>"
      : "") +
    "<p>" +
    (r.success
      ? r.mission === 39
        ? L("Kampanya tamamlandı. Sonsuz koşu üste açıldı.")
        : storyText(run.mission, settings.landscape)
      : L("Kalkan ve yük koruması darbeleri hafifletir. Yol çatallarında güvenli rotayı seçebilirsin.")) +
    '</p><div class="row"><button id="retry" class="primary">' +
    (r.success && r.mission < 39 ? L("Sonraki teslimat ↗") : L("Yeniden dene ↗")) +
    L('</button><button id="back">Üs ve yükseltmeler</button></div></div>');
  $("#menu").innerHTML = westernText($("#menu").innerHTML);
  $("#retry").classList.add("retry-large");
  const resultCard = $("#menu .result-card");
  if (resultCard?.insertAdjacentHTML)
    resultCard.insertAdjacentHTML(
      "beforeend",
      '<p class="best-score ' +
        (newRecord ? "record-celebration" : "") +
        '">' +
        (newRecord ? L("✦ YENİ REKOR! ✦ · ") : L("EN İYİ SKOR · ")) +
        Math.max(previousBest, r.score).toLocaleString(NUMBERS) +
        "</p>" +
        L('<div class="ad-placements"><button id="adContinue" disabled>Devam et (reklam)</button><button id="adDouble" disabled>Altını 2 katına çıkar (reklam)</button><small>Reklamlar bu sürümde kapalı.</small></div>'),
    );
  // No placements are enabled until a real SDK and platform review are complete.
  // One mock entry point is exported by profile.js for later SDK integration.
  if (REWARDED_ADS_ENABLED)
    console.warn(L("Reklam yerleri için platform entegrasyonu gerekli."));
  const retryRow = $("#retry").parentNode;
  const resultHeading = $("#menu .result-card h1");
  if (retryRow && resultHeading?.parentNode)
    resultHeading.parentNode.insertBefore(retryRow, resultHeading.nextSibling);
  const bestScore = $("#menu .best-score");
  if (bestScore && retryRow?.parentNode)
    retryRow.parentNode.insertBefore(bestScore, retryRow);
  $("#retry").onclick = () =>
    openMission(
      r.success && r.mission < 39 ? r.mission + 1 : r.mission,
      r.endless,
    );
  $("#back").onclick = () => {
    page = Math.floor(Math.min(39, settings.unlocked - 1) / 5);
    selected = Math.min(39, settings.unlocked - 1);
    showMenu();
  };
  sound(r.success ? 650 : 120, 0.25);
}
let lastDamage = "";
function events() {
  for (let e of run.takeEvents()) {
    let visual = e.object ? visuals.get(e.object) : null,
      pos =
        visual?.position.clone() ||
        runner.position.clone().add(new T.Vector3(0, 1, 0));
    if (e.type === "jump") sound(430);
    if (e.type === "slide") sound(180);
    if (e.type === "fire") {
      sound(900, 0.05, "triangle");
      arms[1].rotation.x = -1.3;
      muzzleFlash.userData.until = time + 0.1;
    }
    if (e.type === "coin") {
      sound(1200, 0.06, "triangle");
      burst(pos, "#ffda70", 4);
    }
    if (e.type === "power") {
      notice(L("SİLAH GÜCÜ ") + e.level + L("/5 · HASAR ARTTI"), 1.2);
      sound(760, 0.08, "square");
    }
    if (e.type === "gem") {
      burst(pos, "#a8f6ff", 5);
      notice(L("ELMAS ALINDI · ◆ ") + e.total, 1.2);
      sound(1450, 0.08, "triangle");
    }
    if (e.type === "shield") notice(L("KALKAN ALINDI"), 1);
    if (e.type === "repair") notice(L("YÜK ONARILDI"), 1);
    if (e.type === "supply") notice(L("ARA İKMAL · +1 CAN · YÜK ONARILDI"), 2);
    if (
      e.type === "warning" &&
      (run.mission.id < 3 || ["saw", "rock", "wagon", "cart"].includes(e.kind))
    ) {
      notice(
        {
          barrier: L("BARİYER · ZIPLA VEYA KAÇ"),
          rock:
            (settings.landscape === "western"
              ? L("YUVARLANAN FIÇI → ")
              : L("YUVARLANAN KAYA → ")) +
            [L("SOL"), L("ORTA"), L("SAĞ")][e.lane + 1] +
            L(" ŞERİT · ŞERİT DEĞİŞTİR"),
          wagon:
            L("AT ARABASI → ") +
            [L("SOL"), L("ORTA"), L("SAĞ")][e.lane + 1] +
            L(" ŞERİT · KENARA KAÇ"),
          cart:
            L("AĞIR MADEN VAGONU → ") +
            [L("SOL"), L("ORTA"), L("SAĞ")][e.lane + 1] +
            L(" · ŞERİT DEĞİŞTİR"),
          saw:
            (e.side < 0 ? L("SOLDAN") : L("SAĞDAN")) +
            L(" TESTERE → ") +
            [L("SOL"), L("ORTA"), L("SAĞ")][e.lane + 1] +
            L(" ŞERİT · ZIPLA / KAÇ"),
          laser:
            settings.landscape === "western"
              ? L("ALÇAK KİRİŞ · KAY VEYA KAÇ")
              : L("LAZER · KAY VEYA KAÇ"),
          wall: L("KAPALI YOL · ŞERİT DEĞİŞTİR"),
          bolt: L("DRON ATEŞİ · KAÇ"),
        }[e.kind] || "",
        0.8,
      );
    }
    if (e.type === "damage") {
      try {
        // Playables require a haptics toggle; vibration stays off there.
        if (!inPlayables) globalThis.navigator?.vibrate?.(45);
      } catch {}
      shake = 0.35;
      flashTimer = 0.2;
      $("#flash").classList.add("hit");
      lastDamage = {
        barrier: L("Bariyere çarptın; yukarı kaydırarak zıpla."),
        rock:
          settings.landscape === "western"
            ? L("Yuvarlanan fıçıya çarptın; açık şeride geç.")
            : L("Yuvarlanan kayaya çarptın; açık şeride geç."),
        cart: L("Ağır vagon iki can götürür; başka raya geç."),
        saw: L("Dönen testereye yakalandın; daha erken zıpla."),
        laser:
          settings.landscape === "western"
            ? L("Alçak kirişe çarptın; aşağı kaydır.")
            : L("Lazere yakalandın; aşağı kaydır."),
        wall: L("Kapalı şeritten zamanında çıkamadın."),
        train: L("Tren hattından kaçman gerekiyor."),
        gap: L("Çatı boşluğunu zıplayarak geç."),
        drone:
          settings.landscape === "western"
            ? L("At arabasının yolundan çekil.")
            : L("Dronu vur veya yanından kaç."),
        bolt: L("Dron ateşinden kaçınmak için şerit değiştir."),
      }[e.kind];
      notice(lastDamage, 2);
      sound(110, 0.15, "sawtooth");
    }
    if (e.type === "blocked") {
      burst(pos, "#a6f4ec");
      notice(L("KALKAN DARBESİ"), 0.8);
    }
    if (e.type === "explode" || e.type === "environment") {
      burst(
        pos,
        e.kind === "wagon"
          ? "#b79a72"
          : e.type === "environment"
            ? "#ffd09a"
            : "#f4a484",
        20,
      );
      sound(e.kind === "wagon" ? 190 : 130, 0.17, "sawtooth");
      if (e.kind === "wagon") notice(L("AT ARABASI DURDURULDU · ◈3"), 1);
      if (e.type === "environment")
        notice(
          {
            barrel: L("ZİNCİRLEME PATLAMA"),
            vent: L("DRONLAR DEVRE DIŞI"),
            panel: L("GEÇİT AÇILDI"),
          }[e.kind],
          1.2,
        );
    }
    if (e.type === "spark") burst(pos, "#b8e7e4", 4);
    if (e.type === "fork") notice(routeHint(), 3);
    if (e.type === "route")
      notice(
        e.choice === "safe"
          ? routeLabels().left + L(" · GEÇİDE DİKKAT / +70m")
          : e.choice === "street"
            ? routeLabels().middle + L(" · ENGELLERİ AŞ / +20 ALTIN")
            : routeLabels().right + L(" · BOŞLUKLARDAN ATLA / +30 ALTIN"),
        2,
      );
    if (e.type === "end") results(e.result);
  }
}
// Fork choices move the finish line; say so next to the target.
function routeGoalNote() {
  if (!run || run.endless) return "";
  const delta = Math.round(run.goal - run.mission.length);
  return delta
    ? L(" · ROTA\u00a0") + (delta > 0 ? "+" : "−") + Math.abs(delta) + "\u00a0m"
    : "";
}
function updateHud() {
  if (!run) return;
  $("#sector").textContent =
    String(run.mission.id + 1).padStart(2, "0") +
    " · " +
    stageName(run.mission).toLocaleUpperCase(UPPER);
  $("#distance").textContent =
    Math.floor(run.distance) +
    " / " +
    (run.endless ? "∞" : Math.floor(run.goal)) +
    " m" +
    routeGoalNote();
  $("#progress").style.width = run.endless
    ? "100%"
    : Math.min(100, (run.distance / run.goal) * 100) + "%";
  $("#hp").textContent = "▰ ".repeat(Math.max(0, run.health));
  $("#shield").textContent = L("KALKAN ") + run.shield;
  $("#coins").textContent =
    "◈ " +
    run.coins +
    " · ◆ " +
    run.gems +
    L(" · PUAN ") +
    Math.floor(
      run.distance * 10 +
        run.coins * 25 +
        run.gems * 150 +
        run.kills * 200 +
        run.environment * 100,
    );
  $("#cargo").textContent =
    LANG === "en" ? "CARGO " + Math.round(run.cargo) + "%" : "YÜK %" + Math.round(run.cargo);
  $("#ammo").textContent =
    run.reload > 0
      ? L("DOLDURULUYOR")
      : COURIER_WEAPONS[run.weapon].name.toLocaleUpperCase(UPPER) +
        " · " +
        run.ammo +
        " / " +
        run.ammoMax;
  $("#hunter").textContent = run.mission.pursuit
    ? L("TAKİPÇİ ") + Math.max(0, Math.round(run.hunter)) + " m"
    : L("TAKİP YOK");
  $("#hunter").classList.toggle("danger", run.hunter < 30);
  $("#objective").textContent = "★ " + westernText(objective(run.mission).text);
  $("#route").textContent = westernText(
    run.fork
      ? L("YOL AYRIMI ") + Math.ceil(run.fork.at - run.distance) + " m"
      : run.route === "safe"
        ? routeLabels().left + L(" · ALÇAK KİRİŞLER")
        : run.route === "risk"
          ? routeLabels().right + L(" · BOŞLUKLARA DİKKAT")
          : run.route === "street"
            ? routeLabels().middle + L(" · ALTIN VE ELMAS TOPLA")
            : "",
  );
}
function syncObjects() {
  let ids = new Set();
  for (let o of run.objects) {
    ids.add(o.id);
    let mesh = visuals.get(o.id) || createObject(o),
      p = positionOf(o);
    mesh.position.copy(p);
    if (mesh.userData.gapCover)
      mesh.userData.gapCover.visible = terrainAt(o.at)?.kind !== "roof";
    if (o.type === "train") mesh.position.z -= 6;
    if (o.type === "rock")
      mesh.userData.rollingStone.rotation.x = o.rolled / 1.3;
    if (o.type === "cart") {
      mesh.userData.cartLanding.position.y = 0.05 - (o.arcY || 0);
      for (let wheel of mesh.userData.mineWheels)
        wheel.rotation.x = o.rolled / 0.43;
    }
    if (["coin", "power", "gem"].includes(o.type)) {
      mesh.rotation.y = time * (o.type === "coin" ? 2 : 3);
      if (o.type !== "coin")
        mesh.position.y += Math.sin(time * 4 + o.id) * 0.12;
    }
    if (o.appearance === "wagon") {
      if (!o.disabled)
        for (let wheel of mesh.userData.wagonWheels)
          wheel.rotation.x = o.rolled / 0.53;
      for (let i = 0; i < mesh.userData.horseLegs.length; i++)
        mesh.userData.horseLegs[i].rotation.x = o.disabled
          ? 0
          : Math.sin(time * 11 + i * Math.PI) * 0.55;
    }
    if (o.type === "drone" && o.appearance !== "wagon") {
      mesh.rotation.z = Math.sin(time * 4 + o.lane) * 0.07;
      mesh.position.y += Math.sin(time * 4) * 0.1;
      for (let rotor of mesh.userData.rotors || [])
        rotor.rotation.z = time * 12;
      if (mesh.userData.warningGlow)
        mesh.userData.warningGlow.scale.setScalar(
          0.9 + Math.sin(time * 7) * 0.18,
        );
      mesh.traverse((n) => {
        if (n.isSprite && o.disabled) n.material.color.set("#80dfdc");
      });
    }
    if (o.type === "saw") {
      mesh.userData.blade.rotation.z = time * 9;
      mesh.rotation.y = Math.sin(time * 2 + o.lane) * 0.08;
      mesh.userData.landing.position.set(
        o.baseX - o.x,
        0.05 - (o.arcY || 0),
        0,
      );
      mesh.userData.landing.scale.setScalar(1 + Math.sin(time * 8) * 0.12);
    }
    if (o.type === "shield" || o.type === "repair")
      mesh.position.y += Math.sin(time * 3) * 0.15;
  }
  visuals.forEach((g, id) => {
    if (!ids.has(id)) {
      cleanup(g);
      visuals.delete(id);
    }
  });
  let shotIds = new Set();
  for (let s of run.shots) {
    shotIds.add(s.id);
    let mesh = bulletMeshes.get(s.id);
    if (!mesh) {
      let colors = {
          sidearm: ["#b6fff3", "#84f6ee"],
          burst: ["#ffd190", "#db8b46"],
          ion: ["#c4adff", "#775ad1"],
          rail: ["#fff0a5", "#e69c38"],
          repeater: ["#a9ffd6", "#4ca67b"],
          storm: ["#ffad92", "#e96441"],
        }[s.weapon || "sidearm"],
        length = s.weapon === "rail" ? 2.9 : 1.6;
      mesh = box(0.16, 0.16, length, mat(colors[0], 0.1, 0.2, colors[1]));
      mesh.castShadow = false;
      bulletMeshes.set(s.id, mesh);
    }
    let o = run.objects.find((o) => o.id === s.target);
    if (o) {
      let to = positionOf(o);
      if (o.type !== "drone" || o.appearance === "wagon")
        to.y = groundAt(o.at) + 1.1;
      let from = new T.Vector3(
        s.x + pathX(0) + 0.5,
        groundAt(run.distance) + run.y + 1.3,
        2,
      );
      mesh.position.lerpVectors(from, to, clamp(s.t / s.duration, 0, 1));
      mesh.lookAt(to);
    }
  }
  bulletMeshes.forEach((g, id) => {
    if (!shotIds.has(id)) {
      cleanup(g);
      bulletMeshes.delete(id);
    }
  });
  if (run.fork) {
    $("#fork-signs").hidden = false;
    const names = routeLabels();
    $("#fork-left-title").textContent = names.left;
    $("#fork-middle-title").textContent = names.middle;
    $("#fork-right-title").textContent = names.right;
    forkVisual.visible = true;
    forkVisual.position.set(
      pathX(run.fork.at - run.distance),
      0,
      3 - (run.fork.at - run.distance),
    );
  } else {
    forkVisual.visible = false;
    $("#fork-signs").hidden = true;
  }
  hunter.visible = run.mission.pursuit && settings.landscape !== "western";
  westernHunter.visible =
    run.mission.pursuit && settings.landscape === "western";
  hunter.position.set(
    pathX(0) + Math.sin(time) * 2,
    3.6 + Math.sin(time * 2) * 0.3,
    4.5 + Math.min(100, run.hunter) * 0.22,
  );
  westernHunter.position.set(
    hunter.position.x,
    groundAt(run.distance),
    hunter.position.z,
  );
  for (let wheel of westernHunter.userData.wagonWheels)
    wheel.rotation.x = -time * 12;
  for (let i = 0; i < westernHunter.userData.horseLegs.length; i++)
    westernHunter.userData.horseLegs[i].rotation.x =
      Math.sin(time * 11 + i * Math.PI) * 0.55;
}
const raycaster = new T.Raycaster(),
  ndc = new T.Vector2();
function aimed(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, (-e.clientY / innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  let targets = [...visuals.entries()].filter(([id]) =>
    run?.objects.some(
      (o) =>
        o.id === id && ["drone", "barrel", "vent", "panel"].includes(o.type),
    ),
  );
  let hit = raycaster.intersectObjects(
    targets.map((x) => x[1]),
    true,
  )[0];
  if (!hit) return null;
  return (
    targets.find(([, g]) => {
      let o = hit.object;
      while (o) {
        if (o === g) return true;
        o = o.parent;
      }
      return false;
    })?.[0] ?? null
  );
}
view.onpointerdown = (e) => {
  if (mode !== "play") return;
  e.preventDefault();
  view.setPointerCapture(e.pointerId);
  pointer = {
    id: e.pointerId,
    x: e.clientX,
    y: e.clientY,
    at: performance.now(),
    moved: false,
    target: aimed(e),
  };
};
view.onpointermove = (e) => {
  if (
    !pointer ||
    pointer.id !== e.pointerId ||
    pointer.moved ||
    mode !== "play"
  )
    return;
  let dx = e.clientX - pointer.x,
    dy = e.clientY - pointer.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) > 28) {
    pointer.moved = true;
    holding = false;
    run.hold = false;
    run.action(
      Math.abs(dx) > Math.abs(dy)
        ? dx > 0
          ? "right"
          : "left"
        : dy < 0
          ? "jump"
          : "slide",
    );
  }
};
view.onpointerup = (e) => {
  if (
    pointer &&
    pointer.id === e.pointerId &&
    !pointer.moved &&
    mode === "play"
  )
    run.fire(pointer.target);
  pointer = null;
  holding = false;
  if (run) run.hold = false;
};
view.onpointercancel = () => {
  pointer = null;
  holding = false;
  if (run) run.hold = false;
};
let keys = {};
addEventListener(
  "keydown",
  (e) => {
    if (tutorialStep >= 0) {
      if (e.key !== "Escape") e.preventDefault();
      if (e.repeat) return;
      if (e.key === "Escape") {
        finishTutorial();
        pause();
        return;
      }
      if (
        (tutorialStep === 0 &&
          ["ArrowLeft", "ArrowRight", "a", "d"].includes(e.key)) ||
        (tutorialStep === 1 && ["ArrowUp", "w"].includes(e.key)) ||
        (tutorialStep === 2 && e.key === " ")
      )
        advanceTutorial();
      return;
    }
    if (e.key === "Escape" && mode !== "play") {
      // Close whichever panel is open: rewards/costumes, armoury, help.
      const extras = $("#extras");
      if (extras && !extras.hidden && $("#closeProfile")) {
        $("#closeProfile").click();
      } else if (armoryOpen && $("#closeArmory")) {
        $("#closeArmory").click();
      } else if ($("#backMenu")) {
        $("#backMenu").click();
      }
      return;
    }
    if (e.key === "Escape") {
      e.stopImmediatePropagation?.();
      if (!e.repeat) pause();
      return;
    }
    let action = {
      ArrowLeft: "left",
      a: "left",
      ArrowRight: "right",
      d: "right",
      ArrowUp: "jump",
      w: "jump",
      ArrowDown: "slide",
      s: "slide",
      " ": "fire",
    }[e.key];
    if (action) {
      e.preventDefault();
      if (mode === "play" && !keys[e.key]) run.action(action);
      keys[e.key] = true;
      if (e.key === " " && mode === "play") holding = true;
    }
  },
  { capture: true },
);
addEventListener("keyup", (e) => {
  keys[e.key] = false;
  if (e.key === " ") {
    holding = false;
    if (run) run.hold = false;
  }
});
$("#pause").onclick = pause;
$("#quality").onclick = () => {
  setQuality(quality === "low" ? "high" : "low");
  settings.quality = quality;
  save();
};
function lostFocus() {
  gameAudio.stop();
  keys = {};
  pointer = null;
  holding = false;
  if (run) run.hold = false;
  if (mode === "play") pause();
}
if (inPlayables) {
  platform.onPause(() => {
    systemPaused = true;
    lostFocus();
    save();
    cancelAnimationFrame(frameHandle);
  });
  platform.onResume(() => {
    if (!systemPaused) return;
    systemPaused = false;
    last = performance.now();
    accumulator = 0;
    frameHandle = requestAnimationFrame(frame);
  });
  platform.onAudioEnabledChange((enabled) => {
    ytAudio = enabled !== false;
    gameAudio.setMuted(muted || !ytAudio);
    if (ytAudio && mode === "play" && !paused) initAmbient();
  });
} else {
  addEventListener("blur", lostFocus);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) lostFocus();
  });
}
addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
function stepSimulation(dt) {
  if (mode === "play" && run) {
    if (pointer && !pointer.moved && performance.now() - pointer.at > 200)
      holding = true;
    if (holding) {
      if (pointer?.target) run.fire(pointer.target);
      else run.fire();
    }
    run.step(dt);
    events();
  }
}
function update(dt, simulate = true) {
  time += dt;
  muzzleFlash.visible =
    mode === "play" && (muzzleFlash.userData.until || 0) > time;
  alertTimer -= dt;
  if (alertTimer <= 0) $("#callout").textContent = "";
  flashTimer -= dt;
  if (flashTimer <= 0) $("#flash").classList.remove("hit");
  shake = Math.max(0, shake - dt);
  if (simulate) stepSimulation(dt);
  if (mode === "play" && run) {
    syncObjects();
    updateHud();
  }
  let activeTerrain =
    mode === "play" || mode === "pause"
      ? terrainAt(run?.distance || 0)?.kind
      : null;
  let palette =
    activeTerrain === "metro"
      ? settings.landscape === "western"
        ? ["#3b342c", "#66523b", "#ffd394"]
        : ["#123d51", "#246578", "#85ffdf"]
      : activeTerrain === "roof"
        ? ["#c2ac8b", "#c4a882", "#ffe0ac"]
        : settings.landscape === "trail"
          ? ["#a8bec0", "#b8b2a0", "#ffe2ae"]
          : ["#c9b18d", "#c0a17a", "#ffdda3"];
  scene.background.lerp(new T.Color(palette[0]), Math.min(1, dt * 2));
  scene.fog.color.lerp(new T.Color(palette[1]), Math.min(1, dt * 2));
  sun.color.lerp(new T.Color(palette[2]), Math.min(1, dt * 2));
  rain.visible = false;
  dust.visible = activeTerrain !== "metro";
  dust.position.x = run?.offset || 0;
  dust.position.y = groundAt(run?.distance || 0);
  let motion = mode === "play" ? run.speed : mode === "menu" ? 4 : 0;
  if (motion > 0)
    for (let i = 0; i < (quality === "low" ? 2 : dust.children.length); i++) {
      let cloud = dust.children[i];
      cloud.position.z += (motion * 0.7 + 2) * dt;
      cloud.position.x += Math.sin(time * 0.6 + i) * dt * 0.3;
      if (cloud.position.z > 14) {
        cloud.position.z -= 168;
        cloud.position.x = (i % 2 ? 1 : -1) * (6 + (i % 8));
      }
    }
  for (let s of segments) {
    s.position.z += motion * dt;
    if (s.position.z > 40) s.position.z -= 28 * segments.length;
    s.visible = quality !== "low" || s.position.z >= -75;
    if (!s.visible) continue;
    let at = (run?.distance || 0) + 3 - s.position.z;
    let terrain = terrainAt(at + 14);
    let routeDistance = at + 14,
      variant = terrain
        ? ((terrain.variant || 0) +
            Math.max(0, Math.floor((routeDistance - terrain.start) / 112))) %
          8
        : Math.abs(Math.floor(routeDistance / 84)) % 8;
    dressRoute(
      s,
      terrain?.kind ||
        (mode !== "menu" && currentDistrict === 6 ? "metro" : "street"),
      variant,
      currentDistrict,
    );
    if (quality === "low") batchStaticDecor(s.userData.routeDecor);
    s.position.y = groundAt(at);
    s.rotation.x = Math.atan2(groundAt(at + 28) - groundAt(at), 28);
    for (let tile of s.userData.tiles || []) {
      let tileAt = at - tile.position.z;
      tile.visible = !run?.objects.some(
        (o) =>
          o.type === "gap" &&
          !o.dead &&
          o.lane === tile.userData.lane &&
          Math.abs(o.at - tileAt) < 2.6,
      );
    }
    s.position.x = pathX(Math.max(0, -s.position.z));
    s.rotation.y = run ? Math.atan2(run.targetOffset - run.offset, 100) : 0;
  }
  let px = run?.x || 0,
    py = (run?.y || 0) + groundAt(run?.distance || 0),
    offset = run?.offset || 0;
  runner.position.set(px + offset, py, 3);
  body.scale.y = T.MathUtils.damp(
    body.scale.y,
    run?.slide > 0 ? 0.43 : 1,
    16,
    dt,
  );
  body.rotation.z = T.MathUtils.damp(
    body.rotation.z,
    run ? (run.lane * 3.2 - run.x) * -0.06 : 0,
    8,
    dt,
  );
  let cycle = time * (mode === "play" ? run.speed * 0.8 : 4),
    stride = mode === "play" ? 0.85 : 0.05;
  legs[0].rotation.x = Math.sin(cycle) * stride;
  legs[1].rotation.x = -legs[0].rotation.x;
  arms[0].rotation.x = -legs[0].rotation.x * 0.7;
  arms[1].rotation.x = T.MathUtils.damp(
    arms[1].rotation.x,
    holding ? -1.15 : legs[0].rotation.x * 0.6,
    10,
    dt,
  );
  runner.visible =
    mode !== "play" || !run || run.inv <= 0 || Math.floor(time * 16) % 2 === 0;
  shieldBubble.visible = (run?.shield || 0) > 0;
  shieldBubble.rotation.y += dt * 0.4;
  camera.position.x = T.MathUtils.damp(
    camera.position.x,
    offset + px * (camera.aspect < 1 ? 0.62 : 0.32),
    camera.aspect < 1 ? 9 : 5,
    dt,
  );
  camera.position.y = T.MathUtils.damp(
    camera.position.y,
    5.2 + groundAt(run?.distance || 0) + (run?.y || 0) * 0.2,
    5,
    dt,
  );
  camera.position.z = innerWidth < innerHeight ? 14.4 : 12;
  const speedFeel =
    mode === "play" ? clamp((run.speed - run.mission.speed) / 12, 0, 1) : 0;
  const nextFov = T.MathUtils.damp(camera.fov, 57 + speedFeel * 3, 3, dt);
  if (Math.abs(nextFov - camera.fov) > 0.005) {
    camera.fov = nextFov;
    camera.updateProjectionMatrix();
  }
  $("#wind").style.opacity =
    mode === "play" ? String(0.08 + speedFeel * 0.28) : "0";
  camera.lookAt(
    pathX(20) + px * (camera.aspect < 1 ? 0.5 : 0.2),
    1.8 + groundAt((run?.distance || 0) + 20) + (run?.y || 0) * 0.1,
    -17,
  );
  if (shake > 0) {
    camera.position.x += (Math.random() - 0.5) * shake;
    camera.position.y += (Math.random() - 0.5) * shake;
  }
  for (let p of particles) {
    p.mesh.position.addScaledVector(p.v, dt);
    p.v.y -= 12 * dt;
    p.life -= dt;
    p.mesh.scale.setScalar(Math.max(0.05, p.life * 1.5));
  }
  particles = particles.filter((p) => {
    if (p.life <= 0) {
      cleanup(p.mesh);
      return false;
    }
    return true;
  });
  for (let i = 0; rain.visible && i < rainCount; i++) {
    rainPos[i * 3 + 1] -= dt * 13;
    rainPos[i * 3 + 2] += dt * motion * 0.4;
    if (rainPos[i * 3 + 1] < 0) {
      rainPos[i * 3 + 1] = 22;
      rainPos[i * 3 + 2] = -Math.random() * 70 + 12;
    }
  }
  rain.position.x = offset;
  if (rain.visible) rainGeo.attributes.position.needsUpdate = true;
  skyline.position.x = offset * 0.6;
  sun.position.x = -12 + offset;
  sun.target.position.x = offset;
  fill.position.x = offset;
}
let accumulator = 0;
function frame(now) {
  let real = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (mode === "play") accumulator += real;
  else accumulator = 0;
  let steps = 0;
  while (accumulator >= 1 / 60 && steps++ < 6) {
    stepSimulation(1 / 60);
    accumulator -= 1 / 60;
  }
  update(real, false);
  renderer.render(scene, camera);
  frameCount++;
  fpsTime += real;
  if (fpsTime >= 2) {
    let fps = Math.round(frameCount / fpsTime);
    $("#fps").textContent = fps + " FPS";
    if (settings.quality === "auto" && mode === "play" && fps < 32) {
      slowTime += fpsTime;
      if (slowTime >= 6 && quality !== "low") {
        setQuality("low");
        notice(L("AKICILIK İÇİN GÖRÜNTÜ AYARLANDI"), 2);
      }
    } else slowTime = 0;
    fpsTime = frameCount = 0;
  }
  if (!systemPaused) frameHandle = requestAnimationFrame(frame);
}
let frameHandle = 0;
setQuality(settings.quality === "low" ? "low" : "high");
setStaticText();
showMenu();
$("#loading").hidden = true;
frameHandle = requestAnimationFrame(frame);
// Main menu is interactive now.
platform?.gameReady();
window.addEventListener("error", (e) => {
  platform?.logError();
  if (e.filename?.endsWith("game.js"))
    notice(L("Bir hata oluştu; sayfayı yenileyebilirsin."), 10);
});
