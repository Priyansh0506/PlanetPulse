/**
 * Supabase client.
 *
 * Configured via environment variables so credentials are not baked into the
 * bundle. Falls back to a no-op stub when the project is not configured, which
 * lets `storage.js` cleanly degrade to LocalStorage instead of throwing on
 * import — the app stays usable for anyone who clones the repo.
 *
 * See `.env.local.example` for the two values this expects.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// A stub that mimics just enough of the query builder to make every call
// resolve with an error, which is exactly what drives the local fallback.
function makeStubClient() {
  const result = { data: null, error: { message: 'Supabase not configured' } };
  const builder = {
    select: () => builder,
    insert: () => builder,
    upsert: () => builder,
    delete: () => builder,
    update: () => builder,
    eq: () => builder,
    gte: () => builder,
    lte: () => builder,
    limit: () => builder,
    order: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve) => Promise.resolve(result).then(resolve),
  };
  return { from: () => builder };
}

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey)
  : makeStubClient();