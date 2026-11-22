// KÜLHAT visual layer: stylised low-poly western look.
// Everything here is presentation only. Gameplay, collisions and saves never read it.
// Static scenery is built once per (variant, side, quality) and merged per material,
// so a segment costs about a dozen draw calls and re-dressing a segment allocates nothing.
import * as T from "./vendor/three.module.js";

// ---------------------------------------------------------------- textures
function canvasTex(draw, w, h, repeat = true) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  draw(cv.getContext("2d"), w, h);
  const t = new T.CanvasTexture(cv);
  t.colorSpace = T.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}
// Seeded random keeps generated textures identical between runs and screenshots.
function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
// Grey-scale boards; the material colour tints them, so one texture serves every paint job.
const planks = canvasTex(
  (c, w, h) => {
    const r = rng(7);
    const rows = 8;
    for (let i = 0; i < rows; i++) {
      const v = 200 + Math.floor(r() * 45);
      c.fillStyle = `rgb(${v},${v},${v})`;
      c.fillRect(0, (i * h) / rows, w, h / rows);
      for (let k = 0; k < 26; k++) {
        const g = v - 25 - Math.floor(r() * 30);
        c.fillStyle = `rgba(${g},${g},${g},.35)`;
        c.fillRect(r() * w, (i * h) / rows + r() * (h / rows), 20 + r() * 70, 1);
      }
      c.fillStyle = "rgba(40,30,25,.55)";
      c.fillRect(0, ((i + 1) * h) / rows - 2, w, 2);
      const joint = r() * w;
      c.fillRect(joint, (i * h) / rows, 2, h / rows);
      c.fillStyle = "rgba(30,25,20,.6)";
      c.fillRect(joint - 6, (i * h) / rows + 6, 2, 2);
      c.fillRect(joint + 6, (i * h) / rows + 6, 2, 2);
    }
  },
  256,
  256,
);
const sand = canvasTex(
  (c, w, h) => {
    const r = rng(11);
    c.fillStyle = "#d9c09a";
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const v = 150 + r() * 90;
      c.fillStyle = `rgba(${v + 30},${v + 10},${v - 25},.25)`;
      c.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2);
    }
    for (let i = 0; i < 14; i++) {
      c.fillStyle = "rgba(150,115,80,.10)";
      c.beginPath();
      c.ellipse(r() * w, r() * h, 20 + r() * 40, 6 + r() * 10, r() * 3, 0, 7);
      c.fill();
    }
  },
  256,
  256,
);
sand.repeat.set(60, 60);

// ---------------------------------------------------------------- materials
const matCache = new Map();
function m(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    const p = {
      color,
      roughness: opts.rough ?? 0.85,
      metalness: opts.metal ?? 0,
      flatShading: opts.flat ?? false,
    };
    if (opts.map) p.map = opts.map;
    if (opts.emissive) {
      p.emissive = new T.Color(opts.emissive);
      p.emissiveIntensity = opts.ei ?? 1.2;
    }
    matCache.set(key, new T.MeshStandardMaterial(p));
  }
  return matCache.get(key);
}
const wood = (c) => m(c, { map: planks, rough: 0.92 });
const PAINT = [
  // facade, trim, accent  (saloon, sheriff, store, post, stable, smith, station, inn)
  ["#b5653c", "#f0d9a8", "#7a2f22"],
  ["#c9b48a", "#3f5560", "#8c3a2a"],
  ["#5f8a8b", "#f2e2bb", "#c7843f"],
  ["#d29a5c", "#ffffff", "#2f5f73"],
  ["#9b3b2c", "#f3ead7", "#5a3b26"],
  ["#6e665c", "#cfa66b", "#3a2f28"],
  ["#c48a4c", "#efe3c4", "#3c6a54"],
  ["#8f6a9a", "#f6e2b8", "#c25c3f"],
];

// ---------------------------------------------------------------- geometry helpers
// Box with UVs measured in metres so boards keep their scale on every face.
function mbox(w, h, d) {
  const g = new T.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const sizes = [
    [d, h], [d, h], [w, d], [w, d], [w, h], [w, h],
  ];
  for (let f = 0; f < 6; f++)
    for (let k = 0; k < 4; k++) {
      const i = f * 4 + k;
      uv.setXY(i, (uv.getX(i) * sizes[f][0]) / 2.4, (uv.getY(i) * sizes[f][1]) / 2.4);
    }
  return g;
}
// Collects pieces and merges them per material into a few BufferGeometries.
class Kit {
  constructor() {
    this.parts = new Map();
  }
  add(geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    const mat4 = new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromEuler(new T.Euler(rx, ry, rz)),
      new T.Vector3(sx, sy, sz),
    );
    g.applyMatrix4(mat4);
    if (!this.parts.has(material)) this.parts.set(material, []);
    this.parts.get(material).push(g);
    return this;
  }
  box(w, h, d, material, x, y, z, rx = 0, ry = 0, rz = 0) {
    return this.add(mbox(w, h, d), material, x, y, z, rx, ry, rz);
  }
  build(shadows = true) {
    const out = [];
    for (const [material, list] of this.parts) {
      let count = 0;
      for (const g of list) count += g.attributes.position.count;
      const pos = new Float32Array(count * 3),
        nor = new Float32Array(count * 3),
        uv = new Float32Array(count * 2);
      let o = 0;
      for (const g of list) {
        pos.set(g.attributes.position.array, o * 3);
        nor.set(g.attributes.normal.array, o * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
        o += g.attributes.position.count;
        g.dispose();
      }
      const merged = new T.BufferGeometry();
      merged.setAttribute("position", new T.BufferAttribute(pos, 3));
      merged.setAttribute("normal", new T.BufferAttribute(nor, 3));
      merged.setAttribute("uv", new T.BufferAttribute(uv, 2));
      merged.computeBoundingSphere();
      out.push({ geometry: merged, material, shadows });
    }
    return out;
  }
}
const CYL = (rt, rb, h, s = 10) => new T.CylinderGeometry(rt, rb, h, s);
const SPH = (r, w = 10, h = 8) => new T.SphereGeometry(r, w, h);

// ---------------------------------------------------------------- sign boards
const signCache = new Map();
function signTexture(text, ink, board) {
  const key = text + ink + board;
  if (signCache.has(key)) return signCache.get(key);
  const t = canvasTex(
    (c, w, h) => {
      c.fillStyle = board;
      c.fillRect(0, 0, w, h);
      const r = rng(text.length * 31);
      for (let i = 0; i < 40; i++) {
        c.fillStyle = "rgba(0,0,0,.08)";
        c.fillRect(0, r() * h, w, 1);
      }
      c.strokeStyle = ink;
      c.lineWidth = 6;
      c.strokeRect(10, 10, w - 20, h - 20);
      c.fillStyle = ink;
      let size = 74;
      c.font = `900 ${size}px Georgia, "Times New Roman", serif`;
      while (c.measureText(text).width > w - 70 && size > 24) {
        size -= 2;
        c.font = `900 ${size}px Georgia, "Times New Roman", serif`;
      }
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.shadowColor = "rgba(0,0,0,.35)";
      c.shadowOffsetY = 3;
      c.fillText(text, w / 2, h / 2 + 4);
      for (const x of [34, w - 34]) {
        c.beginPath();
        c.arc(x, h / 2, 7, 0, 7);
        c.fill();
      }
    },
    512,
    128,
    false,
  );
  const material = new T.MeshStandardMaterial({ map: t, roughness: 0.9 });
  signCache.set(key, material);
  return material;
}

