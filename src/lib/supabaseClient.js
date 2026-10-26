// supabaseClient.js
//
// This file replaces Base44 as the backend. It creates a Supabase client
// and builds an object with the EXACT same shape as the one Base44 used
// to inject (db.entities.*, db.auth.*, db.integrations.Core.UploadFile),
// then attaches it to `globalThis.__B44_DB__`.
//
// Every page in this app reads its data through that global, so the pages
// themselves did not need to change — this file is the ONLY place that
// talks to Supabase directly.

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in your .env.local file (see .env.example).'
  );
}

// Fallback strings stop the app from crashing on load if the keys are missing,
// so you see a clear error in the console instead of a blank white page.
export const supabase = createClient(
  supabaseUrl || 'https://missing-url.supabase.co',
  supabaseAnonKey || 'missing-key'
);

const STORAGE_BUCKET = 'school-files';

// ---------------------------------------------------------------------
// Entities: turns "list / get / create / update / delete / bulkUpdate"
// calls into normal Postgres queries via Supabase's table API.
// ---------------------------------------------------------------------
const TABLES = {
  Student: 'students',
  SchoolFile: 'school_files',
  Folder: 'folders',
  BoardTask: 'board_tasks',
  User: 'profiles',
};

// Base44 quietly accepted blank text ("") for fields like dates, numbers and
// links to other records. Postgres is strict and rejects "" for those, so any
// blank value in these columns is converted to null (= "empty") before saving.
const STRICT_COLUMNS = {
  students: ['age', 'grade_number'],
  school_files: ['file_size', 'folder_id', 'student_id'],
  folders: ['parent_folder_id'],
  board_tasks: ['due_date'],
};

function clean(table, payload) {
  const strict = STRICT_COLUMNS[table] || [];
  const out = { ...payload };
  for (const col of strict) {
    if (out[col] === '') out[col] = null;
  }
  return out;
}

function makeEntity(entityName) {
  const table = TABLES[entityName];

  return {
    // db.entities.X.list("-created_date", 200)
    async list(sort, limit) {
      let query = supabase.from(table).select('*');
      if (sort) {
        const desc = sort.startsWith('-');
        const column = desc ? sort.slice(1) : sort;
        query = query.order(column, { ascending: !desc });
      } else {
        query = query.order('created_date', { ascending: false });
      }
      if (limit) query = query.limit(limit);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    },

    async create(payload) {
      const { data, error } = await supabase
        .from(table).insert(clean(table, payload)).select().single();
      if (error) throw error;
      return data;
    },

    async update(id, payload) {
      const { data, error } = await supabase
        .from(table).update(clean(table, payload)).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },

    async delete(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    },

    // Used by "Promote Grades": [{ id, grade, grade_number, ... }, ...]
    async bulkUpdate(updates) {
      const results = await Promise.all(
        updates.map(({ id, ...fields }) =>
          supabase.from(table).update(clean(table, fields)).eq('id', id)
        )
      );
      const failed = results.find((r) => r.error);
      if (failed) throw failed.error;
      return { success: true };
    },
  };
}

const entities = {};
for (const name of Object.keys(TABLES)) {
  entities[name] = makeEntity(name);
}

// ---------------------------------------------------------------------
// Auth: maps Base44's auth calls onto Supabase Auth equivalents.
// (In the no-login version nothing forces you to use these, but the
// /login and /register pages still work if you want to try them.)
// ---------------------------------------------------------------------
async function getProfile(userId) {
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  return data;
}

const auth = {
  async isAuthenticated() {
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  },

  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      const err = new Error('Not authenticated');
      err.status = 401;
      throw err;
    }
    const profile = await getProfile(data.user.id);
    return { id: data.user.id, email: data.user.email, role: profile?.role || 'user', ...profile };
  },

  async loginViaEmailPassword(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },

  async loginWithProvider(provider, redirectPath = '/') {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${redirectPath}` },
    });
    if (error) throw error;
  },

  // Signs up AND logs in right away, as long as "Confirm email" is turned
  // OFF in Supabase (Authentication > Providers > Email).
  async register({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },

  async verifyOtp({ email, otpCode }) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token: otpCode, type: 'signup' });
    if (error) throw error;
    return { access_token: data.session?.access_token };
  },

  async resendOtp(email) {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) throw error;
  },

  // No-op: Supabase already holds the session after sign-in.
  setToken() {},

  async resetPasswordRequest(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  },

  // Supabase creates a temporary "recovery" session when the user clicks the
  // emailed link, so the old resetToken value isn't needed here.
  async resetPassword({ newPassword }) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  },

  async logout(redirectUrl) {
    await supabase.auth.signOut();
    if (redirectUrl) window.location.href = redirectUrl;
  },

  redirectToLogin() {
    window.location.href = '/login';
  },
};

// ---------------------------------------------------------------------
// File uploads -> Supabase Storage (bucket must be named "school-files")
// ---------------------------------------------------------------------
const integrations = {
  Core: {
    async UploadFile({ file }) {
      // Keep file names URL-safe (spaces/symbols can break storage paths)
      const safeName = (file.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_');
      // crypto.randomUUID only exists on https/localhost pages; when testing on a
      // phone over plain http WiFi it's missing, so fall back to a random string.
      const uid = globalThis.crypto?.randomUUID
        ? globalThis.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const path = `${uid}-${safeName}`;
      const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
        contentType: file.type || undefined,
      });
      if (error) throw error;
      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
      return { file_url: data.publicUrl };
    },
  },
};

export const db = { auth, entities, integrations };

// Make it available globally BEFORE the rest of the app evaluates.
// main.jsx imports this file first, so this runs before any page reads it.
globalThis.__B44_DB__ = db;

export default db;
