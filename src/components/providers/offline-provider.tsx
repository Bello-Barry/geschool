"use client";

import { ReactNode, createContext, useContext } from "react";
import { useOffline } from "@/hooks/use-offline";

interface OfflineContextValue {
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

const OfflineContext = createContext<OfflineContextValue | null>(null);

export function OfflineProvider({ children }: { children: ReactNode }) {
  const offline = useOffline();

  const value: OfflineContextValue = {
    isOnline: offline.isOnline,
    wasOffline: offline.wasOffline,
    pendingSyncCount: offline.pendingSyncCount,
    enqueueMutation: offline.enqueueMutation,
    flushQueue: offline.flushQueue,
    cacheResponse: offline.cacheResponse,
    getCachedResponse: offline.getCachedResponse,
  };

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOfflineContext(): OfflineContextValue {
  const ctx = useContext(OfflineContext);
  if (!ctx) {
    throw new Error("useOfflineContext must be used within an OfflineProvider");
  }
  return ctx;
}