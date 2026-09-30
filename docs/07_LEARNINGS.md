# 07. Learnings & Pivot Log

Proses *AI Prototyping* ini membuktikan bagaimana kerangka berpikir *Top Product Engineer* (memisahkan *Signal* dari *Noise*) menyelamatkan tim dari pemborosan sumber daya dan fitur yang salah sasaran. Berikut adalah jurnal pembelajaran, kesalahan asumsi awal, dan keputusan pivot:

---

## 1. Pivot Besar: Menolak "Live API" di Hari Pertama
- **Jebakan Awal:** Sebagai insinyur perangkat lunak, insting pertama kita untuk masalah *"Data manual itu lambat"* adalah *"Mari buat integrasi Live API Shopee & TikTok!"*.
- **The Reality (Learnings):** Untuk mendapatkan izin API Shopee & TikTok, perusahaan butuh melewati *Security Review* dan proses legal yang memakan waktu 2–3 bulan. 
- **The Pivot (Signal):** Masalah riil 17 Account Manager bukan pada men-download CSV-nya (itu cuma butuh 10 detik di Seller Center). Masalahnya adalah proses **VLOOKUP dan Analisa** di Excel yang makan waktu 45 menit. Solusi kita: *CSV Dropzone 10 detik + In-Browser Decision Engine*. Kita memecahkan 95% rasa sakit tanpa menunggu izin API sama sekali.

---

## 2. Miskonsepsi Harga Jual & Subsidi Platform (Pricing Trap)
- **Jebakan Awal:** Menghitung margin dengan rumus `Harga yang dibayar konsumen - COGS`.
- **The Reality (Learnings):** Di dunia e-commerce (terutama TikTok), platform berani membakar uang dengan memberi subsidi ke konsumen. Pembeli bayar Rp50.000, padahal modal barang Rp80.000. Jika kita pakai rumus awal, sistem akan berteriak keliru: *"KITA RUGI 30RIBU!"*. Kenyataannya, TikTok mentransfer Rp80.000 penuh ke rekening penjual. 
- **The Pivot:** Kita mewajibkan parsing kolom `Platform_Subsidy` / `Shopee_Rebate` ke dalam formula *Final Revenue* untuk menghindari alarm palsu (*False Positive*).

---

## 3. Jebakan Potongan Biaya Admin Platform (The 8.5% Hidden Fee Trap)
- **Jebakan Awal:** Mengasumsikan `Deal Price + Platform Subsidy - Voucher` adalah uang bersih yang diterima brand.
- **The Reality (Learnings):** Marketplace memotong komisi administrasi, biaya layanan gratis ongkir xtra, dan biaya transaksi per pesanan sebesar **8% hingga 14%**. Menjual barang seharga Rp100.000 dengan modal Rp95.000 terlihat untung Rp5.000, padahal setelah potongan platform 8.5% (Rp8.500), brand sebenarnya **bocor modal rugi Rp3.500 per produk!**
- **The Pivot:** Kita memasukkan variabel `Platform_Fee_Rate` (default 8.5%) ke dalam kalkulasi *Net Realized Margin* di `02_DOMAIN_DATA_SCHEMA.md` dan `06_TECH_SPEC.md` agar AM tidak terjebak ilusi profit.

---

## 4. Filosofi Output: Action > Dashboard Grafik
- **Jebakan Awal:** Membuat *Dashboard* megah dengan grafik *Pie Chart* dan riwayat tren mingguan.
- **The Reality (Learnings):** Insiden *Margin Bleeding* dan *OOS* adalah kebakaran operasional. Pemadam kebakaran tidak butuh membaca statistik curah hujan bulanan saat api menyala; mereka butuh alat semprot air. Saat jam 1 pagi ketika barang bocor modal, AM hanya butuh tahu: *SKU mana yang bocor, berapa ruginya, dan siapa yang harus dihubungi detik ini juga*.
- **The Pivot:** UI diubah menjadi *High-Contrast Triage List*. Menghilangkan semua chart kosmetik. Fokus penuh pada baris anomali (merah/kuning) yang langsung ditempel tombol **1-Click WhatsApp Escalation** dan **In-App Audio Chime**.

---

