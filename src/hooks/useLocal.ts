import { useState } from "react";
export function useLocal<T>(key: string, fallback: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : fallback;
    } catch {
      return fallback;
    }
  });
  function save(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved =
        typeof next === "function"
          ? (next as (current: T) => T)(current)
          : next;
      try {
        localStorage.setItem(key, JSON.stringify(resolved));
      } catch {
        /* Storage may be disabled by the browser. */
      }
      return resolved;
    });
  }
  return [value, save] as const;
}
