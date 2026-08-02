import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TABLE = "wijkkrant_store";
const POSTS_KEY = "posts";
const CONFIG_KEY = "config";
const ARCHIVE_KEY = "archive";

async function getValue(key, fallback) {
  const { data, error } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
  if (error || !data) return fallback;
  return data.value;
}

async function setValue(key, value) {
  await supabase.from(TABLE).upsert({ key, value });
}

export async function getPosts() {
  const posts = await getValue(POSTS_KEY, []);
  return posts || [];
}

export async function setPosts(posts) {
  await setValue(POSTS_KEY, posts);
}

export async function getConfig() {
  const cfg = await getValue(CONFIG_KEY, null);
  if (cfg) return cfg;
  return { password: process.env.ADMIN_PASSWORD || "wijk2025" };
}

export async function setConfig(cfg) {
  await setValue(CONFIG_KEY, cfg);
}

export async function getArchive() {
  const archive = await getValue(ARCHIVE_KEY, []);
  return archive || [];
}

export async function setArchive(archive) {
  await setValue(ARCHIVE_KEY, archive);
}
