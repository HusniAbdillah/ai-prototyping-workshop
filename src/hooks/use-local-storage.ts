import { useCallback, useEffect, useState } from "react";

/**
 * Hook localStorage dengan serialisasi JSON — untuk konfigurasi & state koordinasi
 * (bukan data penjualan; data penjualan tetap 100% di memori).
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Storage penuh / private mode: abaikan (best-effort persistence).
    }
  }, [key, value]);

  const set = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) =>
        typeof next === "function" ? (next as (p: T) => T)(prev) : next,
      );
    },
    [],
  );

  return [value, set];
}
