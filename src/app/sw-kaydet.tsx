"use client";

import { useEffect } from "react";

export function SwKaydet() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // sessizce yut - PWA yuklenebilirligi etkilenir ama uygulama calismaya devam eder
      });
    }
  }, []);

  return null;
}
