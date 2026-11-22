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
  REWARD_IDS,
  rewardedAdsAvailable,
  showRewardedAd,
  interstitialDue,
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
test("outside YouTube there are no ads: no adapter, no reward", async () => {
  assert.equal(rewardedAdsAvailable(null), false);
  assert.equal(rewardedAdsAvailable({ inPlayables: false }), false);
  assert.deepEqual(await showRewardedAd(REWARD_IDS.doubleGold, null), {
    success: false,
    unavailable: true,
  });
});
test("rewarded ad grants only when YouTube reports the reward earned", async () => {
  const calls = [];
  const fake = (result) => ({
    ads: {
      available: true,
      rewarded: async (id) => {
        calls.push(id);
        if (result instanceof Error) throw result;
        return result;
      },
    },
  });
  assert.deepEqual(await showRewardedAd(REWARD_IDS.doubleGold, fake(true)), { success: true });
  assert.deepEqual(await showRewardedAd(REWARD_IDS.doubleGold, fake(false)), { success: false });
  assert.deepEqual(await showRewardedAd(REWARD_IDS.doubleGold, fake("yes")), { success: false });
  assert.deepEqual(await showRewardedAd(REWARD_IDS.doubleGold, fake(Error("no fill"))), { success: false });
  assert.ok(calls.every((id) => id === "kulhat-double-gold-1"));
  // Reward IDs must be readable and carry no user data.
  for (const id of Object.values(REWARD_IDS)) assert.match(id, /^[a-z0-9-]+$/);
});
test("interstitials wait for the first runs, then respect run and time gaps", () => {
  const now = 1_000_000;
  const p = (sessionRuns, runsSinceAd, lastAdAt) => ({ sessionRuns, runsSinceAd, lastAdAt });
  assert.equal(interstitialDue(p(1, 1, -Infinity), now), false);
  assert.equal(interstitialDue(p(2, 2, -Infinity), now), false);
  assert.equal(interstitialDue(p(3, 3, -Infinity), now), true);
  assert.equal(interstitialDue(p(6, 2, now - 600000), now), false);
  assert.equal(interstitialDue(p(6, 3, now - 60000), now), false);
  assert.equal(interstitialDue(p(6, 3, now - 180000), now), true);
});