## 5. Realitas Rantai Pasok: "PO Di-Reject" & Mitigasi Penalti Toko
- **Jebakan Awal:** Mengira semua masalah OOS bisa diselesaikan dengan *"suntik stok tambahan dari gudang"*.
- **The Reality (Learnings):** Catatan lapangan membuktikan bahwa seringkali stok fisik gudang kosong (`Global Buffer = 0`) dan pengajuan Purchase Order (PO) darurat ke supplier **ditolak (*rejected*) atau butuh waktu kirim (*Lead Time*) 5–7 hari**. Jika dibiarkan, pesanan yang membludak akan berujung pada pembatalan massal sepihak, membuat toko dijatuhi sanksi penalti marketplace (*Non-Fulfillment Rate > 2%*).
- **The Pivot:** Pada kondisi buffer habis, sistem tidak memberi harapan palsu *"minta stok ke gudang"*, melainkan memicu **Emergency Penalty Mitigation**: memandu AM untuk segera **mematikan iklan berbayar** dan **menaikkan harga etalase 15%** guna mengerem laju pesanan secara terkendali.

---

## 6. Kolaborasi 17 AM & Kebutuhan Audit Bulanan (Claim Report)
- **Jebakan Awal:** Mengasumsikan aplikasi hanya dipakai oleh 1 orang secara terisolasi.
- **The Reality (Learnings):** Dalam tim beranggotakan 17 AM, eskalasi tanpa penanda status akan memicu tabrakan koordinasi (3 AM mengontak PIC gudang yang sama untuk SKU yang sama). Selain itu, di akhir bulan, AM harus membuat laporan klaim kompensasi (*Claim Report*) untuk brand principal.
- **The Pivot:** Menambahkan status lokal `[ESCALATED]` seketika tombol diklik, serta menyediakan tombol **"1-Click Copy Shift Handover Report"** untuk mengekspor rekap insiden harian ke format teks siap pakai.

---

## 7. QA Assurance & UI Redesign Validation (The Apple-esque Pivot)
- **Jebakan Awal:** Menggabungkan semua informasi (Upload, KPI, List Anomali, dan Pengaturan WA) dalam satu halaman statis yang memanjang ke bawah ("UI Slop").
- **The Reality (Learnings):** Pada *mobile device* (smartphone AM saat di lapangan), tabel panjang yang disatukan dengan form upload menyebabkan kognitif yang berlebih. Modifikasi dan pengaturan PIC sering terlupakan karena terselip di bawah layar.
- **The Pivot:** 
  1. **Multi-Tab Architecture:** Memisahkan *concern* UI ke dalam tab-tab terfokus (`Dashboard` untuk analitik level tinggi, `Triage Center` untuk tabel aksi darurat).
  2. **Settings Abstraction:** Memindahkan konfigurasi *WhatsApp Routing Matrix* ke modal/pop-up khusus agar tidak memenuhi layar utama.
  3. **Mobile-First Layout:** Menggunakan layout yang sangat bersahabat di perangkat kecil, di mana tabel memiliki scroll-horizontal aman tanpa merusak lebar aplikasi, serta indikator *badge notification* di navigasi yang menarik perhatian secara intuitif.
  4. **Glassmorphism & Contrast:** Menambahkan efek translusen ala antarmuka sistem operasi modern (*Apple-like design*) untuk me-rekayasa visual agar lebih elegan, menenangkan, sekaligus memberikan urgensi warna merah murni *hanya* pada baris yang *Critical*.

---

## 8. Ingestion Completeness & Omnichannel Inventory Parity (The TikTok Inventory Fix)
- **Jebakan Awal:** Hanya memuat 4 dari 5 file CSV pada tombol Demo Loader (`shopee_sales`, `tiktok_sales`, `internal_master`, `shopee_inventory`), sementara `tiktok_inventory_report.csv` tertinggal.
- **The Reality (Learnings):** Karena file inventori TikTok tidak dimuat, pemetaan stok kanal TikTok pada memori RAM browser bernilai `undefined`, yang kemudian jatuh ke fallback `master.currentMarketplaceStock` (yang bernilai 0 jika data master tidak memiliki kolom stok kanal). Hal ini menyebabkan engine menghitung semua SKU TikTok sebagai stok 0 atau mendeteksi OOS darurat secara tidak akurat.
- **The Pivot:** 
  1. Memasukkan `tiktok_inventory_report.csv` ke dalam `filesToFetch` demo data loader di `src/App.tsx`.
  2. Memvalidasi bahwa normalisasi `TIKTOK_INVENTORY` membaca alias kolom TikTok (`Seller SKU`, `Available Stock`) dengan benar.
  3. Menambahkan integration test suite otomatis `all-demo-files.test.ts` untuk menjamin seluruh 5 file demo terproses tanpa berkas yang terlewat atau menghasilkan `skippedFiles`.

