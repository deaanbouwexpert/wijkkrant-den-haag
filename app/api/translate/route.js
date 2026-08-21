import { NextResponse } from "next/server";
import {
  getPosts,
  setPosts,
  getAgendaDates,
  setAgendaDates,
  getCleaningRoster,
  setCleaningRoster,
} from "../../../lib/kv";

export const dynamic = "force-dynamic";

function targetName(targetLang) {
  return targetLang === "en" ? "Engels" : targetLang === "es" ? "Spaans" : "Nederlands";
}

// Generieke vertaalfunctie: stuurt een object van tekstvelden naar Claude en krijgt
// diezelfde velden terug, vertaald. Werkt zowel voor {title, text} van een bericht
// als voor {title, when, note} van een agenda-item of {who} van een roosterregel.
async function translateFields(fields, targetLang) {
  const system =
    `Je bent vertaler voor een kerkelijke wijkkrant. Vertaal de waarden in de aangeleverde JSON naar het ${targetName(targetLang)}. ` +
    "Behoud de toon en betekenis. Namen van personen, plaatsen en Bijbelse/kerkelijke termen vertaal je niet, of alleen als er een gangbare vertaling bestaat. Verzin niets en voeg niets toe. " +
    "Antwoord ALLEEN met geldige JSON met exact dezelfde keys als de invoer, zonder uitleg of markdown-opmaak.";
  const userContent = JSON.stringify(fields);

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
      messages: [{ role: "user", content: userContent }],
    }),
  });
  const data = await res.json();
  if (data?.error) {
    throw new Error(data.error.message || "Anthropic API-fout");
  }
  const raw = data?.content?.[0]?.text?.trim() || "{}";
  // Verwijder eventuele code-fences (```json of gewoon ```), waar Claude ook mee begint.
  const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  let jsonText = cleaned;
  // Als er per ongeluk nog tekst voor/na het JSON-object staat: pak het buitenste {...} object eruit.
  if (!jsonText.startsWith("{")) {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) jsonText = match[0];
  }
  try {
    const parsed = JSON.parse(jsonText);
    const result = {};
    for (const key of Object.keys(fields)) {
      result[key] = typeof parsed[key] === "string" ? parsed[key] : fields[key];
    }
    return result;
  } catch {
    return fields;
  }
}

export async function POST(req) {
  const { id, targetLang, type = "post" } = await req.json();

  if (!id || !targetLang || !["nl", "en", "es"].includes(targetLang)) {
    return NextResponse.json({ error: "Ongeldig verzoek." }, { status: 400 });
  }

  if (type === "agenda") {
    const dates = await getAgendaDates();
    const entry = dates.find((d) => d.id === id);
    if (!entry) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    if (entry.translations?.[targetLang]) return NextResponse.json(entry.translations[targetLang]);
    const fields = { title: entry.title || "", when: entry.when || "", note: entry.note || "" };
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(fields);
    try {
      const translated = await translateFields(fields, targetLang);
      const next = dates.map((d) =>
        d.id === id ? { ...d, translations: { ...(d.translations || {}), [targetLang]: translated } } : d
      );
      await setAgendaDates(next);
      return NextResponse.json(translated);
    } catch {
      return NextResponse.json(fields);
    }
  }

  if (type === "roster") {
    const roster = await getCleaningRoster();
    const entry = roster.find((r) => r.id === id);
    if (!entry) return NextResponse.json({ error: "Niet gevonden." }, { status: 404 });
    if (entry.translations?.[targetLang]) return NextResponse.json(entry.translations[targetLang]);
    const fields = { who: entry.who || "" };
    if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json(fields);
    try {
      const translated = await translateFields(fields, targetLang);
      const next = roster.map((r) =>
        r.id === id ? { ...r, translations: { ...(r.translations || {}), [targetLang]: translated } } : r
      );
      await setCleaningRoster(next);
      return NextResponse.json(translated);
    } catch {
      return NextResponse.json(fields);
    }
  }

  // Standaard: een bericht in de wijkkrant-feed (bestaand gedrag).
  const posts = await getPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) {
    return NextResponse.json({ error: "Bericht niet gevonden." }, { status: 404 });
  }

  if (post.translations?.[targetLang]) {
    return NextResponse.json({ title: post.translations[targetLang].title, text: post.translations[targetLang].text });
  }

  const fields = { title: post.title || "", text: post.text || "" };
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ ...fields, note: "AI-vertaling niet ingesteld." });
  }

  try {
    const translated = await translateFields(fields, targetLang);
    const nextPosts = posts.map((p) =>
      p.id === id ? { ...p, translations: { ...(p.translations || {}), [targetLang]: translated } } : p
    );
    await setPosts(nextPosts);
    return NextResponse.json(translated);
  } catch (e) {
    return NextResponse.json({ ...fields, note: "Vertalen mislukt." });
  }
}
