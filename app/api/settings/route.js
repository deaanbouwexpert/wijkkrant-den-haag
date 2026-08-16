import { NextResponse } from "next/server";
import { getSettings, setSettings } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const updates = await req.json();
  const current = await getSettings();
  const next = { ...current, ...updates };
  await setSettings(next);
  return NextResponse.json({ ok: true, settings: next });
}
