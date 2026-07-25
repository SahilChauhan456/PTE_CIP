// Supabase client for server-side Storage uploads (profile pictures).
// Uses the service-role key, so this must only ever run on the server.
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';

let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
} else {
  console.warn(
    '[supabase] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — profile picture uploads are disabled.'
  );
}

// Uploads a buffer to the storage bucket and returns its public URL.
async function uploadPublicFile(path, buffer, contentType) {
  if (!supabase) {
    const err = new Error('File storage is not configured on the server');
    err.status = 503;
    throw err;
  }
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, buffer, { contentType, upsert: true });
  if (error) {
    const err = new Error(`Upload failed: ${error.message}`);
    err.status = 502;
    throw err;
  }
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

module.exports = { supabase, uploadPublicFile, STORAGE_BUCKET };
