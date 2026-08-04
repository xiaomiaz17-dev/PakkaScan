/**
 * Mobile-ready interfaces — contracts only until Stage 2/3.
 * Do not implement native modules here.
 */

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

/** Web Push / future native notification channel. */
export type NotificationPort = {
  getPermission(): Promise<PushPermission>;
  requestPermission(): Promise<PushPermission>;
  /** Register device for report-ready / review-required events when infra exists. */
  registerDevice?(token: string): Promise<void>;
};

/** Camera or file capture for document pages. */
export type CameraUploadPort = {
  /** Prefer capture=environment on supporting browsers; fall back to file picker. */
  pickDocumentImage(): Promise<File | null>;
};

export type OfflineQueueItem = {
  id: string;
  kind: "document_upload" | "status_poll";
  payload: Record<string, unknown>;
  createdAt: string;
};

/** Queue work while offline; flush when connectivity returns. */
export type OfflineSyncPort = {
  enqueue(item: Omit<OfflineQueueItem, "id" | "createdAt">): Promise<OfflineQueueItem>;
  pending(): Promise<OfflineQueueItem[]>;
  flush(): Promise<{ sent: number; failed: number }>;
};

/** No-op web stubs — safe defaults until Stage 2. */
export const unsupportedNotificationPort: NotificationPort = {
  async getPermission() {
    return "unsupported";
  },
  async requestPermission() {
    return "unsupported";
  },
};

export const filePickerCameraPort: CameraUploadPort = {
  async pickDocumentImage() {
    return null; // UI wires <input type="file" accept="image/*,.pdf" capture="environment">
  },
};

export const memoryOfflineSyncPort: OfflineSyncPort = {
  async enqueue(item) {
    return {
      id: `local_${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...item,
    };
  },
  async pending() {
    return [];
  },
  async flush() {
    return { sent: 0, failed: 0 };
  },
};
