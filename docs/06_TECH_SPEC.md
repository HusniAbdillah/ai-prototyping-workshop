# 06. Technical Specification (TECH_SPEC) & Engineering Blueprint

Dokumen ini adalah spesifikasi teknis definitif untuk *Software Engineers*. Berisi batasan ketat (*strict edge boundaries*), antarmuka TypeScript terstandardisasi, model data JSON, dan algoritma matematis (*Core Anomaly & Runway Math*) yang siap diimplementasikan.

---

## 1. Tech Stack & Strict Edge Boundaries

Karena aplikasi "Day 0" ini berjalan 100% di sisi klien (*client-side*), *Engineers* harus mematuhi batasan arsitektur berikut:

### A. Teknologi
- **Framework:** React + Vite (TypeScript).
- **Parser:** `PapaParse` terkonfigurasi menggunakan **Web Workers** (`worker: true`) agar *thread* UI tidak membeku (*freeze*) saat menelan ribuan baris.
- **Audio Synthesizer:** Native Web Audio API (Osilator nada 880Hz -> 440Hz).
- **Styling:** Tailwind CSS + Lucide React + Shadcn UI.
- **State & Local Persistence:** React Hooks (`useState`, `useMemo`) + `localStorage` (untuk preferensi nomor WA PIC & status eskalasi).

### B. Strict Edge Boundaries (Batasan Eksekusi)
1. **Zero Data Persistence:** Tidak ada data penjualan/katalog yang dikirim ke *backend/cloud*. Saat *browser di-refresh*, data lenyap dari RAM. Ini menjamin keamanan (*security compliance*) data sensitif klien.
2. **File Size Limit:** Maksimal ukuran CSV yang diunggah secara bersamaan adalah **50MB**. Di atas itu, sistem menolak file demi mencegah crash V8 Memory Heap.
3. **Stateless Engine:** *Decision Engine* hanyalah kumpulan fungsi murni (*pure functions*) yang menerima *array input* dan memuntahkan *array output*, tanpa mutasi state eksternal.

---

## 2. Data Schema: TypeScript Interfaces & Sample JSON

### A. TypeScript Interfaces
Definisi absolut yang wajib digunakan dalam seluruh *codebase*.

```typescript
export type Marketplace = 'SHOPEE' | 'TIKTOK';
export type IssueSeverity = 'SAFE' | 'WARNING' | 'CRITICAL';
export type IssueType = 'MARGIN_BLEED' | 'BUDGET_BREACH' | 'OOS_RISK' | 'UNMATCHED_SKU' | 'NONE';
export type SensitivityMode = 'NORMAL' | 'MEGA_CAMPAIGN';

// 1. Standarisasi Baris Penjualan Marketplace
export interface OmnichannelSaleRow {
  orderId: string;
  orderTimestamp: number;  // Epoch milliseconds untuk kalkulasi moving-window
  marketplace: Marketplace;
  sku: string;
  qtySold: number;
  dealPrice: number;       // Harga yang dibayar pembeli
  sellerVoucher: number;   // Diskon tanggungan penjual
  platformSubsidy: number; // Subsidi diskon dari platform (Shopee Rebate / TikTok Subsidy)
}

// 2. Standarisasi Master Data Internal
export interface MasterCatalogRow {
  sku: string;
  cogs: number;
  globalBuffer: number;    // Stok fisik di gudang internal
  promoBudgetCap: number;  // Batas toleransi bakar uang (0 jika non-promo)
  currentMarketplaceStock: number; // Stok etalase saat ini
  platformFeeRate?: number; // Default 0.085 (8.5% potongan komisi & admin marketplace)
}

// 3. Konfigurasi Routing WhatsApp PIC
export interface EscalationRoutingConfig {
  waPricing: string;       // Nomor WA PIC Pricing / Ads (contoh: 628123456789)
  waWarehouse: string;     // Nomor WA PIC Warehouse / Gudang
}

// 4. Output Anomali (Triage Item)
export interface AnomalyResult {
  id: string;              // Unique hash / ID anomali
  sku: string;
  marketplace: Marketplace;
  issueType: IssueType;
  severity: IssueSeverity;
  metricValue: number;     // Nilai kerugian (Rp) ATAU sisa jam runway
  
  // Field Finansial Rinci
  dealPrice?: number;
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
  recommendedAction: 'STOP_PROMO' | 'REBALANCE_STOCK' | 'PAUSE_ADS_PRICE_BUMP' | 'NONE';
  actionableMessage: string;
  whatsappUrl: string;
  
  // State Koordinasi Tim (17 AM)
  isEscalated: boolean;
  escalatedAt?: number;
  escalatedTo?: 'PRICING' | 'WAREHOUSE';
}

// 5. In-App Web Notification & Alert Payload
export interface InAppAlert {
  id: string;
  timestamp: number;
  type: 'TOAST' | 'BANNER' | 'BELL_ITEM';
  severity: IssueSeverity;
  title: string;
  message: string;
  sku: string;
  soundChime: boolean;     // Menentukan apakah memicu sintetis audio Web Audio API
  dismissed: boolean;
}
```

