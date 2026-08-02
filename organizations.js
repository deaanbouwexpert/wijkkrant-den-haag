import { NextResponse } from "next/server";
import { getPosts, setPosts } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export async function GET(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const posts = await getPosts();
  return NextResponse.json({ posts });
}

export async function PATCH(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { id, updates } = await req.json();
  const posts = await getPosts();
  const next = posts.map((p) => {
    if (p.id !== id) return p;
    const merged = { ...p, ...updates };
    // Als titel/tekst is aangepast, zijn eerder gecachte vertalingen niet meer betrouwbaar.
    if ("title" in updates || "text" in updates) {
      delete merged.translations;
    }
    return merged;
  });
  await setPosts(next);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { id } = await req.json();
  const posts = await getPosts();
  const next = posts.filter((p) => p.id !== id);
  await setPosts(next);
  return NextResponse.json({ ok: true });
}
