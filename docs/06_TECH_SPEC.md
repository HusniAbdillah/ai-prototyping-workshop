# 06. Technical Specification (TECH_SPEC) & Engineering Blueprint

Dokumen ini adalah spesifikasi teknis definitif untuk *Software Engineers*. Berisi batasan ketat (*strict edge boundaries*), antarmuka TypeScript, contoh *payload* JSON, dan algoritma matematis (Core Anomaly & Runway Math).

---

## 1. Tech Stack & Strict Edge Boundaries

Karena aplikasi "Day 0" ini berjalan 100% di sisi klien (*client-side*), *Engineers* harus mematuhi batasan arsitektur berikut:

### A. Teknologi
- **Framework:** Next.js (SSG/Static Export) atau Vite (React).
- **Parser:** `PapaParse` terkonfigurasi menggunakan **Web Workers** (`worker: true`) agar *thread* UI tidak membeku (*freeze*) saat menelan ribuan baris.
- **Styling:** Tailwind CSS + Shadcn UI.

### B. Strict Edge Boundaries (Batasan Eksekusi)
1. **Zero Data Persistence:** Tidak ada data yang dikirim ke *backend/cloud*. Saat *browser di-refresh*, data lenyap. Ini menjamin keamanan (*security compliance*) tanpa *review* bertele-tele.
2. **File Size Limit:** Maksimal ukuran CSV yang diunggah secara bersamaan adalah **50MB**. Di atas itu, *browser tab* berisiko *crash* akibat limitasi V8 JavaScript Engine *Memory Heap*.
3. **Stateless Engine:** *Decision Engine* hanyalah kumpulan fungsi murni (*pure functions*) yang menerima *array input* dan memuntahkan *array output*, tanpa mutasi state eksternal.

---

## 2. Data Schema: TypeScript Interfaces & Sample JSON

### A. TypeScript Interfaces
Definisi absolut yang wajib digunakan dalam seluruh *codebase*.

```typescript
export type Marketplace = 'SHOPEE' | 'TIKTOK';
export type IssueSeverity = 'SAFE' | 'WARNING' | 'CRITICAL';
export type IssueType = 'MARGIN_BLEED' | 'BUDGET_BREACH' | 'OOS_RISK' | 'NONE';

// 1. Standarisasi Baris Penjualan Marketplace
export interface OmnichannelSaleRow {
  orderId: string;
  orderTimestamp: number;  // Epoch time untuk kalkulasi window
  marketplace: Marketplace;
  sku: string;
  qtySold: number;
  dealPrice: number;       // Harga yang dibayar pembeli
  sellerVoucher: number;   // Diskon tanggungan penjual
  platformSubsidy: number; // Subsidi platform
}

// 2. Standarisasi Master Data
export interface MasterCatalogRow {
  sku: string;
  cogs: number;
  globalBuffer: number;
  promoBudgetCap: number;  // 0 jika tidak ada promo yang disetujui
  currentMarketplaceStock: number; // Stok etalase saat ini
}

// 3. Output Anomali
export interface AnomalyResult {
  sku: string;
  marketplace: Marketplace;
  issueType: IssueType;
  severity: IssueSeverity;
  metricValue: number;     // Nilai kerugian ATAU sisa jam runway
  actionableMessage: string;
  whatsappUrl: string;
}
```

### B. Sample Data JSON (Hasil Parsing PapaParse)
Visualisasi *payload* di memori setelah CSV dinormalisasi:

```json
{
  "omnicales": [
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
      "currentMarketplaceStock": 10
    }
  ]
}
```

---

## 3. Core Anomaly Math & Threshold Rules (The Engine)

### A. Margin & Promo Budget Engine
Algoritma ini mendeteksi produk yang terjual di bawah COGS, lalu melacaknya terhadap *Promo Budget Cap*.

**Threshold Alert Rules (Budget):**
- `Cumulative Burn == 0` ➔ SAFE
- `Cumulative Burn <= 70% Budget Cap` ➔ SAFE (Intentional Burn)
- `Cumulative Burn > 70% AND <= 90%` ➔ WARNING (Watchlist)
- `Cumulative Burn > 100% ATAU Budget Cap == 0` ➔ CRITICAL (Budget Breach!)