### B. Sample Data JSON (Hasil Parsing PapaParse)

```json
{
  "omnichannelSales": [
    {
      "orderId": "SHP-2026-001",
      "orderTimestamp": 1727680000000,
      "marketplace": "SHOPEE",
      "sku": "MS-WL-PRO-BLK",
      "qtySold": 2,
      "dealPrice": 80000,
      "sellerVoucher": 15000,
      "platformSubsidy": 5000
    }
  ],
  "masterCatalog": [
    {
      "sku": "MS-WL-PRO-BLK",
      "cogs": 100000,
      "globalBuffer": 50,
      "promoBudgetCap": 500000,
      "currentMarketplaceStock": 10,
      "platformFeeRate": 0.085
    }
  ]
}
```

---

## 3. Core Anomaly Math & Threshold Rules (The Engine)

### A. Net Realized Margin & Promo Budget Engine
Algoritma ini mendeteksi produk yang terjual di bawah COGS setelah dipotong biaya admin platform, lalu melacaknya terhadap *Promo Budget Cap*.

```typescript
export function evaluateMarginAndBudget(
  sales: OmnichannelSaleRow[], 
  catalog: MasterCatalogRow[],
  routingConfig: EscalationRoutingConfig,
  defaultFeeRate: number = 0.085
): AnomalyResult[] {
  
  const anomalies: AnomalyResult[] = [];
  const burnTracker: Record<string, { cumulativeBurn: number; orderCount: number; sampleSale: OmnichannelSaleRow }> = {};

  // 1. Loop setiap transaksi untuk mengakumulasi kerugian per SKU
  sales.forEach(sale => {
    const master = catalog.find(c => c.sku.toLowerCase() === sale.sku.toLowerCase());
    if (!master) return; // Skip or handle unmatched SKU
    
    const feeRate = master.platformFeeRate !== undefined ? master.platformFeeRate : defaultFeeRate;
    const estPlatformFee = sale.dealPrice * feeRate;
    const netPayout = sale.dealPrice + sale.platformSubsidy - sale.sellerVoucher - estPlatformFee;
    const trueNetMargin = netPayout - master.cogs;
    
    if (trueNetMargin < 0) {
      const lossPerOrder = Math.abs(trueNetMargin) * sale.qtySold;
      if (!burnTracker[sale.sku]) {
        burnTracker[sale.sku] = { cumulativeBurn: 0, orderCount: 0, sampleSale: sale };
      }
      burnTracker[sale.sku].cumulativeBurn += lossPerOrder;
      burnTracker[sale.sku].orderCount += 1;
    }
  });

  // 2. Threshold Evaluation (Signal vs Noise)
  Object.keys(burnTracker).forEach(sku => {
    const master = catalog.find(c => c.sku.toLowerCase() === sku.toLowerCase())!;
    const { cumulativeBurn, sampleSale } = burnTracker[sku];
    const budgetCap = master.promoBudgetCap || 0;
    
    const feeRate = master.platformFeeRate !== undefined ? master.platformFeeRate : defaultFeeRate;
    const estFee = sampleSale.dealPrice * feeRate;
    const netPayout = sampleSale.dealPrice + sampleSale.platformSubsidy - sampleSale.sellerVoucher - estFee;
    const lossPerUnit = Math.abs(netPayout - master.cogs);

    const burnPercentage = budgetCap > 0 ? (cumulativeBurn / budgetCap) * 100 : Infinity;

    // Abaikan jika masih di bawah 70% budget cap (Intentional Burn)
    if (budgetCap > 0 && burnPercentage <= 70) {
      return; // SAFE
    }

    const isWatchlist = budgetCap > 0 && burnPercentage <= 90;
    const severity: IssueSeverity = isWatchlist ? 'WARNING' : 'CRITICAL';
    const issueType: IssueType = budgetCap === 0 ? 'MARGIN_BLEED' : 'BUDGET_BREACH';

    // Buat draft pesan WhatsApp SOP
    const waText = encodeURIComponent(
      `[CRITICAL] SIRCLO Insight\n\n` +
      `Terjadi Bocor Margin (Under COGS)!\n` +
      `Channel: ${sampleSale.marketplace}\n` +
      `SKU: ${sku}\n\n` +
      `Harga Konsumen: Rp${sampleSale.dealPrice.toLocaleString('id-ID')}\n` +
      `Est. Admin Fee (${(feeRate * 100).toFixed(1)}%): Rp${Math.round(estFee).toLocaleString('id-ID')}\n` +
      `Net Payout Toko: Rp${Math.round(netPayout).toLocaleString('id-ID')}\n` +
      `Modal (COGS): Rp${master.cogs.toLocaleString('id-ID')}\n` +
      `Rugi per Unit: Rp${Math.round(lossPerUnit).toLocaleString('id-ID')}\n` +
      `Total Akumulasi Rugi: Rp${Math.round(cumulativeBurn).toLocaleString('id-ID')}\n\n` +
      `*Action Required:* Mohon cabut voucher toko atau hentikan promo flash-sale SKU ini SEKARANG!`
    );

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
      recommendedAction: 'STOP_PROMO',
      actionableMessage: budgetCap === 0 
        ? `Rugi Rp${Math.round(cumulativeBurn).toLocaleString('id-ID')} pada produk non-promo!`
        : `Overburn Rp${Math.round(cumulativeBurn).toLocaleString('id-ID')} (${burnPercentage.toFixed(1)}% dari budget Rp${budgetCap.toLocaleString('id-ID')})`,
      whatsappUrl: `https://wa.me/${routingConfig.waPricing}?text=${waText}`,
      isEscalated: false
    });
  });

  return anomalies;
}
```

---

### B. Moving-Window Velocity & Penalty Mitigation Engine (OOS Risk)

```typescript
export function evaluateRunway(
  sales: OmnichannelSaleRow[], 
  master: MasterCatalogRow,
  routingConfig: EscalationRoutingConfig,
  mode: SensitivityMode = 'NORMAL'
): AnomalyResult | null {
  
  const config = {
    NORMAL: { windowHours: 3, warningRunway: 12, criticalRunway: 4 },
    MEGA_CAMPAIGN: { windowHours: 1, warningRunway: 4, criticalRunway: 1 }
  };
  const { windowHours, warningRunway, criticalRunway } = config[mode];

  // 1. Ambil transaksi dalam window waktu terakhir
  const now = Date.now();
  const cutoff = now - (windowHours * 3600 * 1000);
  const recentSales = sales.filter(s => s.sku.toLowerCase() === master.sku.toLowerCase() && s.orderTimestamp >= cutoff);

  const totalQtySold = recentSales.reduce((sum, s) => sum + s.qtySold, 0);
  const velocityPerHour = totalQtySold / windowHours;

  // Zero Velocity Guard: Stagnant inventory
  if (velocityPerHour === 0) return null;

  const runwayHours = master.currentMarketplaceStock / velocityPerHour;

  // Filter Noise: Runway masih aman di atas batas warning
  if (runwayHours > warningRunway) return null;

  const isTotalOOS = master.globalBuffer <= 0;
  const isEmergency = runwayHours <= criticalRunway || isTotalOOS;
  const severity: IssueSeverity = isEmergency ? 'CRITICAL' : 'WARNING';
  const recommendedRebalance = Math.ceil(velocityPerHour * 24);

  // Format pesan WhatsApp sesuai kondisi (Rebalance vs Mitigasi Penalti Toko)
  let waText = '';
  let targetPIC = routingConfig.waWarehouse;
  let recommendedAction: AnomalyResult['recommendedAction'] = 'REBALANCE_STOCK';

  if (isTotalOOS) {
    targetPIC = routingConfig.waPricing; // Kirim ke Pricing/Ads untuk rem laju
    recommendedAction = 'PAUSE_ADS_PRICE_BUMP';
    waText = encodeURIComponent(
      `[CRITICAL EMERGENCY] SIRCLO Insight\n\n` +
      `Risiko OOS TOTAL (Buffer Gudang KOSONG)!\n` +
      `SKU: ${master.sku}\n` +
      `Runway: Sisa ${runwayHours.toFixed(1)} Jam!\n` +
      `Buffer Gudang: 0 Unit (PO Supplier Kosong/Lead-Time Lama).\n\n` +
      `*Action Required (Pencegahan Penalti Toko):*\n` +
      `1. SEGERA MATIKAN IKLAN BERBAYAR (Ads/Live) SKU ini.\n` +
      `2. Naikkan harga jual etalase 15% untuk mengerem laju order.\n` +
      `3. Cegah pembatalan pesanan massal (Non-Fulfillment Rate)!`
    );
  } else {
    waText = encodeURIComponent(
      `[WARNING] SIRCLO Insight\n\n` +
      `Risiko Out of Stock (OOS)!\n` +
      `SKU: ${master.sku}\n` +
      `Runway: Sisa ${runwayHours.toFixed(1)} Jam lagi.\n` +
      `Velocity: ${velocityPerHour.toFixed(1)} unit/jam.\n` +
      `Buffer Gudang: ${master.globalBuffer} Unit.\n\n` +
      `*Action Required:* Mohon suntik/alokasikan ${recommendedRebalance} unit ke etalase Seller Center segera!`
    );
  }

  return {
    id: `ANOM-OOS-${master.sku}`,
    sku: master.sku,
    marketplace: recentSales[0]?.marketplace || 'SHOPEE',
    issueType: 'OOS_RISK',
    severity,
    metricValue: runwayHours,
    currentStock: master.currentMarketplaceStock,
    velocityPerHour,
    runwayHours,
    globalBuffer: master.globalBuffer,
    recommendedRebalance: isTotalOOS ? 0 : recommendedRebalance,
    recommendedAction,
    actionableMessage: isTotalOOS
      ? `Sisa ${runwayHours.toFixed(1)} jam, TIDAK ADA BUFFER (Matikan Iklan & Naikkan Harga!)`
      : `Sisa ${runwayHours.toFixed(1)} jam. Rekomendasi suntik: ${recommendedRebalance} unit`,
    whatsappUrl: `https://wa.me/${targetPIC}?text=${waText}`,
    isEscalated: false
  };
}
```
