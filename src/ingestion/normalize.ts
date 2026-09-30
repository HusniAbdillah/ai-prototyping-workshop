/**
 * Omnichannel Ingestion & Normalization (docs/02 & docs/06).
 * Memetakan alias kolom Shopee / TikTok / Internal ke antarmuka standar,
 * membersihkan string mata uang Rupiah, dan mengurai timestamp epoch.
 *
 * Modul ini 100% pure function (tanpa side effect) agar mudah diuji.
 */

import type {
  MasterCatalogRow,
  Marketplace,
  OmnichannelSaleRow,
} from "@/types/domain";

export type FileRole =
  | "SHOPEE_SALES"
  | "TIKTOK_SALES"
  | "MASTER"
  | "SHOPEE_INVENTORY"
  | "TIKTOK_INVENTORY"
  | "UNKNOWN";

export interface InventoryRow {
  sku: string;
  marketplace: Marketplace;
  currentStock: number;
}

/** Normalisasi nama header: strip BOM, lowercase, trim. */
export function normalizeHeader(header: string): string {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase();
}

/**
 * Sanitasi string angka (mata uang Rupiah / ribuan Indonesia) menjadi number.
 * Mendukung: "Rp 120.000", "Rp15.500,00", "-Rp 5.000", "0", " 45000 ".
 * Konvensi Indonesia: "." = pemisah ribuan, "," = pemisah desimal.
 */
export function sanitizeNumber(raw: unknown): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (raw === null || raw === undefined) return 0;

  let s = String(raw).trim();
  if (s === "") return 0;

  const isNegative = /^-/.test(s) || /^\(.*\)$/.test(s);
  s = s.replace(/[^\d,.\-]/g, "");
  s = s.replace(/^[()]/g, "").replace(/[()]$/g, "");
  s = s.replace(/^-/, "");
  if (s === "") return 0;

  // Ada koma -> desimal Indonesia (koma = desimal, titik = ribuan).
  if (s.includes(",")) {
    const [intPart, decPart] = s.split(",");
    const intClean = intPart.replace(/\./g, "");
    const decimals = decPart ? `.${decPart}` : "";
    const val = Number(intClean + decimals);
    const signed = isNegative ? -1 : 1;
    return signed * (Number.isFinite(val) ? val : 0);
  }

  // Tanpa koma -> titik dianggap pemisah ribuan.
  const val = Number(s.replace(/\./g, ""));
  const signed = isNegative ? -1 : 1;
  return signed * (Number.isFinite(val) ? val : 0);
}

/**
 * Parse persentase biaya platform: "8.5%" -> 0.085, "0.085" -> 0.085.
 * Fallback ke default 8.5% bila kolom absen / tidak valid.
 */
export function sanitizeFeeRate(raw: unknown, fallback = 0.085): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw === null || raw === undefined) return fallback;

  const s = String(raw).trim();
  if (s === "") return fallback;

  const isPercent = s.endsWith("%");
  const cleaned = s.replace(/[%\s]/g, "").replace(",", ".");
  const val = Number(cleaned);
  if (!Number.isFinite(val)) return fallback;
  return isPercent ? val / 100 : val;
}

/**
 * Parse timestamp pesanan menjadi epoch millisecond.
 * Mendukung "YYYY-MM-DD HH:MM:SS", ISO string, epoch detik (10 digit), epoch ms (13 digit).
 */
export function parseOrderTimestamp(raw: unknown): number {
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Deteksi epoch detik (10 digit) vs ms (13 digit).
    return raw < 1e12 ? raw * 1000 : raw;
  }
  if (raw === null || raw === undefined) return 0;

  const s = String(raw).trim();
  if (s === "") return 0;

  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }

  const iso = s.includes("T") ? s : s.replace(" ", "T");
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** Deteksi peran file berdasarkan daftar header yang sudah dinormalisasi. */
export function detectFileRole(headers: string[]): FileRole {
  const set = new Set(headers.map(normalizeHeader));
  const has = (...keys: string[]) => keys.some((k) => set.has(k));

  if (has("cogs", "global buffer stock", "global buffer")) return "MASTER";
  if (has("deal price")) return "SHOPEE_SALES";
  if (has("sale price")) return "TIKTOK_SALES";
  if (has("available stock", "locked stock")) return "TIKTOK_INVENTORY";
  if (has("sku") && has("stock")) return "SHOPEE_INVENTORY";
  return "UNKNOWN";
}

type RawRow = Record<string, unknown>;

function resolveColumn(
  headers: string[],
  aliases: string[],
): string | undefined {
  const map = new Map(headers.map((h) => [normalizeHeader(h), h]));
  for (const alias of aliases) {
    const hit = map.get(alias);
    if (hit) return hit;
  }
  return undefined;
}

