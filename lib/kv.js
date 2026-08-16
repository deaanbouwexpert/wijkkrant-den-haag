import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const TABLE = "wijkkrant_store";
const POSTS_KEY = "posts";
const CONFIG_KEY = "config";
const ARCHIVE_KEY = "archive";
const SETTINGS_KEY = "settings";
const AGENDA_KEY = "agendaDates";
const ROSTER_KEY = "cleaningRoster";
const FEEDBACK_KEY = "feedback";

async function getValue(key, fallback) {
  const { data, error } = await supabase.from(TABLE).select("value").eq("key", key).maybeSingle();
  if (error || !data) return fallback;
  const v = data.value;
  // Compatibiliteit met een kortstondige eerdere opslagvorm (tijdens het
  // uitzoeken van deze bug) die de waarde verpakte in {__ts, data} — die pakken
  // we hier automatisch weer uit, zodat niets daarvan verloren gaat.
  if (v && typeof v === "object" && !Array.isArray(v) && "__ts" in v && "data" in v) {
    return v.data;
  }
  return v;
}

async function setValue(key, value) {
  // "key" is de primary key van deze tabel — er kan dus maar precies één rij per
  // key bestaan. Upsert is daarom de juiste, atomaire manier van opslaan: de
  // database werkt in één stap de bestaande rij bij (of maakt 'm aan als hij nog
  // niet bestaat). Geen aparte verwijder- of toevoeg-stap nodig, dus ook geen
  // moment waarop data kortstondig weg zou kunnen zijn.
  const { error } = await supabase.from(TABLE).upsert({ key, value }, { onConflict: "key" });
  if (error) {
    throw new Error(`Opslaan is mislukt: ${error.message || "onbekende fout"}`);
  }
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

export async function getSettings() {
  const settings = await getValue(SETTINGS_KEY, null);
  return settings || {};
}

export async function setSettings(settings) {
  await setValue(SETTINGS_KEY, settings);
}

export async function getAgendaDates() {
  const dates = await getValue(AGENDA_KEY, []);
  return dates || [];
}

export async function setAgendaDates(dates) {
  await setValue(AGENDA_KEY, dates);
}

export async function getCleaningRoster() {
  const roster = await getValue(ROSTER_KEY, []);
  return roster || [];
}

export async function setCleaningRoster(roster) {
  await setValue(ROSTER_KEY, roster);
}

export async function getFeedback() {
  const feedback = await getValue(FEEDBACK_KEY, []);
  return feedback || [];
}

export async function setFeedback(feedback) {
  await setValue(FEEDBACK_KEY, feedback);
}
