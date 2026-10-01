/**
 * Shift Handover & Monthly Claim Report Generator (docs/04 §3, docs/06).
 * Merangkai rekapitulasi teks terformat rapi untuk clipboard (MBR / Claim Report).
 */

import type { AnomalyResult } from "@/types/domain";
import { formatRupiah } from "@/lib/format";

export interface ShiftReportOptions {
  dateLabel?: string;
  amName?: string;
}

function issueLabel(anomaly: AnomalyResult): string {
  switch (anomaly.issueType) {
    case "MARGIN_BLEED":
      return `MARGIN_BLEED (Rugi ${formatRupiah(
        anomaly.lossPerUnit ?? 0,
      )}/unit)`;
    case "BUDGET_BREACH":
      return `BUDGET_BREACH (Overburn ${formatRupiah(
        anomaly.cumulativeBurn ?? 0,
      )})`;
    case "OOS_RISK":
      return `OOS_RISK (Runway ${(anomaly.runwayHours ?? 0).toFixed(
        1,
      )} Jam, Buffer ${anomaly.globalBuffer ?? 0})`;
    case "UNMATCHED_SKU":
      return "UNMATCHED_SKU (Butuh verifikasi master data)";
    default:
      return "NONE";
  }
}

function statusLabel(anomaly: AnomalyResult): string {
  if (!anomaly.isEscalated) return "PENDING ACTION";
  const target = anomaly.escalatedTo === "WAREHOUSE" ? "Warehouse" : "Pricing";
  const time = anomaly.escalatedAt
    ? new Date(anomaly.escalatedAt).toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return `ESCALATED via WA ke PIC ${target}${time ? ` at ${time}` : ""}`;
}

export function buildShiftHandoverReport(
  anomalies: AnomalyResult[],
  opts: ShiftReportOptions = {},
): string {
  const dateLabel =
    opts.dateLabel ??
    new Date().toLocaleString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  const amName = opts.amName ?? "AM-Omnichannel-Team";

  const criticalCount = anomalies.filter((a) => a.severity === "CRITICAL").length;
  const warningCount = anomalies.filter((a) => a.severity === "WARNING").length;
  const totalLoss = anomalies
    .filter(
      (a) => a.issueType === "MARGIN_BLEED" || a.issueType === "BUDGET_BREACH",
    )
    .reduce((sum, a) => sum + (a.cumulativeBurn ?? 0), 0);

  const lines: string[] = [];
  lines.push("==================================================");
  lines.push("SIRCLO INSIGHT - SHIFT HANDOVER & CLAIM REPORT");
  lines.push(`Tanggal: ${dateLabel} WIB`);
  lines.push(`Account Manager on Duty: ${amName}`);
  lines.push("==================================================");
  lines.push("");
  lines.push(`TOTAL CRITICAL ISSUES: ${criticalCount}`);
  lines.push(`TOTAL WARNING ISSUES: ${warningCount}`);
  lines.push(`TOTAL KERUGIAN BERJALAN: ${formatRupiah(totalLoss)}`);
  lines.push("");
  lines.push("DAFTAR ANOMALI & STATUS TINDAKAN:");

  anomalies.forEach((a, index) => {
    lines.push(`${index + 1}. [${a.marketplace}] SKU: ${a.sku}`);
    lines.push(`   - Masalah: ${a.severity} ${issueLabel(a)}`);
    if (a.metricValue > 0 && a.issueType !== "OOS_RISK") {
      lines.push(`   - Akumulasi Kerugian: ${formatRupiah(a.metricValue)}`);
    }
    lines.push(`   - Status: [${statusLabel(a)}]`);
    lines.push(`   - Aksi: ${a.actionableMessage}`);
    lines.push("");
  });

  lines.push("==================================================");
  return lines.join("\n");
}
