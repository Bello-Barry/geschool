import { describe, it, expect, beforeEach } from "vitest";
import {
  enqueueSync,
  getSyncQueue,
  getQueueCount,
  removeFromQueue,
  clearSyncQueue,
  processSyncQueue,
} from "@/lib/offline/sync-queue";

const QUEUE_KEY = "geschool_sync_queue";

describe("sync-queue (offline)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("enqueueSync creates an entry with id/timestamps and default retries", async () => {
    const id = await enqueueSync({ url: "/api/subjects", method: "POST", body: { name: "Maths" }, headers: {} });
    expect(id).toBeDefined();

    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(id);
    expect(queue[0].url).toBe("/api/subjects");
    expect(queue[0].method).toBe("POST");
    expect(queue[0].retries).toBe(0);
    expect(queue[0].maxRetries).toBe(3);
    expect(queue[0].timestamp).toBeGreaterThan(0);
  });

  it("persists across getQueueCount", async () => {
    await enqueueSync({ url: "/a", method: "POST", body: null, headers: {} });
    await enqueueSync({ url: "/b", method: "PATCH", body: null, headers: {} });
    expect(getQueueCount()).toBe(2);
  });

  it("stores in localStorage under geschool_sync_queue", async () => {
    await enqueueSync({ url: "/api/students", method: "DELETE", body: null, headers: {} });
    const raw = localStorage.getItem(QUEUE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].method).toBe("DELETE");
  });

  it("covers malformed localStorage", async () => {
    localStorage.setItem(QUEUE_KEY, "{not-json");
    expect(getQueueCount()).toBe(0);
    localStorage.setItem(QUEUE_KEY, JSON.stringify({ not: "array" }));
    expect(getQueueCount()).toBe(0);
  });

  it("removeFromQueue deletes only the targeted entry", async () => {
    const a = await enqueueSync({ url: "/a", method: "POST", body: null, headers: {} });
    await enqueueSync({ url: "/b", method: "POST", body: null, headers: {} });

    await removeFromQueue(a);
    const queue = getSyncQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].url).toBe("/b");
  });

  it("clearSyncQueue empties the queue", async () => {
    await enqueueSync({ url: "/a", method: "POST", body: null, headers: {} });
    await clearSyncQueue();
    expect(getQueueCount()).toBe(0);
  });

  it("processSyncQueue removes entries when onProcess returns success", async () => {
    await enqueueSync({ url: "/a", method: "POST", body: null, headers: {} });
    await enqueueSync({ url: "/b", method: "POST", body: null, headers: {} });

    const result = await processSyncQueue(() => Promise.resolve(false));
    expect(result).toEqual({ processed: 2, failed: 0, remaining: 0 });
    expect(getQueueCount()).toBe(0);
  });

  it("processSyncQueue increments retries and keeps failed entries", async () => {
    await enqueueSync({ url: "/fail", method: "POST", body: null, headers: {} });

    const result = await processSyncQueue(() => Promise.resolve(true));
    expect(result.processed).toBe(0);
    expect(result.remaining).toBe(1);

    const queue = getSyncQueue();
    expect(queue[0].retries).toBe(1);
  });

  it("drops entries that exceeded maxRetries", async () => {
    const id = await enqueueSync({ url: "/dead", method: "POST", body: null, headers: {} });

    for (let i = 0; i < 6; i++) {
      const queue = getSyncQueue();
      if (queue.length === 0) break;
      await processSyncQueue((op) => Promise.resolve(op.retries < op.maxRetries));
    }

    const remaining = getSyncQueue().filter((op) => op.id === id);
    expect(remaining).toHaveLength(0);
  });

  it("processSyncQueue on empty queue returns zeros", async () => {
    const result = await processSyncQueue(() => Promise.resolve(false));
    expect(result).toEqual({ processed: 0, failed: 0, remaining: 0 });
  });
});