import { NextResponse } from "next/server";
import { getCleaningRoster, setCleaningRoster } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const roster = await getCleaningRoster();
  const sorted = [...roster].sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  return NextResponse.json({ roster: sorted });
}

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { date, who } = await req.json();
  if (!date || !who) {
    return NextResponse.json({ error: "Vul een datum en wie in." }, { status: 400 });
  }

  const roster = await getCleaningRoster();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date,
    who: who.trim(),
    createdAt: new Date().toISOString(),
  };
  try {
    await setCleaningRoster([...roster, entry]);
  } catch (e) {
    return NextResponse.json({ error: `Opslaan is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { id } = await req.json();
  const roster = await getCleaningRoster();
  try {
    await setCleaningRoster(roster.filter((r) => r.id !== id));
  } catch (e) {
    return NextResponse.json({ error: `Verwijderen is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
