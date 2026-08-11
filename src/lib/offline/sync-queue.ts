interface SyncOperation {
  id: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body: unknown;
  headers: Record<string, string>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

const QUEUE_KEY = "geschool_sync_queue";
const MAX_RETRIES = 3;

function getQueue(): SyncOperation[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch {
    return [];
  }
}

function setQueue(queue: SyncOperation[]): void {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    /* Storage full or unavailable */
  }
}

export async function enqueueSync(
  operation: Omit<SyncOperation, "id" | "timestamp" | "retries" | "maxRetries">
): Promise<string> {
  const queue = getQueue();
  const entry: SyncOperation = {
    ...operation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retries: 0,
    maxRetries: MAX_RETRIES,
  };
  queue.push(entry);
  setQueue(queue);
  return entry.id;
}

export function getSyncQueue(): SyncOperation[] {
  return getQueue();
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = getQueue().filter((op) => op.id !== id);
  setQueue(queue);
}

export async function clearSyncQueue(): Promise<void> {
  setQueue([]);
}

export async function processSyncQueue(
  onProcess?: (op: SyncOperation) => Promise<boolean>
): Promise<{ processed: number; failed: number; remaining: number }> {
  const queue = getQueue();
  if (queue.length === 0) return { processed: 0, failed: 0, remaining: 0 };

  let processed = 0;
  let failed = 0;
  const remaining: SyncOperation[] = [];

  for (const op of queue) {
    if (op.retries >= op.maxRetries) {
      failed++;
      continue;
    }

    const shouldRetry = onProcess ? await onProcess(op) : true;
    if (shouldRetry) {
      op.retries++;
      remaining.push(op);
    } else {
      processed++;
    }
  }

  setQueue(remaining);
  return { processed, failed, remaining: remaining.length };
}

export function getQueueCount(): number {
  return getQueue().length;
}