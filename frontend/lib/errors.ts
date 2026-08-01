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
