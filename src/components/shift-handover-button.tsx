import { useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import type { AnomalyResult } from "@/types/domain";
import { buildShiftHandoverReport } from "@/engine/shift-report";
import { Button } from "@/components/ui/button";

export interface ShiftHandoverButtonProps {
  anomalies: AnomalyResult[];
}

/**
 * Tombol "Copy Shift Handover Report" — menyalin rekap insiden terformat
 * ke clipboard untuk MBR / Claim Report (docs/04 §3).
 */
export function ShiftHandoverButton({ anomalies }: ShiftHandoverButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const report = buildShiftHandoverReport(anomalies);
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback utk browser tanpa clipboard API permission.
      const textarea = document.createElement("textarea");
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      disabled={anomalies.length === 0}
    >
      {copied ? (
        <>
          <Check className="text-emerald-500" /> Tersalin!
        </>
      ) : (
        <>
          <ClipboardCopy /> Copy Shift Handover Report
        </>
      )}
    </Button>
  );
}
