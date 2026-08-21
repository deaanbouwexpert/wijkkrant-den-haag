import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  getPosts,
  getArchive,
  getSettings,
  getAgendaDates,
  getCleaningRoster,
  getFeedback,
  getCleaningTeams,
  getCleaningRotation,
} from "../../../../lib/kv";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "wijkkrant-backups";
const KEEP_DAYS = 90; // oudere automatische back-ups ruimen we vanzelf op, zodat de opslag niet blijft groeien

async function ensureBucketExists() {
  const { data: buckets } = await supabase.storage.listBuckets();
  const exists = (buckets || []).some((b) => b.name === BUCKET);
  if (!exists) {
    // Bewust NIET publiek: een back-up bevat ook nog niet-goedgekeurde inzendingen,
    // verbeterpunten en (mogelijk) namen — dat hoort niet in de openbare foto-opslag.
    await supabase.storage.createBucket(BUCKET, { public: false });
  }
}

async function cleanupOldBackups() {
  const { data: files } = await supabase.storage.from(BUCKET).list("backups");
  if (!files) return;
  const cutoff = Date.now() - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const stale = files.filter((f) => {
    const match = f.name.match(/wijkkrant-backup-(\d{4}-\d{2}-\d{2})\.json/);
    if (!match) return false;
    const t = new Date(match[1]).getTime();
    return t < cutoff;
  });
  if (stale.length > 0) {
    await supabase.storage.from(BUCKET).remove(stale.map((f) => `backups/${f.name}`));
  }
}

// Deze route wordt wekelijks automatisch aangeroepen door Vercel Cron (zie vercel.json).
// Optioneel afgeschermd met CRON_SECRET, zodat niet zomaar iedereen 'm kan triggeren.
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Niet toegestaan." }, { status: 401 });
    }
  }

  const [posts, archive, settings, agendaDates, cleaningRoster, feedback, cleaningTeams, cleaningRotation] =
    await Promise.all([
      getPosts(),
      getArchive(),
      getSettings(),
      getAgendaDates(),
      getCleaningRoster(),
      getFeedback(),
      getCleaningTeams(),
      getCleaningRotation(),
    ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    posts,
    archive,
    settings,
    agendaDates,
    cleaningRoster,
    feedback,
    cleaningTeams,
    cleaningRotation,
  };

  try {
    await ensureBucketExists();
    const stamp = new Date().toISOString().slice(0, 10);
    const path = `backups/wijkkrant-backup-${stamp}.json`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, JSON.stringify(backup, null, 2), {
        contentType: "application/json",
        upsert: true,
      });
    if (error) throw error;

    await cleanupOldBackups();

    return NextResponse.json({ ok: true, path });
  } catch (e) {
    return NextResponse.json({ error: `Automatische back-up mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }
}
