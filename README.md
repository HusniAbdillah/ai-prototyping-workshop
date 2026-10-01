# SIRCLO Insight - Omnichannel Anomaly Detection Engine

SIRCLO Insight adalah sistem deteksi anomali operasional dan pendukung keputusan berbasis web (*pure client-side*) yang dirancang khusus untuk Account Manager (AM) e-commerce multi-channel (Shopee, TikTok Shop, dll.).

Aplikasi ini mendeteksi kebocoran margin (*margin bleed* di bawah COGS/HPP), pembengkakan anggaran promo (*budget breach*), serta risiko kehabisan stok (*out of stock / OOS*) dalam hitungan detik secara otomatis langsung dari file ekspor marketplace.

---

## Masalah yang Dipecahkan

1. **Margin Bleeding (Kebocoran Modal):** Transaksi produk terjual di bawah harga modal (COGS) akibat tumpang-tindih voucher toko, flash sale yang salah setting, atau kenaikan potongan komisi administrasi marketplace (8.5%).
2. **Promo Budget Cap Breach:** Penggunaan anggaran bakar uang marketing (*intentional burn*) yang melampaui batas alokasi yang disetujui perusahaan.
3. **Risiko OOS & Penalti Toko:** Lonjakan penjualan mendadak saat flash sale yang mengancam stok etalase habis, serta mitigasi darurat saat buffer gudang kosong untuk menghindari penalti pembatalan pesanan (*Non-Fulfillment Rate*).
4. **Lambatnya Analisa Manual:** Mengeliminasi proses olah spreadsheet Excel manual berdurasi 30-45 menit menjadi triase otomatis berdurasi < 5 detik.

---

## Fitur Utama

- **Omnichannel Multi-File Ingestion:** Drag-and-drop file CSV tanpa format kaku. Header file dikenali otomatis (*auto-role detection*) untuk:
  - Laporan Penjualan Shopee (*Shopee Sales*)
  - Laporan Penjualan TikTok (*TikTok Sales*)
  - Katalog Master Internal (*Master Catalog & COGS*)
  - Laporan Stok Etalase Shopee (*Shopee Inventory*)
  - Laporan Stok Etalase TikTok (*TikTok Inventory*)
- **1-Click Demo Data Loader:** Tombol instan untuk memuat seluruh 5 dataset demo secara lengkap dari folder statis.
- **Kalkulasi True Net Margin:** Menghitung penerimaan bersih riil (*Net Realized Payout*) dengan memperhitungkan biaya admin platform, voucher toko, dan subsidi platform terhadap COGS.
- **Dynamic Runway & Sensitivity Presets:** Evaluasi sisa waktu ketahanan stok (*stock runway*) berbasis *moving-time window* (Mode Operasional Normal vs Mega Flash Sale).
- **1-Click WhatsApp Escalation:** Membuka tautan universal link `wa.me` dengan draft pesan SOP terformat sesuai PIC tujuan (PIC Pricing/Ads untuk rem laju transaksi vs PIC Warehouse untuk suntik stok).
- **Shift Handover & MBR Claim Report:** Generator rekapitulasi teks terstruktur yang dapat disalin ke clipboard dalam satu klik untuk materi *Monthly Business Report* dan koordinasi pergantian shift.
- **In-App Multi-Sensory Alerts:** 
  - Toast darurat dan banner merah berkedip saat anomali kritis ditemukan.
  - Nada lonceng peringatan sintetis via Web Audio API (*dual-tone oscillator* tanpa file mp3 eksternal).
  - Judul tab browser berkedip dinamis saat pengguna berpindah tab / multitasking.
- **100% Client-Side Privacy:** Seluruh pemrosesan CSV berjalan di RAM browser pengguna menggunakan Web Worker (PapaParse). Tidak ada data internal ataupun data penjualan yang dikirim ke server backend luar.

---

## Arsitektur Teknologi

- **Frontend Framework:** React 18, TypeScript, Vite
- **Styling & UI:** Tailwind CSS, Lucide React (SVG icons), Tailwind Animate
- **Parsing Engine:** PapaParse (Web Worker CSV stream processing)
- **Audio Synthesizer:** Web Audio API (AudioContext, OscillatorNode)
- **Testing:** Vitest (Unit & Integration tests)
- **Deployment:** Vercel (didukung konfigurasi `vercel.json` SPA rewrite)

---

## Struktur Direktori

```text
ai-prototyping/
├── public/
│   └── data/                    # Dataset CSV omnichannel demo
│       ├── internal_master_data.csv
│       ├── shopee_inventory_report.csv
│       ├── shopee_sales_report.csv
│       ├── tiktok_inventory_report.csv
│       └── tiktok_sales_report.csv
├── src/
│   ├── components/              # Komponen antarmuka (TriageTable, Dropzone, EmergencyBanner, dll.)
│   ├── engine/                  # Decision Engine (margin, runway, escalation, shift-report)
│   ├── hooks/                   # React custom hooks (sound, tab-title, local-storage)
│   ├── ingestion/               # CSV parser, header normalizer, role detector
│   ├── lib/                     # Formatter angka, notifikasi, dan utility fungsi
│   ├── types/                   # TypeScript domain models dan schema types
│   ├── App.tsx                  # Root aplikasi dan integrasi tab layout
│   └── main.tsx                 # Entrypoint Vite React
├── tests/                       # Automated test suite (Vitest)
├── docs/                        # Dokumentasi PRD, Data Schema, SOP Escalation, dan Tech Spec
├── generate_mock_data.py        # Generator dataset sintetis omnichannel
├── vercel.json                  # Konfigurasi deployment Vercel SPA
└── package.json                 # Project dependencies & build scripts
```

---

## Panduan Menjalankan Proyek Secara Lokal

### Prasyarat
- Node.js versi 18.x atau lebih baru
- npm versi 9.x atau lebih baru

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser di alamat `http://localhost:5173`.

### 3. Menjalankan Pengujian Otomatis
```bash
npm test
```

### 4. Menjalankan Kompilasi Produksi
```bash
npm run build
```
Output kompilasi siap rilis akan dihasilkan di folder `dist/`.

### 5. Memeriksa Pratinjau Build Produksi
```bash
npm run preview
```

---

## Panduan Deployment ke Vercel

Proyek ini telah dilengkapi file `vercel.json` sehingga dapat langsung dideploy ke platform Vercel tanpa konfigurasi rumit:

1. Pastikan perubahan kode telah di-commit ke repositori Git:
   ```bash
   git add .
   git commit -m "feat: prepare release and documentation"
   git push origin main
   ```
2. Buka dashboard [Vercel](https://vercel.com) dan klik **Add New Project**.
3. Import repositori proyek ini dari GitHub/GitLab.
4. Vercel akan mendeteksi framework preset **Vite** secara otomatis:
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Klik tombol **Deploy**. Proyek akan aktif dan siap digunakan secara publik dalam waktu kurang dari 1 menit.
