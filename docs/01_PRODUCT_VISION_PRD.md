# 01. Product Vision & PRD (Product Requirements Document)

## 1. Executive Summary
Di ekosistem e-commerce *omnichannel* berskala besar seperti SIRCLO, Account Manager (AM) adalah garda terdepan. Mereka bertanggung jawab memastikan produk klien selalu tersedia (*in-stock*) dan dijual dengan harga yang menguntungkan (di atas modal/COGS). 
Masalah utamanya adalah ketiadaan sistem deteksi terpadu. AM harus mengunduh CSV dari berbagai platform (Shopee, TikTok), menggabungkannya secara manual dengan data internal (Excel), dan mencari anomali. Proses triase manual ini memakan waktu **~45 menit per toko**. Di momen *High Traffic* (seperti 11.11), 45 menit keterlambatan berarti puluhan juta rupiah hangus.

**Misi Produk:** Membangun *Anomaly Detection Engine* (Sirclo Insight) yang memangkas waktu triase dari 45 menit menjadi < 30 detik.

---

## 2. Signal vs Noise (Product Strategy)
Fokus pada memecahkan *core friction* (Signal) dan mengabaikan distraksi *boilerplate* (Noise).

| ❌ Distraksi (Noise) | ✅ Fokus Utama (Signal) | Alasan Eksekusi |
| :--- | :--- | :--- |
| **Integrasi Live API Platform** | **Drag & Drop CSV Upload** | Menunggu *approval API* butuh 3 bulan. AM butuh solusi hari ini. Unggah CSV 10 detik membuktikan *value* di Hari Ke-0. |
| **Login & Role Permission** | **Sistem Lokal tanpa Login** | Akses kontrol tidak menambah *value* pada proses deteksi anomali. |
| **Dashboard Grafik Historikal** | **Tabel Triase (Action-Oriented)** | AM tidak butuh melihat tren bulan lalu saat barang OOS jam 1 pagi. Mereka butuh instruksi aksi detik itu juga. |
| **Mobile App (iOS/Android)** | **Web Browser based** | Pekerjaan mengunduh laporan CSV dari *Seller Center* mutlak dilakukan di laptop/PC. |

---

## 3. Minimum Viable Product (MVP) Scope
1. **Omnichannel Ingestion:** Menerima unggahan *raw file* CSV Laporan Penjualan & Inventori dari Shopee dan TikTok, serta Master Data Internal.
2. **The Brain (Rules Engine):** 
   - Menghitung **Margin Bleeding** (Harga Final vs COGS).
   - Menghitung **Stock Runway & Velocity** (Kecepatan barang habis).
3. **High-Contrast Resolution:** Sistem hanya memuntahkan baris data yang bermasalah. Menyediakan tombol **1-Click WhatsApp Escalation** untuk segera berkoordinasi dengan tim Gudang/Pricing.

---

## 4. Success Metrics (The North Star)
- **Primary Metric:** Penurunan waktu *Time-to-Triage* dari 45 menit menjadi < 30 detik.
- **Secondary Metric:** 0% *Margin Bleed undetected* dalam kurun waktu 1 jam.
- **Tertiary Metric:** Rasio penyelesaian eskalasi (via klik WhatsApp) > 90%.
