# 08. The 90-Minute Solo Prototype Plan (Implementation Roadmap)

Meskipun visi akhir dari produk ini adalah sistem *Enterprise* yang kompleks (Live API, ClickHouse, dsb), **tujuan utama saat ini adalah membangun prototipe fungsional (Day 0 Proof) dalam waktu 90 Menit yang dikerjakan oleh 1 orang (Solo Product Engineer).** 

Dokumen ini adalah rincian eksekusi *sprint* 90 menit tersebut, dilengkapi dengan peta jalan ekspansi di masa depan paska-prototipe.

---

## 🚀 The 90-Minute Solo Sprint (Fase Eksekusi Saat Ini)
**Tujuan:** Membangun MVP (Minimum Viable Product) yang bisa mendemonstrasikan unggahan CSV, mendeteksi Margin Bleeding (Under COGS), dan memunculkan tombol eskalasi WA.
**Tech Stack:** React (Vite) + Tailwind CSS + PapaParse + Shadcn UI.

| Menit Ke- | Aktivitas (Solo Task) | Detail Pekerjaan (End-to-End) |
| :--- | :--- | :--- |
| **00:00 - 00:10** | **1. Boilerplate Setup** | Inisialisasi Vite React (TypeScript), instalasi Tailwind CSS, Lucide Icons, dan Shadcn UI dasar (Card, Table, Button). |
| **00:10 - 00:25** | **2. CSV Ingestion Engine** | Mengimplementasikan `react-dropzone` dan `papaparse`. Membuat fungsi *parser* untuk menelan 3 file sekaligus (Shopee, TikTok, Internal) ke dalam *State* React (`useState`). |
| **00:25 - 00:45** | **3. The Math (Core Logic)** | Menulis fungsi TypeScript `evaluateMarginAndBudget` (Rule 1). Melakukan penggabungan (*join*) data sales dan master data untuk menghitung *True Margin*. |
| **00:45 - 00:65** | **4. UI Triage Dashboard** | Membuat tabel *High-Contrast*. Hanya merender (*filter*) data yang memiliki status `CRITICAL` atau `WARNING`. Menyembunyikan data yang `BUDGET SAFE`. |
| **00:65 - 00:80** | **5. The Resolution (WA Action)** | Membangun fungsi *string literal* untuk URL `wa.me`. Menghubungkannya ke tombol "Escalate" di sebelah baris tabel yang bermasalah. |
| **00:80 - 00:90** | **6. QA & Edge Case Check** | Melakukan *testing* menggunakan *Mock Data* CSV yang sudah kita buat sebelumnya. Memastikan perhitungan COGS dan subsidi sesuai dengan rancangan. Prototipe siap di-demo-kan! |

---

## 📈 Post-Prototype Roadmap (Fase Masa Depan)
Jika dalam demo 90 menit tersebut Account Manager atau Manajemen terkesan dan memberikan "Lampu Hijau" / *Budget*, berikut adalah peta jalan ekspansi (Implementation Plan) ke depannya.

### Phase 2: Shadow Testing & Fitur Lanjutan (Minggu 1 - 2)
*(Tetap dikerjakan Solo atau ditambah 1 QA)*
1. **Pilot Run:** Memberikan aplikasi statis hasil *build* Vite ini ke 2 Account Manager pilihan. Biarkan mereka mencoba menggunakan CSV asli harian mereka.
2. **Bundling & Runrate Engine:** Menambahkan fitur kompleks yang belum terkejar di 90 menit pertama: Logika penguraian SKU Bundling (*Bill of Materials*) dan perhitungan OOS Runway berbasis *Time-Window*.
3. **Pajak & Fees:** Mengakomodir potongan *Platform Admin Fee*.

### Phase 3: The Omnichannel Autopilot (Bulan 2 - 4)
*(Skala Enterprise: Butuh tambahan Data Engineer & Backend Engineer)*
Jika prototipe CSV terbukti mengamankan miliaran rupiah dari potensi *OOS* dan *Margin Bleed*, sistem bermigrasi ke ekosistem Cloud sepenuhnya:
1. **Data Pipeline (Airflow & Kafka):** Mengganti unggahan CSV manual dengan sedotan *Live Webhook API* dari Shopee/TikTok dan ERP Internal.
2. **Database Engine (ClickHouse):** Semua data masuk ke *OLAP Database* untuk perhitungan *Velocity/Runrate* skala raksasa dalam milidetik.
3. **Auto-Rebalancer API (Go/Node.js):** Layanan yang secara otomatis (tanpa manusia) melempar instruksi API untuk mengubah harga jika batas budget promo tembus, atau menyuntik stok tambahan ke etalase saat Runway < 12 Jam.

---

### Kenapa Ini Strategi Eksekusi Terbaik?
Dengan memampatkan pembuatan inti produk (The Brain) ke dalam **sprint 90 menit secara Solo**, kita menghindari *Over-engineering*. Kita membuktikan bahwa teknologi (React + PapaParse) bisa menyelesaikan masalah (Triase 45 Menit -> 30 Detik) tanpa harus mengeluarkan uang untuk membeli server atau menyewa tim besar di awal. Ini adalah wujud nyata dari pola pikir *Product Engineering* yang tangkas (*Agile*).
