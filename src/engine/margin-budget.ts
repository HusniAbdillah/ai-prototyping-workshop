/**
 * Rule 1: Net Realized Margin & Promo Budget Detector (docs/03 §1, docs/06 §3.A).
 * Mendeteksi kebocoran modal (Under COGS) setelah memperhitungkan biaya admin
 * marketplace, dengan batas toleransi bakar uang promosi (Intentional Burn).
 *
 * 100% pure function — tidak memutasi input maupun state eksternal.
 */

import type {
  AnomalyResult,
  EscalationRoutingConfig,
  MasterCatalogRow,
  OmnichannelSaleRow,
} from "@/types/domain";
import { buildMarginBleedWhatsAppUrl } from "./escalation";
import { formatPercent, formatRupiah } from "@/lib/format";

const DEFAULT_FEE_RATE = 0.085;

interface BurnAccumulator {
  cumulativeBurn: number;
  orderCount: number;
  sampleSale: OmnichannelSaleRow;
}

export function evaluateMarginAndBudget(
  sales: OmnichannelSaleRow[],
  catalog: MasterCatalogRow[],
  routingConfig: EscalationRoutingConfig,
  defaultFeeRate: number = DEFAULT_FEE_RATE,
): AnomalyResult[] {
  const catalogBySku = new Map(
    catalog.map((c) => [c.sku.toLowerCase(), c]),
  );
  const burnTracker = new Map<string, BurnAccumulator>();

  // 1. Akumulasi kerugian per SKU dari transaksi yang true margin-nya negatif.
  for (const sale of sales) {
    const master = catalogBySku.get(sale.sku.toLowerCase());
    if (!master) continue;

    const feeRate = master.platformFeeRate ?? defaultFeeRate;
    const estPlatformFee = sale.dealPrice * feeRate;
    const netPayout =
      sale.dealPrice + sale.platformSubsidy - sale.sellerVoucher - estPlatformFee;
    const trueNetMargin = netPayout - master.cogs;

    if (trueNetMargin < 0) {
      const lossPerOrder = Math.abs(trueNetMargin) * sale.qtySold;
      const existing = burnTracker.get(sale.sku) ?? {
        cumulativeBurn: 0,
        orderCount: 0,
        sampleSale: sale,
      };
      existing.cumulativeBurn += lossPerOrder;
      existing.orderCount += 1;
      burnTracker.set(sale.sku, existing);
    }
  }

  // 2. Threshold evaluation (Signal vs Noise).
  const anomalies: AnomalyResult[] = [];

  for (const [sku, acc] of burnTracker) {
    const master = catalogBySku.get(sku.toLowerCase());
    if (!master) continue;

    const { cumulativeBurn, sampleSale } = acc;
    const budgetCap = master.promoBudgetCap || 0;
    const feeRate = master.platformFeeRate ?? defaultFeeRate;
    const estFee = sampleSale.dealPrice * feeRate;
    const netPayout =
      sampleSale.dealPrice +
      sampleSale.platformSubsidy -
      sampleSale.sellerVoucher -
      estFee;
    const lossPerUnit = Math.abs(netPayout - master.cogs);
    const burnPercentage =
      budgetCap > 0 ? (cumulativeBurn / budgetCap) * 100 : Infinity;

    // Intentional Burn: masih <= 70% budget cap -> SAFE, jangan ganggu tim marketing.
    if (budgetCap > 0 && burnPercentage <= 70) continue;

    const isWatchlist = budgetCap > 0 && burnPercentage <= 90;
    const severity = isWatchlist ? "WARNING" : "CRITICAL";
    const issueType = budgetCap === 0 ? "MARGIN_BLEED" : "BUDGET_BREACH";

    const whatsappUrl = buildMarginBleedWhatsAppUrl(routingConfig, {
      marketplace: sampleSale.marketplace,
      sku,
      dealPrice: sampleSale.dealPrice,
      feeRate,
      estFee,
      netPayout,
      cogs: master.cogs,
      lossPerUnit,
      cumulativeBurn,
    });

    anomalies.push({
      id: `ANOM-MARGIN-${sku}`,
      sku,
      marketplace: sampleSale.marketplace,
      issueType,
      severity,
      metricValue: cumulativeBurn,
      dealPrice: sampleSale.dealPrice,
      estimatedFee: estFee,
      netPayout,
      cogs: master.cogs,
      lossPerUnit,
      cumulativeBurn,
      budgetCap,
      recommendedAction: "STOP_PROMO",
      actionableMessage:
        budgetCap === 0
          ? `Rugi ${formatRupiah(cumulativeBurn)} pada produk non-promo!`
          : `Overburn ${formatRupiah(cumulativeBurn)} (${formatPercent(
              burnPercentage,
            )} dari budget ${formatRupiah(budgetCap)})`,
      whatsappUrl,
      isEscalated: false,
    });
  }

  return anomalies;
}
