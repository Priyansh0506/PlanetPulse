/**
 * Data layer for PlanetPulse.
 *
 * Decision: Supabase is the source of truth when it is reachable *and* the
 * tables exist, but the app must never hard-fail in front of a user because a
 * backend is down or unconfigured. A footprint log is small, single-user, and
 * low-stakes — losing the ability to record a trip because a remote table is
 * missing is a far worse outcome than silently keeping the entry locally.
 *
 * So: every read tries Supabase first, and falls back to LocalStorage. Every
 * write writes optimistically to LocalStorage immediately, then tries to sync.
 * If a Supabase write succeeds the local copy is dropped so we never show the
 * same entry twice. `source` is returned so the UI can honestly say whether the
 * data is live or local-only instead of pretending.
 */

import { supabase } from './supabaseClient';

const ACTIVITIES_KEY = 'planetpulse:activities';
const SETTINGS_KEY = 'planetpulse:settings';
const SEEDED_KEY = 'planetpulse:seeded';

// 'unknown' until the first successful round-trip tells us what we have to work with.
let backendMode = 'unknown'; // 'remote' | 'local'

export function getBackendMode() {
  return backendMode;
}

/* ------------------------------------------------------------------ */
/* Local helpers                                                       */
/* ------------------------------------------------------------------ */

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

function readLocalActivities() {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ACTIVITIES_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalActivities(list) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(list));
  } catch {
    /* quota or private mode — nothing useful to do beyond not throwing */
  }
}

function readLocalSetting(key) {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return key in parsed ? parsed[key] : null;
  } catch {
    return null;
  }
}

function writeLocalSetting(key, value) {
  if (!isBrowser()) return;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    parsed[key] = value;
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(parsed));
  } catch {
    /* ignore */
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/* ------------------------------------------------------------------ */
/* First-run seed                                                      */
/* ------------------------------------------------------------------ */

/**
 * A brand-new install shows an empty dashboard, which reads as "broken" to
 * anyone opening the app for the first time. So on the very first visit we lay
 * down a small, realistic week of demo entries so the charts, the pace line and
 * the history filters all have something true to show.
 *
 * Two rules keep this honest:
 *   * It happens at most once, tracked by SEEDED_KEY.
 *   * It never overwrites a log the user already has — if anything exists,
 *     remote or local, seeding is skipped entirely. Demo data must never
 *     replace real data.
 */
const SEED_PLAN = [
  // [type, quantity, daysAgo, hourOfDay]
  ['car', 34, 0, 8],
  ['veg_meal', 2, 0, 13],
  ['electricity', 9.5, 0, 19],
  ['bus', 12, 1, 8],
  ['nonveg_meal', 1, 1, 20],
  ['car', 26, 2, 9],
  ['veg_meal', 3, 2, 13],
  ['flight', 420, 3, 7],
  ['veg_meal', 1, 3, 18],
  ['electricity', 11, 4, 20],
  ['car', 18, 5, 10],
  ['nonveg_meal', 2, 5, 21],
];

function buildSeed() {
  const now = new Date();
  return SEED_PLAN.map(([type, quantity, daysAgo, hour], i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, (i * 7) % 60, 0, 0);
    const factor = FACTORS[type];
    return {
      id: `seed-${i}-${type}`,
      type,
      quantity,
      co2_kg: Number((factor * quantity).toFixed(3)),
      flagged: false,
      created_at: d.toISOString(),
      is_sample: true,
    };
  });
}

