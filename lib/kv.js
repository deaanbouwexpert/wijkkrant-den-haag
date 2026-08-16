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
  // We sorteren op "id" aflopend en pakken de nieuwste rij. We gebruiken bewust
  // geen .maybeSingle(): als er (tijdelijk) meerdere rijen voor dezelfde key
  // bestaan, gooit .maybeSingle() een fout en krijg je de fallback — dan lijkt
  // het alsof opslaan niet werkt, terwijl de data er wel staat.
  let { data, error } = await supabase
    .from(TABLE)
    .select("value")
    .eq("key", key)
    .order("id", { ascending: false })
    .limit(1);
  if (error) {
    // Mocht sorteren op "id" om wat voor reden dan ook niet lukken: gewoon
    // proberen zonder sortering, beter dan meteen opgeven.
    const retry = await supabase.from(TABLE).select("value").eq("key", key).limit(1);
    data = retry.data;
    error = retry.error;
  }
  if (error || !data || data.length === 0) return fallback;
  return data[0].value;
}

async function setValue(key, value) {
  // BELANGRIJK: we verwijderen de oude rij nooit vóórdat de nieuwe veilig is
  // opgeslagen ("insert-eerst"-patroon). Zo kan het nooit meer gebeuren dat data
  // eerst weg is en de vervanging vervolgens mislukt — wat hiervoor wél gebeurde
  // met het "verwijderen + opnieuw toevoegen"-patroon, en dataverlies veroorzaakte.
  const { error } = await supabase.from(TABLE).insert({ key, value });
  if (error) {
    // Nu gooien we de fout WEL door, zodat een mislukte opslag ook echt als
    // fout terugkomt naar de gebruiker, in plaats van in stilte te mislukken.
    throw new Error(`Opslaan is mislukt: ${error.message || "onbekende fout"}`);
  }

  // Pas ná een geslaagde opslag ruimen we oudere rijen voor deze key op — en
  // zelfs als dat opruimen om wat voor reden dan ook faalt, is de nieuwe data
  // allang veilig binnen.
  try {
    const { data: rows } = await supabase
      .from(TABLE)
      .select("id")
      .eq("key", key)
      .order("id", { ascending: false });
    if (rows && rows.length > 1) {
      const staleIds = rows.slice(1).map((r) => r.id);
      await supabase.from(TABLE).delete().in("id", staleIds);
    }
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
