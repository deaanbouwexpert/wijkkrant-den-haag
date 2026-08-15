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
  // We gebruiken hier bewust geen .maybeSingle(): als er per ongeluk meerdere rijen
  // voor dezelfde key zouden bestaan (bijv. door een eerdere opslag-bug), gooit
  // .maybeSingle() een fout en krijg je altijd de fallback terug — dan lijkt het
  // alsof opslaan niet werkt, terwijl de data er wel staat (alleen dubbel).
  const { data, error } = await supabase.from(TABLE).select("value").eq("key", key).limit(1);
  if (error || !data || data.length === 0) return fallback;
  return data[0].value;
}

async function setValue(key, value) {
  // Verwijderen + opnieuw inserten i.p.v. upsert: dit werkt altijd goed, ook als de
  // tabel geen unieke constraint op "key" heeft (waardoor upsert soms gewoon een
  // extra rij toevoegt in plaats van de bestaande bij te werken). Ruimt eventuele
  // eerder ontstane dubbele rijen voor deze key ook meteen op.
  await supabase.from(TABLE).delete().eq("key", key);
  await supabase.from(TABLE).insert({ key, value });
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