const SALES_ALIASES = {
  orderId: ["order id"],
  orderTimestamp: ["order creation time", "created time"],
  sku: ["sku", "seller sku"],
  qtySold: ["quantity"],
  dealPrice: ["deal price", "sale price"],
  sellerVoucher: ["seller voucher", "discount (seller)", "discount"],
  platformSubsidy: ["shopee rebate", "platform subsidy"],
} satisfies Record<string, string[]>;

const MASTER_ALIASES = {
  sku: ["sku"],
  cogs: ["cogs"],
  globalBuffer: ["global buffer stock", "global buffer", "buffer"],
  promoBudgetCap: ["promo budget cap", "promo budget", "budget cap"],
  currentMarketplaceStock: ["current stock", "current marketplace stock"],
  platformFeeRate: ["platform fee rate", "platform fee", "marketplace fee rate"],
} satisfies Record<string, string[]>;

const INVENTORY_ALIASES = {
  sku: ["sku", "seller sku"],
  currentStock: ["stock", "available stock"],
} satisfies Record<string, string[]>;

/** Normalisasi baris penjualan (Shopee atau TikTok) ke OmnichannelSaleRow. */
export function normalizeSalesRows(
  rows: RawRow[],
  headers: string[],
  marketplace: Marketplace,
): OmnichannelSaleRow[] {
  const col = (aliases: string[]) => resolveColumn(headers, aliases);

  const orderIdCol = col(SALES_ALIASES.orderId);
  const timeCol = col(SALES_ALIASES.orderTimestamp);
  const skuCol = col(SALES_ALIASES.sku);
  const qtyCol = col(SALES_ALIASES.qtySold);
  const dealCol = col(SALES_ALIASES.dealPrice);
  const voucherCol = col(SALES_ALIASES.sellerVoucher);
  const subsidyCol = col(SALES_ALIASES.platformSubsidy);

  const result: OmnichannelSaleRow[] = [];
  for (const row of rows) {
    const sku = String(skuCol ? row[skuCol] ?? "" : "").trim();
    const orderId = String(orderIdCol ? row[orderIdCol] ?? "" : "").trim();
    const orderTimestamp = parseOrderTimestamp(timeCol ? row[timeCol] : 0);
    if (sku === "" || orderTimestamp === 0) continue;

    result.push({
      orderId,
      orderTimestamp,
      marketplace,
      sku,
      qtySold: sanitizeNumber(qtyCol ? row[qtyCol] : 0),
      dealPrice: sanitizeNumber(dealCol ? row[dealCol] : 0),
      sellerVoucher: sanitizeNumber(voucherCol ? row[voucherCol] : 0),
      platformSubsidy: sanitizeNumber(subsidyCol ? row[subsidyCol] : 0),
    });
  }
  return result;
}

/** Normalisasi baris master data internal ke MasterCatalogRow. */
export function normalizeMasterRows(
  rows: RawRow[],
  headers: string[],
): MasterCatalogRow[] {
  const col = (aliases: string[]) => resolveColumn(headers, aliases);

  const skuCol = col(MASTER_ALIASES.sku);
  const cogsCol = col(MASTER_ALIASES.cogs);
  const bufferCol = col(MASTER_ALIASES.globalBuffer);
  const budgetCol = col(MASTER_ALIASES.promoBudgetCap);
  const stockCol = col(MASTER_ALIASES.currentMarketplaceStock);
  const feeCol = col(MASTER_ALIASES.platformFeeRate);

  const result: MasterCatalogRow[] = [];
  for (const row of rows) {
    const sku = String(skuCol ? row[skuCol] ?? "" : "").trim();
    if (sku === "") continue;

    const feeRate = feeCol ? sanitizeFeeRate(row[feeCol]) : undefined;
    const master: MasterCatalogRow = {
      sku,
      cogs: sanitizeNumber(cogsCol ? row[cogsCol] : 0),
      globalBuffer: sanitizeNumber(bufferCol ? row[bufferCol] : 0),
      promoBudgetCap: sanitizeNumber(budgetCol ? row[budgetCol] : 0),
      currentMarketplaceStock: sanitizeNumber(stockCol ? row[stockCol] : 0),
    };
    if (feeRate !== undefined) master.platformFeeRate = feeRate;
    result.push(master);
  }
  return result;
}

/** Normalisasi baris inventori marketplace ke InventoryRow. */
export function normalizeInventoryRows(
  rows: RawRow[],
  headers: string[],
  marketplace: Marketplace,
): InventoryRow[] {
  const col = (aliases: string[]) => resolveColumn(headers, aliases);

  const skuCol = col(INVENTORY_ALIASES.sku);
  const stockCol = col(INVENTORY_ALIASES.currentStock);

  const result: InventoryRow[] = [];
  for (const row of rows) {
    const sku = String(skuCol ? row[skuCol] ?? "" : "").trim();
    if (sku === "") continue;
    result.push({
      sku,
      marketplace,
      currentStock: sanitizeNumber(stockCol ? row[stockCol] : 0),
    });
  }
  return result;
}
