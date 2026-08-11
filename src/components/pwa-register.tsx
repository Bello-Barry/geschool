"use client";

import { useEffect, useRef } from "react";

export function PwaRegister() {
  const registered = useRef(false);

  useEffect(() => {
    if (registered.current) return;
    if (!("serviceWorker" in navigator)) return;

    registered.current = true;

    navigator.serviceWorker.register("/sw.js").then((registration) => {
      console.log("[PWA] Service Worker enregistré:", registration.scope);

      if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      }
    }).catch((err) => {
      console.warn("[PWA] Échec enregistrement SW:", err);
    });

    if ("serviceWorker" in navigator && "SyncManager" in window) {
      navigator.serviceWorker.ready.then((registration) => {
        (registration as { sync?: { register: (tag: string) => Promise<void> } }).sync
          ?.register("geschool-sync-queue")
          .catch(() => {});
      });
    }

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (event.data && event.data.type === "SYNC_QUEUE") {
        window.dispatchEvent(new CustomEvent("offline-sync"));
      }
    });

    window.addEventListener("offline-sync", () => {
      window.dispatchEvent(new CustomEvent("offline-sync"));
    });
  }, []);

  return null;
}