import { useMemo, useState } from "react";

type AdvisorId = "chris" | "maya" | "dan" | "rick" | "jon";

type Advisor = {
  id: AdvisorId;
  name: string;
  title: string;
  vibe: string;
  specialty: string[];
};

const ADVISORS: Advisor[] = [
  {
    id: "chris",
    name: "Chris Halstead",
    title: "Financial and Valuation Strategist",
    vibe: "Numbers brain. Keeps you grounded.",
    specialty: ["valuation", "EBITDA", "SDE", "QoE", "multiple", "margin", "financials", "books", "add-backs", "cash flow", "forecast"],
  },
  {
    id: "maya",
    name: "Maya Reddington",
    title: "Negotiator and Deal Architect",
    vibe: "Clarity, leverage, and deal structure.",
    specialty: ["LOI", "term", "terms", "negotiation", "leverage", "offer", "counter", "earnout", "escrow", "working capital", "structure", "price"],
  },
  {
    id: "dan",
    name: "Daniel “Dan” Cortez",
    title: "Operations and Systems Veteran",
    vibe: "Operator’s operator. Builds buyer-ready machines.",
    specialty: ["SOP", "KPI", "process", "systems", "hiring", "training", "pricing", "capacity", "quality", "dispatch", "standardize"],
  },
  {
    id: "rick",
    name: "Rick Moreno",
    title: "Home Services Industry Insider",
    vibe: "Pattern recognition across the trades.",
    specialty: ["market", "PE", "roll-up", "platform", "tuck-in", "industry", "consolidation", "competition", "trends", "buyer"],
  },
  {
    id: "jon",
    name: "Jon Mercer",
    title: "Owner Identity and Exit Coach",
    vibe: "The heart voice. Aligns decisions to your life.",
    specialty: ["goals", "identity", "life", "what do I want", "burnout", "stay on", "walk away", "legacy", "purpose", "values"],
  },
];

function pickAdvisors(question: string): AdvisorId[] {
  const q = question.toLowerCase().trim();
  if (!q) return [];

  // Simple “who speaks up” rules for V1 (we’ll replace with AI later)
  const hits = new Set<AdvisorId>();

  const containsAny = (words: string[]) => words.some((w) => q.includes(w.toLowerCase()));

  for (const a of ADVISORS) {
    if (containsAny(a.specialty)) hits.add(a.id);
  }

  // If nothing matched, default to Maya + Jon (most broadly useful)
  if (hits.size === 0) {
    hits.add("maya");
    hits.add("jon");
  }

  // Cap at 3 voices so it feels like “only who matters speaks”
  const order: AdvisorId[] = ["chris", "maya", "dan", "rick", "jon"];
  return order.filter((id) => hits.has(id)).slice(0, 3);
}

function demoResponse(advisorId: AdvisorId, question: string): string {
  // Short, believable “placeholder” answers so the product feels real.
  switch (advisorId) {
    case "chris":
      return `Let’s anchor this in numbers. Before we talk strategy, I’d want: trailing 12 revenue, seller discretionary earnings (SDE) vs EBITDA, customer concentration, and the top add-backs. If you give me those, we can sanity-check your value range and what a buyer will challenge.`;
    case "maya":
      return `Treat this like a negotiation, not a formality. The first draft is rarely the best draft. Your leverage comes from clarity: what you will concede, what you won’t, and what you’ll trade. Tell me what outcome you want and I’ll map the cleanest path.`;
    case "dan":
      return `Buyers don’t buy “you.” They buy a machine. I’d look at repeatability: SOPs, KPIs, sales-to-production flow, training, and how quality is enforced. If the business runs without heroics, you become far more valuable.`;
    case "rick":
      return `Zooming out: buyers love predictable cash flow and category leadership signals. In home services, the story matters—your niche, defensibility, and the roll-up narrative. We can position you so you’re not just “another shop,” but a strategic fit.`;
    case "jon":
      return `Before we optimize the deal, let’s make sure it matches your life. Do you want a full exit, a partial exit, or to stay involved? Your best decision is the one that aligns the money with the future you actually want.`;
    default:
      return `Tell me more about what you’re trying to achieve.`;
  }
}

