import test from "node:test";
import assert from "node:assert/strict";
import { validateSave, rewardRun } from "../dist/core.js";
import {
  loadGame,
  saveGame,
  normalizeProfile,
  claimLogin,
  recordDaily,
  claimTask,
  selectCostume,
  dailyState,
  LOGIN_REWARDS,
  REWARDED_ADS_ENABLED,
  showRewardedAd,
} from "../dist/profile.js";
const date = (n) => new Date(2026, 9, n, 12);
test("single persistence layer migrates old saves, tolerates corrupt/blocked storage, retains cosmetics after core rewards", () => {
  let value = JSON.stringify({ ...validateSave(null), coins: 1000 });
  const storage = { getItem: () => value, setItem: (k, v) => (value = v) };
  let { settings, profile } = loadGame(storage, validateSave);
  assert.equal(settings.coins, 1000);
  assert.equal(profile.costume, "courier");
  assert(selectCostume(settings, profile, "ember"));
  profile.tutorialDone = true;
  settings = rewardRun(settings, {
    mission: 0,
    success: false,
    score: 50,
    coins: 3,
    gems: 1,
    stars: 0,
    endless: false,
  });
  assert(saveGame(storage, settings, profile));
  let restored = loadGame(storage, validateSave);
  assert.equal(restored.profile.costume, "ember");
  assert.equal(restored.profile.tutorialDone, true);
  value = "{broken";
  assert.equal(
    loadGame(storage, validateSave).settings.coins,
    validateSave(null).coins,
  );
  const blocked = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("quota");
    },
  };
  assert.equal(
    loadGame(blocked, validateSave).settings.coins,
    validateSave(null).coins,
  );
  assert.equal(saveGame(blocked, settings, profile), false);
  assert.doesNotThrow(() =>
    normalizeProfile({ costumes: 12, tasks: { claimed: 42 } }),
  );
});
test("seven-day reward calendar cannot be claimed twice, cycles and resets after absence", () => {
  const settings = validateSave(null),
    profile = normalizeProfile();
  for (let i = 1; i <= 7; i++) {
    assert.equal(claimLogin(settings, profile, date(i)), LOGIN_REWARDS[i - 1]);
    assert.equal(claimLogin(settings, profile, date(i)), 0);
  }
  assert.equal(profile.login.streak, 7);
  assert.equal(claimLogin(settings, profile, date(8)), 50);
  assert.equal(profile.login.streak, 1);
  claimLogin(settings, profile, date(10));
  assert.equal(profile.login.streak, 1);
});
test("three daily tasks accumulate between runs and claims are idempotent; next day resets", () => {
  const settings = validateSave(null),
    profile = normalizeProfile();
  recordDaily(profile, { distance: 300, gems: 10, coins: 25 }, date(1));
  assert.equal(claimTask(settings, profile, 0, date(1)), false);
  recordDaily(profile, { distance: 210, gems: 10, coins: 25 }, date(1));
  for (let i = 0; i < 3; i++) {
    assert.equal(claimTask(settings, profile, i, date(1)), true);
    assert.equal(claimTask(settings, profile, i, date(1)), false);
  }
  assert.equal(settings.coins, 220);
  assert.equal(dailyState(profile, date(2)).distance, 0);
});
test("cosmetic selections do not change combat or movement settings and never charge twice", () => {
  const settings = validateSave(null),
    profile = normalizeProfile();
  settings.coins = 1000;
  const before = { ...settings };
  assert(selectCostume(settings, profile, "crimson"));
  assert.equal(settings.coins, 100);
  assert(selectCostume(settings, profile, "crimson"));
  assert.equal(settings.coins, 100);
  assert.equal(selectCostume(settings, profile, "ember"), false);
  assert.deepEqual({ ...settings, coins: before.coins }, before);
});
test("rewarded ads are disabled; the only adapter is a deterministic offline mock", async () => {
  assert.equal(REWARDED_ADS_ENABLED, false);
  assert.deepEqual(await showRewardedAd(), { success: true, mock: true });
});
