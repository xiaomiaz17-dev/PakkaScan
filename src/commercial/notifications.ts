/**
 * Customer notification inbox (in-memory for unit/beta).
 */

export type NotificationItem = {
  id: string;
  userId: string;
  kind: "report_ready" | "review_required" | "system";
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

const inbox = new Map<string, NotificationItem[]>();

export function notify(userId: string, input: Omit<NotificationItem, "id" | "userId" | "read" | "createdAt">): NotificationItem {
  const item: NotificationItem = {
    id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    userId,
    kind: input.kind,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const list = inbox.get(userId) ?? [];
  list.unshift(item);
  inbox.set(userId, list.slice(0, 100));
  return item;
}

export function listNotifications(userId: string): NotificationItem[] {
  return (inbox.get(userId) ?? []).map((n) => ({ ...n }));
}

export function markRead(userId: string, id: string): boolean {
  const list = inbox.get(userId) ?? [];
  const item = list.find((n) => n.id === id);
  if (!item) return false;
  item.read = true;
  return true;
}
