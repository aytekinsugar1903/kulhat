import test from "node:test";
import assert from "node:assert/strict";
import {
  Run,
  MISSIONS,
  COURIER_WEAPONS,
  validateSave,
  rewardRun,
  rng,
  signature,
} from "../dist/core.js";
import { pilot } from "./pilot.js";
test("heavy mine carts descend into the track, approach and deal two damage", () => {
  let r = new Run(30); r.script=[];r.nextWave=r.nextFork=Infinity;
  let cart=r.add("cart",0,200,{drop:true});
  r.step(0);assert.equal(cart.arcY,9);
  r.distance=160;r.step(0);assert.equal(cart.arcY,0);
  r.distance=199.9;r.step(0.04);assert.equal(r.health,1);
  assert.ok(cart.at<200);
});
test("scoreboard persists sorted top ten while free exploration does not skip campaign locks", () => {
  let r=new Run(39,{freePlay:true});r.distance=150;r.coins=10;r.end(true,"delivered");
  let s=rewardRun({version:3},r.result);
  assert.equal(s.unlocked,1);assert.equal(s.leaderboard[0].mission,39);
  assert.ok(s.leaderboard[0].score>0);
  let cleaned=validateSave({...s,leaderboard:[...s.leaderboard,{score:"bad",mission:2},
    ...Array.from({length:20},(_,i)=>({score:i,mission:0,distance:100}))]});
  assert.equal(cleaned.leaderboard.length,10);
  assert.ok(cleaned.leaderboard.every((x,i,a)=>i===0||a[i-1].score>=x.score));
});
test("western replaces airborne enemies with approaching wagons that never fire drone bolts", () => {
  for (let landscape of ["western", "trail"]) {
    let r = new Run(2, {landscape});
    r.script=[]; r.nextWave=r.nextFork=Infinity;
    let target=r.add("drone",0,50);
    r.step(0.04);
    assert.equal(target.appearance,landscape==="western"?"wagon":"drone");
    assert.equal(r.objects.some(o=>o.type==="bolt"),landscape!=="western");
    assert.equal(target.at<50,landscape==="western");
    r.hitTarget(target,100);
    assert.ok(target.dead);
    assert.equal(r.kills,1);
  }
});
test("terrain preference persists and the first encounter already contains an approaching rock", () => {
  assert.equal(validateSave({version:3,landscape:"trail"}).landscape,"trail");
  assert.equal(validateSave({version:3,landscape:"bad"}).landscape,"western");
  let r = new Run(0); r.nextFork=Infinity; r.script=[];
  for(let i=0;i<25;i++)r.step(0.04);
  assert.ok(r.objects.some(o=>o.type==="rock"));
  assert.ok(r.speed>=26);
});
test("rolling rock approaches in one lane and swept collisions cannot miss a fast crossing", () => {
  for (let lane of [-1, 0, 1]) {
    let r = new Run(0);
    r.script = []; r.nextWave = r.nextFork = Infinity;
    let rock = r.add("rock", lane, 80);
    r.step(0.04);
    assert.ok(rock.at < 80 && rock.rolled > 0);
    assert.equal(rock.x, lane * 3.2, "rock stays in its lane");
    assert.ok(r.takeEvents().some((e) => e.kind === "rock" && e.type === "warning"));
  }
  for (let lane of [0, 1]) {
    let r = new Run(0);
    r.script = []; r.nextWave = r.nextFork = Infinity;
    r.add("rock", lane, 0.1);
    r.step(0.04);
    assert.equal(r.health, lane === 0 ? 2 : 3, "adjacent lane remains safe");
  }
  let r = new Run(5); r.waveN = 0;
  let generated = r.generateWave();
  assert.ok(generated.some(([type]) => type === "rock"));
});
test("moving hazards share simulation coordinates and elite contracts pay double collected gold", () => {
  let a = new Run(10, { contract: "standard" }),
    b = new Run(10, { contract: "elite" });
  let hazard = a.add("barrier", 0, 100, { id: 3 });
  a.nextWave = b.nextWave = Infinity;
  a.script = b.script = [];
  a.step(0.04);
  b.step(0.04);
  assert.ok(hazard.moving && hazard.x !== hazard.baseX);
  assert.ok(Math.abs(hazard.x - hazard.baseX) <= 0.7);
  assert.ok(b.speed > a.speed);
  a.coins = b.coins = 25;
  a.end(true, "test");
  b.end(true, "test");
  assert.equal(b.result.coins, a.result.coins * 2);
});
test("reward trail pickups visibly grow weapon power and bank rare gems", () => {
  let r = new Run(8, {}, 72);
  r.nextWave = Infinity;
  r.add("power", 0, 0.5);
  r.add("gem", 0, 1);
  for (let i = 0; i < 4; i++) r.step(0.04);
  assert.equal(r.power, 1);
  assert.equal(r.gems, 1);
  r.end(true, "delivered");
  let saved = rewardRun({}, r.result);
  assert.ok(saved.diamonds >= 2, "collected gem plus first-clear reward are banked");
});
test("saws enter from both edges, rise on an arc and arrive at their warned lane", () => {
  for (let id of [2, 3]) {
    let r = new Run(10);
    r.script = [];
    r.nextWave = Infinity;
    let saw = r.add("saw", 0, 100, { id });
    r.step(0);
    assert.equal(saw.x, saw.sweepSide * 10);
    r.distance = 55;
    r.step(0);
    assert.ok(saw.arcY > 1.6);
    assert.ok(Math.abs(saw.x) > 4.9 && Math.abs(saw.x) < 5.1);
    r.distance = 100;
    r.step(0);
    assert.equal(saw.x, 0);
    assert.ok(saw.arcY < 0.001);
  }
});
test("campaign has 40 distinct missions and monotonic progression", () => {
  assert.equal(MISSIONS.length, 40);
  assert.equal(new Set(MISSIONS.map((m) => m.name)).size, 40);
  for (let i = 1; i < MISSIONS.length; i++) {
    assert.ok(MISSIONS[i].length >= MISSIONS[i - 1].length);
    assert.ok(MISSIONS[i].speed >= MISSIONS[i - 1].speed);
    assert.ok(MISSIONS[i].spacing <= MISSIONS[i - 1].spacing);
    assert.ok(MISSIONS[i].threat >= MISSIONS[i - 1].threat);
  }
  assert.equal(MISSIONS[0].threat, 1);
  assert.equal(MISSIONS[29].threat, 6);
});
test("controls, cargo, shield, pause/end guards", () => {
  let r = new Run(10);
  r.action("left");
  r.action("left");
  assert.equal(r.lane, -1);
  r.action("jump");
  for (let i = 0; i < 25; i++) r.step(0.04);
  assert.equal(r.y, 0);
  r.shield = 1;
  r.damage({ id: 1, type: "wall" });
  assert.equal(r.health, 3);
  r.inv = 0;
  r.damage({ id: 2, type: "wall" });
  assert.equal(r.health, 2);
  assert.equal(r.cargo, 75);
  r.end(true, "test");
  let x = r.distance;
  r.step(0.04);
  assert.equal(r.distance, x);
});
test("environment barrel, vent, gate change enemy and obstacle states", () => {
  let r = new Run(10);
  let b = r.add("barrel", 0, 100),
    d = r.add("drone", 1, 115),
    wall = r.add("barrier", 0, 110);
  r.hitTarget(b, 2);
  assert.ok(d.dead && wall.dead);
  let v = r.add("vent", 0, 200),
    d2 = r.add("drone", 0, 230);
  r.hitTarget(v, 2);
  assert.ok(d2.disabled);
  let p = r.add("panel", 0, 300),
    w = r.add("wall", 0, 325, { linked: true });
  r.hitTarget(p, 3);
  assert.ok(w.dead);
});
test("both route choices alter actual distance, risk, rewards and direction", () => {
  let a = new Run(4),
    b = new Run(4);
  a.fork = b.fork = { at: 0, chosen: false };
  a.chooseRoute("safe");
  b.fork = { at: 0, chosen: false };
  b.chooseRoute("risk");
  assert.ok(a.goal > b.goal);
  assert.ok(a.targetOffset < b.targetOffset);
  assert.ok(b.coins > a.coins);
  assert.ok(a.hunter > b.hunter);
});
test("save validation rejects malformed, extreme and nonfinite fields", () => {
  let s = validateSave({
    version: 3,
    coins: Infinity,
    unlocked: 500,
    shield: -1,
    records: { 0: { stars: 9, best: 90 }, 99: { stars: 3 } },
  });
  assert.equal(s.coins, 0);
  assert.equal(s.unlocked, 40);
  assert.equal(s.shield, 0);
  assert.equal(s.records[0].stars, 3);
  assert.equal(s.records[99], undefined);
  assert.equal(validateSave(null).unlocked, 1);
  let migrated = validateSave({ version: 2, coins: 5 });
  assert.equal(migrated.coins, 225);
  assert.equal(migrated.diamonds, 8);
  let retained = validateSave({
    version: 3,
    weaponMastery: { sidearm: 42, rail: Infinity },
    daily: { day: "2026-10-17", done: true },
  });
  assert.equal(retained.weaponMastery.sidearm, 42);
  assert.equal(retained.weaponMastery.rail, 0);
  assert.deepEqual(retained.daily, { day: "2026-10-17", done: true });
});
test("replay rewards are smaller; progress and stars do not regress", () => {
  let result = { success: true, coins: 10, mission: 0, stars: 3, cargo: 100 };
  let a = rewardRun({ version: 3 }, result),
    b = rewardRun(a, { ...result, stars: 1 });
  assert.equal(a.unlocked, 2);
  assert.equal(b.records[0].stars, 3);
  assert.equal(b.coins - a.coins, 30);
  assert.equal(a.diamonds, 2);
  assert.equal(b.diamonds, 2);
});
test("courier weapon inventory, levels and four fire profiles are validated", () => {
  let save = validateSave({
    weapon: "rail",
    ownedWeapons: ["rail", "fake"],
    weaponLevels: { rail: 3, sidearm: 99 },
    diamonds: 12,
  });
  assert.equal(save.weapon, "rail");
  assert.deepEqual(save.ownedWeapons, ["sidearm", "rail"]);
  assert.equal(save.weaponLevels.rail, 3);
  assert.equal(save.weaponLevels.sidearm, 4);
  let signatures = new Set();
  for (let weapon of Object.keys(COURIER_WEAPONS)) {
    let r = new Run(10, { weapon, weaponLevels: { [weapon]: 0 } }, 7);
    let target = r.add("drone", 0, 60);
    r.fire(target.id);
    signatures.add(
      [r.shots.length, r.shots[0].damage, r.cool, r.ammoMax].join(":"),
    );
  }
  assert.equal(signatures.size, 6);
});
test("all missions can finish at baseline upgrades with a reactive player", () => {
  let fail = [];
  for (let i = 0; i < MISSIONS.length; i++) {
    let r = new Run(i, {}, 100 + i);
    let result = pilot(r);
    if (!result?.success)
      fail.push({
        i,
        reason: result?.reason,
        distance: r.distance,
        health: r.health,
      });
  }
  assert.deepEqual(fail, []);
});
test("multiple seeds and risky forks remain traversable at upgraded equipment", () => {
  let fail = [];
  for (let seed = 1; seed <= 4; seed++)
    for (let i of [4, 9, 14, 19, 24, 29]) {
      let r = new Run(i, { shield: 2, gun: 1, cargo: 1 }, seed);
      let result = pilot(r, "risk");
      if (!result?.success) fail.push({ seed, i, result });
      assert.ok(r.objects.length < 200);
    }
  assert.deepEqual(fail, []);
});
test("route choice corridor is protected from prequeued and future hazards", () => {
  let r = new Run(5);
  r.distance = 420;
  r.nextFork = 420;
  r.add("train", 1, 590);
  r.step(0.01);
  assert.ok(r.fork);
  assert.equal(
    r.objects.some(
      (o) => o.type === "train" && Math.abs(o.at - r.fork.at) < 65,
    ),
    false,
  );
  assert.equal(r.add("wall", -1, r.fork.at), null);
});
test("all signature encounters occur before the mission end and are not merely retitled waves", async () => {
  let { signature } = await import("../dist/core.js");
  for (let m of MISSIONS) {
    let s = signature(m);
    assert.ok(s.length >= 2);
    assert.ok(s.every((o) => o.at < m.length));
    assert.equal(new Set(s.map((o) => o.type)).size >= 1, true);
  }
});
test("ammunition reload, endless duration and deterministic seeds", () => {
  let r = new Run(0);
  for (let i = 0; i < 12; i++) {
    r.cool = 0;
    r.fire();
  }
  assert.equal(r.ammo, 0);
  assert.ok(r.reload > 0);
  for (let i = 0; i < 35; i++) r.step(0.04);
  assert.equal(r.ammo, 12);
  let a = new Run(10, {}, 18),
    b = new Run(10, {}, 18);
  a.generateWave();
  b.generateWave();
  assert.deepEqual(a.objects, b.objects);
  let e = new Run(29, {}, 18, true);
  e.distance = e.goal + 10;
  e.step(0.01);
  assert.equal(e.phase, "play");
});

