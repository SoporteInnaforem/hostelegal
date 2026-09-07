export const TALLY_ORIGIN = "https://tally.so";
export const TALLY_FORM_ID = "441ZRY";

/** Validate only metadata needed by the UI; never retain answers or mutate quotas. */
export function parseTallyMessage(
  origin: string, source: unknown, expectedSource: unknown, data: unknown,
): "page" | "submitted" | null {
  if (origin !== TALLY_ORIGIN || !expectedSource || source !== expectedSource || typeof data !== "string") return null;
  try {
    const message = JSON.parse(data);
    if (!message || message.payload?.formId !== TALLY_FORM_ID) return null;
    if (message.event === "Tally.FormPageView" &&
        Number.isInteger(message.payload.page) && message.payload.page > 0) return "page";
    if (message.event === "Tally.FormSubmitted" &&
        typeof message.payload.id === "string" && message.payload.id.trim()) return "submitted";
  } catch { /* Not a supported Tally payload. */ }
  return null;
}
