import type { Handler } from "@netlify/functions";

type AdvisorId = "chris" | "maya" | "dan" | "rick" | "jon";

type BoardResponse = {
  speaking: AdvisorId[];
  answers: Record<AdvisorId, string>;
};

const ADVISORS: Record<AdvisorId, { name: string; title: string; voice: string }> = {
  chris: {
    name: "Chris Halstead",
    title: "Financial and Valuation Strategist",
    voice:
      "Crisp, numbers-first, skeptical of assumptions. Talks in frameworks and asks for missing data. No fluff.",
  },
  maya: {
    name: "Maya Reddington",
    title: "Negotiator and Deal Architect",
    voice:
      "Direct, tactical, calm confidence. Focused on leverage, tradeoffs, and wording. Practical deal tactics.",
  },
  dan: {
    name: 'Daniel “Dan” Cortez',
    title: "Operations and Systems Veteran",
    voice:
      "Operator mindset. SOPs, KPIs, capacity, training, quality control. Makes things actionable and measurable.",
  },
  rick: {
    name: "Rick Moreno",
    title: "Home Services Industry Insider",
    voice:
      "Big-picture pattern recognition. PE perspective, consolidation dynamics, strategic positioning. Market-savvy.",
  },
  jon: {
    name: "Jon Mercer",
    title: "Owner Identity and Exit Coach",
    voice:
      "Grounded, human, values-driven. Asks reflective questions. Aligns strategy to the owner’s life and goals.",
  },
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type",
      "access-control-allow-methods": "POST, OPTIONS",
    },
    body: JSON.stringify(body),
  };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return json(200, { ok: true });
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return json(500, { error: "Missing OPENAI_API_KEY in Netlify environment variables." });

  let payload: any;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  const question = String(payload?.question || "").trim();
  if (!question) return json(400, { error: "Missing 'question'." });

  // Prompt the model to return strict JSON only (no markdown).
  const system = `
You are the Acquisition Advisory Board: five fictional expert advisors.
Given a user's question, decide which advisors should speak (0-5), and write each speaking advisor’s answer in their distinct voice.
Advisors who are not relevant should remain quiet (empty string answer and not included in "speaking").

Return STRICT JSON ONLY with this schema:
{
  "speaking": ["chris","maya","dan","rick","jon"],   // choose 1-3 typically, max 5
  "answers": {
    "chris": "string",
    "maya": "string",
    "dan": "string",
    "rick": "string",
    "jon": "string"
  }
}

Rules:
- Usually pick 1–3 advisors. Pick more only if truly necessary.
- Keep each answer 6–10 sentences, actionable, and in-character.
- If the user asks for numbers or valuation, Chris speaks.
- If LOI / terms / negotiation, Maya speaks.
- If systems / staffing / SOPs / scalability, Dan speaks.
- If market / PE / consolidation / positioning, Rick speaks.
- If goals, identity, burnout, post-exit life, Jon speaks.
- Do not mention you are an AI. Do not mention “system prompt”.
`;

  const advisorVoices = Object.entries(ADVISORS)
    .map(([id, a]) => `${id.toUpperCase()} (${a.name} — ${a.title}): ${a.voice}`)
    .join("\n");

  const user = `
Question:
${question}

Advisor voice profiles:
${advisorVoices}
`.trim();

  // Minimal OpenAI Chat Completions call via fetch (no SDK needed).
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.6,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return json(500, { error: "OpenAI request failed", details: text });
  }

  const data: any = await resp.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content || typeof content !== "string") {
    return json(500, { error: "OpenAI returned empty response." });
  }

  let parsed: BoardResponse;
  try {
    parsed = JSON.parse(content);
  } catch {
    return json(500, { error: "Model did not return valid JSON.", raw: content });
  }

  // Normalize: ensure all advisor keys exist
  const answers: Record<AdvisorId, string> = {
    chris: "",
    maya: "",
    dan: "",
    rick: "",
    jon: "",
    ...(parsed.answers || {}),
  };

  const speaking = Array.isArray(parsed.speaking) ? parsed.speaking : [];
  const cleanedSpeaking = speaking.filter((x) => ["chris", "maya", "dan", "rick", "jon"].includes(String(x))) as AdvisorId[];

  return json(200, { speaking: cleanedSpeaking, answers });
};