// ---------------------------------------------------------------- western buildings
const buildCache = new Map();
// One building, facade facing the street. side: -1 left, +1 right. Local origin = segment.
function westernBuilding(kit, variant, side, z, high, twoStory) {
  const [paint, trim, accent] = PAINT[variant % 8];
  const face = side * 7; // facade plane x
  const depth = 6.2;
  const cx = side * (7 + depth / 2);
  const L = 9.4;
  const H = twoStory ? 6.4 : 4.2;
  const out = side; // +x for right side means "away from street"
  const body = wood(paint),
    trimM = wood(trim),
    accM = m(accent, { rough: 0.7 }),
    dark = m("#2a211c", { rough: 0.95 }),
    glass = m("#2b3c45", { rough: 0.25, metal: 0.2, emissive: "#6b4a22", ei: 0.25 });
  const barn = variant === 4;
  // Main body
  kit.box(depth, H, L, body, cx, H / 2, z);
  if (barn) {
    // Gambrel roof: two pitched pairs.
    kit.add(mbox(depth + 0.6, 0.25, 3.6), wood("#5b3a28"), cx, H + 0.55, z - 3.2, 0.95, 0, 0);
    kit.add(mbox(depth + 0.6, 0.25, 3.6), wood("#5b3a28"), cx, H + 0.55, z + 3.2, -0.95, 0, 0);
    kit.add(mbox(depth + 0.6, 0.25, 2.8), wood("#5b3a28"), cx, H + 2.0, z - 1.25, 0.35, 0, 0);
    kit.add(mbox(depth + 0.6, 0.25, 2.8), wood("#5b3a28"), cx, H + 2.0, z + 1.25, -0.35, 0, 0);
    // Gable wall filling the roof triangle on the street side.
    kit.add(CYL(0.01, 4.6, 2.6, 4), body, face - out * 0.05, H + 1.2, z, 0, Math.PI / 4, 0, 0.05, 1, 1);
    // Big doors with white X braces.
    kit.box(0.2, 3.2, 3.6, accM, face - out * 0.1, 1.6, z);
    for (const s of [-1, 1])
      kit.box(0.08, 0.2, 4.6, trimM, face - out * 0.22, 1.6, z, s * 0.72, 0, 0);
    kit.box(0.1, 0.25, 3.8, trimM, face - out * 0.22, 3.3, z);
    kit.box(0.2, 1.1, 1.1, dark, face - out * 0.12, H + 0.7, z);
    // Hay bales
    if (high)
      for (const [dz, y] of [[-3.6, 0.45], [-2.6, 0.45], [-3.1, 1.3]])
        kit.add(CYL(0.55, 0.55, 1.1, 10), m("#d9b45f", { rough: 1 }), face - out * 1.2, y, z + dz, 0, 0, Math.PI / 2);
    return;
  }
  // Pitched roof hidden behind the false front.
  kit.add(mbox(depth + 0.4, 0.22, L + 0.4), wood("#5d4636"), cx + out * 0.4, H + 0.55, z, 0, 0, -out * 0.18);
  // False front, the western silhouette.
  const FH = H + 1.5 + (variant % 3) * 0.35;
  kit.box(0.3, FH, L + 0.2, body, face + out * 0.1, FH / 2, z);
  const step = variant % 3;
  if (step === 0) {
    kit.box(0.32, 0.7, L * 0.5, body, face + out * 0.1, FH + 0.35, z);
    kit.box(0.42, 0.18, L * 0.5 + 0.3, trimM, face + out * 0.05, FH + 0.75, z);
  } else if (step === 1) {
    kit.add(CYL(L * 0.28, L * 0.28, 0.3, 14), body, face + out * 0.1, FH - 0.6, z, 0, 0, Math.PI / 2, 1, 1, 0.55);
  } else {
    for (const s of [-1, 1]) kit.box(0.32, 0.5, 1.4, body, face + out * 0.1, FH + 0.25, z + s * (L / 2 - 0.7));
  }
  kit.box(0.42, 0.22, L + 0.5, trimM, face + out * 0.02, FH - 0.05, z);
  kit.box(0.4, 0.12, L + 0.4, accM, face + out * 0.02, FH - 0.3, z);
  for (const s of [-1, 1]) kit.box(0.4, FH, 0.22, trimM, face, FH / 2, z + s * (L / 2 + 0.05));
  // Ground floor: door + windows
  const doorZ = z + (variant % 2 ? 0 : -1.2);
  kit.box(0.14, 2.5, 1.5, trimM, face - out * 0.02, 1.25, doorZ);
  kit.box(0.16, 2.3, 1.25, dark, face - out * 0.05, 1.15, doorZ);
  if (variant === 0) {
    // Saloon batwing doors
    for (const s of [-1, 1]) kit.box(0.08, 0.95, 0.58, wood("#c99b5e"), face - out * 0.3, 1.25, doorZ + s * 0.31, 0, s * out * 0.25, 0);
  }
  for (const dz of [-3.1, 2.6]) {
    if (Math.abs(z + dz - doorZ) < 1.4) continue;
    const wz = z + dz;
    kit.box(0.14, 1.75, 1.75, trimM, face - out * 0.02, 1.85, wz);
    kit.box(0.16, 1.45, 1.45, glass, face - out * 0.06, 1.85, wz);
    kit.box(0.18, 0.08, 1.5, trimM, face - out * 0.08, 1.85, wz);
    kit.box(0.18, 1.5, 0.08, trimM, face - out * 0.08, 1.85, wz);
    if (high)
      for (const s of [-1, 1]) kit.box(0.08, 1.6, 0.55, accM, face - out * 0.08, 1.85, wz + s * 1.2);
  }
  // Upper floor windows + balcony
  if (twoStory) {
    for (const dz of [-2.8, 0, 2.8]) {
      kit.box(0.14, 1.4, 1.1, trimM, face - out * 0.02, 4.6, z + dz);
      kit.box(0.16, 1.15, 0.85, glass, face - out * 0.06, 4.6, z + dz);
    }
  }
  // Porch: boardwalk, posts, awning (doubles as balcony when two storeys).
  const px = side * 5.45;
  const deck = wood("#8a6845");
  kit.box(1.9, 0.22, L + 0.4, deck, side * 6.05, 0.11, z);
  const awnY = 3.05;
  for (const dz of high ? [-L / 2, -L / 6, L / 6, L / 2] : [-L / 2, L / 2])
    kit.box(0.2, awnY, 0.2, wood("#6e5139"), px, awnY / 2, z + dz);
  if (twoStory) {
    kit.box(2.2, 0.2, L + 0.4, deck, side * 6.0, awnY + 0.1, z);
    kit.box(0.08, 0.08, L + 0.4, trimM, px, awnY + 1.05, z);
    if (high)
      for (let dz = -L / 2; dz <= L / 2 + 0.01; dz += 0.6)
        kit.box(0.06, 0.9, 0.06, trimM, px, awnY + 0.6, z + dz);
  } else {
    kit.add(mbox(2.3, 0.14, L + 0.6), wood("#7b5233"), side * 6.1, awnY + 0.2, z, 0, 0, side * 0.2);
    kit.box(0.12, 0.3, L + 0.6, accM, side * 5.0, awnY - 0.02, z);
  }
  // Hitching rail at the street edge.
  for (const dz of [-1.8, 1.8]) kit.box(0.16, 1.0, 0.16, wood("#6b4b33"), side * 5.15, 0.5, z + 3.3 + dz * 0.5);
  kit.box(0.12, 0.12, 2.2, wood("#7d5a3e"), side * 5.15, 0.95, z + 3.3);
  // Props
  const barrel = CYL(0.4, 0.36, 1.0, 12);
  kit.add(barrel, wood("#9a6136"), side * 6.4, 0.6, z - L / 2 + 0.6);
  kit.add(CYL(0.42, 0.42, 0.06, 12), m("#3d342c", { metal: 0.6, rough: 0.5 }), side * 6.4, 0.85, z - L / 2 + 0.6);
  if (high) {
    kit.add(barrel, wood("#8a5530"), side * 6.5, 0.6, z - L / 2 + 1.5);
    kit.box(0.8, 0.8, 0.8, wood("#b08455"), side * 6.4, 0.62, z + L / 2 - 0.7, 0, 0.3, 0);
    kit.box(0.6, 0.6, 0.6, wood("#a07448"), side * 6.4, 1.32, z + L / 2 - 0.8, 0, -0.2, 0);
    // Wanted poster
    kit.box(0.04, 0.7, 0.55, m("#efe0bd", { rough: 1 }), face - out * 0.18, 2.0, z + (variant % 2 ? 1.6 : 0.7));
    // Bench
    kit.box(0.5, 0.08, 1.8, wood("#7a5536"), side * 6.6, 0.55, z + 1.6);
    for (const s of [-1, 1]) kit.box(0.4, 0.45, 0.08, wood("#5c3f29"), side * 6.6, 0.33, z + 1.6 + s * 0.8);
  }
  // Specials
  if (variant === 5) {
    kit.add(CYL(0.45, 0.55, 3.0, 8), m("#5a504a", { flat: true }), cx + out * 1.4, H + 1.6, z + 2.5);
    kit.box(0.9, 0.45, 0.45, m("#3b3b3d", { metal: 0.8, rough: 0.4 }), side * 6.3, 0.9, z + 1.2);
    kit.box(0.3, 0.5, 0.3, m("#3b3b3d", { metal: 0.8, rough: 0.4 }), side * 6.3, 0.45, z + 1.2);
  }
  if (variant === 6 && high) {
    const tx = side * 12.5,
      tz = z - L / 2 - 1.8;
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]])
      kit.box(0.22, 7, 0.22, wood("#5b4130"), tx + ax * 1.1, 3.5, tz + az * 1.1, az * 0.05, 0, -ax * 0.05);
    kit.add(CYL(1.8, 1.8, 2.6, 14), wood("#8e6542"), tx, 8.2, tz);
    kit.add(new T.ConeGeometry(2.0, 1.1, 14), wood("#5b3a28"), tx, 10.05, tz);
    for (const y of [7.3, 9.1]) kit.add(CYL(1.83, 1.83, 0.1, 14), m("#2f2a26", { metal: 0.6 }), tx, y, tz);
  }
}
function signFor(kit, text, variant, side, z, twoStory) {
  if (!text) return null;
  const [, trim, accent] = PAINT[variant % 8];
  const H = twoStory ? 6.4 : 4.2;
  const material = signTexture(text, variant === 4 ? "#f3ead7" : accent, trim);
  const g = new T.PlaneGeometry(6.4, 1.6);
  g.rotateY(-side * Math.PI / 2);
  g.translate(side * 6.78, variant === 4 ? H + 0.3 : H + 0.6, z);
  return { geometry: g, material, shadows: false };
}
function alley(kit, variant, side, z, high) {
  // Small fence and crates between buildings; keeps the street from looking hollow.
  const f = wood("#8c6a48");
  kit.box(0.12, 1.2, 4.2, f, side * 7.2, 0.6, z);
  for (const dz of [-2, 0, 2]) kit.box(0.18, 1.5, 0.18, wood("#6c4f37"), side * 7.2, 0.75, z + dz);
  if (high && variant % 2 === 0) {
    kit.box(0.9, 0.9, 0.9, wood("#b88d5c"), side * 6.4, 0.45, z - 1.1, 0, 0.4, 0);
    kit.add(CYL(0.12, 0.12, 0.9, 8), m("#a9a49a", { metal: 0.3 }), side * 6.4, 0.45, z + 1.2, 0, 0, Math.PI / 2);
  }
  // Wagon wheel leaning on the fence
  if (high) {
    kit.add(new T.TorusGeometry(0.6, 0.06, 6, 16), wood("#5f3f28"), side * 7.0, 0.62, z + 1.1, 0, Math.PI / 2, 0.15 * side);
    for (let k = 0; k < 4; k++)
      kit.box(0.05, 1.15, 0.05, wood("#6b4a30"), side * 7.0, 0.62, z + 1.1, (k * Math.PI) / 4, 0, 0.15 * side);
  }
}
function cactus(kit, x, z, s, high) {
  const g = m("#5d7d3e", { rough: 0.9, flat: true });
  kit.add(CYL(0.24 * s, 0.28 * s, 2.4 * s, 8), g, x, 1.2 * s, z);
  kit.add(SPH(0.24 * s, 8, 6), g, x, 2.4 * s, z);
  if (!high) return;
  for (const k of [-1, 1]) {
    const ax = x + k * 0.5 * s,
      ay = (1.1 + (k > 0 ? 0.35 : 0)) * s;
    kit.add(CYL(0.16 * s, 0.16 * s, 0.5 * s, 7), g, x + k * 0.27 * s, ay, z, 0, 0, Math.PI / 2);
    kit.add(CYL(0.16 * s, 0.16 * s, 0.9 * s, 7), g, ax, ay + 0.42 * s, z);
    kit.add(SPH(0.16 * s, 7, 5), g, ax, ay + 0.87 * s, z);
  }
}
function rock(kit, x, y, z, s, color) {
  kit.add(new T.DodecahedronGeometry(1, 0), m(color, { flat: true, rough: 1 }), x, y, z, s, s * 2, 0, s * 1.3, s * 0.8, s);
}
export function westernStreetParts(variant, quality, signText) {
  const key = variant + ":" + quality + ":" + signText;
  if (buildCache.has(key)) return buildCache.get(key);
  const high = quality !== "low";
  const kit = new Kit();
  const signs = [];
  for (const side of [-1, 1]) {
    // Ground: sidewalk dirt and the desert beyond.
    kit.box(7.2, 0.2, 28, m("#c7a77b", { map: sand, rough: 1 }), side * 8.9, -0.12, -14);
    const slots = high ? [-6.5, -20.5] : [-13.5];
    slots.forEach((z, i) => {
      const v = (variant + i * 3 + (side > 0 ? 5 : 0)) % 8;
      const two = v === 0 || v === 7 || v === 6 || (v === 2 && side > 0);
      westernBuilding(kit, v, side, z, high, two);
      const s = signFor(kit, i === 0 && side < 0 ? signText : SIGN_DEFAULTS[v], v, side, z, two);
      if (s) signs.push(s);
    });
    if (high) alley(kit, variant, side, -13.5, high);
    // Desert dressing behind the facades.
    cactus(kit, side * (16 + (variant % 3)), -9 - (variant % 4) * 3, 1.2, high);
    if (high) {
      cactus(kit, side * (19.5 + (variant % 2) * 2), -22, 0.9, high);
      rock(kit, side * 15.5, 0.3, -2.5, 0.7, "#a8805b");
      rock(kit, side * 18, 0.4, -15, 1.0, "#b58c64");
    }
  }
  // Wheel ruts and hoof-worn centre; the playable road stays clear.
  for (const x of [-3.9, -2.5, 2.5, 3.9]) kit.box(0.35, 0.02, 28, m("#9a7a54", { rough: 1 }), x, 0.0, -14);
  const parts = kit.build(high).concat(signs);
  buildCache.set(key, parts);
  return parts;
}
let SIGN_DEFAULTS = [];
export function setSignNames(list) {
  SIGN_DEFAULTS = list;
}
export function trailParts(variant, quality) {
  const key = "trail:" + variant + ":" + quality;
  if (buildCache.has(key)) return buildCache.get(key);
  const high = quality !== "low";
  const kit = new Kit();
  const r = rng(variant * 97 + 3);
  for (const side of [-1, 1]) {
    kit.box(7.2, 0.2, 28, m("#b9a47f", { map: sand, rough: 1 }), side * 8.9, -0.12, -14);
    // Layered sandstone cliffs.
    for (const z of high ? [-5, -15, -24] : [-14]) {
      const h = 6 + r() * 6;
      const x = side * (12 + r() * 2);
      const layers = ["#b4774e", "#c98d5d", "#a96a45", "#d3a26f"];
      for (let k = 0; k < 4; k++) {
        const w = 6.5 - k * 0.9 + r();
        kit.add(CYL(w * 0.48, w * 0.55, h / 4, 7), m(layers[(k + variant) % 4], { flat: true, rough: 1 }), x, (k + 0.5) * (h / 4), z, 0, r() * 3, 0, 1, 1, 1.25);
      }
    }
    // Fence posts and rails along the trail.
    for (let z = -2; z > -28; z -= 4.5) kit.box(0.16, 1.2, 0.16, wood("#7a6046"), side * 5.8, 0.6, z);
    kit.box(0.1, 0.1, 28, wood("#a58a66"), side * 5.8, 1.0, -14);
    if (high) kit.box(0.1, 0.1, 28, wood("#a58a66"), side * 5.8, 0.55, -14);
    // Pines on the far side, scrub on the near side.
    for (const z of high ? [-3, -11, -19, -26] : [-12]) {
      const px = side * (8 + r() * 2.5),
        s = 0.8 + r() * 0.6;
      kit.add(CYL(0.12 * s, 0.16 * s, 1.2 * s, 6), wood("#5d4330"), px, 0.6 * s, z);
      for (let k = 0; k < 3; k++)
        kit.add(new T.ConeGeometry((1.2 - k * 0.3) * s, 1.5 * s, 7), m(["#3f6b45", "#4b7a4d", "#577f50"][k], { flat: true }), px, (1.4 + k * 0.85) * s, z);
    }
    if (high) {
      rock(kit, side * 6.6, 0.25, -8, 0.45, "#9f8467");
      rock(kit, side * 7.1, 0.3, -21, 0.6, "#a88b6b");
    }
  }
  for (const x of [-2.2, 2.2]) kit.box(0.4, 0.02, 28, m("#8f7553", { rough: 1 }), x, 0.0, -14);
  const parts = kit.build(high);
  buildCache.set(key, parts);
  return parts;
}
export function partsToGroup(parts, group) {
  for (const p of parts) {
    const mesh = new T.Mesh(p.geometry, p.material);
    mesh.castShadow = p.shadows;
    mesh.receiveShadow = true;
    mesh.matrixAutoUpdate = false;
    mesh.userData.visualPart = true;
    group.add(mesh);
  }
}

