import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const BUCKET = "wijkkrant-images";

// Geen wachtwoord-check: dit endpoint wordt gebruikt door het publieke inzendformulier,
// zodat wijkbewoners zelf een PDF (bijv. een programma-overzicht of flyer) kunnen meesturen.
// Het bestand gaat via een tijdelijke, eenmalige link rechtstreeks naar de opslag
// (bypassed de 4.5MB-limiet van een Vercel-functie).
export async function POST() {
  const path = `submitted-pdfs/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.pdf`;

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
