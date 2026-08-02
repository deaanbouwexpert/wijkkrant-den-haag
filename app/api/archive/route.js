import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getArchive, setArchive } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "wijkkrant-images";

export async function GET() {
  const archive = await getArchive();
  const sorted = [...archive].sort((a, b) => (b.year - a.year) || (b.month - a.month) || (a.lang < b.lang ? -1 : 1));
  return NextResponse.json({ archive: sorted });
}

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { title, year, month, lang, file } = await req.json();

  if (!title || !year || !month || !file) {
    return NextResponse.json({ error: "Vul titel, jaar, maand in en kies een PDF-bestand." }, { status: 400 });
  }

  const match = /^data:(application\/pdf);base64,(.*)$/.exec(file);
  if (!match) {
    return NextResponse.json({ error: "Alleen PDF-bestanden zijn toegestaan." }, { status: 400 });
  }
  const buffer = Buffer.from(match[2], "base64");
  const filename = `archief/${year}-${String(month).padStart(2, "0")}-${lang || "nl"}-${Date.now()}.pdf`;

  const { error } = await supabase.storage.from(BUCKET).upload(filename, buffer, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) {
    return NextResponse.json({ error: "Uploaden is niet gelukt." }, { status: 500 });
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);

  const archive = await getArchive();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    year: Number(year),
    month: Number(month),
    lang: lang || "nl",
    url: data.publicUrl,
    createdAt: new Date().toISOString(),
  };
  await setArchive([...archive, entry]);

  return NextResponse.json({ ok: true, entry });
}

export async function DELETE(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { id } = await req.json();
  const archive = await getArchive();
  await setArchive(archive.filter((a) => a.id !== id));
  return NextResponse.json({ ok: true });
}
