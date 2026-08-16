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
  // We houden zelf een tijdstempel bij in de opgeslagen data (in plaats van te
  // vertrouwen op een kolom als "id" of "created_at", waarvan we niet zeker weten
  // of die bestaat). We halen ALLE rijen voor deze key op en kiezen er zelf,
  // in code, de nieuwste van uit. Rijen van vóór deze aanpassing hebben nog geen
  // tijdstempel — die behandelen we als "heel oud", zodat nieuwere data altijd wint.
  const { data, error } = await supabase.from(TABLE).select("value").eq("key", key);
  if (error || !data || data.length === 0) return fallback;

  let bestTs = -1;
  let bestData = fallback;
  let found = false;
  for (const row of data) {
    const v = row.value;
    const isEnvelope = v && typeof v === "object" && !Array.isArray(v) && "__ts" in v;
    const ts = isEnvelope ? v.__ts : 0;
    if (!found || ts > bestTs) {
      bestTs = ts;
      bestData = isEnvelope ? v.data : v;
      found = true;
    }
  }
  return bestData;
}

async function setValue(key, value) {
  // BELANGRIJK: we verwijderen de oude rij nooit vóórdat de nieuwe veilig is
  // opgeslagen ("insert-eerst"-patroon), en we bewaren onze eigen tijdstempel
  // in de data zelf (i.p.v. te vertrouwen op een tabelkolom die we niet kennen).
  const ts = Date.now();
  const envelope = { __ts: ts, data: value };
  const { error } = await supabase.from(TABLE).insert({ key, value: envelope });
  if (error) {
    // Fout wél doorgooien, zodat een mislukte opslag ook echt als fout
    // terugkomt naar de gebruiker, in plaats van in stilte te mislukken.
    throw new Error(`Opslaan is mislukt: ${error.message || "onbekende fout"}`);
  }

  // Pas ná een geslaagde opslag ruimen we oudere rijen voor deze key op, op basis
  // van onze eigen tijdstempel (niet op basis van een tabelkolom). Best-effort:
  // zelfs als dit faalt, is de nieuwe data allang veilig binnen.
  try {
    await supabase.from(TABLE).delete().eq("key", key).neq("value->>__ts", String(ts));
  } catch {
    // Opruimen mislukt? Geen probleem, de nieuwe data staat al veilig opgeslagen.
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
