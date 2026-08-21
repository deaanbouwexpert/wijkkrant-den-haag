import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminPassword } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "wijkkrant-backups";

// Geeft een lijst van automatische back-ups terug, elk met een tijdelijke,
// beveiligde downloadlink (de opslagplek zelf is afgeschermd, niet openbaar).
export async function GET(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }

  const { data: files, error } = await supabase.storage.from(BUCKET).list("backups", {
    sortBy: { column: "name", order: "desc" },
  });
  if (error || !files) {
    return NextResponse.json({ backups: [] });
  }

  const backups = [];
  for (const f of files) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(`backups/${f.name}`, 60 * 10); // 10 minuten geldig
    backups.push({
      name: f.name,
      size: f.metadata?.size || null,
      updatedAt: f.updated_at || f.created_at || null,
      url: signed?.signedUrl || null,
    });
  }

  return NextResponse.json({ backups });
}
