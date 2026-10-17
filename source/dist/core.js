import { L, LANG } from "./i18n.js";
export const TITLE = "KÜLHAT";
export const DISTRICTS = [
  {
    name: L("Yağmur Çarşısı"),
    sky: "#293e4f",
    fog: "#293e4f",
    light: "#f4cab2",
    rain: true,
    kind: "city",
  },
  {
    name: "Demir Hatlar",
    sky: "#55463e",
    fog: "#55463e",
    light: "#ffcb92",
    rain: false,
    kind: "rail",
  },
  {
    name: L("Yüksek Bahçeler"),
    sky: "#344e58",
    fog: "#344e58",
    light: "#d2e5c1",
    rain: false,
    kind: "roof",
  },
  {
    name: L("Su Altındaki Şehir"),
    sky: "#223a4e",
    fog: "#223a4e",
    light: "#a9d5ee",
    rain: true,
    kind: "flood",
  },
  {
    name: L("Karantina"),
    sky: "#233446",
    fog: "#233446",
    light: "#c6c6ee",
    rain: true,
    kind: "quarantine",
  },
  {
    name: L("Aktarım Kalesi"),
    sky: "#443c50",
    fog: "#443c50",
    light: "#f5c6a4",
    rain: false,
    kind: "citadel",
  },
  { name: L("Kızıl Maden"), sky: "#554332", fog: "#70553c", light: "#ffd39a", rain: false, kind: "mine" },
  { name: L("Kartal Kanyonu"), sky: "#a3b8ba", fog: "#b7a38a", light: "#ffe2ae", rain: false, kind: "canyon" },
];
const NAMES = [
  ["İlk Paket", "Dar Geçit", "Çarşıdaki Göz", "İki Yol", "İlk Takip"],
  ["Ağır Yük", L("Son Vagon"), "Kırmızı Varil", "Makası Değiştir", "Demir Avcı"],
  ["Cam Çekirdek", "Çatı Arası", "Soğutucu", "Rüzgâr Hattı", "Yüksek Takip"],
  [
    "Tıbbi Sevkiyat",
    "Kayıp Köprü",
    "Suların Üstü",
    "Koridor",
    "Dalgaların Avcısı",
  ],
  [
    "Sessiz Bölge",
    "Zırhlı Göz",
    "Kararsız Hücre",
    L("Kapanan Çember"),
    "Karantina Avcısı",
  ],
  [
    L("Geri Dönüş Yok"),
    L("Üçüncü Kapı"),
    "Son Kesinti",
    "Çekirdek Yolu",
    L("Son Teslimat"),
  ],
  ["Maden Girişi", "Kopan Vinç", L("Üç Ray"), "Kömür Konvoyu", "Çöküşten Kaçış"],
  [L("Dar Kanyon"), L("Taş Yağmuru"), "Asma Geçit", "Son Konvoy", "Kartal Geçidi"],
];
// Per-map stage names. NAMES above stays as the neutral city default.
const MAP_NAMES = {
  western: [
    [L("İlk Posta"), L("Dar Sokak"), L("Salondaki Göz"), L("İki Patika"), L("İlk Kovalamaca")],
    [L("Ağır Sandık"), L("Son Vagon"), L("Barut Fıçısı"), L("Makas Değişimi"), L("Demir Şerif")],
    [L("Cam Fener"), L("Çatı Katı"), L("Su Kulesi"), L("Yel Değirmeni"), L("Çatılarda Takip")],
    [L("Doktorun Çantası"), L("Yıkık Köprü"), L("Kuru Dere"), L("Ahır Geçidi"), L("Taşkın Avcısı")],
    [L("Sessiz Kasaba"), L("Zırhlı Posta Arabası"), L("Kararsız Barut"), L("Kapanan Çember"), L("Kanun Kaçağı Avcısı")],
    [L("Dönüş Yok"), L("Üçüncü Kapı"), L("Son Telgraf"), L("Kale Yolu"), L("Son Teslimat")],
    [L("Kızıl Ocak"), L("Kopan Makara"), L("Üç Ray"), L("Kömür Arabası"), L("Göçükten Kaçış")],
    [L("Dar Kanyon"), L("Kızgın Kayalar"), L("Asma Köprü"), L("Son Kervan"), L("Kartal Kayası")],
  ],
  trail: [
    [L("İlk Yük"), L("Dar Patika"), L("Kayadaki Göz"), L("İki Dere"), L("Çam Altı Takibi")],
    [L("Ağır Heybe"), L("Son Teleferik"), L("Gaz Tüpü"), L("Yol Ayrımı"), L("Sarp Yokuş Avcısı")],
    [L("Cam Termos"), L("Kaya Çıkıntısı"), L("Buzul Suyu"), L("Rüzgâr Sırtı"), L("Zirve Takibi")],
    [L("Sağlık Çantası"), L("Halat Köprü"), L("Şelale Üstü"), L("Sisli Koridor"), L("Çağlayan Avcısı")],
    [L("Sessiz Yayla"), L("Zırhlı Gözcü"), L("Oynak Kaya"), L("Kapanan Vadi"), L("Sis Avcısı")],
    [L("Geri Dönüş Yok"), L("Üçüncü Geçit"), L("Son Kamp"), L("Zirve Yolu"), L("Son Teslimat")],
    [L("Terk Edilmiş Ocak"), L("Kopan Halat"), L("Üç Tünel"), L("Cevher Konvoyu"), L("Heyelandan Kaçış")],
    [L("Derin Boğaz"), L("Taş Yağmuru"), L("Kartal Yuvası"), L("Kervan Yolu"), L("Doruk Geçidi")],
  ],
};
// Per-map story lines shown on the result screen (city lines stay on MISSIONS.story).
const MAP_STORIES = {
  western: [
    L("Kasabanın son postası sende. Çantayı istasyona ulaştır."),
    L("Ağır sandıklar treni bekliyor; hattı açık tut."),
    L("Cam fenerler en küçük sarsıntıda çatlar. Yumuşak koş."),
    L("Doktorun ilaçları dere taşmadan karşıya geçmeli."),
    L("Barut sandığı kararsız ve kanun kaçakları peşinde."),
    L("Son telgrafı kaleye götür. Kasabanın sesi sende."),
    L("Kızıl Ocak'ın vinçlerini aş; kaçış rayını açık tut."),
    L("Son kervanı kanyondan geçir. Kartal Kayası'ndan sonra yol özgür."),
  ],
  trail: [
    L("Yayla köyünün tek yükü sende. Patikadan aşağı indir."),
    L("Teleferik durdu; heybeleri sırtlayıp yokuşu aş."),
    L("Cam termoslar buzul suyu taşıyor. Taşlara dikkat."),
    L("Sağlık çantası şelalenin öbür yakasında bekleniyor."),
    L("Sis çöktü, kayalar oynuyor. Gözcüler seni izliyor."),
    L("Zirve kampına son yükü çıkar. Dağın ışıkları yeniden yansın."),
    L("Terk edilmiş ocakta halatlar kopuyor; tünelden çıkışı bul."),
    L("Derin boğazdan geç. Doruk Geçidi'nden sonra yol açık."),
  ],
};
export function storyText(m, landscape) {
  return MAP_STORIES[landscape]?.[m.district] || m.story;
}
export function missionName(m, landscape) {
  return MAP_NAMES[landscape]?.[m.district]?.[m.id % 5] || m.name;
}
export const MISSIONS = Array.from({ length: 40 }, (_, i) => {
  let district = Math.floor(i / 5),
    step = i % 5;
  return {
    id: i,
    district,
    name: NAMES[district][step],
    length: i === 0 ? 1800 : 2800 + i * 140,
    speed: 26 + Math.min(10, i * 0.35),
    spacing: Math.max(32, 48 - i * 0.55),
    cargo:
      i < 5
        ? "data"
        : district === 1
          ? "heavy"
          : district === 2
            ? "fragile"
            : district === 3
              ? "medical"
              : district === 4
                ? "volatile"
                : "core",
    pursuit: i >= 4,
    boss: step === 4,
    branches: true,
    environment: i >= 7,
    drone: i >= 2,
    laser: i >= 1,
    train: district === 1,
    gap: district === 2,
    armored: i >= 21,
    threat: 1 + district,
    reward: 80 + i * 7,
    story: [
      L("Veri çekirdeği bulundu. Çarşının son kuryesisin."),
      L("Aktarım istasyonuna giden tren hattını aç."),
      L("Cam çekirdek tek bir sert darbeye bile duyarlı."),
      L("Tıbbi paketler suya teslim olmayacak."),
      L("Karantinanın enerji kaynağını taşıyorsun."),
      L("Çekirdeği kaleye ulaştır. Şehrin ışıklarını geri getir."),
      L("Kızıl Maden'in vinçlerini aş; kaçış rayını açık tut."),
      L("Son konvoyu Kartal Kanyonu'ndan geçir."),
    ][district],
  };
});
export const CARGOS = {
  data: { name: L("Veri çekirdeği"), damage: 12, jump: 9, speed: 1 },
  heavy: { name: L("Ağır batarya"), damage: 10, jump: 8.3, speed: 0.93 },
  fragile: { name: L("Cam çekirdek"), damage: 25, jump: 9, speed: 1 },
  medical: { name: L("Tıbbi paket"), damage: 16, jump: 9, speed: 1 },
  volatile: { name: L("Kararsız hücre"), damage: 20, jump: 9, speed: 1 },
  core: { name: L("Son çekirdek"), damage: 18, jump: 9, speed: 1 },
};
export const COURIER_WEAPONS = {
  sidearm: {
    name: L("Kurye Tabancası"),
    desc: L("Dengeli ve güvenilir"),
    coinCost: 0,
    diamondCost: 0,
    damage: 1,
    cooldown: 0.24,
    magazine: 12,
    rounds: 1,
  },
  burst: {
    name: L("Üçlü Atım"),
    desc: L("Her dokunuşta üç mermi"),
    coinCost: 220,
    diamondCost: 0,
    damage: 0.85,
    cooldown: 0.36,
    magazine: 15,
    rounds: 3,
  },
  ion: {
    name: L("İyon İğnesi"),
    desc: L("Hızlı ve yüksek hasarlı"),
    coinCost: 0,
    diamondCost: 8,
    damage: 1.7,
    cooldown: 0.18,
    magazine: 10,
    rounds: 1,
  },
  rail: {
    name: L("Ray Kırıcı"),
    desc: L("Yavaş ama zırh parçalayan"),
    coinCost: 0,
    diamondCost: 16,
    damage: 4.2,
    cooldown: 0.62,
    magazine: 6,
    rounds: 1,
  },
  repeater: {
    name: L("Kasırga Makineli"),
    desc: L("Geniş şarjör · kesintisiz baskı ateşi"),
    coinCost: 380,
    diamondCost: 0,
    damage: 0.75,
    cooldown: 0.09,
    magazine: 30,
    rounds: 1,
  },
  storm: {
    name: L("Fırtına Beşlisi"),
    desc: L("Tek dokunuşta beşli ağır yaylım"),
    coinCost: 580,
    diamondCost: 0,
    damage: 1.05,
    cooldown: 0.55,
    magazine: 20,
    rounds: 5,
  },
};
export const DEFAULT_SAVE = () => ({
  version: 3,
  coins: 0,
  diamonds: 0,
  unlocked: 1,
  shield: 0,
  gun: 0,
  weapon: "sidearm",
  ownedWeapons: ["sidearm"],
  weaponLevels: {
    sidearm: 0,
    burst: 0,
    ion: 0,
    rail: 0,
    repeater: 0,
    storm: 0,
  },
  weaponMastery: {
    sidearm: 0,
    burst: 0,
    ion: 0,
    rail: 0,
    repeater: 0,
    storm: 0,
  },
  daily: { day: "", done: false },
  cargo: 0,
  records: {},
  trailRecords: {},
  endlessBest: 0,
  sound: true,
  quality: "auto",
  contract: "standard",
  landscape: "western",
  leaderboard: [],
  freePlay: false,
});
export function validateSave(v) {
  let s = DEFAULT_SAVE();
  if (!v || typeof v !== "object") return s;
  for (let [k, max] of [
    ["coins", 10000000],
    ["diamonds", 100000],
    ["unlocked", MISSIONS.length],
    ["shield", 3],
    ["gun", 2],
    ["cargo", 3],
    ["endlessBest", 10000000],
  ])
    if (Number.isFinite(v[k]))
      s[k] = Math.max(
        k === "unlocked" ? 1 : 0,
        Math.min(max, Math.floor(v[k])),
      );
  if (typeof v.sound === "boolean") s.sound = v.sound;
  s.freePlay = v.freePlay === true;
  if (["western", "trail"].includes(v.landscape)) s.landscape = v.landscape;
  if (["standard", "bounty", "elite"].includes(v.contract))
    s.contract = v.contract;
  if (["auto", "low", "high"].includes(v.quality)) s.quality = v.quality;
  if (Array.isArray(v.ownedWeapons))
    s.ownedWeapons = [
      ...new Set([
        "sidearm",
        ...v.ownedWeapons.filter((x) => COURIER_WEAPONS[x]),
      ]),
    ];
  if (v.weaponLevels && typeof v.weaponLevels === "object")
    for (let id of Object.keys(COURIER_WEAPONS))
      if (Number.isFinite(v.weaponLevels[id]))
        s.weaponLevels[id] = Math.max(
          0,
          Math.min(4, Math.floor(v.weaponLevels[id])),
        );
  if (v.weaponMastery && typeof v.weaponMastery === "object")
    for (let id of Object.keys(COURIER_WEAPONS))
      if (Number.isFinite(v.weaponMastery[id]))
        s.weaponMastery[id] = Math.max(
          0,
          Math.min(10000000, Math.floor(v.weaponMastery[id])),
        );
  if (
    v.daily &&
    typeof v.daily === "object" &&
    typeof v.daily.day === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v.daily.day)
  )
    s.daily = { day: v.daily.day, done: v.daily.done === true };
  if (!v.weaponLevels && Number.isFinite(v.gun))
    s.weaponLevels.sidearm = Math.min(4, Math.floor(v.gun));
  if (COURIER_WEAPONS[v.weapon] && s.ownedWeapons.includes(v.weapon))
    s.weapon = v.weapon;
  for (let key of ["records", "trailRecords"])
    if (v[key] && typeof v[key] === "object")
      for (let [id, r] of Object.entries(v[key])) {
        if (+id >= 0 && +id < MISSIONS.length && r && Number.isFinite(r.stars))
          s[key][id] = {
            stars: Math.max(0, Math.min(3, Math.floor(r.stars))),
            best: Number.isFinite(r.best) ? Math.max(0, r.best) : 0,
          };
      }
  if (Array.isArray(v.leaderboard))
    s.leaderboard = v.leaderboard.filter((r) => r && Number.isFinite(r.score) &&
      Number.isInteger(r.mission) && r.mission >= 0 && r.mission < MISSIONS.length)
      .map((r) => ({score: Math.max(0, Math.min(1e9, Math.floor(r.score))), mission:r.mission,
        distance: Math.max(0, Math.min(1e7, Math.floor(r.distance)||0)), success:r.success===true,
        ...(["western", "trail"].includes(r.landscape) ? {landscape:r.landscape} : {})}))
      .sort((a,b)=>b.score-a.score).slice(0,10);
  // One-time v3 armoury credit lets existing prototype players try the new store.
  if (v.version !== 3) {
    s.coins = Math.min(10000000, s.coins + 220);
    s.diamonds = Math.min(100000, s.diamonds + 8);
  }
  return s;
}
export function rewardRun(save, result) {
  let s = validateSave(save);
  s.coins += result.coins;
  s.diamonds += Math.max(0, Math.floor(result.gems || 0));
  if (Number.isFinite(result.score))
    s.leaderboard = [...s.leaderboard, {score:result.score, mission:result.mission,
      distance:Math.floor(result.distance), success:result.success,
      ...(result.landscape ? {landscape:result.landscape} : {})}]
      .sort((a,b)=>b.score-a.score).slice(0,10);
  if (result.success && !result.endless && !result.freePlay) {
    // Stars and best cargo are tracked per map; "records" = Western (and older saves).
    let recs = result.landscape === "trail" ? s.trailRecords : s.records,
      prev = recs[result.mission],
      first = !prev;
    recs[result.mission] = {
      stars: Math.max(prev?.stars || 0, result.stars),
      best: Math.max(prev?.best || 0, result.cargo),
    };
    s.coins += first ? MISSIONS[result.mission].reward : 20;
    if (first) s.diamonds += 1;
    if (result.stars === 3 && (prev?.stars || 0) < 3) s.diamonds += 1;
    s.unlocked = Math.min(MISSIONS.length, Math.max(s.unlocked, result.mission + 2));
  }
  if (result.endless)
    s.endlessBest = Math.max(s.endlessBest, Math.floor(result.distance));
  return s;
}
export function objective(m) {
  let slot = m.id % 5;
  if (m.id === 0)
    return { kind: "clean", count: 0, text: L("Hiç darbe almadan teslim et") };
  if (slot === 4)
    return {
      kind: "hunter",
      count: 55,
      text: L("Takipçi mesafesini 55 metrenin üstünde tut"),
    };
  if (slot === 3)
    return { kind: "risk", count: 1, text: L("En az bir kestirme rota kullan") };
  if (m.environment && slot === 2)
    return {
      kind: "environment",
      count: 2,
      text: L("İki çevre hedefini etkinleştir"),
    };
  return {
    kind: "kills",
    count: Math.max(1, Math.min(7, Math.floor(m.id / 5) + 1)),
    text:
      LANG === "en"
        ? "Shoot down " + Math.max(1, Math.min(7, Math.floor(m.id / 5) + 1)) + " drones"
        : Math.max(1, Math.min(7, Math.floor(m.id / 5) + 1)) + " dron düşür",
  };
}
export function signature(m) {
  let entries = [],
    slot = m.id % 5,
    d = m.district;
  let at = m.id === 0 ? 210 : 280;
  function add(type, lane, offset = 0, extra = {}) {
    entries.push({ type, lane, at: at + offset, ...extra });
  }
  if (d === 0) {
    if (slot === 0) {
      add("barrier", 0);
      add("barrier", -1, 190);
      add("barrier", 1, 380);
    }
    if (slot === 1) {
      add("laser", 0);
      add("barrier", -1, 110);
      add("laser", 1, 230);
    }
    if (slot === 2) {
      add("drone", 0);
      add("drone", -1, 100);
      add("drone", 1, 220);
    }
    if (slot === 3) {
      add("wall", 0);
      add("drone", 1, 170);
    }
    if (slot === 4) {
      for (let i = 0; i < 4; i++) add("drone", (i % 3) - 1, i * 130);
    }
  } else if (d === 1) {
    if (slot === 0) {
      add("barrier", 0);
      add("train", -1, 170);
      add("train", 1, 310);
    }
    if (slot === 1) {
      add("train", 0);
      add("laser", -1, 110);
      add("train", 1, 260);
    }
    if (slot === 2) {
      for (let i = 0; i < 3; i++) {
        add("barrel", (i % 3) - 1, i * 200);
        add("drone", (i % 3) - 1, i * 200 + 28);
      }
    }
    if (slot === 3) {
      for (let i = 0; i < 3; i++) {
        add("panel", 1, i * 240);
        add("wall", 1, i * 240 + 26, { linked: true });
      }
    }
    if (slot === 4) {
      for (let i = 0; i < 5; i++) {
        add("train", (i % 3) - 1, i * 140);
        add("drone", 1 - (i % 3), i * 140 + 60);
      }
    }
  } else if (d === 2) {
    if (slot === 0) {
      add("gap", 0);
      add("saw", -1, 160);
    }
    if (slot === 1) {
      for (let i = 0; i < 4; i++) add("gap", (i % 3) - 1, i * 150);
    }
    if (slot === 2) {
      for (let i = 0; i < 3; i++) {
        add("vent", (i % 3) - 1, i * 220);
        add("drone", (i % 3) - 1, i * 220 + 26);
      }
    }
    if (slot === 3) {
      add("gap", 0);
      add("laser", 1, 180);
      add("drone", -1, 390);
    }
    if (slot === 4) {
      for (let i = 0; i < 6; i++)
        add(i % 2 ? "drone" : "gap", (i % 3) - 1, i * 120);
    }
  } else if (d === 3) {
    if (slot === 0) {
      add("repair", 0);
      add("laser", 1, 180);
      add("drone", -1, 330);
    }
    if (slot === 1) {
      add("wall", -1);
      add("wall", 1);
      add("saw", 0, 180);
    }
    if (slot === 2) {
      for (let i = 0; i < 3; i++) {
        add("barrel", 0, i * 200);
        add("drone", 1, i * 200 + 25);
      }
    }
    if (slot === 3) {
      for (let i = 0; i < 4; i++) add("laser", (i % 3) - 1, i * 180);
    }
    if (slot === 4) {
      for (let i = 0; i < 5; i++) {
        add("drone", (i % 3) - 1, i * 150);
        add("shield", 1 - (i % 3), i * 150 + 65);
      }
    }
  } else if (d === 4) {
    if (slot === 0) {
      add("laser", 0);
      add("wall", -1, 130);
      add("drone", 1, 250);
    }
    if (slot === 1) {
      for (let i = 0; i < 4; i++) add("drone", (i % 3) - 1, i * 180, { hp: 6 });
    }
    if (slot === 2) {
      for (let i = 0; i < 3; i++) {
        add("vent", (i % 3) - 1, i * 220);
        add("drone", (i % 3) - 1, i * 220 + 25, { hp: 6 });
      }
    }
    if (slot === 3) {
      for (let i = 0; i < 4; i++) {
        add("panel", 1 - (i % 3), i * 210);
        add("wall", 1 - (i % 3), i * 210 + 28, { linked: true });
      }
    }
    if (slot === 4) {
      for (let i = 0; i < 6; i++) add("drone", (i % 3) - 1, i * 170, { hp: 6 });
    }
  } else if (d >= 6) {
    let patterns = d === 6
      ? [["cart", "rock", "laser"], ["cart", "barrier", "cart"], ["cart", "saw", "cart"], ["cart", "drone", "rock"], ["rock", "cart", "laser"]]
      : [["rock", "gap", "barrier"], ["rock", "rock", "cart"], ["gap", "laser", "rock"], ["drone", "cart", "saw"], ["rock", "gap", "cart"]];
    for (let i=0;i<14;i++) add(patterns[slot][i%3], (i+slot)%3-1, i*150, {drop:i%3===0});
  } else {
    let pattern =
      slot === 0
        ? ["barrel", "drone", "saw"]
        : slot === 1
          ? ["panel", "laser", "drone"]
          : slot === 2
            ? ["vent", "drone", "wall"]
            : slot === 3
              ? ["gap", "laser", "drone"]
              : ["drone", "barrel", "drone", "panel", "drone", "vent"];
    for (let i = 0; i < 9; i++) {
      let type = pattern[i % pattern.length];
      add(type, (i % 3) - 1, i * 125);
      if (type === "panel")
        add("wall", (i % 3) - 1, i * 125 + 25, { linked: true });
      if (type === "barrel" || type === "vent")
        add("drone", (i % 3) - 1, i * 125 + 30);
    }
  }
  return entries.sort((a, b) => a.at - b.at);
}
const HAZARDS = new Set([
  "cart",
  "barrier",
  "rock",
  "saw",
  "laser",
  "wall",
  "train",
  "gap",
  "bolt",
]);
const TARGETS = new Set(["drone", "barrel", "vent", "panel"]);
export function rng(seed) {
  let v = seed >>> 0;
  return () => {
    v = (1664525 * v + 1013904223) >>> 0;
    return v / 4294967296;
  };
}
export class Run {
  constructor(mission = 0, upgrades = {}, seed = 17, endless = false) {
    this.mission = MISSIONS[mission];
    this.upgrades = { shield: 0, gun: 0, cargo: 0, ...upgrades };
    this.contract = this.upgrades.contract || "standard";
    this.riskFactor =
      this.contract === "elite" ? 1.2 : this.contract === "bounty" ? 1.1 : 1;
    this.weapon = COURIER_WEAPONS[this.upgrades.weapon]
      ? this.upgrades.weapon
      : "sidearm";
    this.weaponLevel =
      this.upgrades.weaponLevels?.[this.weapon] ?? this.upgrades.gun ?? 0;
    this.weaponStats = COURIER_WEAPONS[this.weapon];
    this.endless = endless;
    this.rand = rng(seed);
    this.phase = "play";
    this.distance = 0;
    this.time = 0;
    this.speed = this.mission.speed;
    this.goal = this.mission.length;
    this.lane = 0;
    this.x = 0;
    this.y = 0;
    this.vy = 0;
    this.slide = 0;
    this.inv = 0;
    this.health = 3;
    this.shield = this.upgrades.shield;
    this.cargo = 100;
    this.hunter = this.mission.pursuit ? 100 : Infinity;
    this.coins = 0;
    this.gems = 0;
    this.power = 0;
    this.kills = 0;
    this.environment = 0;
    this.route = "normal";
    this.routes = [];
    this.offset = 0;
    this.targetOffset = 0;
    this.cool = 0;
    this.ammoMax = this.weaponStats.magazine + this.weaponLevel;
    this.ammo = this.ammoMax;
    this.reload = 0;
    this.nextWave = 18;
    this.nextFork = this.mission.id === 0 ? 20 : 220;
    this.routeSections = [];
    this.fork = null;
    this.nextId = 1;
    this.objects = [];
    this.shots = [];
    this.events = [];
    this.waveN = 0;
    this.damageCount = 0;
    this.hold = false;
    this.routeEnds = 0;
    this.score = 0;
    this.nextSupply = 1200;
    this.script = signature(this.mission);
    this.scriptIndex = 0;
  }
  emit(type, data = {}) {
    this.events.push({ type, ...data });
  }
  takeEvents() {
    let e = this.events;
    this.events = [];
    return e;
  }
  action(type) {
    if (this.phase !== "play") return;
    if (type === "left") this.lane = Math.max(-1, this.lane - 1);
    if (type === "right") this.lane = Math.min(1, this.lane + 1);
    if (type === "jump" && this.y < 0.05 && this.slide <= 0) {
      this.vy = CARGOS[this.mission.cargo].jump;
      this.emit("jump");
    }
    if (type === "slide" && this.y < 0.1) {
      this.slide = 0.85;
      this.emit("slide");
    }
    if (type === "fire") this.fire();
  }
  add(type, lane, at, extra = {}) {
    if (
      this.fork &&
      Math.abs(at - this.fork.at) < 65 &&
      [
        "barrier",
        "rock",
        "cart",
        "saw",
        "laser",
        "wall",
        "train",
        "gap",
        "drone",
        "bolt",
      ].includes(type)
    )
      return null;
    let o = {
      id: this.nextId++,
      type,
      lane,
      x: lane * 3.2,
      at,
      hp:
        type === "drone"
          ? this.mission.armored
            ? 7 + Math.floor(this.mission.threat / 2)
            : 2 + Math.floor(this.mission.threat * 0.75)
          : type === "panel"
            ? 2
            : 1,
      hit: false,
      dead: false,
      warned: false,
      ...extra,
    };
    this.objects.push(o);
    o.baseX = o.x;
    o.appearance = type === "drone" && (this.upgrades.landscape || "western") === "western"
      ? "wagon" : type;
    o.rollSpeed = type === "rock" ? 7 + this.mission.threat * 0.5 : 0;
    if (type === "cart") o.rollSpeed = 10;
    if (o.appearance === "wagon") o.rollSpeed = 5;
    o.rolled = 0;
    o.sweepSide = o.id % 2 ? -1 : 1;
    o.arcY = 0;
    o.moving =
      this.mission.threat >= 2 &&
      ["saw", "barrier", "laser"].includes(type) &&
      o.id % 3 === 0;
    return o;
  }
  generateWave() {
    let m = this.mission,
      n = this.waveN++,
      p = Math.floor(this.rand() * 7),
      l = Math.floor(this.rand() * 3) - 1,
      free = Math.floor(this.rand() * 3) - 1,
      at = this.distance + 155;
    let types = [];
    if (p === 0) types = [[m.threat >= 2 && n % 2 ? "saw" : "barrier", l, 0]];
    if (p === 1) types = [[m.laser ? "laser" : "barrier", l, 0]];
    if (p === 2)
      types = [
        ...[-1, 0, 1].filter((x) => x !== free).map((x) => ["wall", x, 0]),
      ];
    if (p === 3)
      types = [
        [m.threat >= 3 ? "saw" : "barrier", l, 0],
        [m.drone ? "drone" : "coin", l === 1 ? -1 : l + 1, 18],
      ];
    if (p === 4)
      types = [
        [m.threat >= 4 ? "saw" : "barrier", -1, 0],
        ["barrier", 0, 0],
        [m.laser ? "laser" : "barrier", 1, 0],
      ];
    if (p === 5) types = [[m.train ? "train" : m.gap ? "gap" : "wall", l, 0]];
    if (p === 6)
      types = [
        [m.drone ? "drone" : "barrier", l, 0],
        [m.environment ? "barrel" : "coin", l === 1 ? -1 : l + 1, -14],
      ];
    if (this.route === "safe") {
      types = [[n % 2 ? "barrier" : "laser", l, 0]];
    }
    if (this.route === "risk")
      types = [[n % 2 ? "gap" : m.threat >= 2 ? "saw" : "barrier", l, 0]];
    if (!["safe", "risk"].includes(this.route) && n % 2 === 0)
      types = [["rock", l, 0]];
    if (this.route === "risk" && m.drone && n % 2 === 0)
      types.push(["drone", free, 28]);
    if (m.threat >= 3 && m.drone && n % 3 === 1)
      types.push(["drone", l === 1 ? -1 : l + 1, 42]);
    if (this.route !== "safe" && m.threat >= 2 && n % 5 === 0)
      types.push(["saw", free, 65]);
    if (this.route !== "safe" && m.drone && m.threat >= 2 && n % 6 === 0)
      types.push(["drone", l === -1 ? 1 : -1, 90]);
    if (m.threat >= 4 && n % 4 === 2) {
      types.push(["barrier", free === 1 ? -1 : free + 1, 54]);
      if (m.threat >= 5) types.push(["saw", free, 88]);
    }
    for (let [t, l, d] of types) this.add(t, l, at + d);
    if (m.environment && n % 5 === 2) {
      let kind = n % 3 === 0 ? "panel" : n % 3 === 1 ? "vent" : "barrel";
      this.add(kind, free, at - 18);
      if (kind === "panel") this.add("wall", free, at + 22, { linked: true });
      if (kind === "vent") this.add("drone", free, at + 20);
    }
    for (let k = 0; k < 7; k++)
      this.add("coin", free, at + 30 + k * 3.8, { value: k === 6 ? 2 : 1 });
    if (n % 4 === 3) this.add("power", free, at + 62);
    if (n % 3 === 1) this.add("gem", free, at + 76);
    if (n % 7 === 5) this.add("shield", free, at + 62);
    if (m.cargo === "medical" && n % 9 === 4) this.add("repair", free, at + 70);
    return types;
  }
  fire(id = null) {
    if (this.phase !== "play" || this.cool > 0 || this.reload > 0) return false;
    if (this.ammo <= 0) {
      this.reload = 1.2;
      return false;
    }
    let candidates = this.objects.filter(
      (o) =>
        TARGETS.has(o.type) &&
        !o.dead &&
        o.at - this.distance > 3 &&
        o.at - this.distance < 105,
    );
    let target =
      id !== null
        ? candidates.find((o) => o.id === id)
        : candidates
            .filter((o) => Math.abs(o.x - this.x) < 2.4)
            .sort((a, b) => a.at - b.at)[0];
    if (!target)
      target = candidates.sort(
        (a, b) =>
          Math.abs(a.x - this.x) - Math.abs(b.x - this.x) || a.at - b.at,
      )[0];
    let stats = this.weaponStats,
      levelPower = 1 + this.weaponLevel * 0.25;
    this.cool = stats.cooldown * Math.pow(0.95, this.weaponLevel);
    this.ammo--;
    this.emit("fire", { target: target?.id, weapon: this.weapon });
    if (target)
      for (let round = 0; round < stats.rounds; round++)
        this.shots.push({
          id: this.nextId++,
          target: target.id,
          t: -round * 0.045,
          duration: Math.max(0.07, (target.at - this.distance) / 115),
          x: this.x,
          start: this.distance,
          weapon: this.weapon,
          damage: stats.damage * levelPower * (1 + this.power * 0.12),
        });
    if (this.ammo === 0) this.reload = 1.2;
    return true;
  }
  hitTarget(o, damage) {
    if (o.dead) return;
    o.hp -= damage;
    this.emit("spark", { object: o.id });
    if (o.hp > 0) return;
    o.dead = true;
    if (o.type === "drone") {
      this.kills++;
      this.coins += 3;
      this.hunter = Math.min(100, this.hunter + 3);
      this.emit("explode", { object: o.id, kind: o.appearance });
    } else {
      this.environment++;
      this.hunter = Math.min(100, this.hunter + 7);
      this.emit("environment", { object: o.id, kind: o.type });
      for (let q of this.objects) {
        if (q === o || q.dead) continue;
        if (
          o.type === "barrel" &&
          Math.abs(q.at - o.at) < 38 &&
          Math.abs(q.lane - o.lane) <= 1 &&
          (q.type === "drone" || q.type === "barrier")
        ) {
          q.dead = true;
          if (q.type === "drone") {
            this.kills++;
            this.coins += 3;
          }
          this.emit("explode", { object: q.id });
        }
        if (
          o.type === "vent" &&
          q.type === "drone" &&
          q.at > o.at &&
          q.at - o.at < 70
        ) {
          q.disabled = true;
          this.emit("freeze", { object: q.id });
        }
        if (o.type === "panel" && q.linked && q.at - o.at < 60 && q.at > o.at) {
          q.dead = true;
          this.emit("gate", { object: q.id });
        }
      }
    }
  }
  damage(o) {
    if (this.inv > 0 || this.phase !== "play") return;
    this.inv = 1.2;
    this.hunter -= 12;
    if (this.shield > 0) {
      this.shield--;
      this.emit("blocked", { object: o.id });
      return;
    }
    // Only hits that reach armour/cargo count against the no-damage goal.
    this.damageCount++;
    this.health -= o.type === "cart" ? 2 : 1;
    this.cargo = Math.max(
      0,
      this.cargo -
        Math.max(
          5,
          CARGOS[this.mission.cargo].damage - this.upgrades.cargo * 4,
        ),
    );
    this.emit("damage", { kind: o.type, object: o.id });
    if (this.health <= 0) this.end(false, "health");
    else if (this.cargo <= 0) this.end(false, "cargo");
  }
  chooseRoute(choice) {
    if (!this.fork || this.fork.chosen) return;
    this.fork.chosen = true;
    this.route = choice;
    this.routes.push(choice);
    let variant = (this.mission.id + this.routes.length - 1) % 8;
    let westernMine = choice === "safe" && (this.upgrades.landscape || "western") === "western";
    this.routeEnds = this.distance + (westernMine ? 620 : 350);
    this.routeSections = this.routeSections.filter(
      (s) => s.end > this.distance - 230,
    );
    this.routeSections.push({
      kind: choice === "safe" ? "metro" : choice === "street" ? "street" : "roof",
      variant,
      start: this.distance,
      end: this.routeEnds,
    });
    // Clear the old street encounters: the new route gets its own authored rhythm.
    this.objects = this.objects.filter(
      (o) => o.at < this.distance + 65 || o.at > this.routeEnds,
    );
    for (let k = 0; k < (westernMine ? 8 : 4); k++) {
      let at = this.distance + 95 + k * 58,
        lane = (k % 3) - 1;
      this.add(
        choice === "safe"
          ? (westernMine ? (k % 3 === 1 ? "rock" : "cart") : (k % 2 === 0 ? "rock" : "laser"))
          : choice === "street"
            ? (k % 2 ? "drone" : "rock")
            : "gap",
        westernMine && k % 3 === 0 ? 0 : lane,
        at,
        {drop: westernMine && k % 3 === 0},
      );
      this.add(
        "coin",
        choice === "safe" ? (lane === 1 ? -1 : lane + 1) : lane,
        at + 14,
      );
      this.add("gem", choice === "safe" ? (lane === 1 ? -1 : lane + 1) : lane, at + 22);
      if (choice === "risk" && variant % 2 === 1 && k === 2)
        for (let other of [-1, 0, 1].filter((x) => x !== lane))
          this.add("gap", other, at);
    }
    this.targetOffset += choice === "safe" ? -9 : choice === "street" ? 0 : 9;
    if (choice === "safe") {
      this.goal += 70;
      this.hunter = Math.min(100, this.hunter + 10);
      this.shield = Math.min(4, this.shield + 1);
    } else if (choice === "risk") {
      this.goal = Math.max(this.distance + 180, this.goal - 90);
      this.coins += 30;
      this.hunter -= 7;
    } else {
      this.coins += 20;
    }
    this.emit("route", { choice });
    this.fork = null;
    this.nextFork = Math.max(this.distance + 480, this.routeEnds + 70);
  }
  step(dt) {
    if (this.phase !== "play") return;
    dt = Math.min(0.04, Math.max(0, dt));
    this.time += dt;
    let prev = this.distance;
    let base =
      this.mission.speed * CARGOS[this.mission.cargo].speed +
      (this.endless
        ? Math.min(12, this.distance / 700)
        : Math.min(3, this.distance / 900));
    this.speed =
      base *
      this.riskFactor *
      (this.route === "safe" ? 0.96 : this.route === "risk" ? 1.06 : 1);
    this.distance += this.speed * dt;
    if (this.distance >= this.nextSupply) {
      this.nextSupply += 1500;
      this.health = Math.min(3, this.health + 1);
      this.cargo = Math.min(100, this.cargo + 20);
      this.emit("supply");
    }
    this.x += (this.lane * 3.2 - this.x) * (1 - Math.exp(-14 * dt));
    this.offset +=
      (this.targetOffset - this.offset) * (1 - Math.exp(-0.6 * dt));
    this.cool -= dt;
    this.inv = Math.max(0, this.inv - dt);
    this.slide = Math.max(0, this.slide - dt);
    if (this.reload > 0) {
      this.reload -= dt;
      if (this.reload <= 0) this.ammo = this.ammoMax;
    }
    if (this.hold) this.fire();
    if (this.y > 0 || this.vy > 0) {
      this.vy -= 24 * dt;
      this.y = Math.max(0, this.y + this.vy * dt);
      if (this.y === 0) this.vy = 0;
    }
    if (this.mission.pursuit) {
      this.hunter -=
        dt * (this.mission.boss ? 0.32 + this.mission.id * 0.008 : 0.14);
      if (this.hunter <= 0) {
        this.end(false, "hunter");
        return;
      }
    }
    if (
      this.mission.branches &&
      !this.fork &&
      this.distance >= this.nextFork &&
      (this.endless || this.distance < this.goal - 500)
    ) {
      this.fork = { at: this.distance + 170, chosen: false };
      this.objects = this.objects.filter(
        (o) =>
          Math.abs(o.at - this.fork.at) >= 65 ||
          ![
            "barrier",
            "rock",
            "cart",
            "laser",
            "wall",
            "train",
            "gap",
            "drone",
            "bolt",
          ].includes(o.type),
      );
      this.emit("fork");
    }
    if (this.fork && this.distance >= this.fork.at)
      this.chooseRoute(this.lane === 1 ? "risk" : this.lane === -1 ? "safe" : "street");
    if (this.route !== "normal" && this.distance > this.routeEnds) {
      this.route = "normal";
      this.emit("routeEnd");
    }
    while (
      this.scriptIndex < this.script.length &&
      this.script[this.scriptIndex].at < this.distance + 155
    ) {
      let item = this.script[this.scriptIndex++];
      if (
        !this.routeSections.some(
          (s) => item.at >= s.start + 65 && item.at <= s.end,
        )
      )
        this.add(item.type, item.lane, item.at, item);
    }
    if (this.distance >= this.nextWave) {
      let curated = this.script.some(
        (e) => Math.abs(e.at - (this.distance + 155)) < 60,
      ) || this.routeSections.some((s) =>
        this.distance + 155 >= s.start + 65 && this.distance + 155 <= s.end);
      if (
        !curated &&
        (!this.fork || Math.abs(this.distance + 155 - this.fork.at) > 95)
      )
        this.generateWave();
      this.nextWave +=
        this.mission.spacing *
        (this.route === "safe" ? 1.3 : this.route === "risk" ? 0.88 : 1);
    }
    for (let shot of this.shots) {
      shot.t += dt;
      if (shot.t >= shot.duration) {
        let o = this.objects.find((x) => x.id === shot.target);
        if (o && !o.dead && o.at - this.distance > -2)
          this.hitTarget(o, shot.damage);
        shot.dead = true;
      }
    }
    this.shots = this.shots.filter((s) => !s.dead);
    for (let o of this.objects) {
      if (o.dead) continue;
      let previousAt = o.at;
      if (o.type === "rock" || o.type === "cart" || o.appearance === "wagon") {
        let travel = o.disabled ? 0 : o.rollSpeed * dt;
        o.at -= travel;
        o.rolled += travel + this.speed * dt;
      }
      let ahead = o.at - this.distance;
      if (o.type === "cart") o.arcY = o.drop ? Math.max(0, Math.min(9, (ahead - 45) * 0.16)) : 0;
      if (o.type === "saw") {
        let t = Math.max(0, Math.min(1, (90 - ahead) / 90)),
          ease = t * t * (3 - 2 * t);
        o.x = o.sweepSide * 10 * (1 - ease) + o.baseX * ease;
        o.arcY = Math.sin(t * Math.PI) * 1.7;
      } else if (o.moving)
        o.x =
          o.baseX +
          Math.sin(this.time * (1.25 + this.mission.threat * 0.08) + o.id) *
            (0.7 + this.mission.threat * 0.08);
      if (
        (HAZARDS.has(o.type) || o.appearance === "wagon") &&
        !o.warned &&
        ahead < (["saw", "rock", "cart"].includes(o.type) || o.appearance === "wagon" ? 100 : 38) &&
        ahead > 0
      ) {
        o.warned = true;
        this.emit("warning", { kind: o.appearance === "wagon" ? "wagon" : o.type,
          lane: o.lane, side: o.sweepSide });
      }
      if (
        o.type === "drone" &&
        o.appearance !== "wagon" &&
        !o.disabled &&
        !o.fired &&
        ahead < 70 &&
        ahead > 25
      ) {
        o.fired = true;
        let at = this.distance + Math.max(18, ahead * 0.48);
        this.add("bolt", this.lane, at, { x: this.x });
        this.emit("enemyFire", { object: o.id, targetAt: at, targetX: this.x });
      }
      if (!o.hit && prev <= previousAt && this.distance >= o.at) {
        o.hit = true;
        let same = Math.abs(this.x - o.x) <
          (o.type === "bolt" ? 0.62 : o.type === "rock" ? 1.5 : 1.2);
        if (same) {
          if (o.type === "coin" && this.y < 1.5) {
            this.coins += o.value || 1;
            o.dead = true;
            this.emit("coin", { object: o.id });
          } else if (o.type === "power") {
            this.power = Math.min(5, this.power + 1);
            o.dead = true;
            this.emit("power", { level: this.power });
          } else if (o.type === "gem") {
            this.gems++;
            o.dead = true;
            this.emit("gem", { total: this.gems });
          } else if (o.type === "shield") {
            this.shield = Math.min(4, this.shield + 1);
            o.dead = true;
            this.emit("shield");
          } else if (o.type === "repair") {
            this.cargo = Math.min(100, this.cargo + 20);
            o.dead = true;
            this.emit("repair");
          } else if (HAZARDS.has(o.type) || o.type === "drone") {
            let safe =
              o.type === "barrier" || o.type === "saw"
                ? this.y > 1.1
                : o.type === "gap"
                  ? this.y > 0.65
                  : o.type === "laser"
                    ? this.slide > 0
                    : o.type === "bolt"
                      ? this.y > 1.1 || this.slide > 0
                      : false;
            if (!safe) this.damage(o);
          }
        }
      }
      if (ahead < -22) o.dead = true;
    }
    this.objects = this.objects.filter((o) => !o.dead);
    if (!this.endless && this.distance >= this.goal)
      this.end(this.cargo > 0, "delivered");
    if (this.phase === "play" && this.cargo < 0) this.end(false, "cargo");
  }
  end(success, reason) {
    if (this.phase !== "play") return;
    this.phase = "end";
    let obj = objective(this.mission),
      met =
        obj.kind === "clean"
          ? this.damageCount === 0
          : obj.kind === "hunter"
            ? this.hunter >= obj.count
            : obj.kind === "risk"
              ? this.routes.includes("risk")
              : obj.kind === "environment"
                ? this.environment >= obj.count
                : this.kills >= obj.count;
    let stars = success ? 1 + (this.cargo >= 75 ? 1 : 0) + (met ? 1 : 0) : 0;
    let runScore = Math.floor(this.distance * 10 + this.coins * 25 + this.gems * 150 +
      this.kills * 200 + this.environment * 100);
    this.score = runScore + (success ? 5000 + stars * 1000 : 0);
    this.result = {
      success,
      score: this.score,
      reason,
      mission: this.mission.id,
      endless: this.endless,
      freePlay: this.upgrades.freePlay === true,
      distance: this.distance,
      cargo: this.cargo,
      coins: Math.round(
        this.coins *
          (this.contract === "elite"
            ? 2
            : this.contract === "bounty"
              ? 1.5
              : 1),
      ),
      gems: this.gems,
      power: this.power,
      kills: this.kills,
      environment: this.environment,
      routes: [...this.routes],
      stars,
      landscape: this.upgrades.landscape || "western",
      runScore,
      deliveryBonus: success ? 5000 : 0,
      starBonus: success ? stars * 1000 : 0,
      cargoStar: success && this.cargo >= 75,
      objective: met,
      objectiveText: obj.text,
      time: this.time,
    };
    this.emit("end", { result: this.result });
  }
}