// ---------------------------------------------------------------- sky + horizon
export function createSky(scene) {
  const uniforms = {
    top: { value: new T.Color("#5f93bf") },
    horizon: { value: new T.Color("#e9c89a") },
    ground: { value: new T.Color("#b58f68") },
    sunDir: { value: new T.Vector3(-0.28, 0.24, -0.93).normalize() },
    sunColor: { value: new T.Color("#fff0cf") },
  };
  const mat = new T.ShaderMaterial({
    uniforms,
    side: T.BackSide,
    depthWrite: false,
    fog: false,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `uniform vec3 top; uniform vec3 horizon; uniform vec3 ground; uniform vec3 sunDir; uniform vec3 sunColor; varying vec3 vDir;
      void main(){ float y = vDir.y; vec3 c = y > 0.0 ? mix(horizon, top, pow(clamp(y*1.6,0.0,1.0), 0.7)) : mix(horizon, ground, clamp(-y*6.0,0.0,1.0));
      float s = max(dot(normalize(vDir), sunDir), 0.0); c += sunColor * (pow(s, 600.0) * 1.6 + pow(s, 12.0) * 0.28);
      gl_FragColor = vec4(c, 1.0);
      #include <colorspace_fragment>
      }`,
  });
  const mesh = new T.Mesh(new T.SphereGeometry(400, 32, 16), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -10;
  scene.add(mesh);
  const tmp = new T.Color();
  return {
    mesh,
    update(camera, horizonColor, mood) {
      mesh.position.copy(camera.position);
      uniforms.horizon.value.copy(horizonColor);
      const target =
        mood === "mine" ? "#2a241d" : mood === "trail" ? "#6f9ec4" : "#5c90bf";
      uniforms.top.value.lerp(tmp.set(target), 0.05);
      uniforms.ground.value.copy(horizonColor).multiplyScalar(0.82);
    },
  };
}
// Distant mesas and buttes replace the cone mountains.
export function fillHorizon(group, landscape) {
  const r = rng(landscape === "trail" ? 5 : 19);
  const western = landscape !== "trail";
  const cols = western
    ? ["#c58a5f", "#b77b54", "#d19b6c", "#a96f4c"]
    : ["#8f9a9e", "#9fa7a3", "#7f8d93", "#b0ad9d"];
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const x = side * (35 + r() * 110),
      z = -90 - r() * 170,
      h = western ? 12 + r() * 26 : 25 + r() * 45,
      w = 10 + r() * 26;
    const g = new T.Group();
    if (western) {
      // Mesa: stacked bands with a flat cap.
      const bands = 3;
      for (let k = 0; k < bands; k++) {
        const mesh = new T.Mesh(
          new T.CylinderGeometry(w * (0.55 - k * 0.07), w * (0.62 - k * 0.07), h / bands, 7),
          m(cols[(i + k) % 4], { flat: true, rough: 1 }),
        );
        mesh.position.y = (k + 0.5) * (h / bands);
        mesh.scale.z = 0.55 + r() * 0.4;
        mesh.rotation.y = r() * 3;
        g.add(mesh);
      }
    } else {
      const mesh = new T.Mesh(new T.ConeGeometry(w, h, 6), m(cols[i % 4], { flat: true, rough: 1 }));
      mesh.position.y = h / 2;
      g.add(mesh);
      const cap = new T.Mesh(new T.ConeGeometry(w * 0.32, h * 0.32, 6), m("#f2f1ea", { flat: true }));
      cap.position.y = h * 0.84;
      g.add(cap);
    }
    g.position.set(x, -3, z);
    group.add(g);
  }
  // Soft cloud puffs.
  for (let i = 0; i < 9; i++) {
    const c = new T.Group();
    const n = 3 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const s = new T.Mesh(SPH(4 + r() * 4, 9, 6), m("#fff7ec", { rough: 1, emissive: "#f6e3c8", ei: 0.55, flat: true }));
      s.position.set(k * 5 - n * 2.5, r() * 2, r() * 3);
      s.scale.y = 0.55;
      c.add(s);
    }
    c.position.set((r() - 0.5) * 260, 55 + r() * 30, -150 - r() * 120);
    c.userData.drift = 0.6 + r();
    c.userData.cloud = true;
    group.add(c);
  }
}
// Desert floor beyond the sidewalks; split in two so it never covers the track or the mine.
export function createDesertFloor(scene) {
  const g = new T.Group();
  for (const side of [-1, 1]) {
    const geo = new T.PlaneGeometry(300, 420);
    geo.rotateX(-Math.PI / 2);
    const mesh = new T.Mesh(geo, m("#cfb088", { map: sand, rough: 1 }));
    mesh.position.set(side * (12.4 + 150), -0.25, -150);
    mesh.receiveShadow = true;
    g.add(mesh);
  }
  scene.add(g);
  return g;
}

