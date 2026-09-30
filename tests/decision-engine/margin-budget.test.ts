import { describe, expect, it } from "vitest";
import { evaluateMarginAndBudget } from "@/engine/margin-budget";
import type {
  EscalationRoutingConfig,
  MasterCatalogRow,
  OmnichannelSaleRow,
} from "@/types/domain";

const routing: EscalationRoutingConfig = {
  waPricing: "628111",
  waWarehouse: "628222",
};

function sale(
  partial: Partial<OmnichannelSaleRow> & { sku: string },
): OmnichannelSaleRow {
  return {
    orderId: "TEST-1",
    orderTimestamp: Date.now(),
    marketplace: "SHOPEE",
    qtySold: 1,
    dealPrice: 0,
    sellerVoucher: 0,
    platformSubsidy: 0,
    ...partial,
  };
}

function master(
  partial: Partial<MasterCatalogRow> & { sku: string },
): MasterCatalogRow {
  return {
    cogs: 0,
    globalBuffer: 0,
    promoBudgetCap: 0,
    currentMarketplaceStock: 0,
    ...partial,
  };
}

describe("evaluateMarginAndBudget — Net Realized Margin & Promo Budget", () => {
  it("CHK-FIN-001: mengklasifikasikan SAFE saat subsidi platform menutup harga di bawah COGS", () => {
    const sales = [
      sale({ sku: "SKU-BEAUTY", dealPrice: 50000, platformSubsidy: 35000, qtySold: 5 }),
    ];
    const catalog = [master({ sku: "SKU-BEAUTY", cogs: 80000 })];
    expect(evaluateMarginAndBudget(sales, catalog, routing)).toEqual([]);
  });

  it("CHK-FIN-002: memflag CRITICAL MARGIN_BLEED saat voucher toko membuat margin negatif pada SKU non-promo", () => {
    const sales = [
      sale({ sku: "SKU-GADGET", dealPrice: 95000, sellerVoucher: 25000, qtySold: 10 }),
    ];
    const catalog = [master({ sku: "SKU-GADGET", cogs: 90000, promoBudgetCap: 0 })];
    const result = evaluateMarginAndBudget(sales, catalog, routing);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("CRITICAL");
    expect(result[0].issueType).toBe("MARGIN_BLEED");
    // netPayout = 95000 - 25000 - (95000*0.085) = 61925; rugi = 90000-61925 = 28075 * 10.
    expect(result[0].cumulativeBurn).toBeCloseTo(280750);
    expect(result[0].recommendedAction).toBe("STOP_PROMO");
  });

  it("CHK-FIN-003: mengklasifikasikan intentional burn <= 70% budget sebagai SAFE", () => {
    const sales = [
      sale({ sku: "SKU-HERO", dealPrice: 85000, platformSubsidy: 5000, qtySold: 200 }),
    ];
    const catalog = [
      master({ sku: "SKU-HERO", cogs: 100000, promoBudgetCap: 5000000 }),
    ];
    expect(evaluateMarginAndBudget(sales, catalog, routing)).toEqual([]);
  });

  it("CHK-FIN-004: memicu WARNING watchlist saat burn berada di 70%–90% budget cap", () => {
    const sales = [sale({ sku: "SKU-WATCH", dealPrice: 90000, qtySold: 50 })];
    const catalog = [
      master({ sku: "SKU-WATCH", cogs: 100000, promoBudgetCap: 1000000 }),
    ];
    const result = evaluateMarginAndBudget(sales, catalog, routing);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("WARNING");
    expect(result[0].issueType).toBe("BUDGET_BREACH");
    // rugi/unit = 100000 - (90000 - 7650) = 17650; * 50 = 882500 (88.25%).
    expect(result[0].cumulativeBurn).toBeCloseTo(882500);
  });

  it("CHK-FIN-005: memicu CRITICAL BUDGET_BREACH saat burn melebihi 90% budget cap", () => {
    const sales = [sale({ sku: "SKU-BREACH", dealPrice: 90000, qtySold: 60 })];
    const catalog = [
      master({ sku: "SKU-BREACH", cogs: 100000, promoBudgetCap: 1000000 }),
    ];
    const result = evaluateMarginAndBudget(sales, catalog, routing);

    expect(result).toHaveLength(1);
    expect(result[0].severity).toBe("CRITICAL");
    expect(result[0].issueType).toBe("BUDGET_BREACH");
    expect(result[0].cumulativeBurn).toBeCloseTo(1059000);
  });

  it("CHK-FIN-007: menangani order gratis tanpa NaN dan menghitung rugi COGS penuh", () => {
    const sales = [sale({ sku: "SKU-FREE", dealPrice: 0, qtySold: 20 })];
    const catalog = [master({ sku: "SKU-FREE", cogs: 15000 })];
    const result = evaluateMarginAndBudget(sales, catalog, routing);

    expect(Number.isFinite(result[0].cumulativeBurn)).toBe(true);
    expect(result[0].cumulativeBurn).toBe(300000);
    expect(result[0].issueType).toBe("MARGIN_BLEED");
  });

  it("CHK-FIN-006: mengakumulasi burn hanya dari transaksi rugi lintas marketplace", () => {
    const sales = [
      sale({ orderId: "A", marketplace: "SHOPEE", sku: "SKU-OMNI", dealPrice: 120000, qtySold: 5 }),
      sale({ orderId: "B", marketplace: "TIKTOK", sku: "SKU-OMNI", dealPrice: 70000, qtySold: 4 }),
      sale({ orderId: "C", marketplace: "SHOPEE", sku: "SKU-OMNI", dealPrice: 60000, platformSubsidy: 10000, qtySold: 3 }),
    ];
    const catalog = [
      master({ sku: "SKU-OMNI", cogs: 100000, promoBudgetCap: 200000 }),
    ];
    const result = evaluateMarginAndBudget(sales, catalog, routing);

    expect(result).toHaveLength(1);
    expect(result[0].issueType).toBe("BUDGET_BREACH");
    // Hanya order B (35950*4=143800) dan C (35100*3=105300) yang rugi.
    expect(result[0].cumulativeBurn).toBeCloseTo(249100);
  });

  it("CHK-FIN-008: mendeteksi margin bleed saat biaya admin 8.5% mengubah profit menjadi rugi", () => {
    const sales = [sale({ sku: "SKU-SLIM", dealPrice: 100000, qtySold: 20 })];
    const catalog = [master({ sku: "SKU-SLIM", cogs: 95000 })];
    const result = evaluateMarginAndBudget(sales, catalog, routing);

    expect(result[0].estimatedFee).toBeCloseTo(8500);
    expect(result[0].netPayout).toBeCloseTo(91500);
    expect(result[0].lossPerUnit).toBeCloseTo(3500);
    expect(result[0].cumulativeBurn).toBeCloseTo(70000);
    expect(result[0].issueType).toBe("MARGIN_BLEED");
  });

  it("CHK-ING-003: melewati SKU yang tidak cocok dengan master tanpa melempar error", () => {
    const sales = [sale({ sku: "SKU-UNKNOWN" })];
    const catalog = [master({ sku: "SKU-KNOWN", cogs: 100000 })];
    expect(() => evaluateMarginAndBudget(sales, catalog, routing)).not.toThrow();
    expect(evaluateMarginAndBudget(sales, catalog, routing)).toEqual([]);
  });

  it("CHK-ESC-002: hanya mengembalikan baris anomali (SAFE disaring dari triase)", () => {
    const sales = [
      sale({ sku: "SAFE-SKU", dealPrice: 50000, platformSubsidy: 35000, qtySold: 5 }),
      sale({ sku: "BAD-SKU", dealPrice: 95000, sellerVoucher: 25000, qtySold: 10 }),
    ];
    const catalog = [
      master({ sku: "SAFE-SKU", cogs: 80000 }),
      master({ sku: "BAD-SKU", cogs: 90000 }),
    ];
    const result = evaluateMarginAndBudget(sales, catalog, routing);

    expect(result).toHaveLength(1);
    expect(result.every((r) => r.severity !== "SAFE")).toBe(true);
  });
});
