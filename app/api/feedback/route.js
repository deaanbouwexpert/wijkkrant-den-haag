import { NextResponse } from "next/server";
import { getFeedback, setFeedback } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

// De redactie bekijkt hier de ingestuurde verbeterpunten (wachtwoord vereist).
export async function GET(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const feedback = await getFeedback();
  return NextResponse.json({ feedback: [...feedback].reverse() });
}

// Iedereen (ook zonder wachtwoord) kan hier een verbeterpunt achterlaten.
export async function POST(req) {
  const { name, text } = await req.json();
  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Schrijf even wat je kwijt wilt." }, { status: 400 });
  }

  const feedback = await getFeedback();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: (name || "").trim(),
    text: text.trim(),
    createdAt: new Date().toISOString(),
  };
  try {
    await setFeedback([...feedback, entry]);
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
  const feedback = await getFeedback();
  try {
    await setFeedback(feedback.filter((f) => f.id !== id));
  } catch (e) {
    return NextResponse.json({ error: `Verwijderen is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
