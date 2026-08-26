/**
 * Checks for src/lib/rate-limit.ts, and specifically for refundRateLimit().
 *
 *     npm run test:rate-limit
 *
 * The refund path exists because Saathi's anonymous trial is a scarce daily
 * budget rather than a speed limit: six questions, and if the model provider
 * returns 503 the visitor got nothing and must not lose one of the six. That
 * makes two things worth pinning — that the cap actually stops at six, and
 * that a refund hands back exactly one question and never invents budget on a
 * key that never spent any.
 */
import { rateLimit, refundRateLimit } from "../src/lib/rate-limit.ts";

const CAP = { scope: "test-anon", limit: 6, windowMs: 24 * 60 * 60_000 };

let passed = 0;
let failed = 0;

function check(label, cond, detail = "") {
  if (cond) {
    passed++;
    console.log(`PASS  ${label}`);
  } else {
    failed++;
    console.log(`FAIL  ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

// ── The cap holds ───────────────────────────────────────────────────────────
const ip = "203.0.113.7";
const seen = [];
for (let i = 0; i < 6; i++) seen.push(rateLimit(ip, CAP));

check("six questions are allowed", seen.every((r) => r.ok));
check(
  "remaining counts down 5 to 0",
  JSON.stringify(seen.map((r) => r.remaining)) === "[5,4,3,2,1,0]",
  JSON.stringify(seen.map((r) => r.remaining))
);

const seventh = rateLimit(ip, CAP);
check("the seventh is refused", !seventh.ok);
check("the refusal reports a reset window", seventh.resetInMs > 0);

// ── A refund hands back exactly one ─────────────────────────────────────────
refundRateLimit(ip, CAP);
check("a refunded question can be re-asked", rateLimit(ip, CAP).ok);
check("and the budget is spent again straight after", !rateLimit(ip, CAP).ok);

// ── Refunding what was never spent must not create budget ───────────────────
const fresh = "203.0.113.99";
refundRateLimit(fresh, CAP);
refundRateLimit(fresh, CAP);
const allowed = [];
for (let i = 0; i < 8; i++) allowed.push(rateLimit(fresh, CAP).ok);
check(
  "refunding an unused key grants nothing extra",
  allowed.filter(Boolean).length === 6,
  `${allowed.filter(Boolean).length} allowed`
);

// ── Budgets are per key ─────────────────────────────────────────────────────
check("a second visitor has their own budget", rateLimit("203.0.113.50", CAP).ok);

// ── Scopes do not bleed into each other ─────────────────────────────────────
const other = { scope: "test-other", limit: 1, windowMs: 60_000 };
check("a different scope is independent", rateLimit(ip, other).ok);

console.log(
  `\n${failed === 0 ? "all rate-limit checks passed" : `${failed} check(s) FAILED`}` +
    ` (${passed} passed)`
);
process.exit(failed ? 1 : 0);
