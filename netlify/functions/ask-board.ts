// netlify/functions/ask-board.ts
import type { Handler } from "@netlify/functions";

type AdvisorId = "chris" | "maya" | "dan" | "rick" | "jon";

type AdvisorAnswer = {
  speaking: AdvisorId[];
  answers: Record<AdvisorId, string>;
};

const ALLOW_ORIGIN = "*"; // Optionally tighten later to your Netlify domain

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOW_ORIGIN,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  };
}

function json(statusCode: number, body: any) {
  return {
    statusCode,
    headers: corsHeaders(),
    body: JSON.stringify(body),
  };
}

function pickSpeakers(question: string): AdvisorId[] {
  const q = question.toLowerCase();
  const hits = new Set<AdvisorId>();

  const hasAny = (words: string[]) => words.some((w) => q.includes(w));

  if (
    hasAny([
      "valuation",
      "multiple",
      "ebitda",
      "sde",
      "qoe",
      "margin",
      "books",
      "add-back",
      "add back",
      "cash flow",
      "forecast",
      "financial",
    ])
  ) {
    hits.add("chris");
  }

  if (
    hasAny([
      "loi",
      "term",
      "terms",
      "negotiat",
      "leverage",
      "counter",
      "offer",
      "earnout",
      "escrow",
      "working capital",
      "structure",
      "price",
      "meeting",
      "first meeting",
      "intro call",
      "discovery",
      "call",
      "buyer meeting",
      "bring",
      "attend",
      "who should",
    ])
  ) {
    hits.add("maya");
  }

  if (
    hasAny([
      "sop",
      "kpi",
      "process",
      "systems",
      "hiring",
      "training",
      "pricing",
      "capacity",
      "quality",
      "dispatch",
      "standard",
      "team",
      "head inspector",
      "lead inspector",
      "manager",
      "operations",
      "roles",
      "org chart",
    ])
  ) {
    hits.add("dan");
  }

  if (
    hasAny([
      "market",
      "pe",
      "private equity",
      "roll-up",
      "roll up",
      "platform",
      "tuck-in",
      "tuck in",
      "industry",
      "consolidation",
      "competition",
      "trends",
      "buyer",
    ])
  ) {
    hits.add("rick");
  }

  if (
    hasAny([
      "goals",
      "identity",
      "burnout",
      "stay on",
      "walk away",
      "legacy",
      "purpose",
      "values",
      "life",
      "do i want to sell",
      "what do i want",
    ])
  ) {
    hits.add("jon");
  }

  // If nothing matched, default to broad helpers
  if (hits.size === 0) {
    hits.add("maya");
    hits.add("jon");
  }

  // ✅ If only one matched, add a “generalist” so it feels like a boardroom
  // Prefer Maya, then Jon.
  if (hits.size === 1) {
    const generalists: AdvisorId[] = ["maya", "jon"];
    for (const g of generalists) {
      if (!hits.has(g)) {
        hits.add(g);
        break;
      }
    }
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

async function callOpenAI(opts: {
  apiKey: string;
  model: string;
  prompt: string;
  timeoutMs?: number;
}) {
  const { apiKey, model, prompt, timeoutMs = 20000 } = opts;

  const input = prompt.length > 8000 ? prompt.slice(0, 8000) : prompt;

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input,
        temperature: 0.6,
        max_output_tokens: 300,
      }),
    });

    if (!resp.ok) {
      const raw = await resp.text();
      return { ok: false as const, status: resp.status, raw: raw.slice(0, 400) };
    }

    const data: any = await resp.json();
    const out = data?.output_text ?? data?.output?.[0]?.content?.[0]?.text ?? "";
    return { ok: true as const, text: String(out || "").trim() };
  } finally {
    clearTimeout(t);
  }
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: corsHeaders(),
      body: "",
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Use POST" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  if (!apiKey) {
    return json(500, {
      error:
        "Missing OPENAI_API_KEY. Add it in Netlify → Project configuration → Environment variables (as a secret).",
    });
  }

  let body: any;
  try {
    body = event.body ? JSON.parse(event.body) : null;
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }

  const question = String(body?.question || "").trim();

  if (!question) return json(400, { error: "Missing question" });
  if (question.length > 2000) return json(400, { error: "Question too long" });

  const speaking = pickSpeakers(question);

  const answers: Record<AdvisorId, string> = {
    chris: "",
    maya: "",
    dan: "",
    rick: "",
    jon: "",
  };

  try {
    const jobs = speaking.map(async (advisor) => {
      const prompt = advisorPrompt(advisor, question);
      const result = await callOpenAI({ apiKey, model, prompt });

      if (!result.ok) {
        console.error("OpenAI error", { advisor, status: result.status, raw: result.raw });
        answers[advisor] = "I hit a snag generating this response. Please try again.";
        return;
      }

      answers[advisor] = result.text || "No response.";
    });

    await Promise.all(jobs);

    const payload: AdvisorAnswer = { speaking, answers };
    return json(200, payload);
  } catch (err: any) {
    console.error("Server error", err);
    return json(500, { error: "Server error. Please try again." });
  }
};
