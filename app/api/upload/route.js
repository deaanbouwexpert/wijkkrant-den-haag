import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "wijkkrant-images";

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
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
      contentType,
      upsert: false,
    });
    if (error) continue;

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
    if (data?.publicUrl) urls.push(data.publicUrl);
  }

  return NextResponse.json({ urls });
}
