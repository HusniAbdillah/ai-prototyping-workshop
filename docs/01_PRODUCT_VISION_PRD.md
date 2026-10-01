# 01. Product Vision & PRD (Product Requirements Document)

## 1. Executive Summary
Di ekosistem e-commerce *omnichannel* berskala besar seperti SIRCLO, **17 Account Manager (AM)** adalah garda terdepan operasional. Mereka bertanggung jawab atas ratusan SKU dari puluhan brand klien untuk memastikan produk selalu tersedia (*in-stock*), terhindar dari penalti performa toko marketplace (*Non-Fulfillment Rate / Cancellation Rate*), dan dijual dengan profit riil setelah dipotong komisi platform.

Masalah utamanya adalah ketiadaan sistem deteksi terpadu. AM harus mengunduh CSV secara sporadis dari berbagai platform (Shopee, TikTok Shop), menggabungkannya secara manual dengan data internal (Excel VLOOKUP), dan mencari anomali satu per satu. Proses triase manual ini memakan waktu **~45 menit per toko**. Di momen *High Traffic* (seperti Payday atau 11.11 Flash Sale), 45 menit keterlambatan berarti puluhan juta rupiah hangus akibat harga salah atau hilangnya omset akibat OOS dadakan.

**Misi Produk:** Membangun *Anomaly Detection Engine* (SIRCLO Insight) yang memangkas waktu triase dari 45 menit menjadi **< 30 detik**, melindungi reputasi toko, dan menyediakan audit jejak eskalasi instan untuk *Monthly Business Report* (Claim Report).

---

## 2. Signal vs Noise (Product Strategy)
Fokus pada memecahkan *core friction* (Signal) dan mengabaikan distraksi *boilerplate* (Noise).

| Distraksi (Noise) | Fokus Utama (Signal) | Alasan Eksekusi |
| :--- | :--- | :--- |
| **Integrasi Live API Platform** | **Drag & Drop CSV Dropzone** | Menunggu *approval API* butuh 3 bulan. AM butuh solusi hari ini. Unggah CSV 10 detik membuktikan *value* di Hari Ke-0. |
| **Login & Role Permission** | **Sistem Lokal tanpa Login** | Akses kontrol tidak menambah *value* pada proses deteksi anomali. Data tetap 100% aman di RAM browser pengguna. |
| **Dashboard Grafik Historikal** | **Tabel Triase (Action-Oriented)** | AM tidak butuh melihat tren bulan lalu saat barang bocor modal jam 1 pagi. Mereka butuh aksi detik itu juga. |
| **Mobile App (iOS/Android)** | **Web Browser Based** | Pekerjaan mengunduh laporan CSV dari *Seller Center* mutlak dilakukan di laptop/PC kerja AM. |
| **Sistem Tiket Kompleks (Jira)** | **1-Click WhatsApp & Web Alert** | Tiket butuh 10 menit untuk diisi. WhatsApp dan Audio Chime web langsung berbunyi di tim operasional seketika. |

---

## 3. Minimum Viable Product (MVP) Scope
1. **Omnichannel Ingestion:** Menerima unggahan *raw file* CSV Laporan Penjualan & Inventori dari Shopee dan TikTok, serta Master Data Internal dengan penyeragaman format otomatis.
2. **The Brain (Rules Engine):** 
   - **Net Realized Margin Bleed:** Menghitung laba/rugi setelah memperhitungkan Deal Price, Platform Subsidy, Seller Voucher, dan estimasi biaya admin platform (*Marketplace Fee*).
   - **Promo Budget Burn Tracking:** Membedakan bakar uang yang disengaja (*Budget Safe*) dari kebocoran tanpa batas (*Critical Breach*).
   - **Dynamic Moving-Window Runrate:** Menghitung sisa waktu habis (*runway*) berbasis 1 jam / 3 jam untuk menangkap lonjakan flash sale.
   - **Stockout & Penalty Mitigation:** Bila buffer gudang habis (*Global Buffer = 0*) dan PO supplier ditolak/lama, sistem memandu mitigasi perlambatan laju order (naikkan harga / rem iklan).
3. **High-Contrast Resolution & Team Coordination:** 
   - Sistem hanya merender baris bermasalah (merah/kuning), menyembunyikan noise.
   - Menyediakan tombol **1-Click WhatsApp Escalation** dengan pemetaan nomor PIC (Warehouse vs Pricing).
   - **Session Resolution State:** Menandai SKU yang sudah dieskalasi (*Escalated badge*) untuk mencegah tabrakan koordinasi antar 17 AM.
   - **1-Click Claim Report Copy:** Ekspor rekap insiden harian ke clipboard untuk materi *Monthly Business Report (MBR)*.

---

## 4. Success Metrics (The North Star)
- **Primary Metric:** Penurunan waktu *Time-to-Triage* dari 45 menit menjadi < 30 detik per sesi pemeriksaan laporan.
- **Secondary Metric:** 0% *Margin Bleed undetected* dalam kurun waktu 1 jam saat jam sibuk promosi.
- **Tertiary Metric:** Mengurangi tingkat pembatalan pesanan (*OOS Cancellation Rate*) di bawah ambang batas penalti marketplace (< 1.5%).
- **Operational Metric:** Rasio penyelesaian eskalasi (via klik WhatsApp dan konfirmasi tindakan) > 90%.
