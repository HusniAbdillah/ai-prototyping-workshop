/**
 * Single Source of Truth untuk tipe domain SIRCLO Insight.
 * Definisi absolut wajib dipakai di seluruh codebase (lihat docs/06_TECH_SPEC.md §2).
 */

export type Marketplace = "SHOPEE" | "TIKTOK";
export type IssueSeverity = "SAFE" | "WARNING" | "CRITICAL";
export type IssueType =
  | "MARGIN_BLEED"
  | "BUDGET_BREACH"
  | "OOS_RISK"
  | "UNMATCHED_SKU"
  | "NONE";
export type SensitivityMode = "NORMAL" | "MEGA_CAMPAIGN";
export type RecommendedAction =
  | "STOP_PROMO"
  | "REBALANCE_STOCK"
  | "PAUSE_ADS_PRICE_BUMP"
  | "NONE";

/** 1. Standarisasi Baris Penjualan Marketplace */
export interface OmnichannelSaleRow {
  orderId: string;
  orderTimestamp: number; // Epoch milliseconds untuk kalkulasi moving-window
  marketplace: Marketplace;
  sku: string;
  qtySold: number;
  dealPrice: number; // Harga yang dibayar pembeli
  sellerVoucher: number; // Diskon tanggungan penjual
  platformSubsidy: number; // Subsidi diskon dari platform (Shopee Rebate / TikTok Subsidy)
}

/** 2. Standarisasi Master Data Internal */
export interface MasterCatalogRow {
  sku: string;
  cogs: number;
  globalBuffer: number; // Stok fisik di gudang internal
  promoBudgetCap: number; // Batas toleransi bakar uang (0 jika non-promo)
  currentMarketplaceStock: number; // Stok etalase saat ini
  platformFeeRate?: number; // Default 0.085 (8.5% potongan komisi & admin marketplace)
}

/** 3. Konfigurasi Routing WhatsApp PIC */
export interface EscalationRoutingConfig {
  waPricing: string; // Nomor WA PIC Pricing / Ads (contoh: 628123456789)
  waWarehouse: string; // Nomor WA PIC Warehouse / Gudang
}

/** 4. Output Anomali (Triage Item) */
export interface AnomalyResult {
  id: string;
  sku: string;
  marketplace: Marketplace;
  issueType: IssueType;
  severity: IssueSeverity;
  metricValue: number; // Nilai kerugian (Rp) ATAU sisa jam runway

  dealPrice?: number;
  platformSubsidy?: number;
  sellerVoucher?: number;
  estimatedFee?: number;
  netPayout?: number;
  cogs?: number;
  lossPerUnit?: number;
  cumulativeBurn?: number;
  budgetCap?: number;

  // Field Logistik Rinci
  currentStock?: number;
  velocityPerHour?: number;
  runwayHours?: number;
  globalBuffer?: number;
  recommendedRebalance?: number;

  // Aksi & Eskalasi
  recommendedAction: RecommendedAction;
  actionableMessage: string;
  whatsappUrl: string;

  // State Koordinasi Tim (17 AM)
  isEscalated: boolean;
  escalatedAt?: number;
  escalatedTo?: "PRICING" | "WAREHOUSE";
}

/** 5. In-App Web Notification & Alert Payload */
export interface InAppAlert {
  id: string;
  timestamp: number;
  type: "TOAST" | "BANNER" | "BELL_ITEM";
  severity: IssueSeverity;
  title: string;
  message: string;
  sku: string;
  soundChime: boolean;
  dismissed: boolean;
}

/** Hasil agregat parsing file CSV omnichannel. */
export interface ParsedDataset {
  omnichannelSales: OmnichannelSaleRow[];
  masterCatalog: MasterCatalogRow[];
}
