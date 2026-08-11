"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { enqueueSync, getQueueCount, processSyncQueue, removeFromQueue } from "@/lib/offline/sync-queue";
import { offlineStorage } from "@/lib/offline/storage";

interface UseOfflineReturn {
  isOnline: boolean;
  wasOffline: boolean;
  pendingSyncCount: number;
  enqueueMutation: (url: string, options?: {
    method?: "POST" | "PUT" | "PATCH" | "DELETE";
    body?: unknown;
    headers?: Record<string, string>;
  }) => Promise<{ queued: boolean; id?: string }>;
  flushQueue: () => Promise<{ processed: number; failed: number }>;
  cacheResponse: (url: string, response: Response) => Promise<void>;
  getCachedResponse: (url: string) => Promise<{ body: unknown; status: number } | null>;
}

export function useOffline(): UseOfflineReturn {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const flushInProgress = useRef(false);

  useEffect(() => {
    const online = () => setIsOnline(true);
    const offline = () => {
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  useEffect(() => {
    const count = getQueueCount();
    setPendingSyncCount(count);
    const interval = setInterval(() => {
      setPendingSyncCount(getQueueCount());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const enqueueMutation = useCallback(
    async (
      url: string,
      options?: {
        method?: "POST" | "PUT" | "PATCH" | "DELETE";
        body?: unknown;
        headers?: Record<string, string>;
      }
    ): Promise<{ queued: boolean; id?: string }> => {
      if (isOnline) {
        return { queued: false };
      }

      const id = await enqueueSync({
        url,
        method: options?.method ?? "POST",
        body: options?.body ?? null,
        headers: options?.headers ?? {},
      });

      setPendingSyncCount(getQueueCount());
      return { queued: true, id };
    },
    [isOnline]
  );

  const flushQueue = useCallback(async (): Promise<{ processed: number; failed: number }> => {
    if (flushInProgress.current || !isOnline) {
      return { processed: 0, failed: 0 };
    }
    flushInProgress.current = true;

    try {
      const result = await processSyncQueue(async (op) => {
        try {
          const res = await fetch(op.url, {
            method: op.method,
            headers: {
              "Content-Type": "application/json",
              ...op.headers,
            },
            body: op.body ? JSON.stringify(op.body) : undefined,
          });

          if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
              return false;
            }
            return true;
          }

          await offlineStorage.cacheResponse(op.url, res);
          await removeFromQueue(op.id);
          setPendingSyncCount(getQueueCount());
          return false;
        } catch {
          return true;
        }
      });

      setPendingSyncCount(getQueueCount());
      if (wasOffline && result.remaining === 0) {
        setWasOffline(false);
      }
      return { processed: result.processed, failed: result.failed };
    } finally {
      flushInProgress.current = false;
    }
  }, [isOnline, wasOffline]);

  const cacheResponse = useCallback(
    async (url: string, response: Response): Promise<void> => {
      await offlineStorage.cacheResponse(url, response);
    },
    []
  );

  const getCachedResponse = useCallback(
    async (url: string): Promise<{ body: unknown; status: number } | null> => {
      return offlineStorage.getCachedResponse(url);
    },
    []
  );

  // Retour en ligne avec des opérations en attente → flush
  useEffect(() => {
    if (!isOnline || !wasOffline) return;
    setPendingSyncCount(getQueueCount());
    flushQueue();
  }, [isOnline, wasOffline, flushQueue]);

  return {
    isOnline,
    wasOffline,
    pendingSyncCount,
    enqueueMutation,
    flushQueue,
    cacheResponse,
    getCachedResponse,
  };
}