// Local copy of the factors lets this data layer stay importable without
// pulling in React or the calculator, which keeps it unit-testable.
const FACTORS = {
  car: 0.2,
  bus: 0.08,
  flight: 0.25,
  electricity: 0.8,
  veg_meal: 0.5,
  nonveg_meal: 2.0,
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function seedIfEmpty() {
  if (!isBrowser()) return false;
  try {
    if (window.localStorage.getItem(SEEDED_KEY)) return false;
    if (readLocalActivities().length > 0) {
      window.localStorage.setItem(SEEDED_KEY, '1');
      return false;
    }
  } catch {
    return false;
  }

  // Only seed when the remote table is genuinely empty too — if Supabase is
  // configured and already holds entries, demo data would be noise.
  try {
    const { data, error } = await supabase.from('activities').select('id').limit(1);
    if (error) throw error;
    if (data && data.length > 0) {
      window.localStorage.setItem(SEEDED_KEY, '1');
      return false;
    }
  } catch {
    // No backend — fine, local seeding is exactly right here.
  }

  writeLocalActivities(buildSeed());
  try {
    window.localStorage.setItem(SEEDED_KEY, '1');
  } catch {
    /* ignore */
  }
  return true;
}

export async function fetchActivities({ from, to } = {}) {
  let remote = null;
  let remoteOk = false;

  try {
    let query = supabase
      .from('activities')
      .select('id,type,quantity,co2_kg,flagged,created_at')
      .order('created_at', { ascending: false });
    query = query.limit(500);
    if (from) query = query.gte('created_at', from);
    if (to) query = query.lte('created_at', to);
    const { data, error } = await query;
    if (error) throw error;
    remote = data || [];
    remoteOk = true;
    backendMode = 'remote';
  } catch {
    backendMode = 'local';
  }

  const local = readLocalActivities();

  if (!remoteOk) {
    return sortDesc(filterRange(local, from, to));
  }

  // Remote wins; local-only entries (added while offline) are merged on top.
  const remoteIds = new Set(remote.map((r) => r.id));
  const merged = [...remote, ...local.filter((l) => !remoteIds.has(l.id))];
  return sortDesc(filterRange(merged, from, to));
}

function filterRange(list, from, to) {
  return list.filter((a) => {
    if (from && new Date(a.created_at) < new Date(from)) return false;
    if (to && new Date(a.created_at) > new Date(to)) return false;
    return true;
  });
}

function sortDesc(list) {
  return [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function logActivity({ type, quantity, co2Kg, flagged, createdAt }) {
  const entry = {
    id: makeId(),
    type,
    quantity,
    co2_kg: co2Kg,
    flagged: !!flagged,
    created_at: createdAt || new Date().toISOString(),
  };

  // Optimistic local write so the entry is never lost to a network hiccup.
  writeLocalActivities([entry, ...readLocalActivities()]);

  try {
    const { data, error } = await supabase
      .from('activities')
      .insert([
        {
          type,
          quantity,
          co2_kg: co2Kg,
          flagged: !!flagged,
          created_at: entry.created_at,
        },
      ])
      .select()
      .single();
    if (error) throw error;

    // Remote accepted it — drop the local duplicate and use the real row.
    writeLocalActivities(readLocalActivities().filter((a) => a.id !== entry.id));
    backendMode = 'remote';
    return { ...data, __synced: true };
  } catch {
    backendMode = 'local';
    return { ...entry, __synced: false };
  }
}

export async function deleteActivity(id) {
  writeLocalActivities(readLocalActivities().filter((a) => a.id !== id));
  try {
    const { error } = await supabase.from('activities').delete().eq('id', id);
    if (error) throw error;
  } catch {
    backendMode = 'local';
  }
}

export async function getWeeklyTarget() {
  try {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'weekly_target_kg')
      .maybeSingle();
    if (error) throw error;
    if (data) {
      backendMode = 'remote';
      return Number(data.value);
    }
  } catch {
    backendMode = 'local';
  }
  const local = readLocalSetting('weekly_target_kg');
  return local == null ? null : Number(local);
}

export async function setWeeklyTarget(kg) {
  writeLocalSetting('weekly_target_kg', String(kg));
  try {
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'weekly_target_kg', value: String(kg) }, { onConflict: 'key' });
    if (error) throw error;
  } catch {
    backendMode = 'local';
  }
}
