import { NextResponse } from "next/server";
import { getCleaningRotation, setCleaningRotation } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const rotation = await getCleaningRotation();
  return NextResponse.json({ rotation });
}

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { anchorDate, order } = await req.json();
  if (!anchorDate || !Array.isArray(order) || order.length === 0) {
    return NextResponse.json({ error: "Vul een startdatum en minstens één team in." }, { status: 400 });
  }

  const rotation = { anchorDate, order: order.map((o) => o.trim()).filter(Boolean) };
  try {
    await setCleaningRotation(rotation);
  } catch (e) {
    return NextResponse.json({ error: `Opslaan is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true, rotation });
}
