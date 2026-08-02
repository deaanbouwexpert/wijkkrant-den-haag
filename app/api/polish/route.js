import { NextResponse } from "next/server";

const VARIANT_STYLES = [
  { id: "kort", label: "Kort & bondig", instruction: "kort en bondig, to-the-point, geschikt voor een korte mededeling" },
  { id: "verhalend", label: "Warm verteld", instruction: "warm en verhalend, met wat sfeer en gevoel, alsof je het aan een vriend vertelt" },
  { id: "feestelijk", label: "Feestelijk", instruction: "enthousiast en feestelijk, gezellig getoonzet, gepast voor een vrolijk nieuwtje in de wijkkrant (gebruik hooguit één toepasselijke emoji)" },
];

async function callClaude(system, userText) {
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
      system,
      messages: [{ role: "user", content: userText }],
    }),
  });
  const data = await res.json();
  return data?.content?.[0]?.text?.trim() || "";
}

export async function POST(req) {
  const { text, mode } = await req.json();

  if (!text || !text.trim()) {
    return NextResponse.json({ error: "Geen tekst ontvangen." }, { status: 400 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    if (mode === "variants") {
      return NextResponse.json({
        variants: VARIANT_STYLES.map((s) => ({ id: s.id, label: s.label, text })),
        note: "AI-controle niet ingesteld.",
      });
    }
    return NextResponse.json({ polished: text, note: "AI-controle niet ingesteld." });
  }

  if (mode === "variants") {
    try {
      const results = await Promise.all(
        VARIANT_STYLES.map(async (s) => {
          const system =
            `Je herschrijft de aangeleverde tekst voor een kerkelijke wijkkrant in een ${s.instruction} stijl. ` +
            "Verbeter ook de spelling, grammatica en interpunctie. Behoud de taal (Nederlands of Engels) en de volledige, feitelijke betekenis — verzin niets en voeg geen nieuwe feiten of namen toe. Houd de lengte ongeveer gelijk aan het origineel. Geef alleen de tekst terug, zonder inleiding, uitleg of aanhalingstekens.";
          const out = await callClaude(system, text);
          return { id: s.id, label: s.label, text: out || text };
        })
      );
      return NextResponse.json({ variants: results });
    } catch (e) {
      return NextResponse.json({
        variants: VARIANT_STYLES.map((s) => ({ id: s.id, label: s.label, text })),
        note: "AI-suggesties genereren is mislukt, originele tekst gebruikt.",
      });
    }
  }

  try {
    const polished = await callClaude(
      "Je verbetert alleen spelling, grammatica en interpunctie van de aangeleverde tekst voor een kerkelijke wijkkrant. Behoud de taal (Nederlands of Engels), de toon en de volledige betekenis. Voeg geen nieuwe informatie toe, verzin niets en maak de tekst niet langer of korter dan nodig. Geef alleen de gecorrigeerde tekst terug, zonder inleiding, uitleg of aanhalingstekens.",
      text
    );
    return NextResponse.json({ polished: polished || text });
  } catch (e) {
    return NextResponse.json({ polished: text, note: "AI-controle mislukt, originele tekst gebruikt." });
  }
}
