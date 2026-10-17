import test from "node:test";
import assert from "node:assert/strict";
import { Run, MISSIONS, validateSave, rewardRun, missionName } from "../dist/core.js";
test("each map has its own 40 unique stage names without bazaar names on the trail", () => {
  for (let map of ["western", "trail"]) {
    let names = MISSIONS.map((m) => missionName(m, map));
    assert.equal(new Set(names).size, 40);
  }
  let trail = MISSIONS.map((m) => missionName(m, "trail")).join(" ");
  assert.ok(!/Çarşı/.test(trail));
  assert.notEqual(missionName(MISSIONS[2], "western"), missionName(MISSIONS[2], "trail"));
});
test("stars are stored per map and survive validation", () => {
  let r = { success: true, coins: 0, mission: 0, stars: 3, cargo: 100 };
  let s = rewardRun({ version: 3 }, { ...r, landscape: "western" });
  assert.equal(s.records[0].stars, 3);
  assert.equal(s.trailRecords[0], undefined);
  s = rewardRun(s, { ...r, stars: 1, landscape: "trail" });
  s = validateSave({ ...s, version: 3 });
  assert.equal(s.records[0].stars, 3);
  assert.equal(s.trailRecords[0].stars, 1);
});
test("a shield-blocked hit keeps the no-damage goal; score breakdown adds up", () => {
  let run = new Run(0, { shield: 1 });
  run.damage({ type: "barrier", id: 1 });
  assert.equal(run.damageCount, 0);
  assert.equal(run.cargo, 100);
  run.distance = run.goal;
  run.end(true, "delivered");
  assert.equal(run.result.stars, 3);
  assert.equal(run.result.runScore + run.result.deliveryBonus + run.result.starBonus, run.result.score);
});
