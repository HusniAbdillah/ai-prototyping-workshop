# 07. Learnings & Pivot Log

Proses *AI Prototyping* ini membuktikan bagaimana kerangka berpikir *Top Product Engineer* (memisahkan *Signal* dari *Noise*) menyelamatkan kita dari membuang waktu 3 bulan untuk fitur yang salah. Berikut adalah jurnal pembelajaran dan pivot kita:

## 1. Pivot Besar: Menolak "Live API"
- **Jebakan Awal:** Sebagai engineer, insting pertama kita untuk masalah *"Data manual itu lambat"* adalah *"Mari buat integrasi API!"*.
- **The Reality (Learnings):** Untuk mendapatkan izin API Shopee & TikTok, perusahaan butuh melewati *Security Review* yang bisa memakan waktu berbulan-bulan. 
- **The Pivot (Signal):** Masalah Account Manager bukan pada men-download CSV-nya (itu cuma butuh 10 detik). Masalahnya adalah proses **VLOOKUP dan Analisa** di Excel yang makan waktu 45 menit. Solusi kita: *CSV Dropzone 10 detik + Triage Otomatis*. Kita memecahkan 95% rasa sakit tanpa menyentuh API sama sekali.

## 2. Miskonsepsi Harga Jual (Pricing Trap)
- **Jebakan Awal:** Menghitung margin dengan rumus `Harga yang dibayar konsumen - COGS`.
- **The Reality (Learnings):** Di dunia e-commerce (terutama TikTok), platform berani membakar uang dengan memberi subsidi ke konsumen. Pembeli bayar Rp50.000, padahal modal barang Rp80.000. Jika kita pakai rumus awal, sistem akan berteriak "KITA RUGI 30RIBU!". Kenyataannya, TikTok akan mentransfer Rp80.000 ke rekening perusahaan. 
- **The Pivot:** Kita harus mewajibkan *parsing* kolom `Platform_Subsidy` atau `Shopee_Rebate` di dalam `DOMAIN_DATA_SCHEMA.md` untuk menghindari *False Alarm*.

## 3. Filosofi Output: Action > Dashboard
- **Jebakan Awal:** Membuat *Dashboard* cantik dengan grafik *Pie Chart* dan tren mingguan.
- **The Reality (Learnings):** Insiden *Margin Bleeding* adalah kondisi kebakaran. Pemadam kebakaran tidak butuh laporan curah hujan, mereka butuh alat semprot. Saat jam 1 pagi ketika barang bocor modal, AM harus secepat mungkin memberi instruksi ke operator toko.
- **The Pivot:** UI kita diubah menjadi *High-Contrast Triage List*. Menghilangkan semua grafik. Fokus penuh pada daftar merah (Rugi) dan kuning (Mau Habis), yang langsung ditempel dengan tombol **Escalation via WhatsApp**. Klik 1 tombol, draf instruksi kerja langsung tertulis. Waktu penyelesaian masalah (*Time to Resolution*) turun drastis.

## 4. Next Step Learning (Masa Depan)
Ketika prototipe (Day 0) ini digunakan, kita akan mempelajari metrik *Adoption Rate*. Jika AM benar-benar menggunakan *tool* ini setiap hari dan kerugian akibat OOS menurun drastis, itu adalah "Lampu Hijau" untuk mengunci *budget* perusahaan guna mengeksekusi pembangunan arsitektur di tahap Day 180 (Full Automation dengan Live API).
