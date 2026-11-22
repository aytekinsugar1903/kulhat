import { L } from "./i18n.js";
// All persistence goes through these two functions. Replace the adapter for a platform SDK.
export const SAVE_KEY = "kulhat-save-v2";
export function loadGame(storage, validate) {
  let raw = null;
  try {
    raw = JSON.parse(storage.getItem(SAVE_KEY));
  } catch {}
  return { settings: validate(raw), profile: normalizeProfile(raw?.profile) };
}
export function saveGame(storage, settings, profile) {
  try {
    storage.setItem(
      SAVE_KEY,
      JSON.stringify({ ...settings, profile: normalizeProfile(profile) }),
    );
    return true;
  } catch {
    return false;
  }
}
export const COSTUMES = [
  {
    id: "courier",
    name: L("Külhat"),
    price: 0,
    suit: "#174c5c",
    armor: "#66d7cb",
  },
  { id: "ember", name: L("Kor"), price: 200, suit: "#743c2b", armor: "#ffa45e" },
  {
    id: "sage",
    name: L("Adaçayı"),
    price: 350,
    suit: "#334d3c",
    armor: "#afce82",
  },
  { id: "violet", name: L("Gece"), price: 500, suit: "#433665", armor: "#c0a0f0" },
  {
    id: "ivory",
    name: L("Fildişi"),
    price: 700,
    suit: "#635b4a",
    armor: "#eee1bf",
  },
  {
    id: "crimson",
    name: L("Kızıl"),
    price: 900,
    suit: "#552e36",
    armor: "#f06e80",
  },
];
const amount = (n) =>
  Number.isFinite(n) ? Math.max(0, Math.min(1e9, Math.floor(n))) : 0;
export function normalizeProfile(p = {}) {
  p = p && typeof p === "object" ? p : {};
  const owned = COSTUMES.filter(
    (c) =>
      c.price === 0 || (Array.isArray(p.costumes) && p.costumes.includes(c.id)),
  ).map((c) => c.id);
  return {
    version: 1,
    tutorialDone: !!p.tutorialDone,
    costumes: owned,
    costume: owned.includes(p.costume) ? p.costume : "courier",
    login: {
      last: typeof p.login?.last === "string" ? p.login.last : "",
      streak: Math.min(7, amount(p.login?.streak)),
    },
    tasks: {
      day: typeof p.tasks?.day === "string" ? p.tasks.day : "",
      distance: amount(p.tasks?.distance),
      gems: amount(p.tasks?.gems),
      coins: amount(p.tasks?.coins),
      claimed: [0, 1, 2].filter(
        (i) => Array.isArray(p.tasks?.claimed) && p.tasks.claimed.includes(i),
      ),
    },
  };
}
export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export const LOGIN_REWARDS = [50, 75, 100, 125, 150, 200, 300];
export const TASKS = [
  { key: "distance", target: 500, label: L("500 m koş"), reward: 60 },
  { key: "gems", target: 20, label: L("20 elmas topla"), reward: 90 },
  { key: "coins", target: 50, label: L("50 altın topla"), reward: 70 },
];
export function dailyState(profile, date = new Date()) {
  const key = dayKey(date);
  if (profile.tasks.day !== key)
    profile.tasks = { day: key, distance: 0, gems: 0, coins: 0, claimed: [] };
  return profile.tasks;
}
export function claimLogin(settings, profile, date = new Date()) {
  const key = dayKey(date);
  if (profile.login.last === key) return 0;
  const yesterday = new Date(date);
  yesterday.setDate(yesterday.getDate() - 1);
  const streak =
    profile.login.last === dayKey(yesterday)
      ? (profile.login.streak % 7) + 1
      : 1;
  profile.login = { last: key, streak };
  const reward = LOGIN_REWARDS[streak - 1];
  settings.coins += reward;
  return reward;
}
export function recordDaily(profile, result, date = new Date()) {
  const tasks = dailyState(profile, date);
  for (const [key, value] of Object.entries({
    distance: result.distance,
    gems: result.gems,
    coins: result.coins,
  }))
    tasks[key] = Math.min(1e9, tasks[key] + amount(value));
}
export function claimTask(settings, profile, index, date = new Date()) {
  const state = dailyState(profile, date),
    task = TASKS[index];
  if (!task || state.claimed.includes(index) || state[task.key] < task.target)
    return false;
  state.claimed.push(index);
  settings.coins += task.reward;
  return true;
}
export function selectCostume(settings, profile, id) {
  const item = COSTUMES.find((c) => c.id === id);
  if (!item) return false;
  if (!profile.costumes.includes(id)) {
    if (settings.coins < item.price) return false;
    settings.coins -= item.price;
    profile.costumes.push(id);
  }
  profile.costume = id;
  return true;
}
// Ads come only from the YouTube Playables ads API (via platform.js). Outside
// YouTube there is no ad SDK and no network call: every placement stays hidden.
export const REWARD_IDS = { doubleGold: "kulhat-double-gold-1", continueRun: "kulhat-continue-1" };
export function rewardedAdsAvailable(platform = globalThis.KULHAT_PLATFORM) {
  return !!platform?.ads?.available;
}
// Resolves {success:true} only when YouTube reports the reward as earned.
export async function showRewardedAd(id, platform = globalThis.KULHAT_PLATFORM) {
  if (!rewardedAdsAvailable(platform)) return { success: false, unavailable: true };
  try {
    return { success: (await platform.ads.rewarded(id)) === true };
  } catch {
    return { success: false };
  }
}
// Interstitial pacing: never during a player's first runs of the session, then at
// most one ad per 3 finished runs and per 3 minutes. Shown only on the result →
// next screen transition (never during play).
export const INTERSTITIAL_RULES = { firstAfterRuns: 3, everyRuns: 3, minGapMs: 180000 };
export function interstitialDue(p, now, rules = INTERSTITIAL_RULES) {
  return (
    p.sessionRuns >= rules.firstAfterRuns &&
    p.runsSinceAd >= rules.everyRuns &&
    now - p.lastAdAt >= rules.minGapMs
  );
}
