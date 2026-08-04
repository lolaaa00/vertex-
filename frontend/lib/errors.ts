export function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null) {
    const obj = err as Record<string, unknown>;
    const candidate = obj.shortMessage ?? obj.reason ?? obj.message ?? obj.error;
    if (typeof candidate === "string") return candidate;
    try {
      return JSON.stringify(err);
    } catch {
      // fall through
    }
  }
  return "Transaction failed. Check the browser console for details.";
}

// The contract prefixes every gl.vm.UserError with one of these four
// declared kinds (see intelligent-contract/contracts/vertex_bounty_fusion.py
// ERR_EXPECTED / ERR_EXTERNAL / ERR_TRANSIENT / ERR_LLM). A revert
// propagates through viem/genlayer-js wrapped in extra text ("execution
// reverted: ...", quotes, etc.) so this searches for the prefix anywhere in
// the extracted message rather than requiring an exact match at the start.
export type ErrorKind = "EXPECTED" | "EXTERNAL" | "TRANSIENT" | "LLM_ERROR" | "UNKNOWN";

export type ClassifiedError = {
  kind: ErrorKind;
  message: string; // prefix stripped
  guidance: string;
};

const PREFIXES: Array<{ kind: ErrorKind; needle: string }> = [
  { kind: "EXPECTED", needle: "EXPECTED:" },
  { kind: "EXTERNAL", needle: "EXTERNAL:" },
  { kind: "TRANSIENT", needle: "TRANSIENT:" },
  { kind: "LLM_ERROR", needle: "LLM_ERROR:" },
];

const GUIDANCE: Record<ErrorKind, string> = {
  EXPECTED: "This was a caller mistake — fix the input above and resubmit; no need to retry blindly.",
  EXTERNAL: "An upstream fetch (e.g. a submission's evidence URL) failed. This can be transient — try again shortly, or check the URL is publicly reachable.",
  TRANSIENT: "A retryable condition on the network side. Try again.",
  LLM_ERROR: "The model's output couldn't be used after sanitization. This is usually transient — try again.",
  UNKNOWN: "Check the browser console for the full error.",
};

export function classifyError(err: unknown): ClassifiedError {
  const raw = extractErrorMessage(err);
  for (const { kind, needle } of PREFIXES) {
    const idx = raw.indexOf(needle);
    if (idx !== -1) {
      return {
        kind,
        message: raw.slice(idx + needle.length).trim().replace(/["'\\]+$/, ""),
        guidance: GUIDANCE[kind],
      };
    }
  }
  return { kind: "UNKNOWN", message: raw, guidance: GUIDANCE.UNKNOWN };
}