// ---------------------------------------------------------------- courier
// Cowboy courier: hat, duster coat, bandana, glowing cargo satchel.
// Keeps the rig contract game.js animates: arms[2], legs[2] pivot at shoulders/hips, weapon mesh.
export function buildCourier(body, suit, armor, accent) {
  const skin = m("#c98d63", { rough: 0.7 }),
    leather = m("#5a3a26", { rough: 0.75 }),
    // Own material (not the shared cache): costumes recolour the hat.
    hatM = m("#6b4428", { rough: 0.85 }).clone(),
    hair = m("#3b2516", { rough: 0.9 }),
    denim = m("#3d4d63", { rough: 0.9 }),
    bootM = m("#3a2619", { rough: 0.6 }),
    brass = m("#d6a24a", { metal: 0.8, rough: 0.35 }),
    glowM = m("#ffd27a", { emissive: "#ffae3d", ei: 1.6, rough: 0.4 });
  const add = (geo, material, x, y, z, parent) => {
    const o = new T.Mesh(geo, material);
    o.position.set(x, y, z);
    o.castShadow = true;
    parent.add(o);
    return o;
  };
  const group = (parent, x = 0, y = 0, z = 0) => {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  };
  // Rig: body (feet) → hips (bob) → chest (lean/twist, pivots at the hip joint).
  // `upper` undoes the hip height so upper-body parts keep model-space coordinates.
  const HIP = 1.05;
  const hips = group(body),
    chest = group(hips, 0, HIP, 0),
    upper = group(chest, 0, -HIP, 0);
  // Torso: duster coat over a vest.
  const torso = add(new T.CapsuleGeometry(0.42, 0.55, 4, 10), suit, 0, 1.55, 0, upper);
  torso.scale.set(1.05, 1, 0.78);
  add(new T.CapsuleGeometry(0.36, 0.5, 4, 10), armor, 0, 1.6, -0.12, upper).scale.set(0.95, 1, 0.6);
  // Shoulder cape: gives the back a readable western silhouette.
  const cape = add(new T.CylinderGeometry(0.36, 0.62, 0.34, 14, 1, true), suit, 0, 1.94, 0.02, upper);
  cape.material = suit;
  cape.scale.z = 0.8;
  // Coat tails hinge at the waist so they can flap behind a running courier.
  const tails = [];
  for (const s of [-1, 1]) {
    const hinge = group(upper, s * 0.2, 1.38, 0.26);
    const tail = add(new T.BoxGeometry(0.42, 0.95, 0.07), suit, 0, -0.46, 0, hinge);
    tail.rotation.z = s * 0.1;
    hinge.userData.side = s;
    tails.push(hinge);
  }
  // Belt + buckle + holster
  add(new T.CylinderGeometry(0.43, 0.43, 0.12, 14), leather, 0, 1.12, 0, upper).scale.z = 0.8;
  add(new T.BoxGeometry(0.16, 0.12, 0.05), brass, 0, 1.12, -0.35, upper);
  add(new T.BoxGeometry(0.14, 0.3, 0.12), leather, 0.4, 1.0, 0.05, upper);
  // Cargo satchel with a glowing seal and crossed straps.
  add(new T.BoxGeometry(0.62, 0.5, 0.32), leather, 0, 1.6, 0.42, upper);
  add(new T.BoxGeometry(0.64, 0.12, 0.34), accent, 0, 1.78, 0.42, upper);
  add(new T.SphereGeometry(0.08, 10, 8), glowM, 0, 1.62, 0.6, upper);
  for (const s of [-1, 1]) add(new T.BoxGeometry(0.08, 0.7, 0.06), leather, s * 0.24, 1.75, 0.18, upper).rotation.x = -0.3;
  // Head: neck, face, bandana, hair, hat.
  const headPivot = group(upper, 0, 1.98, 0);
  add(new T.CylinderGeometry(0.17, 0.2, 0.18, 10), skin, 0, -0.03, 0, headPivot);
  const head = add(new T.SphereGeometry(0.3, 14, 12), skin, 0, 0.22, -0.02, headPivot);
  head.scale.set(0.95, 1.05, 0.95);
  add(new T.CylinderGeometry(0.31, 0.27, 0.24, 14, 1, true, Math.PI / 2, Math.PI), armor, 0, 0.1, -0.03, headPivot).material.side = T.DoubleSide;
  add(new T.SphereGeometry(0.31, 12, 8, Math.PI * 1.5, Math.PI, 0, Math.PI * 0.62), hair, 0, 0.24, 0.0, headPivot);
  // Short ponytail under the hat: moves with the run and reads from behind.
  const pony = group(headPivot, 0, 0.2, 0.27);
  add(new T.CapsuleGeometry(0.07, 0.22, 3, 6), hair, 0, -0.14, 0.03, pony);
  const hat = group(headPivot, 0, 0.44, -0.02);
  hat.rotation.x = -0.08;
  const brim = add(new T.CylinderGeometry(0.62, 0.62, 0.05, 20), hatM, 0, 0, 0, hat);
  brim.scale.z = 0.9;
  add(new T.TorusGeometry(0.58, 0.05, 6, 20), hatM, 0, 0.03, 0, hat).rotation.x = Math.PI / 2;
  const crown = add(new T.CylinderGeometry(0.27, 0.33, 0.36, 14), hatM, 0, 0.2, 0, hat);
  crown.scale.z = 0.92;
  add(new T.CylinderGeometry(0.335, 0.335, 0.08, 14), accent, 0, 0.07, 0, hat).scale.z = 0.92;
  add(new T.SphereGeometry(0.26, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), hatM, 0, 0.36, 0, hat).scale.set(1, 0.35, 0.92);
  // Scarf: a short chain behind the neck in the accent colour, the most visible
  // moving part from the chase camera.
  const scarf = [];
  let link = group(headPivot, 0, 0.0, 0.2);
  add(new T.SphereGeometry(0.14, 10, 8), accent, 0, 0, -0.02, link).scale.set(1.6, 0.7, 0.9);
  for (let i = 0; i < 4; i++) {
    const seg = group(link, 0, 0, i === 0 ? 0.06 : 0.2);
    add(new T.BoxGeometry(0.26 - i * 0.03, 0.07, 0.24), accent, 0, 0, 0.1, seg);
    scarf.push(seg);
    link = seg;
  }
  // Costume accessories, each readable from the chase camera (see setCostumeStyle).
  const extras = {};
  {
    // Ember: bandolier slung across the back over the satchel.
    const b = group(upper, 0, 1.56, 0.62);
    b.rotation.z = -0.72;
    add(new T.BoxGeometry(0.14, 1.3, 0.05), leather, 0, 0, 0, b);
    for (let k = 0; k < 7; k++)
      add(new T.CylinderGeometry(0.035, 0.035, 0.16, 6), brass, 0, -0.48 + k * 0.16, 0.04, b).rotation.z = Math.PI / 2;
    extras.bandolier = b;
    // Sage: striped wool poncho over the shoulders.
    const p = group(upper, 0, 1.74, 0.02);
    const wool = m("#7d6442", { rough: 1 }),
      stripe = m("#c9a46a", { rough: 1 });
    const cone = add(new T.CylinderGeometry(0.42, 0.8, 0.78, 14, 1, true), wool, 0, 0, 0, p);
    cone.material.side = T.DoubleSide;
    cone.scale.z = 0.88;
    for (const y of [-0.22, -0.3])
      add(new T.CylinderGeometry(0.74 + (y + 0.22) * -0.4, 0.75 + (y + 0.22) * -0.4, 0.04, 14, 1, true), stripe, 0, y, 0, p).scale.z = 0.88;
    extras.poncho = p;
    // Violet: a tall feather in the hat band.
    const f = group(hat, 0.26, 0.12, 0.16);
    f.rotation.set(0.5, 0, -0.35);
    add(new T.CapsuleGeometry(0.05, 0.5, 3, 6), accent, 0, 0.3, 0, f).scale.set(0.6, 1, 1.6);
    extras.feather = f;
    // Ivory: a brass star on the back of the shoulder cape.
    const shape = new T.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 ? 0.09 : 0.21,
        a = (i / 10) * Math.PI * 2 + Math.PI / 2;
      i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const star = new T.Mesh(new T.ShapeGeometry(shape), brass);
    star.position.set(0, 1.9, 0.5);
    star.rotation.x = -0.35;
    upper.add(star);
    extras.star = star;
    // Crimson: a sash at the waist with long tails that trail behind.
    const sash = group(upper, 0, 0, 0);
    add(new T.CylinderGeometry(0.455, 0.455, 0.16, 14), accent, 0, 1.24, 0, sash).scale.z = 0.82;
    extras.sashTails = [];
    for (const side of [-1, 1]) {
      const hinge = group(sash, side * 0.12, 1.22, 0.38);
      add(new T.BoxGeometry(0.14, 0.85, 0.03), accent, 0, -0.42, 0, hinge);
      hinge.userData.side = side * 2;
      extras.sashTails.push(hinge);
    }
    extras.sash = sash;
  }
  const arms = [],
    legs = [],
    knees = [],
    elbows = [];
  for (const s of [-1, 1]) {
    // Leg: hip joint → thigh → knee joint → shin + boot.
    const leg = group(hips, s * 0.2, HIP, 0);
    add(new T.CapsuleGeometry(0.135, 0.4, 3, 8), denim, 0, -0.25, 0, leg);
    const knee = group(leg, 0, -0.5, 0);
    add(new T.CapsuleGeometry(0.12, 0.3, 3, 8), denim, 0, -0.17, 0.01, knee);
    add(new T.CylinderGeometry(0.15, 0.14, 0.3, 10), bootM, 0, -0.3, 0.02, knee);
    add(new T.BoxGeometry(0.24, 0.12, 0.42), bootM, 0, -0.47, -0.08, knee);
    add(new T.TorusGeometry(0.05, 0.015, 4, 8), brass, 0, -0.44, 0.18, knee).rotation.y = Math.PI / 2;
    legs.push(leg);
    knees.push(knee);
    // Arm: shoulder → upper arm → elbow → forearm + glove.
    const arm = group(upper, s * 0.5, 1.9, 0);
    add(new T.CapsuleGeometry(0.12, 0.3, 3, 8), suit, 0, -0.2, 0, arm);
    const elbow = group(arm, 0, -0.42, 0);
    add(new T.CapsuleGeometry(0.1, 0.26, 3, 8), suit, 0, -0.16, 0, elbow);
    add(new T.SphereGeometry(0.11, 8, 6), leather, 0, -0.38, 0, elbow);
    arms.push(arm);
    elbows.push(elbow);
  }
  // Revolver in the right glove, barrel continuing the forearm line so that
  // raising the arm points it down the street. weapon = barrel (game.js tints it).
  const gun = group(elbows[1], 0, -0.4, -0.02);
  add(new T.BoxGeometry(0.1, 0.12, 0.24), m("#6e432a", { rough: 0.6 }), 0, 0.02, 0.06, gun);
  add(new T.CylinderGeometry(0.1, 0.1, 0.15, 8), m("#3f454a", { metal: 0.85, rough: 0.3 }), 0, -0.1, 0, gun);
  const weapon = add(new T.CylinderGeometry(0.05, 0.05, 0.5, 10), m("#59656e", { metal: 0.8, rough: 0.3 }).clone(), 0, -0.4, 0, gun);
  const muzzle = group(gun, 0, -0.7, 0);
  return {
    arms, legs, knees, elbows, weapon, head, torso,
    hips, chest, headPivot, hat, tails: [...tails, ...extras.sashTails], scarf, pony, muzzle,
    extras, hatMat: hatM,
    phase: 0, squash: 0, wasAir: false, fireAt: -9,
  };
}

