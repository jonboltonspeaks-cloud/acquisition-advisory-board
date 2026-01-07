export const config = {
  // Keeps responses fast and avoids timeouts on free-ish plans.
  // (Netlify will still enforce its own limits.)
};

type AdvisorId = "chris" | "maya" | "dan" | "rick" | "jon";

type AdvisorAnswer = {
  speaking: AdvisorId[];
  answers: Record<AdvisorId, string>;
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

function pickSpeakers(question: string): AdvisorId[] {
  const q = question.toLowerCase();

  const hits = new Set<AdvisorId>();

  const hasAny = (words: string[]) => words.some((w) => q.includes(w));

  if (hasAny(["valuation", "multiple", "ebitda", "sde", "qoe", "margin", "books", "add-back", "add back", "cash flow", "forecast", "financial"])) {
    hits.add("chris");
  }
  if (hasAny(["loi", "term", "terms", "negotiat", "leverage", "counter", "offer", "earnout", "escrow", "working capital", "structure", "price"])) {
    hits.add("maya");
  }
  if (hasAny(["sop", "kpi", "process", "systems", "hiring", "training", "pricing", "capacity", "quality", "dispatch", "standard"])) {
    hits.add("dan");
  }
  if (hasAny(["market", "pe", "private equity", "roll-up", "roll up", "platform", "tuck-in", "tuck in", "industry", "consolidation", "competition", "trends", "buyer"])) {
    hits.add("rick");
  }
  if (hasAny(["goals", "identity", "burnout", "stay on", "walk away", "legacy", "purpose", "values", "life", "do i want to sell"])) {
    hits.add("jon");
  }

  // If nothing matched, default to broad helpers
  if (hits.size === 0) {
    hits.add("maya");
    hits.add("jon");
  }

  // Cap at 3 voices for “only who matters speaks”
  const order: AdvisorId[] = ["chris", "maya", "dan", "rick", "jon"];
  return order.filter((id) => hits.has(id)).slice(0, 3);
}

function advisorPrompt(advisor: AdvisorId, question: string) {
  const personas: Record<AdvisorId, string> = {
    chris:
      "You are Chris Halstead, a Financial & Valuation Strategist for home-services businesses. You speak clearly, numbers-first, and you give practical next steps. Keep it concise but high-value.",
    maya:
      "You are Maya Reddington, a Negotiator & Deal Architect. You focus on leverage, deal structure, LOI terms, and scripts. You are confident, direct, and tactical.",
    dan:
      "You are Daniel “Dan” Cortez, an Operations & Systems Veteran. You think in SOPs, KPIs, repeatability, and buyer-readiness. You are pragmatic and specific.",
    rick:
      "You are Rick Moreno, a home-services industry insider. You give market/PE pattern-recognition and positioning advice. You connect dots and talk like an experienced operator.",
    jon:
      "You are Jon Mercer, an Owner Identity & Exit Coach. You focus on goals, tradeoffs, identity, and the life after exit. You are grounded and thoughtful.",
  };

  return [
    personas[advisor],
    "",
    "Rules:",
    "- Answer ONLY as this advisor (no disclaimers about being AI).",
    "- Keep it to ~120-200 words.",
    "- Use short paragraphs or bullets if helpful.",
    "- Give at least one concrete next step.",
    "",
    `Question: ${question}`,
  ].join("\n");
}

export default async (request: Request) => {
  if (request.method === "OPTIONS") {
    return new Response("", {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (request.method !== "POST") {
    return json({ error: "Use POST" }, 405);
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return json(
      {
        error:
          "Missing OPENAI_API_KEY. Add it in Netlify → Project configuration → Environment variables (as a secret).",
      },
      500
    );
  }

  let body: any = null;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const question = String(body?.question || "").trim();
  if (!question) return json({ error: "Missing question" }, 400);

  const speaking = pickSpeakers(question);

  try {
    const answers: Record<AdvisorId, string> = {
      chris: "",
      maya: "",
      dan: "",
      rick: "",
      jon: "",
    };

    // Call OpenAI once per speaking advisor (simple + robust for V1)
    for (const advisor of speaking) {
      const prompt = advisorPrompt(advisor, question);

      const resp = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: prompt,
          temperature: 0.6,
        }),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return json(
          { error: `OpenAI error (${resp.status})`, details: text.slice(0, 500) },
          500
        );
      }

      const data: any = await resp.json();

      // Responses API: best-effort extraction
      const out =
        data?.output_text ??
        data?.output?.[0]?.content?.[0]?.text ??
        "";

      answers[advisor] = String(out || "").trim() || "No response.";
    }

    const payload: AdvisorAnswer = { speaking, answers };
    return json(payload, 200);
  } catch (err: any) {
    return json({ error: "Server error", details: String(err?.message || err) }, 500);
  }
};
