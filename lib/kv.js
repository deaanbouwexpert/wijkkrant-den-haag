import { kv } from "@vercel/kv";

const POSTS_KEY = "wijkkrant:posts";
const CONFIG_KEY = "wijkkrant:config";

export async function getPosts() {
  const posts = await kv.get(POSTS_KEY);
  return posts || [];
}

export async function setPosts(posts) {
  await kv.set(POSTS_KEY, posts);
}

export async function getConfig() {
  const cfg = await kv.get(CONFIG_KEY);
  if (cfg) return cfg;
  return { password: process.env.ADMIN_PASSWORD || "wijk2025" };
}

export async function setConfig(cfg) {
  await kv.set(CONFIG_KEY, cfg);
}