// Costume look: hat colour plus one signature accessory per costume.
const COSTUME_STYLE = {
  courier: { hat: "#6b4428" },
  ember: { hat: "#4f2a1a", extra: "bandolier" },
  sage: { hat: "#5e5a3c", extra: "poncho" },
  violet: { hat: "#1f1a26", extra: "feather" },
  ivory: { hat: "#e6dbc0", extra: "star" },
  crimson: { hat: "#3a1d1d", extra: "sash" },
};
export function setCostumeStyle(c, id) {
  const style = COSTUME_STYLE[id] || COSTUME_STYLE.courier;
  c.hatMat.color.set(style.hat);
  for (const [name, node] of Object.entries(c.extras))
    if (!Array.isArray(node)) node.visible = name === style.extra;
}

// Pose the courier for this frame. Presentation only: the simulation never reads
// any of it. `st` = {mode, time, speed, y, vy, slide, holding, lean}.
export function animateCourier(c, body, st, dt) {
  const k = 1 - Math.exp(-16 * dt),
    soft = 1 - Math.exp(-7 * dt);
  const to = (o, key, v, f = k) => (o[key] += (v - o[key]) * f);
  const running = st.mode === "play",
    air = running && st.y > 0.05,
    slide = running && st.slide > 0,
    aiming = running && (st.holding || st.time - c.fireAt < 0.35);
  if (running) c.phase += dt * Math.min(15, Math.max(9, (st.speed || 20) * 0.6));
  else c.phase += dt * 1.6;
  if (c.wasAir && !air && running) c.squash = 1;
  c.wasAir = air;
  c.squash = Math.max(0, c.squash - dt * 5);
  const p = c.phase,
    s = Math.sin(p),
    co = Math.cos(p);
  // Targets for each joint; positive x rotation swings a limb forward.
  let thigh = [0, 0], knee = [-0.05, -0.05], shoulder = [0.05, 0.05], elbow = [0.2, 0.2],
    hipY = 0, chestX = 0, chestY = 0, bodyX = 0, bodyZ = 0, spread = 0;
  if (!running) {
    // Idle: relaxed stance with breathing.
    const b = Math.sin(st.time * 1.8);
    hipY = b * 0.012;
    chestX = -0.03 + b * 0.015;
    shoulder = [0.05 + b * 0.03, 0.05 - b * 0.03];
    elbow = [0.25, 0.25];
    knee = [-0.08, -0.08];
    thigh = [0.04, 0.04];
  } else if (slide) {
    // Baseball slide: lean back on the trailing leg, lead leg forward.
    bodyX = 0.95;
    hipY = -0.08;
    chestX = -0.55;
    thigh = [1.55, 0.75];
    knee = [-0.1, -1.7];
    shoulder = [-0.9, 0.6];
    elbow = [0.1, 0.9];
    spread = 0.35;
  } else if (air) {
    // Tuck on the way up, reach for the ground on the way down.
    const rising = (st.vy || 0) > 0;
    chestX = -0.12;
    thigh = rising ? [1.05, 0.25] : [0.55, -0.1];
    knee = rising ? [-1.5, -0.9] : [-0.6, -0.35];
    shoulder = [-0.7, -0.5];
    elbow = [0.7, 0.7];
    spread = 0.45;
  } else {
    // Sprint cycle with knee lift on the recovery swing and a hip bob per step.
    thigh = [s * 0.95, -s * 0.95];
    knee = [-(0.15 + 1.3 * Math.max(0, co)), -(0.15 + 1.3 * Math.max(0, -co))];
    shoulder = [-s * 0.85, s * 0.85];
    elbow = [1.25 + s * 0.25, 1.25 - s * 0.25];
    hipY = -0.04 + 0.09 * Math.abs(co);
    chestX = -0.24;
    chestY = s * 0.12;
  }
  if (aiming) {
    shoulder[1] = 1.5;
    elbow[1] = 0.02;
    chestY = -0.18;
  }
  hipY -= c.squash * 0.14;
  bodyZ = st.lean || 0;
  for (let i = 0; i < 2; i++) {
    to(c.legs[i].rotation, "x", thigh[i]);
    to(c.knees[i].rotation, "x", knee[i]);
    to(c.arms[i].rotation, "x", shoulder[i], i === 1 && aiming ? 0.6 : k);
    to(c.arms[i].rotation, "z", (i ? -1 : 1) * spread);
    to(c.elbows[i].rotation, "x", elbow[i]);
  }
  to(c.hips.position, "y", hipY);
  to(c.chest.rotation, "x", chestX, soft);
  to(c.chest.rotation, "y", chestY);
  to(c.headPivot.rotation, "y", -chestY * 0.7);
  to(c.headPivot.rotation, "x", -chestX * 0.6, soft);
  to(body.rotation, "x", bodyX, soft);
  to(body.position, "z", bodyX * -0.55, soft);
  to(body.rotation, "z", bodyZ, 1 - Math.exp(-8 * dt));
  body.scale.y = 1;
  // Cloth: tails and scarf trail behind (negative x), flapping with speed.
  const wind = running ? (slide || air ? 1.2 : 0.8) : 0.1,
    t = st.time;
  for (const h of c.tails)
    to(h.rotation, "x", -(0.12 + wind * 0.5) - wind * 0.12 * Math.sin(t * 11 + h.userData.side), soft);
  c.scarf.forEach((seg, i) => {
    // Positive x droops a link downward; wind lifts the first link toward horizontal.
    seg.rotation.x = (i === 0 ? 1.3 - wind * 1.25 : 0.1) + Math.sin(t * 9 - i * 1.1) * (0.1 + wind * 0.2);
    seg.rotation.y = Math.sin(t * 6.5 - i * 0.8) * 0.12 * (0.4 + wind);
  });
  c.pony.rotation.x = -0.2 - wind * 0.5 + Math.sin(p * 2) * 0.15 * wind;
}

