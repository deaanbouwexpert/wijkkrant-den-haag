import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(req) {
  const { images } = await req.json();

  if (!images || !Array.isArray(images)) {
    return NextResponse.json({ error: "Geen afbeeldingen ontvangen." }, { status: 400 });
  }

  const urls = [];
  for (const dataUrl of images) {
    const match = /^data:(image\/\w+);base64,(.*)$/.exec(dataUrl);
    if (!match) continue;
    const contentType = match[1];
    const buffer = Buffer.from(match[2], "base64");
    const ext = contentType.split("/")[1] || "jpg";
    const filename = `wijkkrant/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const blob = await put(filename, buffer, { access: "public", contentType });
    urls.push(blob.url);
  }

  return NextResponse.json({ urls });
}
