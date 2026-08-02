import { NextResponse } from "next/server";
import { getPosts, setPosts } from "../../../lib/kv";

async function translateWithClaude(title, text, targetLang) {
  const targetName = targetLang === "en" ? "Engels" : "Nederlands";
  const system =
    `Je bent vertaler voor een kerkelijke wijkkrant. Vertaal de aangeleverde titel en tekst naar het ${targetName}. ` +
    "Behoud de toon, betekenis en alle namen exact zoals ze zijn (namen van personen, plaatsen en Bijbelse/kerkelijke termen vertaal je niet, of alleen als er een gangbare vertaling bestaat). Verzin niets en voeg niets toe. " +
    'Antwoord ALLEEN met geldige JSON in dit exacte formaat, zonder uitleg of markdown-opmaak: {"title": "...", "text": "..."}';
  const userContent = JSON.stringify({ title: title || "", text: text || "" });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1200,
      system,
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await res.json();
  const raw = data?.content?.[0]?.text?.trim() || "{}";
  const cleaned = raw.replace(/^```json\s*|\s*```$/g, "");
  try {
    const parsed = JSON.parse(cleaned);
    return { title: parsed.title || title, text: parsed.text || text };
  } catch {
    return { title, text };
  }
}

export async function POST(req) {
  const { id, targetLang } = await req.json();

  if (!id || !targetLang || !["nl", "en"].includes(targetLang)) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  const posts = await getPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: "Bericht niet gevonden." }, { status: 404 });
  }

  // Al vertaald en gecachet? Geef dat meteen terug, geen nieuwe AI-aanroep nodig.
  if (post.translations?.[targetLang]) {
    return NextResponse.json({ title: post.translations[targetLang].title, text: post.translations[targetLang].text });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ title: post.title, text: post.text, note: "AI-vertaling niet ingesteld." });
  }

  try {
    const translated = await translateWithClaude(post.title, post.text, targetLang);
    const nextPosts = posts.map((p) =>
      p.id === id
        ? { ...p, translations: { ...(p.translations || {}), [targetLang]: translated } }
        : p
    );
    await setPosts(nextPosts);
    return NextResponse.json(translated);
  } catch (e) {
    return NextResponse.json({ title: post.title, text: post.text, note: "Vertalen mislukt." });
  }
}