**TypeScript Core Logic:**
```typescript
export function evaluateMarginAndBudget(
  sales: OmnichannelSaleRow[], 
  catalog: MasterCatalogRow[]
): AnomalyResult[] {
  
  const anomalies: AnomalyResult[] = [];
  const burnTracker: Record<string, number> = {}; // { SKU: cumulativeLoss }

  // Loop setiap transaksi
  sales.forEach(sale => {
    const master = catalog.find(c => c.sku === sale.sku);
    if (!master) return; // Skip invalid SKU
    
    // Core Math: True Margin
    const finalRevenue = sale.dealPrice + sale.platformSubsidy - sale.sellerVoucher;
    const trueMargin = finalRevenue - master.cogs;
    
    if (trueMargin < 0) {
      const lossPerTransaction = Math.abs(trueMargin) * sale.qtySold;
      burnTracker[sale.sku] = (burnTracker[sale.sku] || 0) + lossPerTransaction;
    }
  });

  // Threshold Evaluation
  Object.keys(burnTracker).forEach(sku => {
    const master = catalog.find(c => c.sku === sku)!;
    const cumulativeBurn = burnTracker[sku];
    const budgetCap = master.promoBudgetCap;

    if (budgetCap === 0 || cumulativeBurn > budgetCap) {
      anomalies.push({
        sku,
        marketplace: 'SHOPEE', // Agnostik atau disesuaikan
        issueType: budgetCap === 0 ? 'MARGIN_BLEED' : 'BUDGET_BREACH',
        severity: 'CRITICAL',
        metricValue: cumulativeBurn,
        actionableMessage: `Kerugian Rp${cumulativeBurn} melebihi limit Rp${budgetCap}`,
        whatsappUrl: `https://wa.me/?text=URGENT...`
      });
    }
  });

  return anomalies;
}
```

### B. Runway Math & Velocity Engine (OOS Risk)
Menghitung kecepatan terjual berdasarkan *Moving Time-Window* (misal: 3 jam ke belakang).

**Threshold Alert Rules (Stock):**
- `Runway > 12 hours` ➔ SAFE
- `Runway <= 12 hours AND Global Buffer == 0` ➔ CRITICAL (Total OOS, tak bisa diselamatkan)
- `Runway <= 12 hours AND Global Buffer > 0` ➔ WARNING (Rebalance Required)

**TypeScript Core Logic:**
```typescript
export function evaluateRunway(
  sales: OmnichannelSaleRow[], 
  master: MasterCatalogRow,
  timeWindowHours: number = 3
): AnomalyResult | null {
  
  const currentTime = Date.now();
  const windowMs = timeWindowHours * 60 * 60 * 1000;
  const cutoffTime = currentTime - windowMs;

  // 1. Filter Sales within the Window
  const recentSales = sales.filter(s => s.sku === master.sku && s.orderTimestamp >= cutoffTime);
  
  // 2. Core Math: Velocity & Runway
  const totalQtySold = recentSales.reduce((sum, s) => sum + s.qtySold, 0);
  const velocityPerHour = totalQtySold / timeWindowHours;
  
  if (velocityPerHour === 0) return null; // Safe
  
  const runwayHours = master.currentMarketplaceStock / velocityPerHour;

  // 3. Threshold Rules
  if (runwayHours <= 12) {
    const isTotalOOS = master.globalBuffer <= 0;
    return {
      sku: master.sku,
      marketplace: 'SHOPEE', // Sederhanakan utk contoh
      issueType: 'OOS_RISK',
      severity: isTotalOOS ? 'CRITICAL' : 'WARNING',
      metricValue: runwayHours,
      actionableMessage: isTotalOOS 
        ? `Sisa ${runwayHours.toFixed(1)} jam, TIDAK ADA BUFFER`
        : `Sisa ${runwayHours.toFixed(1)} jam, REBALANCE SEKARANG`,
      whatsappUrl: `https://wa.me/?text=OOS_ALERT...`
    };
  }
  return null;
}
```
