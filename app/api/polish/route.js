import { NextResponse } from "next/server";

export async function POST(req) {
  const { text } = await req.json();

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Geen tekst ontvangen." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    // AI-controle niet ingesteld: geef gewoon de originele tekst terug.
    return NextResponse.json({ polished: text, note: "AI-controle niet ingesteld." });
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 800,
        system:
          "Je verbetert alleen spelling, grammatica en interpunctie van de aangeleverde tekst voor een kerkelijke wijkkrant. Behoud de taal (Nederlands of Engels), de toon en de volledige betekenis. Voeg geen nieuwe informatie toe, verzin niets en maak de tekst niet langer of korter dan nodig. Geef alleen de gecorrigeerde tekst terug, zonder inleiding, uitleg of aanhalingstekens.",
        messages: [{ role: "user", content: text }],
      }),
    });
    const data = await res.json();
    const polished = data?.content?.[0]?.text?.trim();
    return NextResponse.json({ polished: polished || text });
  } catch (e) {
    return NextResponse.json({ polished: text, note: "AI-controle mislukt, originele tekst gebruikt." });
  }
}