const SUGGESTED = [
  "What questions will an acquirer ask in the first meeting?",
  "How do I think about valuation if my books are messy?",
  "What LOI terms should I push back on?",
  "What operational changes make me more attractive to a buyer?",
  "Do I even want to sell — and what would “the right exit” look like for me?",
];

export default function App() {
  const [question, setQuestion] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);

  const speaking = useMemo(() => (submitted ? pickAdvisors(submitted) : []), [submitted]);

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", padding: 28, maxWidth: 1100, margin: "0 auto" }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ margin: 0, fontSize: 38, letterSpacing: -0.5 }}>Acquisition Advisory Board</h1>
        <p style={{ marginTop: 10, marginBottom: 0, fontSize: 16, opacity: 0.85 }}>
          Five experts behind you. One purpose in front of you. Your most valuable exit.
        </p>
      </header>

      <section style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 18, marginBottom: 18 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 520px" }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>Ask the Board</div>
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question about selling, acquisition readiness, valuation, deal terms, negotiation, operations, or exit planning…"
              style={{
                width: "100%",
                padding: "12px 12px",
                borderRadius: 10,
                border: "1px solid #d9d9d9",
                fontSize: 15,
              }}
            />
          </div>

          <button
            onClick={() => setSubmitted(question.trim() || null)}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #111",
              background: "#111",
              color: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            Ask
          </button>

          <button
            onClick={() => {
              setQuestion("");
              setSubmitted(null);
            }}
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              border: "1px solid #d9d9d9",
              background: "#fff",
              fontWeight: 700,
              cursor: "pointer",
              minWidth: 120,
            }}
          >
            Clear
          </button>
        </div>

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, opacity: 0.85 }}>Suggested questions</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SUGGESTED.map((s) => (
              <button
                key={s}
                onClick={() => setQuestion(s)}
                style={{
                  border: "1px solid #e0e0e0",
                  background: "#fff",
                  borderRadius: 999,
                  padding: "8px 10px",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 18 }}>
        {ADVISORS.map((a) => (
          <div key={a.id} style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 14 }}>
            <div style={{ fontWeight: 800 }}>{a.name}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{a.title}</div>
            <div style={{ fontSize: 13, marginTop: 10, lineHeight: 1.35 }}>{a.vibe}</div>
            <button
              onClick={() => setQuestion(`Question for ${a.name}: `)}
              style={{
                marginTop: 12,
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid #d9d9d9",
                background: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Ask {a.name.split(" ")[0]}
            </button>
          </div>
        ))}
      </section>

      <section style={{ border: "1px solid #e6e6e6", borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.85, marginBottom: 10 }}>Boardroom</div>

        {!submitted ? (
          <div style={{ opacity: 0.75, lineHeight: 1.5 }}>
            Ask a question above. Only the advisors who have something meaningful to contribute will speak up.
          </div>
        ) : (
          <div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.7 }}>YOUR QUESTION</div>
              <div style={{ fontSize: 16, fontWeight: 750, marginTop: 6 }}>{submitted}</div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {speaking.map((id) => {
                const advisor = ADVISORS.find((a) => a.id === id)!;
                return (
                  <div key={id} style={{ border: "1px solid #ededed", borderRadius: 12, padding: 14 }}>
                    <div style={{ fontWeight: 900 }}>{advisor.name}</div>
                    <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{advisor.title}</div>
                    <div style={{ marginTop: 10, lineHeight: 1.5 }}>{demoResponse(id, submitted)}</div>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 14, opacity: 0.7, fontSize: 12, lineHeight: 1.4 }}>
              *This is a demo version of the experience. Next step is wiring real AI responses and letting the Board decide who speaks based on intent.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
