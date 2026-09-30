import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { computeCriticalToastTitle } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export interface EmergencyBannerProps {
  criticalCount: number;
  totalRunningLoss: number;
}

/**
 * Floating Emergency Banner + Toast — muncul saat ada anomali CRITICAL.
 * Warna merah membara dengan animasi pulse halus (docs/04 §2).
 */
export function EmergencyBanner({
  criticalCount,
  totalRunningLoss,
}: EmergencyBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    if (criticalCount > 0) {
      setDismissed(false);
      setToastVisible(true);
      const timer = window.setTimeout(() => setToastVisible(false), 5000);
      return () => window.clearTimeout(timer);
    }
    setToastVisible(false);
  }, [criticalCount]);

  if (criticalCount <= 0) return null;

  return (
    <>
      {toastVisible && (
        <div className="fixed right-4 top-4 z-50 max-w-sm rounded-lg bg-red-600/95 px-4 py-3 text-white shadow-lg animate-pulse">
          <p className="text-sm font-semibold">
            🚨 {computeCriticalToastTitle(criticalCount)}
          </p>
          <p className="text-xs opacity-90">
            Total kerugian berjalan: {formatRupiah(totalRunningLoss)}
          </p>
        </div>
      )}

      {!dismissed && (
        <div className="flex items-center justify-between gap-3 rounded-lg bg-red-600/95 px-4 py-3 text-white animate-pulse">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm font-semibold">
              🚨 {criticalCount} anomali CRITICAL terdeteksi — kerugian berjalan{" "}
              {formatRupiah(totalRunningLoss)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Tutup banner"
            className={cn("text-white/80 hover:text-white")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </>
  );
}
