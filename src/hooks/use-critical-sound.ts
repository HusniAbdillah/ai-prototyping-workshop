import { useEffect, useRef } from "react";
import { playWarningChime } from "@/lib/sound";

/**
 * Membunyikan Web Audio chime saat deteksi anomali kritis pertama kali
 * muncul pada suatu "run" analisis (transisi 0 -> N), bila sound diaktifkan.
 */
export function useCriticalSound(criticalCount: number, enabled: boolean): void {
  const prevRef = useRef(criticalCount);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = criticalCount;
    if (enabled && criticalCount > 0 && prev === 0) {
      playWarningChime();
    }
  }, [criticalCount, enabled]);
}
