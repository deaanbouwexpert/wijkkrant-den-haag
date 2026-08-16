import { NextResponse } from "next/server";
import { checkAdminPassword } from "../../../../lib/auth";
import {
  getPosts,
  getArchive,
  getSettings,
  getAgendaDates,
  getCleaningRoster,
  getFeedback,
} from "../../../../lib/kv";

export const dynamic = "force-dynamic";

// Geeft een volledige export van alle wijkkrant-data terug, zodat de redactie
// zelf af en toe een reservekopie kan downloaden en bewaren.
export async function GET(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }

  const [posts, archive, settings, agendaDates, cleaningRoster, feedback] = await Promise.all([
    getPosts(),
    getArchive(),
    getSettings(),
    getAgendaDates(),
    getCleaningRoster(),
    getFeedback(),
  ]);

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    posts,
    archive,
    settings,
    agendaDates,
    cleaningRoster,
    feedback,
  });
}
