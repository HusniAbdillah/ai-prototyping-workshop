import { describe, expect, it } from "vitest";
import {
  detectFileRole,
  normalizeHeader,
  normalizeInventoryRows,
  normalizeMasterRows,
  normalizeSalesRows,
  parseOrderTimestamp,
  sanitizeFeeRate,
  sanitizeNumber,
} from "@/ingestion/normalize";
import { assertFileSizeAllowed, FileTooLargeError } from "@/ingestion/parser";

describe("Omnichannel Ingestion & Normalization", () => {
  it("CHK-ING-002: membersihkan string mata uang Rupiah menjadi integer", () => {
    const rawValues = ["Rp 120.000", "Rp15.500,00", "-Rp 5.000", "0", " 45000 "];
    const parsedNumbers = rawValues.map(sanitizeNumber);
    expect(parsedNumbers).toEqual([120000, 15500, -5000, 0, 45000]);
  });

  it("mengurai persentase biaya platform ke angka desimal", () => {
    expect(sanitizeFeeRate("8.5%")).toBeCloseTo(0.085);
    expect(sanitizeFeeRate("0.085")).toBeCloseTo(0.085);
    expect(sanitizeFeeRate(undefined)).toBeCloseTo(0.085);
  });

  it("mengurai timestamp pesanan (string, epoch detik, epoch ms)", () => {
    expect(parseOrderTimestamp("2026-09-28 00:10:00")).toBeGreaterThan(0);
    expect(parseOrderTimestamp(1727680000)).toBe(1727680000000);
    expect(parseOrderTimestamp(1727680000000)).toBe(1727680000000);
  });

  it("CHK-ING-004: menormalisasi header dan membuang BOM UTF-8", () => {
    expect(normalizeHeader("\uFEFFOrder ID")).toBe("order id");
    expect(normalizeHeader("  Seller SKU  ")).toBe("seller sku");
  });

  it("mendeteksi peran file berdasarkan header", () => {
    expect(detectFileRole(["SKU", "COGS", "Global Buffer Stock"])).toBe("MASTER");
    expect(detectFileRole(["Order ID", "SKU", "Deal Price"])).toBe("SHOPEE_SALES");
    expect(detectFileRole(["Order ID", "Seller SKU", "Sale Price"])).toBe("TIKTOK_SALES");
    expect(detectFileRole(["Seller SKU", "Available Stock"])).toBe("TIKTOK_INVENTORY");
    expect(detectFileRole(["SKU", "Stock"])).toBe("SHOPEE_INVENTORY");
  });

  it("CHK-ING-001: menormalisasi alias header Shopee & TikTok ke OmnichannelSaleRow", () => {
    const shopeeHeaders = [
      "Order ID", "SKU", "Order Creation Time", "Quantity",
      "Deal Price", "Seller Voucher", "Shopee Rebate",
    ];
    const shopeeRows = [
      {
        "Order ID": "SHP-1",
        "SKU": "SKU-A",
        "Order Creation Time": "2026-09-28 00:10:00",
        "Quantity": "2",
        "Deal Price": "80000",
        "Seller Voucher": "15000",
        "Shopee Rebate": "5000",
      },
    ];
    const shopee = normalizeSalesRows(shopeeRows, shopeeHeaders, "SHOPEE");
    expect(shopee[0]).toMatchObject({
      orderId: "SHP-1",
      sku: "SKU-A",
      marketplace: "SHOPEE",
      qtySold: 2,
      dealPrice: 80000,
      sellerVoucher: 15000,
      platformSubsidy: 5000,
    });

    const tiktokHeaders = [
      "Order ID", "Seller SKU", "Created Time", "Quantity",
      "Sale Price", "Discount (Seller)", "Platform Subsidy",
    ];
    const tiktokRows = [
      {
        "Order ID": "TT-1",
        "Seller SKU": "SKU-A",
        "Created Time": "2026-09-28 00:10:00",
        "Quantity": "3",
        "Sale Price": "90000",
        "Discount (Seller)": "20000",
        "Platform Subsidy": "0",
      },
    ];
    const tiktok = normalizeSalesRows(tiktokRows, tiktokHeaders, "TIKTOK");
    expect(tiktok[0]).toMatchObject({
      orderId: "TT-1",
      sku: "SKU-A",
      marketplace: "TIKTOK",
      qtySold: 3,
      dealPrice: 90000,
      sellerVoucher: 20000,
      platformSubsidy: 0,
    });
  });

  it("menormalisasi baris master data internal ke MasterCatalogRow", () => {
    const headers = [
      "SKU", "COGS", "Global Buffer Stock", "Promo Budget Cap",
      "Current Stock", "Platform Fee Rate",
    ];
    const rows = [
      {
        "SKU": "SKU-A",
        "COGS": "100000",
        "Global Buffer Stock": "50",
        "Promo Budget Cap": "500000",
        "Current Stock": "10",
        "Platform Fee Rate": "8.5%",
      },
    ];
    const result = normalizeMasterRows(rows, headers);
    expect(result[0]).toMatchObject({
      sku: "SKU-A",
      cogs: 100000,
      globalBuffer: 50,
      promoBudgetCap: 500000,
      currentMarketplaceStock: 10,
      platformFeeRate: 0.085,
    });
  });

  it("menormalisasi baris inventori marketplace ke InventoryRow", () => {
    const headers = ["Seller SKU", "Available Stock"];
    const rows = [{ "Seller SKU": "SKU-A", "Available Stock": "40" }];
    const result = normalizeInventoryRows(rows, headers, "TIKTOK");
    expect(result[0]).toEqual({ sku: "SKU-A", marketplace: "TIKTOK", currentStock: 40 });
  });

  it("CHK-SYS-001: menegakkan batas 50MB file", () => {
    const oversized = { size: 55_000_000, name: "large.csv" } as File;
    const valid = { size: 15_000_000, name: "valid.csv" } as File;

    expect(() => assertFileSizeAllowed(oversized)).toThrow(FileTooLargeError);
    expect(() => assertFileSizeAllowed(valid)).not.toThrow();
  });
});
