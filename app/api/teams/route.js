import { NextResponse } from "next/server";
import { getCleaningTeams, setCleaningTeams } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const teams = await getCleaningTeams();
  return NextResponse.json({ teams });
}

// Nieuw team toevoegen, of een bestaand team bijwerken (als "id" wordt meegestuurd).
export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { id, name, members } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "Vul een teamnaam in." }, { status: 400 });
  }

  const teams = await getCleaningTeams();
  const cleanMembers = Array.isArray(members) ? members.map((m) => m.trim()).filter(Boolean) : [];

  let next;
  if (id) {
    next = teams.map((t) => (t.id === id ? { ...t, name: name.trim(), members: cleanMembers } : t));
  } else {
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      members: cleanMembers,
      createdAt: new Date().toISOString(),
    };
    next = [...teams, entry];
  }

  try {
    await setCleaningTeams(next);
  } catch (e) {
    return NextResponse.json({ error: `Opslaan is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { id } = await req.json();
  const teams = await getCleaningTeams();
  try {
    await setCleaningTeams(teams.filter((t) => t.id !== id));
  } catch (e) {
    return NextResponse.json({ error: `Verwijderen is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
