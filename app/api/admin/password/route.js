import { NextResponse } from "next/server";
import { getConfig, setConfig } from "../../../../lib/kv";
import { checkAdminPassword } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

// Wordt ook gebruikt als simpele inlogcheck vanuit de redactiepagina
export async function GET(req) {
  const ok = await checkAdminPassword(req);
  return NextResponse.json({ ok });
}

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { newPassword } = await req.json();
  if (!newPassword || !newPassword.trim()) {
    return NextResponse.json({ error: "Nieuw wachtwoord ontbreekt." }, { status: 400 });
  }
  const cfg = await getConfig();
  await setConfig({ ...cfg, password: newPassword.trim() });
  return NextResponse.json({ ok: true });
}
