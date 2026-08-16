import { NextResponse } from "next/server";
import { getPosts, setPosts } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const posts = await getPosts();
  return NextResponse.json({ posts });
}

// De redacteur maakt hier zelf direct een bericht aan (bijv. een programma-overzicht als PDF).
// Dit gaat, anders dan bij ingestuurde bijdragen, direct de wijkkrant in (status "published").
export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const body = await req.json();
  const { category, org, title, text, pdfUrl, pdfName } = body;

  const hasText = text && text.trim();
  const hasPdf = pdfUrl && pdfUrl.trim();

  if (!hasText && !hasPdf) {
    return NextResponse.json({ error: "Voeg tekst of een PDF-bestand toe." }, { status: 400 });
  }

  const posts = await getPosts();
  const post = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: "Redactie",
    category: category || "agenda",
    org: org || "",
    title: (title || "").trim(),
    text: (text || "").trim(),
    images: [],
    pdfUrl: hasPdf ? pdfUrl.trim() : null,
    pdfName: (pdfName || "").trim(),
    status: "published",
    createdAt: new Date().toISOString(),
  };
  posts.push(post);
  try {
    await setPosts(posts);
  } catch (e) {
    return NextResponse.json({ error: `Opslaan is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: post.id });
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
  try {
    await setPosts(next);
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
  const posts = await getPosts();
  const next = posts.filter((p) => p.id !== id);
  try {
    await setPosts(next);
  } catch (e) {
    return NextResponse.json({ error: `Verwijderen is mislukt: ${e.message || "onbekende fout"}` }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
