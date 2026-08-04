/**
 * In-memory feedback capture for beta — durable store when Postgres bound later.
 */

export type FeedbackItem = {
  id: string;
  userId?: string;
  category: "bug" | "idea" | "praise" | "other";
  message: string;
  createdAt: string;
};

const items: FeedbackItem[] = [];

export function submitFeedback(input: Omit<FeedbackItem, "id" | "createdAt"> & { id?: string }): FeedbackItem {
  const item: FeedbackItem = {
    id: input.id ?? `fb_${Date.now()}`,
    userId: input.userId,
    category: input.category,
    message: input.message.trim(),
    createdAt: new Date().toISOString(),
  };
  if (!item.message) throw new Error("VALIDATION_FAILED");
  items.push(item);
  return item;
}

export function listFeedback(): FeedbackItem[] {
  return items.map((i) => ({ ...i }));
}
