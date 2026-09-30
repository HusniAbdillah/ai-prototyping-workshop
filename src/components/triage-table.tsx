import { useMemo, useState } from "react";
import { MessageCircle } from "lucide-react";
import type { AnomalyResult, RecommendedAction } from "@/types/domain";
import type { EscalationMap } from "@/types/escalation-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatClock,
  formatPercent,
  formatRunway,
  formatRupiah,
  formatVelocity,
} from "@/lib/format";
import { rowIdForAnomaly } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export interface TriageTableProps {
  anomalies: AnomalyResult[];
  escalationMap: EscalationMap;
  onEscalate: (anomaly: AnomalyResult, to: "PRICING" | "WAREHOUSE") => void;
  highlightedId?: string | null;
}

type Filter = "ALL" | "PENDING" | "ESCALATED";

function severityVariant(severity: AnomalyResult["severity"]) {
  return severity === "CRITICAL" ? "destructive" : "warning";
}

function issueTypeLabel(type: AnomalyResult["issueType"]): string {
  switch (type) {
    case "MARGIN_BLEED":
      return "Margin Bleed";
    case "BUDGET_BREACH":
      return "Budget Breach";
    case "OOS_RISK":
      return "Risiko OOS";
    case "UNMATCHED_SKU":
      return "SKU Tidak Dikenal";
    default:
      return "-";
  }
}

function escalationTarget(action: RecommendedAction): "PRICING" | "WAREHOUSE" {
  return action === "REBALANCE_STOCK" ? "WAREHOUSE" : "PRICING";
}

function MetricCell({ anomaly }: { anomaly: AnomalyResult }) {
  if (anomaly.issueType === "OOS_RISK") {
    return (
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p>Runway: {formatRunway(anomaly.runwayHours ?? 0)}</p>
        <p>Velocity: {formatVelocity(anomaly.velocityPerHour ?? 0)}</p>
        <p>Buffer: {anomaly.globalBuffer ?? 0} unit</p>
        {anomaly.recommendedRebalance ? (
          <p>Suntik: {anomaly.recommendedRebalance} unit</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-0.5 text-xs text-muted-foreground">
      <p>Rugi/unit: {formatRupiah(anomaly.lossPerUnit ?? 0)}</p>
      <p>Akumulasi: {formatRupiah(anomaly.cumulativeBurn ?? 0)}</p>
      {anomaly.budgetCap ? (
        <p>
          Budget cap: {formatRupiah(anomaly.budgetCap)} (
          {formatPercent(((anomaly.cumulativeBurn ?? 0) / anomaly.budgetCap) * 100)}
          )
        </p>
      ) : null}
    </div>
  );
}

/**
 * High-Contrast Triage Table — hanya merender baris anomali (CRITICAL/WARNING),
 * menyembunyikan noise (SAFE). Filter status + 1-Click WhatsApp escalation.
 */
export function TriageTable({
  anomalies,
  escalationMap,
  onEscalate,
  highlightedId,
}: TriageTableProps) {
  const [filter, setFilter] = useState<Filter>("ALL");

  const visible = useMemo(() => {
    return anomalies.filter((a) => {
      if (filter === "PENDING") return !escalationMap[a.id];
      if (filter === "ESCALATED") return Boolean(escalationMap[a.id]);
      return true;
    });
  }, [anomalies, filter, escalationMap]);

  const pendingCount = anomalies.filter((a) => !escalationMap[a.id]).length;
  const escalatedCount = anomalies.length - pendingCount;

  const filterTabs: { key: Filter; label: string }[] = [
    { key: "ALL", label: `Semua (${anomalies.length})` },
    { key: "PENDING", label: `Menunggu Aksi (${pendingCount})` },
    { key: "ESCALATED", label: `Sudah Dieskalasi (${escalatedCount})` },
  ];

  if (anomalies.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-sm text-muted-foreground">
        Belum ada anomali. Unggah CSV untuk menjalankan deteksi.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "border border-input bg-background hover:bg-accent",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-muted text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Channel</th>
              <th className="px-3 py-2">SKU</th>
              <th className="px-3 py-2">Masalah</th>
              <th className="px-3 py-2">Severity</th>
              <th className="px-3 py-2">Detail</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((a) => {
              const record = escalationMap[a.id];
              const target = escalationTarget(a.recommendedAction);
              return (
                <tr
                  key={a.id}
                  id={rowIdForAnomaly(a.id)}
                  className={cn(
                    "border-t transition-colors",
                    a.severity === "CRITICAL"
                      ? "bg-destructive/10 hover:bg-destructive/15"
                      : "bg-warning/10 hover:bg-warning/15",
                    highlightedId === a.id && "ring-2 ring-primary",
                  )}
                >
                  <td className="px-3 py-2">
                    <Badge variant="secondary">{a.marketplace}</Badge>
                  </td>
                  <td className="px-3 py-2 font-medium">{a.sku}</td>
                  <td className="px-3 py-2">{issueTypeLabel(a.issueType)}</td>
                  <td className="px-3 py-2">
                    <Badge variant={severityVariant(a.severity)}>
                      {a.severity}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    <MetricCell anomaly={a} />
                  </td>
                  <td className="px-3 py-2">
                    {record ? (
                      <span className="text-xs text-emerald-600">
                        ✅ Escalated at {formatClock(record.escalatedAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        ⏳ Pending
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {record ? (
                      <span className="text-xs text-muted-foreground">
                        Tindakan terkirim
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant={a.severity === "CRITICAL" ? "destructive" : "default"}
                        disabled={!a.whatsappUrl}
                        onClick={() => {
                          if (a.whatsappUrl) {
                            window.open(a.whatsappUrl, "_blank", "noopener,noreferrer");
                          }
                          onEscalate(a, target);
                        }}
                      >
                        <MessageCircle /> Escalate WA
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
