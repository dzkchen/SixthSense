"use client";

import { useEffect, useState } from "react";

export function useStoredBoolean(key: string, initialValue = false) {
  const [value, setValue] = useState(initialValue);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue !== null) {
        setValue(storedValue === "true");
      }
    } finally {
      setIsReady(true);
    }
  }, [key]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(key, String(value));
  }, [isReady, key, value]);

  return [value, setValue, isReady] as const;
}
