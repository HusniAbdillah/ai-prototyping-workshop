# 06. Technical Specification (TECH_SPEC)

Dokumen ini ditujukan untuk *Software Engineers* yang akan mengeksekusi pembuatan aplikasi MVP (Day 0 Proof).

## 1. Tech Stack (The Day 0 Toolkit)
Sesuai prinsip "Zero Boilerplate", kita tidak akan men-setup server/database untuk tahap awal. Semua pemrosesan data (ribuan baris CSV) terjadi di *client-side* komputer Account Manager.

- **Frontend Framework:** Next.js (dengan konfigurasi `output: 'export'` untuk SPA statis) atau Vite + React.
- **UI Library:** TailwindCSS (untuk kecepatan styling) + Shadcn UI (komponen Tabel dan Button yang cantik).
- **Data Parser:** `PapaParse.js` (Library tercepat untuk mengubah CSV mentah menjadi JSON array secara *in-browser*).
- **Language:** TypeScript (Sangat krusial untuk menjaga keamanan tipe data saat menormalisasi kolom dari 3 sumber CSV yang berbeda).

---

## 2. Directory Structure (Architecture)

```text
/src
  /components
    /ui                  # Shadcn generic components
    CsvDropzone.tsx      # Komponen form upload 3 file sekaligus
    AnomalyTable.tsx     # Tabel hasil deteksi dengan filter
    WhatsAppButton.tsx   # Komponen generator URL wa.me
  /core                  # The Decision Engine (Murni Logic)
    csvNormalizer.ts     # Mapper Shopee/TikTok/Master -> Omnichannel Schema
    marginEngine.ts      # Logika margin bleeding
    runwayEngine.ts      # Logika stock & velocity
  /store                 # State Management
    useDataStore.ts      # Zustand store untuk menyimpan CSV yang ter-parse
  /types                 # TypeScript Definitions
    index.ts             # Interface OmnichannelRow
```

---

## 3. Data Interfaces (TypeScript)

Berikut adalah struktur data internal (Omnichannel Schema) yang digunakan setelah CSV dinormalisasi.

```typescript
// /src/types/index.ts

export type Marketplace = 'SHOPEE' | 'TIKTOK';

export interface RawSaleRecord {
  orderId: string;
  marketplace: Marketplace;
  sku: string;
  dealPrice: number;       // Uang yang dibayar pembeli
  sellerVoucher: number;   // Diskon ditanggung seller
  platformSubsidy: number; // Diskon ditanggung Shopee/TikTok
  qtySold: number;
}

export interface MasterCatalog {
  sku: string;
  cogs: number;
  globalBuffer: number;
}

export interface AnomalyResult {
  sku: string;
  channel: Marketplace;
  issueType: 'MARGIN_BLEED' | 'OOS_RISK';
  severity: 'CRITICAL' | 'WARNING';
  actionableMessage: string;
  whatsappPayloadUrl: string; // Pre-generated wa.me link
}
```

---

## 4. Performance Consideration
- Walaupun *client-side*, `PapaParse` mampu membaca 10.000 baris CSV dalam < 1 detik jika menggunakan *Web Workers*.
- Hindari rendering 10.000 baris ke dalam `<table>` HTML sekaligus. Gunakan *Virtualization* (seperti `tanstack-virtual`) HANYA JIKA sistem menampilkan semua data. Namun, sesuai filosofi kita, UI **hanya akan merender baris anomali**, yang biasanya kurang dari 100 baris per eksekusi.
