"use client";

import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw } from "lucide-react";
import { useOfflineContext } from "@/components/providers/offline-provider";
import { Button } from "@/components/ui/button";

export function OfflineBanner() {
  const { isOnline, wasOffline, pendingSyncCount, flushQueue } = useOfflineContext();
  const [syncing, setSyncing] = useState(false);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    await flushQueue();
    setSyncing(false);
  }, [flushQueue]);

  useEffect(() => {
    const handler = () => {
      if (isOnline && pendingSyncCount > 0) {
        handleSync();
      }
    };
    window.addEventListener("offline-sync", handler);
    return () => window.removeEventListener("offline-sync", handler);
  }, [isOnline, pendingSyncCount, handleSync]);

  const isVisible = isOnline ? wasOffline && pendingSyncCount > 0 : true;

  if (!isVisible) return null;

  return (
    <div className="fixed top-14 left-0 right-0 z-50 animate-in slide-in-from-top">
      <div className="bg-amber-500/90 backdrop-blur text-amber-950 px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="font-medium">
            {isOnline ? "Connexion rétablie" : "Mode hors-ligne"}
          </span>
          {pendingSyncCount > 0 && (
            <span className="bg-amber-900/20 text-amber-950 px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingSyncCount} en attente
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {pendingSyncCount > 0 && isOnline && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSync}
              disabled={syncing}
              className="h-7 text-xs bg-amber-900/20 text-amber-950 hover:bg-amber-900/40"
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Synchronisation..." : "Synchroniser"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}