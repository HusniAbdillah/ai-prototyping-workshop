/**
 * Decision Engine orchestrator — menjalankan seluruh rule engine (Stateless).
 * Menerima dataset + inventori + konfigurasi, mengembalikan daftar anomali.
 */

import type {
  AnomalyResult,
  EscalationRoutingConfig,
  Marketplace,
  OmnichannelSaleRow,
  ParsedDataset,
  SensitivityMode,
} from "@/types/domain";
import type { InventoryRow } from "@/ingestion/normalize";
import { evaluateMarginAndBudget } from "./margin-budget";
import { evaluateRunway } from "./runway-oos";

export interface EngineInput {
  dataset: ParsedDataset;
  inventory: InventoryRow[];
  routingConfig: EscalationRoutingConfig;
  mode?: SensitivityMode;
  /** Referensi waktu "sekarang". Default: max(orderTimestamp) dari data (agar demo tetap akurat). */
  nowMs?: number;
}

export interface EngineOutput {
  anomalies: AnomalyResult[];
  unmatchedSkus: string[];
  totalCritical: number;
  totalWarning: number;
  totalRunningLoss: number;
}

const SEVERITY_RANK: Record<AnomalyResult["severity"], number> = {
  CRITICAL: 0,
  WARNING: 1,
  SAFE: 2,
};

export function runDecisionEngine(input: EngineInput): EngineOutput {
  const { dataset, inventory, routingConfig, mode = "NORMAL" } = input;

  // Referensi "sekarang": gunakan timestamp terbaru dari data agar moving-window
  // tetap bermakna untuk CSV demo yang mungkin berumur beberapa hari.
  const nowMs =
    input.nowMs ??
    (dataset.omnichannelSales.length > 0
      ? Math.max(...dataset.omnichannelSales.map((s) => s.orderTimestamp))
      : Date.now());

  // Peta stok per channel: sku(lower) -> { SHOPEE: n, TIKTOK: n }.
  const stockBySku = new Map<
    string,
    Partial<Record<Marketplace, number>>
  >();
  for (const inv of inventory) {
    const key = inv.sku.toLowerCase();
    const map = stockBySku.get(key) ?? {};
    map[inv.marketplace] = inv.currentStock;
    stockBySku.set(key, map);
  }

  const catalogBySku = new Set(
    dataset.masterCatalog.map((c) => c.sku.toLowerCase()),
  );

  const anomalies: AnomalyResult[] = [];

  // Rule 1: Margin & Budget.
  anomalies.push(
    ...evaluateMarginAndBudget(
      dataset.omnichannelSales,
      dataset.masterCatalog,
      routingConfig,
    ),
  );

  // Rule 2: Runway / OOS per (SKU, marketplace).
  const salesBySkuMarketplace = new Map<string, OmnichannelSaleRow[]>();
  for (const sale of dataset.omnichannelSales) {
    const key = `${sale.sku.toLowerCase()}|${sale.marketplace}`;
    const arr = salesBySkuMarketplace.get(key) ?? [];
    arr.push(sale);
    salesBySkuMarketplace.set(key, arr);
  }

  for (const master of dataset.masterCatalog) {
    const key = master.sku.toLowerCase();
    for (const marketplace of ["SHOPEE", "TIKTOK"] as Marketplace[]) {
      const sales = salesBySkuMarketplace.get(`${key}|${marketplace}`) ?? [];
      if (sales.length === 0) continue;

      const currentStock =
        stockBySku.get(key)?.[marketplace] ?? master.currentMarketplaceStock;

      const anomaly = evaluateRunway(sales, master, routingConfig, {
        mode,
        marketplace,
        currentStock,
        nowMs,
      });
      if (anomaly) anomalies.push(anomaly);
    }
  }

  // Unmatched SKU handling (docs/02 §C, checkpoint CHK-ING-003) — tanpa crash.
  const unmatchedSkus = new Set<string>();
  for (const sale of dataset.omnichannelSales) {
    if (!catalogBySku.has(sale.sku.toLowerCase())) {
      unmatchedSkus.add(sale.sku);
    }
  }

  for (const sku of unmatchedSkus) {
    const sample = dataset.omnichannelSales.find(
      (s) => s.sku.toLowerCase() === sku.toLowerCase(),
    );
    anomalies.push({
      id: `ANOM-UNMATCHED-${sku}`,
      sku,
      marketplace: sample?.marketplace ?? "SHOPEE",
      issueType: "UNMATCHED_SKU",
      severity: "WARNING",
      metricValue: 0,
      recommendedAction: "NONE",
      actionableMessage:
        "SKU belum terdaftar di Master Catalog. Verifikasi COGS & promo budget di master data.",
      whatsappUrl: "",
      isEscalated: false,
    });
  }

  // Urutkan: CRITICAL dulu, lalu WARNING, lalu metrik terbesar.
  anomalies.sort(
    (a, b) =>
      SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] ||
      b.metricValue - a.metricValue,
  );

  const totalCritical = anomalies.filter((a) => a.severity === "CRITICAL").length;
  const totalWarning = anomalies.filter((a) => a.severity === "WARNING").length;
  const totalRunningLoss = anomalies
    .filter(
      (a) => a.issueType === "MARGIN_BLEED" || a.issueType === "BUDGET_BREACH",
    )
    .reduce((sum, a) => sum + (a.cumulativeBurn ?? 0), 0);

  return {
    anomalies,
    unmatchedSkus: [...unmatchedSkus],
    totalCritical,
    totalWarning,
    totalRunningLoss,
  };
}
