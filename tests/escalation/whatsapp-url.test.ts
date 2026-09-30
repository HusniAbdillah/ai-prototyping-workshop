import { describe, expect, it } from "vitest";
import {
  buildMarginBleedWhatsAppUrl,
  buildOosWhatsAppUrl,
} from "@/engine/escalation";
import { buildShiftHandoverReport } from "@/engine/shift-report";
import type { AnomalyResult } from "@/types/domain";

const config = { waPricing: "628111", waWarehouse: "628222" };

describe("Incident Escalation & Triage UI", () => {
  it("CHK-ESC-001: menghasilkan URL WhatsApp ter-encode dengan parameter SOP", () => {
    const url = buildMarginBleedWhatsAppUrl(config, {
      marketplace: "TIKTOK",
      sku: "MS-WL-PRO-BLK",
      dealPrice: 80000,
      feeRate: 0.085,
      estFee: 6800,
      netPayout: 71200,
      cogs: 100000,
      lossPerUnit: 28800,
      cumulativeBurn: 57600,
    });

    expect(url.startsWith("https://wa.me/628111?text=")).toBe(true);
    expect(url).toContain("MS-WL-PRO-BLK");
    expect(url).toContain("%0A"); // line break ter-encode
    expect(decodeURIComponent(url)).toContain("*Action Required:*");
  });

  it("merutekan OOS rebalance ke PIC Warehouse dan emergency ke PIC Pricing", () => {
    const rebalance = buildOosWhatsAppUrl(config, {
      marketplace: "SHOPEE",
      sku: "SKU-A",
      runwayHours: 4,
      velocityPerHour: 10,
      globalBuffer: 200,
      recommendedRebalance: 240,
      isTotalOOS: false,
    });
    expect(rebalance.startsWith("https://wa.me/628222")).toBe(true);

    const emergency = buildOosWhatsAppUrl(config, {
      marketplace: "SHOPEE",
      sku: "SKU-A",
      runwayHours: 2.5,
      velocityPerHour: 4,
      globalBuffer: 0,
      recommendedRebalance: 0,
      isTotalOOS: true,
    });
    expect(emergency.startsWith("https://wa.me/628111")).toBe(true);
    expect(decodeURIComponent(emergency)).toContain("Pencegahan Penalti Toko");
  });

  it("CHK-ESC-003: menghasilkan laporan shift handover terformat untuk clipboard", () => {
    const anomalies: AnomalyResult[] = [
      {
        id: "ANOM-1",
        sku: "SKU-01",
        marketplace: "SHOPEE",
        issueType: "MARGIN_BLEED",
        severity: "CRITICAL",
        metricValue: 500000,
        lossPerUnit: 20000,
        cumulativeBurn: 500000,
        recommendedAction: "STOP_PROMO",
        actionableMessage: "Rugi pada produk non-promo",
        whatsappUrl: "",
        isEscalated: true,
        escalatedAt: Date.now(),
        escalatedTo: "PRICING",
      },
      {
        id: "ANOM-2",
        sku: "SKU-02",
        marketplace: "TIKTOK",
        issueType: "OOS_RISK",
        severity: "WARNING",
        metricValue: 2.5,
        runwayHours: 2.5,
        globalBuffer: 0,
        recommendedAction: "REBALANCE_STOCK",
        actionableMessage: "Suntik 240 unit",
        whatsappUrl: "",
        isEscalated: false,
      },
    ];

    const report = buildShiftHandoverReport(anomalies, {
      dateLabel: "30 September 2026, 15:35",
    });

    expect(report).toContain("SHIFT HANDOVER & CLAIM REPORT");
    expect(report).toContain("SKU-01");
    expect(report).toContain("ESCALATED");
    expect(report).toContain("TOTAL CRITICAL ISSUES: 1");
    expect(report).toContain("TOTAL KERUGIAN BERJALAN: Rp 500.000");
  });
});