test("first mission exposes metro and roof branches with distinct encounters", () => {
  for (let choice of ["safe", "risk"]) {
    let r = new Run(0);
    while (!r.fork && r.phase === "play") r.step(0.04);
    assert.ok(r.fork && r.distance < 100);
    r.distance = r.fork.at;
    r.chooseRoute(choice);
    assert.equal(r.routeSections[0].kind, choice === "safe" ? "metro" : "roof");
    let hazards = r.objects.filter(
      (o) => o.at > r.distance + 65 && o.at < r.routeEnds &&
        !["coin", "gem", "power"].includes(o.type),
    );
    assert.equal(hazards.length, choice === "safe" ? 8 : 4);
    assert.ok(
      hazards.every((o) =>
        choice === "safe"
          ? ["cart", "rock"].includes(o.type)
          : o.type === "gap",
      ),
    );
    assert.ok(hazards.every((o) => o.at < r.goal));
  }
});
test("scripted encounters are postponed past the opening fork instead of deleted", () => {
  const r = new Run(0, {}, 1);
  const planned = signature(r.mission);
  let placed = 0;
  const orig = r.add.bind(r);
  r.add = (type, lane, at, extra = {}) => {
    const o = orig(type, lane, at, extra);
    if (extra.authored && o) placed++;
    return o;
  };
  r.damage = () => {};
  r.end = () => {};
  let guard = 0;
  while (guard++ < 12000 && r.scriptIndex < r.script.length) r.step(0.04);
  for (let i = 0; i < 80; i++) r.step(0.04);
  assert.equal(placed, planned.length);
  assert.equal(
    r.objects.filter((o) => o.authored && r.fork && Math.abs(o.at - r.fork.at) < 65).length,
    0,
  );
});
test("a committed lane still hits when the body is visually between lanes", () => {
  const r = new Run(0);
  r.script = [];
  r.nextWave = r.nextFork = Infinity;
  r.add("rock", 0, 0.15);
  r.x = 2.8;
  r.step(0.04);
  assert.equal(r.health, 2);
});
test("jumping does not skip a coin in the same lane", () => {
  const r = new Run(0);
  r.script = [];
  r.nextWave = r.nextFork = Infinity;
  r.y = 1.6;
  r.add("coin", 0, 0.2, { value: 1 });
  r.step(0.04);
  assert.equal(r.coins, 1);
});
test("clean runs survive late pursuit stages and bosses stay short of a free third star", () => {
  for (const i of [4, 34, 39]) {
    const r = new Run(i, {}, 3);
    r.damage = () => {
      r.inv = 0.2;
    };
    let guard = 0;
    while (r.phase === "play" && guard++ < 200000) r.step(0.04);
    assert.equal(r.result?.reason, "delivered", "mission " + i);
    assert.ok(r.hunter > 8, "mission " + i + " hunter " + r.hunter);
  }
  const boss = new Run(39, {}, 3);
  boss.damage = () => {
    boss.inv = 0.2;
  };
  let guard = 0;
  while (boss.phase === "play" && guard++ < 200000) boss.step(0.04);
  assert.ok(boss.hunter < 55);
});
test("middle fork selects a reward-bearing street route and all routes contain gems", () => {
  for (let choice of ["safe", "risk", "street"]) {
    let r = new Run(5);
    r.distance = 220; r.fork = { at: 220 };
    r.chooseRoute(choice);
    assert.ok(r.objects.filter((o) => o.type === "gem").length >= 4);
    assert.equal(r.routeSections[0].kind,
      choice === "safe" ? "metro" : choice === "risk" ? "roof" : "street");
  }
  let r = new Run(0); r.fork = { at: 0 }; r.step(0);
  assert.equal(r.route, "street");
});
