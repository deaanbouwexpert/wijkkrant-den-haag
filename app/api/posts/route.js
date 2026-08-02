import { NextResponse } from "next/server";
import { getPosts, setPosts } from "../../../lib/kv";

export async function GET() {
  const posts = await getPosts();
  const published = posts.filter((p) => p.status === "published");
  return NextResponse.json({ posts: published });
}

export async function POST(req) {
  const body = await req.json();
  const { name, category, title, text, images, polished } = body;

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Tekst is verplicht." }, { status: 400 });
  }

  const posts = await getPosts();
  const post = {
    id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: (name || "Anoniem").trim(),
    category: category || "anders",
    title: (title || "").trim(),
    text: text.trim(),
    aiPolished: !!polished,
    images: Array.isArray(images) ? images : [],
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  posts.push(post);
  await setPosts(posts);

  return NextResponse.json({ ok: true, id: post.id });
}
