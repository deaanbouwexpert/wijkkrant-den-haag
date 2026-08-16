import { NextResponse } from "next/server";
import { getArchive, setArchive } from "../../../lib/kv";
import { checkAdminPassword } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const archive = await getArchive();
  const sorted = [...archive].sort((a, b) => (b.year - a.year) || (b.month - a.month) || (a.lang < b.lang ? -1 : 1));
  return NextResponse.json({ archive: sorted });
}

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { title, year, month, lang, publicUrl } = await req.json();

  if (!title || !year || !month || !publicUrl) {
    return NextResponse.json({ error: "Vul titel, jaar en maand in en upload een PDF-bestand." }, { status: 400 });
  }

  const archive = await getArchive();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    year: Number(year),
    month: Number(month),
    lang: lang || "nl",
    url: publicUrl,
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
