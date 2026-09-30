# 08. The 90-Minute Solo Prototype Plan (Implementation Roadmap)

Meskipun visi akhir dari produk ini adalah sistem *Enterprise Omnichannel Autopilot* yang kompleks (Live API, ClickHouse, dsb), **tujuan utama saat ini adalah membangun prototipe fungsional (Day 0 Proof) dalam waktu 90 Menit yang dikerjakan oleh 1 orang (Solo Product Engineer).** 

Dokumen ini adalah rincian eksekusi *sprint* 90 menit tersebut, dilengkapi dengan peta jalan ekspansi di masa depan paska-prototipe.

---

## 🚀 The 90-Minute Solo Sprint (Fase Eksekusi Saat Ini)

**Tujuan:** Membangun MVP (Minimum Viable Product) yang bisa mendemonstrasikan unggahan CSV omnichannel, mendeteksi Margin Bleeding dengan memperhitungkan Marketplace Fee, mendeteksi risiko OOS Flash Sale, membunyikan Web Audio Chime, serta memicu WhatsApp SOP & Shift Handover Report.

**Tech Stack:** React (Vite) + TypeScript + Tailwind CSS + Lucide Icons + PapaParse (Web Worker) + Web Audio API.

| Menit Ke- | Aktivitas (Solo Task) | Detail Pekerjaan (End-to-End) |
| :--- | :--- | :--- |
| **00:00 - 00:15** | **1. Boilerplate & Shell Setup** | Inisialisasi project React Vite (TypeScript), instalasi Tailwind CSS, Lucide React icons, dan setup layout dashboard bertema *Dark/Light High-Contrast*. Setup Web Audio chime synthesizer helper. |
| **00:15 - 00:30** | **2. Omnichannel Ingestion Engine** | Mengimplementasikan Dropzone 3 file CSV (Shopee Sales, TikTok Sales, Master Catalog). Konfigurasi `PapaParse` dengan `worker: true`, sanitasi format mata uang Rupiah ("Rp", titik, koma), dan pemetaan alias kolom ke antarmuka standar `OmnichannelSaleRow`. |
| **00:30 - 00:50** | **3. The Math & Decision Engine** | Mengimplementasikan fungsi `evaluateMarginAndBudget` (Rule 1) dengan memperhitungkan Platform Admin Fee (8.5%) dan Promo Budget Cap. Mengimplementasikan `evaluateRunway` (Rule 2) dengan moving-window 3 jam / 1 jam dan mitigasi darurat saat `Global Buffer = 0`. |
| **00:50 - 00:70** | **4. High-Contrast Triage UI & In-App Alerts** | Membuat tabel triase dengan filter agresif (sembunyikan baris aman). Menambahkan Floating Toast merah darurat saat status `CRITICAL` ditemukan, trigger nada audio chime, flasher judul tab browser, dan Notification Bell drawer di navbar. |
| **00:70 - 00:80** | **5. Escalation & Team Handover** | Menghubungkan tombol `[Escalate via WhatsApp]` dengan deep-link `wa.me` terformat sesuai SOP (Pricing vs Warehouse PIC). Mengubah status lokal baris menjadi `[✅ ESCALATED]` dan menambahkan tombol **"📋 Copy Shift Handover Report"** untuk materi *Monthly Business Report (MBR)*. |
| **00:80 - 00:90** | **6. End-to-End QA & Demo Dry Run** | Menguji prototipe menggunakan dataset CSV di folder `data/` (`shopee_sales_report.csv`, `tiktok_sales_report.csv`, `internal_master_data.csv`). Memastikan seluruh skenario anomali (kebocoran modal, overburn, OOS kritis) terdeteksi presisi dalam waktu < 5 detik. Prototipe siap di-demo-kan ke manajemen! |

---

## 📈 Post-Prototype Roadmap (Fase Masa Depan)

Jika dalam demo 90 menit tersebut 17 Account Manager dan Manajemen terkesan dan memberikan "Lampu Hijau" / *Budget*, berikut adalah peta jalan ekspansi (Implementation Plan) ke depannya.

### Phase 2: Pilot Testing & Peningkatan Fitur (Minggu 1 - 2)
*(Dikerjakan Solo Product Engineer + 1 QA)*
1. **Pilot Run:** Mendistribusikan build statis aplikasi ini ke 3 Account Manager senior untuk digunakan pada shift harian mereka.
2. **Preset Sensitivitas Dinamis:** Menguji mode *Mega Flash Sale (1 Jam)* saat tanggal kembar vs *Normal Ops (3 Jam)*.
3. **Bundling Expansion:** Logika penguraian SKU Bundling (*Bill of Materials*) otomatis jika master data memiliki relasi *Parent-Child SKU*.

### Phase 3: The Omnichannel Autopilot (Bulan 2 - 4)
*(Skala Enterprise: Melibatkan Backend & Data Engineering)*
Jika prototipe CSV terbukti menyelamatkan puluhan juta rupiah dari potensi *OOS* dan *Margin Bleed*, sistem bermigrasi ke ekosistem Cloud:
1. **Data Pipeline (Airflow & Kafka):** Mengganti unggahan CSV manual dengan sedotan *Live Webhook API* dari Shopee/TikTok Open API dan ERP Internal.
2. **Database Engine (ClickHouse):** Perhitungan *Velocity* dan *Runway* dilakukan secara masif dalam milidetik di level database OLAP.
3. **Auto-Rebalancer API (Go/Node.js):** Layanan yang secara otomatis (tanpa manusia) melempar instruksi API untuk mengubah harga jika budget promo jebol, atau memindahkan alokasi stok etalase saat Runway < 4 Jam.

---

### Kenapa Ini Strategi Eksekusi Terbaik?
Dengan memfokuskan inti produk (*The Signal*) ke dalam **sprint 90 menit secara Solo**, kita membuktikan bahwa antarmuka cerdas (React + PapaParse + Decision Engine) mampu memangkas waktu kerja manual dari **45 Menit menjadi < 30 Detik** tanpa mengeluarkan biaya server sepeser pun. Ini adalah manifestasi puncak dari pola pikir *Product Engineering* yang tangkas (*Agile & Lean*).
