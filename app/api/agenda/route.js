import { NextResponse } from "next/server";
import { getAgendaDates, setAgendaDates } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const dates = await getAgendaDates();
  return NextResponse.json({ dates });
}

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { title, when, note } = await req.json();
  if (!title || !when) {
    return NextResponse.json({ error: "Vul een titel en 'wanneer' in." }, { status: 400 });
  }

  const dates = await getAgendaDates();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: title.trim(),
    when: when.trim(),
    note: (note || "").trim(),
    createdAt: new Date().toISOString(),
  };
  await setAgendaDates([...dates, entry]);

  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { id } = await req.json();
  const dates = await getAgendaDates();
  await setAgendaDates(dates.filter((d) => d.id !== id));
  return NextResponse.json({ ok: true });
}
