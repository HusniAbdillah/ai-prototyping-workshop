/**
 * WhatsApp 1-Click Escalation builder (docs/04 §1, docs/06 §3).
 * Semua payload di-encode dengan encodeURIComponent agar emoji, line break,
 * dan simbol khusus aman di dalam URL universal link (wa.me).
 */

import type { EscalationRoutingConfig, Marketplace } from "@/types/domain";

/** Format Rupiah kompak tanpa spasi (e.g. 1250000 -> "Rp1.250.000"). */
function rp(value: number): string {
  return `Rp${Math.round(value).toLocaleString("id-ID")}`;
}

// ---------------------------------------------------------------------------
// Margin Bleed
// ---------------------------------------------------------------------------

export interface MarginBleedPayload {
  marketplace: Marketplace;
  sku: string;
  dealPrice: number;
  feeRate: number;
  estFee: number;
  netPayout: number;
  cogs: number;
  lossPerUnit: number;
  cumulativeBurn: number;
}

export function buildMarginBleedWhatsAppText(p: MarginBleedPayload): string {
  const feePct = (p.feeRate * 100).toFixed(1);
  return (
    `🚨 CRITICAL [SIRCLO Insight]\n\n` +
    `Terjadi Bocor Margin (Under COGS)!\n` +
    `Channel: ${p.marketplace}\n` +
    `SKU: ${p.sku}\n\n` +
    `Harga Konsumen: ${rp(p.dealPrice)}\n` +
    `Est. Admin Fee (${feePct}%): ${rp(p.estFee)}\n` +
    `Net Payout Toko: ${rp(p.netPayout)}\n` +
    `Modal (COGS): ${rp(p.cogs)}\n` +
    `❌ Rugi per Unit: ${rp(p.lossPerUnit)}\n` +
    `💥 Total Akumulasi Rugi: ${rp(p.cumulativeBurn)}\n\n` +
    `*Action Required:* Mohon cabut voucher toko atau hentikan promo flash-sale SKU ini SEKARANG!`
  );
}

export function buildMarginBleedWhatsAppUrl(
  config: EscalationRoutingConfig,
  p: MarginBleedPayload,
): string {
  return `https://wa.me/${config.waPricing}?text=${encodeURIComponent(
    buildMarginBleedWhatsAppText(p),
  )}`;
}

// ---------------------------------------------------------------------------
// OOS Risk (Rebalance vs Emergency)
// ---------------------------------------------------------------------------

export interface OosPayload {
  marketplace: Marketplace;
  sku: string;
  runwayHours: number;
  velocityPerHour: number;
  globalBuffer: number;
  recommendedRebalance: number;
  isTotalOOS: boolean;
}

export function buildRebalanceOosWhatsAppText(p: OosPayload): string {
  return (
    `⚠️ WARNING [SIRCLO Insight]\n\n` +
    `Risiko Out of Stock (OOS)!\n` +
    `Channel: ${p.marketplace}\n` +
    `SKU: ${p.sku}\n\n` +
    `Runway: Sisa ${p.runwayHours.toFixed(1)} Jam lagi.\n` +
    `Velocity: ${p.velocityPerHour.toFixed(1)} unit/jam.\n` +
    `Buffer Gudang Tersedia: ${p.globalBuffer} Unit.\n\n` +
    `*Action Required:* Mohon suntik/pindahkan ${p.recommendedRebalance} unit ke etalase marketplace segera agar tidak kehabisan stok.`
  );
}

export function buildEmergencyOosWhatsAppText(p: OosPayload): string {
  return (
    `🚨 CRITICAL EMERGENCY [SIRCLO Insight]\n\n` +
    `Risiko OOS TOTAL (Buffer Gudang KOSONG)!\n` +
    `Channel: ${p.marketplace}\n` +
    `SKU: ${p.sku}\n\n` +
    `Runway: Sisa ${p.runwayHours.toFixed(1)} Jam!\n` +
    `Buffer Gudang: 0 Unit (PO Supplier Tidak Tersedia/Lead-Time Lama).\n\n` +
    `*Action Required (Pencegahan Penalti Toko)*:\n` +
    `1. SEGERA MATIKAN IKLAN BERBAYAR (Ads/Live) untuk SKU ini.\n` +
    `2. Naikkan harga jual etalase 15% untuk mengerem laju order.\n` +
    `3. JANGAN sampai terjadi pembatalan pesanan massal (Non-Fulfillment Rate).`
  );
}

/**
 * Pilih teks & PIC tujuan secara otomatis:
 * - Buffer habis (emergency) -> PIC Pricing/Ads (rem laju).
 * - Buffer tersedia (rebalance) -> PIC Warehouse (suntik stok).
 */
export function buildOosWhatsAppUrl(
  config: EscalationRoutingConfig,
  p: OosPayload,
): string {
  const text = p.isTotalOOS
    ? buildEmergencyOosWhatsAppText(p)
    : buildRebalanceOosWhatsAppText(p);
  const target = p.isTotalOOS ? config.waPricing : config.waWarehouse;
  return `https://wa.me/${target}?text=${encodeURIComponent(text)}`;
}