// ---------------------------------------------------------------- ambient life
export function createAmbient(scene, glowTex) {
  const group = new T.Group();
  scene.add(group);
  // Footstep dust puffs (pooled sprites).
  const puffMat = new T.SpriteMaterial({ map: glowTex, color: "#d8b88c", transparent: true, opacity: 0.0, depthWrite: false });
  const puffs = [];
  for (let i = 0; i < 18; i++) {
    const s = new T.Sprite(puffMat.clone());
    s.visible = false;
    group.add(s);
    puffs.push({ s, life: 0 });
  }
  let puffIndex = 0,
    stepClock = 0;
  // Tumbleweeds roll along the sidewalks only, never across lanes.
  const twMat = m("#9a7a4c", { rough: 1, flat: true });
  const weeds = [];
  for (let i = 0; i < 3; i++) {
    const w = new T.Group();
    for (let k = 0; k < 3; k++) {
      const shell = new T.Mesh(new T.IcosahedronGeometry(0.42 + k * 0.08, 0), twMat);
      shell.rotation.set(k, k * 2, k * 0.5);
      shell.material = twMat;
      w.add(shell);
    }
    w.children.forEach((c) => (c.material.wireframe = false));
    w.visible = false;
    group.add(w);
    weeds.push({ w, x: 0, z: -40 - i * 50, v: 0 });
  }
  const wire = new T.MeshStandardMaterial({ color: "#7d6036", wireframe: true });
  weeds.forEach(({ w }) => {
    const mesh = new T.Mesh(new T.IcosahedronGeometry(0.55, 1), wire);
    w.add(mesh);
  });
  // Circling buzzards far above.
  const birdGeo = new T.BufferGeometry();
  birdGeo.setAttribute(
    "position",
    new T.BufferAttribute(new Float32Array([-1, 0, 0, 0, 0, -0.3, 0, 0.12, 0.1, 0, 0, -0.3, 1, 0, 0, 0, 0.12, 0.1]), 3),
  );
  birdGeo.computeVertexNormals();
  const birdMat = new T.MeshBasicMaterial({ color: "#3a2c25", side: T.DoubleSide, fog: true });
  const birds = [];
  for (let i = 0; i < 4; i++) {
    const b = new T.Mesh(birdGeo, birdMat);
    b.scale.setScalar(1.3);
    group.add(b);
    birds.push({ b, a: i * 1.6, r: 14 + i * 4, h: 26 + i * 3, cz: -70 - i * 12 });
  }
  return {
    update(dt, t, ctx) {
      const { runner, speed, playing, quality, landscape, terrain, offset } = ctx;
      const low = quality === "low";
      const outdoors = terrain !== "metro";
      // Puffs
      if (playing && outdoors && runner.position.y < 8 && speed > 0) {
        stepClock -= dt * speed * 0.18;
        if (stepClock <= 0) {
          stepClock = 1;
          const p = puffs[puffIndex++ % puffs.length];
          p.life = 0.7;
          p.s.visible = true;
          p.s.position.set(runner.position.x + (Math.random() - 0.5) * 0.4, runner.position.y + 0.25, runner.position.z + 0.5);
          p.s.scale.set(0.6, 0.4, 1);
        }
      }
      for (const p of puffs) {
        if (p.life <= 0) continue;
        p.life -= dt;
        const k = 1 - p.life / 0.7;
        p.s.position.z += speed * dt * 0.9;
        p.s.position.y += dt * 0.6;
        p.s.scale.set(0.6 + k * 2.2, 0.4 + k * 1.1, 1);
        p.s.material.opacity = 0.35 * (1 - k);
        if (p.life <= 0) p.s.visible = false;
      }
      // Tumbleweeds
      for (const tw of weeds) {
        const show = !low && outdoors && landscape === "western";
        tw.w.visible = show;
        if (!show) continue;
        tw.z += (speed * 0.85 + 2) * dt;
        tw.x += tw.v * dt;
        if (tw.z > 16 || Math.abs(tw.x) > 13) {
          const side = Math.random() < 0.5 ? -1 : 1;
          tw.z = -60 - Math.random() * 60;
          tw.x = side * (6.3 + Math.random() * 1.5);
          tw.v = side * (0.2 + Math.random() * 0.5);
        }
        tw.w.position.set(offset + tw.x, 0.5 + Math.abs(Math.sin(t * 4 + tw.z)) * 0.35, tw.z);
        tw.w.rotation.x -= dt * (speed * 0.4 + 2);
        tw.w.rotation.z += dt * tw.v;
      }
      // Birds
      for (const bd of birds) {
        bd.b.visible = !low && outdoors;
        bd.a += dt * 0.25;
        bd.b.position.set(offset + Math.cos(bd.a) * bd.r, bd.h + Math.sin(t + bd.a) * 0.5, bd.cz + Math.sin(bd.a) * bd.r);
        bd.b.rotation.y = -bd.a;
        bd.b.rotation.z = Math.sin(t * 3 + bd.a) * 0.25;
      }
    },
  };
}

