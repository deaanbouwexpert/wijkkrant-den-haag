import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { checkAdminPassword } from "../../../../lib/auth";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "wijkkrant-images";

export async function POST(req) {
  if (!(await checkAdminPassword(req))) {
    return NextResponse.json({ error: "Onjuist wachtwoord." }, { status: 401 });
  }
  const { year, month, lang } = await req.json();
  if (!year || !month) {
    return NextResponse.json({ error: "Jaar en maand zijn verplicht." }, { status: 400 });
  }

  const path = `archief/${year}-${String(month).padStart(2, "0")}-${lang || "nl"}-${Date.now()}.pdf`;

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ error: "Kon geen upload-link aanmaken." }, { status: 500 });
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    path,
    signedUrl: data.signedUrl,
    token: data.token,
    publicUrl: pub.publicUrl,
  });
}
