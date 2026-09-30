/**
 * Rule 2: Moving-Window Velocity & Penalty Mitigation (OOS Risk)
 * (docs/03 §2 & §4, docs/06 §3.B).
 *
 * Menghitung kecepatan penjualan berbasis jendela waktu dinamis, runway,
 * dan mitigasi darurat saat Global Buffer gudang = 0.
 */

import type {
  AnomalyResult,
  EscalationRoutingConfig,
  MasterCatalogRow,
  Marketplace,
  OmnichannelSaleRow,
  SensitivityMode,
} from "@/types/domain";
import { buildOosWhatsAppUrl } from "./escalation";

export const SENSITIVITY_PRESETS = {
  NORMAL: { windowHours: 3, warningRunway: 12, criticalRunway: 4 },
  MEGA_CAMPAIGN: { windowHours: 1, warningRunway: 4, criticalRunway: 1 },
} as const;

export interface RunwayContext {
  mode?: SensitivityMode;
  marketplace: Marketplace;
  currentStock: number;
  /** Referensi "sekarang" (epoch ms). Default Date.now(); dapat di-inject untuk demo/test. */
  nowMs?: number;
}

export function evaluateRunway(
  sales: OmnichannelSaleRow[],
  master: MasterCatalogRow,
  routingConfig: EscalationRoutingConfig,
  context: RunwayContext,
): AnomalyResult | null {
  const preset = SENSITIVITY_PRESETS[context.mode ?? "NORMAL"];
  const { windowHours, warningRunway, criticalRunway } = preset;
  const now = context.nowMs ?? Date.now();
  const cutoff = now - windowHours * 3600 * 1000;

  // 1. Ambil transaksi SKU + channel dalam window waktu terakhir.
  const recentSales = sales.filter(
    (s) =>
      s.sku.toLowerCase() === master.sku.toLowerCase() &&
      s.marketplace === context.marketplace &&
      s.orderTimestamp >= cutoff,
  );

  const totalQtySold = recentSales.reduce((sum, s) => sum + s.qtySold, 0);
  const velocityPerHour = totalQtySold / windowHours;

  // Zero Velocity Guard: stok stagnan -> SAFE, jangan render Infinity.
  if (velocityPerHour === 0) return null;

  const runwayHours = context.currentStock / velocityPerHour;

  // Filter Noise: runway masih aman di atas batas warning.
  if (runwayHours > warningRunway) return null;

  const isTotalOOS = master.globalBuffer <= 0;
  const isEmergency = runwayHours <= criticalRunway || isTotalOOS;
  const severity = isEmergency ? "CRITICAL" : "WARNING";
  const recommendedRebalance = Math.ceil(velocityPerHour * 24);
  const marketplace = recentSales[0]?.marketplace ?? context.marketplace;

  const whatsappUrl = buildOosWhatsAppUrl(routingConfig, {
    marketplace,
    sku: master.sku,
    runwayHours,
    velocityPerHour,
    globalBuffer: master.globalBuffer,
    recommendedRebalance,
    isTotalOOS,
  });

  return {
    id: `ANOM-OOS-${master.sku}-${marketplace}`,
    sku: master.sku,
    marketplace,
    issueType: "OOS_RISK",
    severity,
    metricValue: runwayHours,
    currentStock: context.currentStock,
    velocityPerHour,
    runwayHours,
    globalBuffer: master.globalBuffer,
    recommendedRebalance: isTotalOOS ? 0 : recommendedRebalance,
    recommendedAction: isTotalOOS ? "PAUSE_ADS_PRICE_BUMP" : "REBALANCE_STOCK",
    actionableMessage: isTotalOOS
      ? `Sisa ${runwayHours.toFixed(1)} jam, TIDAK ADA BUFFER (Matikan Iklan & Naikkan Harga!)`
      : `Sisa ${runwayHours.toFixed(
          1,
        )} jam. Rekomendasi suntik: ${recommendedRebalance} unit`,
    whatsappUrl,
    isEscalated: false,
  };
}
