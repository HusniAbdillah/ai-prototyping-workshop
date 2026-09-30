import { useEffect, useRef, useState } from "react";
import { Bell, BellRing } from "lucide-react";
import type { AnomalyResult } from "@/types/domain";
import { Badge } from "@/components/ui/badge";
import { formatClock } from "@/lib/format";

export interface NotificationBellProps {
  anomalies: AnomalyResult[];
  onNavigate: (id: string) => void;
}

function severityVariant(severity: AnomalyResult["severity"]) {
  return severity === "CRITICAL" ? "destructive" : "warning";
}

/**
 * Notification Bell Drawer — lonceng + counter badge + kartu peringatan ringkas.
 * Klik item -> auto-scroll & highlight ke baris tabel (docs/04 §2.4).
 */
export function NotificationBell({ anomalies, onNavigate }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = anomalies.length;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-foreground shadow-sm hover:bg-accent"
        aria-label="Notifikasi"
      >
        {count > 0 ? (
          <BellRing className="h-4 w-4 text-destructive" />
        ) : (
          <Bell className="h-4 w-4" />
        )}
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-80 rounded-lg border bg-popover text-popover-foreground shadow-lg">
          <div className="border-b px-3 py-2 text-sm font-semibold">
            Notifikasi ({count})
          </div>
          <div className="max-h-96 overflow-y-auto">
            {anomalies.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Tidak ada anomali aktif.
              </p>
            )}
            {anomalies.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  onNavigate(a.id);
                  setOpen(false);
                }}
                className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={severityVariant(a.severity)}>
                    {a.severity}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {a.marketplace}
                  </span>
                </div>
                <p className="mt-1 truncate font-medium">{a.sku}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.actionableMessage}
                </p>
                <span className="text-[10px] text-muted-foreground">
                  {formatClock(Date.now())}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
