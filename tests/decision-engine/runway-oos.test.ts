import { describe, expect, it } from "vitest";
import { evaluateRunway, SENSITIVITY_PRESETS } from "@/engine/runway-oos";
import { allocateBufferByVelocity } from "@/engine/pareto";
import type {
  EscalationRoutingConfig,
  MasterCatalogRow,
  OmnichannelSaleRow,
} from "@/types/domain";

const routing: EscalationRoutingConfig = {
  waPricing: "628111",
  waWarehouse: "628222",
};

const NOW = 1_800_000_000_000; // referensi "sekarang" tetap.

function saleAt(
  minutesAgo: number,
  qty: number,
  sku = "SKU-A",
  marketplace: OmnichannelSaleRow["marketplace"] = "SHOPEE",
): OmnichannelSaleRow {
  return {
    orderId: `O-${minutesAgo}`,
    orderTimestamp: NOW - minutesAgo * 60_000,
    marketplace,
    sku,
    qtySold: qty,
    dealPrice: 100000,
    sellerVoucher: 0,
    platformSubsidy: 0,
  };
}

function master(
  partial: Partial<MasterCatalogRow> & { sku: string },
): MasterCatalogRow {
  return {
    cogs: 100000,
    globalBuffer: 0,
    promoBudgetCap: 0,
    currentMarketplaceStock: 0,
    ...partial,
  };
}

describe("evaluateRunway — Moving-Window Velocity & OOS", () => {
  it("CHK-INV-002: mengembalikan null (SAFE) saat velocity nol / stok stagnan", () => {
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 45, globalBuffer: 100 });
    expect(
      evaluateRunway([], m, routing, {
        marketplace: "SHOPEE",
        currentStock: 45,
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it("menyaring noise: runway di atas batas warning -> null", () => {
    const sales = [saleAt(30, 3)]; // velocity = 3/3 = 1
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 100, globalBuffer: 50 });
    expect(
      evaluateRunway(sales, m, routing, {
        marketplace: "SHOPEE",
        currentStock: 100,
        nowMs: NOW,
      }),
    ).toBeNull();
  });

  it("CHK-INV-003: memicu WARNING rebalance saat runway <= 12 jam dan buffer tersedia", () => {
    const sales = [saleAt(30, 30)]; // velocity = 10
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 80, globalBuffer: 200 });
    const r = evaluateRunway(sales, m, routing, {
      marketplace: "SHOPEE",
      currentStock: 80,
      nowMs: NOW,
    });

    expect(r?.severity).toBe("WARNING");
    expect(r?.issueType).toBe("OOS_RISK");
    expect(r?.runwayHours).toBeCloseTo(8);
    expect(r?.recommendedAction).toBe("REBALANCE_STOCK");
    expect(r?.recommendedRebalance).toBe(240);
    expect(r?.whatsappUrl.startsWith("https://wa.me/628222")).toBe(true);
  });

  it("memicu CRITICAL saat runway <= 4 jam meski buffer tersedia", () => {
    const sales = [saleAt(30, 30)]; // velocity = 10
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 30, globalBuffer: 200 });
    const r = evaluateRunway(sales, m, routing, {
      marketplace: "SHOPEE",
      currentStock: 30,
      nowMs: NOW,
    });

    expect(r?.severity).toBe("CRITICAL");
    expect(r?.runwayHours).toBeCloseTo(3);
    expect(r?.recommendedAction).toBe("REBALANCE_STOCK");
  });

  it("CHK-INV-004: memicu CRITICAL emergency saat buffer gudang habis", () => {
    const sales = [saleAt(30, 15)]; // velocity = 5
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 15, globalBuffer: 0 });
    const r = evaluateRunway(sales, m, routing, {
      marketplace: "SHOPEE",
      currentStock: 15,
      nowMs: NOW,
    });

    expect(r?.severity).toBe("CRITICAL");
    expect(r?.recommendedAction).toBe("PAUSE_ADS_PRICE_BUMP");
    expect(r?.actionableMessage).toContain("TIDAK ADA BUFFER");
    expect(r?.whatsappUrl.startsWith("https://wa.me/628111")).toBe(true);
  });

  it("CHK-INV-005: memflag CRITICAL seketika saat stok etalase mencapai 0", () => {
    const sales = [saleAt(30, 24)]; // velocity = 8
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 0, globalBuffer: 50 });
    const r = evaluateRunway(sales, m, routing, {
      marketplace: "SHOPEE",
      currentStock: 0,
      nowMs: NOW,
    });

    expect(r?.severity).toBe("CRITICAL");
    expect(r?.runwayHours).toBe(0);
  });

  it("CHK-INV-001: menghitung velocity dari jendela 3 jam (bukan rata-rata harian)", () => {
    const sales = [
      saleAt(30, 100),
      saleAt(60, 100),
      saleAt(120, 100),
      saleAt(600, 20), // di luar jendela 3 jam
    ];
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 150, globalBuffer: 0 });
    const r = evaluateRunway(sales, m, routing, {
      marketplace: "SHOPEE",
      currentStock: 150,
      nowMs: NOW,
    });

    expect(r?.velocityPerHour).toBeCloseTo(100);
    expect(r?.runwayHours).toBeCloseTo(1.5);
  });

  it("menggunakan jendela 1 jam pada mode MEGA_CAMPAIGN", () => {
    expect(SENSITIVITY_PRESETS.MEGA_CAMPAIGN.windowHours).toBe(1);
    const sales = [
      saleAt(30, 60), // dalam 1 jam
      saleAt(120, 300), // di luar jendela 1 jam
    ];
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 120, globalBuffer: 0 });
    const r = evaluateRunway(sales, m, routing, {
      mode: "MEGA_CAMPAIGN",
      marketplace: "SHOPEE",
      currentStock: 120,
      nowMs: NOW,
    });

    expect(r?.velocityPerHour).toBeCloseTo(60);
  });

  it("CHK-INV-007: memicu protokol mitigasi penalti saat buffer nol & runway kritis", () => {
    const sales = [saleAt(30, 12)]; // velocity = 4
    const m = master({ sku: "SKU-A", currentMarketplaceStock: 10, globalBuffer: 0 });
    const r = evaluateRunway(sales, m, routing, {
      marketplace: "SHOPEE",
      currentStock: 10,
      nowMs: NOW,
    });

    expect(r?.runwayHours).toBeCloseTo(2.5);
    expect(r?.severity).toBe("CRITICAL");
    expect(r?.recommendedAction).toBe("PAUSE_ADS_PRICE_BUMP");
    expect(r?.actionableMessage).toContain("Matikan Iklan & Naikkan Harga");
  });
});

describe("allocateBufferByVelocity — Cross-Channel Pareto Allocator", () => {
  it("CHK-INV-006: mengalokasikan buffer proporsional terhadap velocity tiap channel", () => {
    const result = allocateBufferByVelocity({ TIKTOK: 80, SHOPEE: 20 }, 100);
    const tiktok = result.find((r) => r.marketplace === "TIKTOK");
    const shopee = result.find((r) => r.marketplace === "SHOPEE");

    expect(tiktok?.ratio).toBeCloseTo(0.8);
    expect(tiktok?.allocation).toBe(80);
    expect(shopee?.ratio).toBeCloseTo(0.2);
    expect(shopee?.allocation).toBe(20);
  });

  it("mengembalikan alokasi nol saat seluruh velocity nol", () => {
    const result = allocateBufferByVelocity({ TIKTOK: 0, SHOPEE: 0 }, 100);
    expect(result.every((r) => r.allocation === 0)).toBe(true);
  });
});
