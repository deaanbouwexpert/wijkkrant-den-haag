import { NextResponse } from "next/server";
import { getPosts, setPosts } from "../../../lib/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  const posts = await getPosts();
  const published = posts
    .filter((p) => p.status === "published")
    .map(({ name, ...rest }) => rest); // naam van de inzender blijft prive, alleen redactie ziet die
  return NextResponse.json({ posts: published });
}

export async function POST(req) {
  const body = await req.json();
  const { name, category, org, title, text, images, polished, pdfUrl, pdfName } = body;

  const hasText = text && text.trim();
  const hasImages = Array.isArray(images) && images.length > 0;
  const hasPdf = pdfUrl && pdfUrl.trim();

  if (!hasText && !hasImages && !hasPdf) {
    return NextResponse.json({ error: "Voeg tekst, een foto of een PDF toe." }, { status: 400 });
  }

  const posts = await getPosts();
  const post = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: (name || "Anoniem").trim(),
    category: category || "anders",
    org: org || "",
    title: (title || "").trim(),
    text: (text || "").trim(),
    aiPolished: !!polished,
    images: Array.isArray(images) ? images : [],
    pdfUrl: hasPdf ? pdfUrl.trim() : null,
    pdfName: (pdfName || "").trim(),
    status: "pending",
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
