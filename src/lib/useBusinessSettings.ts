"use client";

import { useEffect, useState } from "react";
import { BusinessSettings } from "@/types";
import { INITIAL_SETTINGS } from "@/lib/store";

/**
 * Shared client hook to keep header, footer, and floating buttons synced with Admin BusinessSettings.
 */
export function useBusinessSettings(): BusinessSettings {
  const [settings, setSettings] = useState<BusinessSettings>(INITIAL_SETTINGS);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (active && json?.success && json?.data) {
          setSettings({ ...INITIAL_SETTINGS, ...json.data });
        }
      } catch {
        // Keep defaults on transient network error
      }
    };

    loadSettings();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "caxoi_menu_updated_at") {
        loadSettings();
      }
    };
    const onFocus = () => loadSettings();

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return settings;
}
