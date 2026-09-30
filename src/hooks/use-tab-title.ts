import { useEffect } from "react";
import { BASE_TITLE, computeTabTitle } from "@/lib/tab-title";

/**
 * Dynamic Tab Title Flasher: saat tab di background dan ada anomali kritis,
 * judul berkedip. Kembali normal saat difokuskan.
 */
export function useTabTitle(criticalCount: number): void {
  useEffect(() => {
    let interval: number | undefined;

    const applyAlert = () => {
      document.title = computeTabTitle(criticalCount);
    };

    const reset = () => {
      if (interval !== undefined) window.clearInterval(interval);
      interval = undefined;
      document.title = BASE_TITLE;
    };

    const onFocus = () => reset();

    const onBlur = () => {
      if (criticalCount <= 0) return;
      applyAlert();
      interval = window.setInterval(() => {
        document.title =
          document.title === BASE_TITLE
            ? computeTabTitle(criticalCount)
            : BASE_TITLE;
      }, 1200);
    };

    window.addEventListener("focus", onFocus);
    window.addEventListener("blur", onBlur);

    if (document.hasFocus()) {
      document.title = BASE_TITLE;
    } else if (criticalCount > 0) {
      onBlur();
    }

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("blur", onBlur);
      reset();
    };
  }, [criticalCount]);
}