// ---------------------------------------------------------------- western rooftops
// Side dressing only; the lane tiles stay in game.js because gaps hide them one by one.
export function westernRoofParts(variant, quality) {
  const key = "roofW:" + variant + ":" + quality;
  if (buildCache.has(key)) return buildCache.get(key);
  const high = quality !== "low";
  const kit = new Kit();
  const r = rng(variant * 13 + 5);
  for (const side of [-1, 1]) {
    // Parapet and the building walls dropping to the street below.
    const [paint, trim] = PAINT[(variant + (side > 0 ? 3 : 0)) % 8];
    kit.box(0.35, 0.7, 28, wood(trim), side * 5.0, 0.15, -14);
    kit.box(2.2, 10, 28, wood(paint), side * 6.3, -4.9, -14);
    kit.box(2.3, 0.25, 28, wood("#5d4636"), side * 6.3, 0.05, -14);
    for (const z of [-4, -11, -18, -25]) kit.box(2.32, 1.2, 1.1, m("#2b3c45", { rough: 0.3 }), side * 6.3, -2.5, z);
    // Brick chimneys and water barrels.
    for (const z of high ? [-6, -20] : [-13]) {
      const cx = side * (6.4 + r() * 0.6);
      kit.box(0.8, 1.8, 0.8, m("#9a4a32", { rough: 0.9, flat: true }), cx, 1.1, z);
      kit.box(0.95, 0.18, 0.95, m("#6f3524"), cx, 2.05, z);
      kit.add(CYL(0.42, 0.4, 1.0, 12), wood("#8e5a33"), side * 6.2, 0.7, z + 3.5);
    }
    if (high) {
      // Tin sheets, crates and a laundry line strung between posts.
      kit.add(mbox(2.0, 0.08, 6), m("#9fa3a0", { metal: 0.6, rough: 0.45 }), side * 6.6, 0.32, -13, 0, 0, side * 0.12);
      kit.box(0.8, 0.8, 0.8, wood("#b08455"), side * 6.0, 0.55, -10, 0, 0.4, 0);
      for (const z of [-15, -23]) kit.box(0.1, 2.4, 0.1, wood("#6b4b33"), side * 6.6, 1.3, z);
      kit.box(0.03, 0.03, 8, m("#e8dcc0"), side * 6.6, 2.4, -19);
      for (let k = 0; k < 4; k++)
        kit.box(0.04, 0.7, 0.8, m(["#c2533a", "#e9dcc0", "#3f6f8f", "#d8a74a"][k], { rough: 1 }), side * 6.6, 2.0, -16.5 - k * 1.6, 0, 0, 0);
      // Weathervane
      kit.box(0.06, 1.6, 0.06, m("#3a3330", { metal: 0.7 }), side * 6.4, 2.9, -6);
      kit.box(0.04, 0.12, 0.9, m("#3a3330", { metal: 0.7 }), side * 6.4, 3.6, -6);
    }
    // The rest of the town below and beyond.
    for (const z of high ? [-5, -19] : [-12]) {
      const h = 6 + r() * 3;
      kit.box(5, h, 7, wood(PAINT[Math.floor(r() * 8)][0]), side * (11 + r() * 2), h / 2 - 9, z);
      kit.add(mbox(5.4, 0.2, 7.4), wood("#5d4636"), side * (11 + r() * 2), h - 8.8, z, 0, 0, side * 0.2);
    }
  }
  const parts = kit.build(high);
  buildCache.set(key, parts);
  return parts;
}
