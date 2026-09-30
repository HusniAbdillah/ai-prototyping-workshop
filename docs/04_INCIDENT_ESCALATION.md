# 04. Incident Escalation & Resolution (SOP)

Tujuan dari sistem ini bukan sekadar memberi tahu ada masalah, melainkan **mempercepat resolusi masalah dari hitungan jam menjadi detik**. Dokumen ini mengatur Standar Operasional Prosedur (SOP) paska-deteksi anomali untuk 17 Account Manager (AM) SIRCLO.

---

## 1. Mekanisme 1-Click WhatsApp Triage & Routing Matrix

Setiap anomali yang dimunculkan oleh *Decision Engine* pada Dashboard UI dilengkapi tombol aksi instan **"Escalate via WhatsApp"**. URL universal link (`wa.me`) otomatis memformat pesan sesuai SOP dan mengarahkan pesan ke penanggung jawab (PIC) yang tepat.

### A. Routing Matrix PIC
Di header aplikasi, pengguna dapat mengonfigurasi nomor tujuan default (tersimpan di `localStorage` browser):
- **Pricing & Ads PIC (`wa_pricing`):** Mengurusi pencabutan voucher, perubahan harga promo, dan pematian iklan.
- **Warehouse & Logistics PIC (`wa_warehouse`):** Mengurusi suntik stok fisik dari buffer internal ke Seller Center.

---

### B. Format Pesan Eskalasi Otomatis

#### 1. Eskalasi Margin Bleeding (Kebocoran Modal):
- **Tujuan:** Tim Pricing & Kampanye
- **URL Payload:**
  ```text
  https://wa.me/{wa_pricing}?text=🚨%20CRITICAL%20[SIRCLO%20Insight]%0A%0ATerjadi%20Bocor%20Margin%20(Under%20COGS)!%0AChannel%3A%20{Channel}%0ASKU%3A%20{SKU}%0A%0AHarga%20Konsumen%3A%20Rp{Deal_Price}%0AEstimasi%20Admin%20Fee%20({Fee_Rate}%)%3A%20Rp{Est_Fee}%0ANet%20Payout%20ke%20Toko%3A%20Rp{Net_Payout}%0AModal%20Produk%20(COGS)%3A%20Rp{COGS}%0A❌%20Rugi%20Bersih%20per%20Unit%3A%20Rp{Loss_per_unit}%0A💥%20Total%20Akumulasi%20Rugi%3A%20Rp{Cumulative_Burn}%0A%0A*Action%20Required%3A*%20Mohon%20cabut%20voucher%20toko%20atau%20hentikan%20flash-sale%20SKU%20ini%20SEKARANG%20JUGA!
  ```

#### 2. Eskalasi OOS Risk dengan Buffer Tersedia (Rebalancing):
- **Tujuan:** Tim Warehouse & Operations
- **URL Payload:**
  ```text
  https://wa.me/{wa_warehouse}?text=⚠️%20WARNING%20[SIRCLO%20Insight]%0A%0ARisiko%20Out%20of%20Stock%20(OOS)!%0AChannel%3A%20{Channel}%0ASKU%3A%20{SKU}%0A%0ARunway%3A%20Sisa%20{Runway}%20Jam%20lagi.%0AVelocity%3A%20{Velocity}%20unit%2Fjam.%0ABuffer%20Gudang%20Tersedia%3A%20{Global_Buffer}%20Unit.%0A%0A*Action%20Required%3A*%20Mohon%20suntik%2Fpindahkan%20{Recommended_Rebalance}%20unit%20ke%20etalase%20marketplace%20segera%20agar%20tidak%20kehabisan%20stok.
  ```

#### 3. Eskalasi Darurat OOS Tanpa Buffer (Mitigasi Penalti Toko & PO Rejection):
- **Tujuan:** Tim Pricing, Ads & Store Admin
- **URL Payload:**
  ```text
  https://wa.me/{wa_pricing}?text=🚨%20CRITICAL%20EMERGENCY%20[SIRCLO%20Insight]%0A%0ARisiko%20OOS%20TOTAL%20(Buffer%20Gudang%20KOSONG)!%0AChannel%3A%20{Channel}%0ASKU%3A%20{SKU}%0A%0ARunway%3A%20Sisa%20{Runway}%20Jam!%0ABuffer%20Gudang%3A%200%20Unit%20(PO%20Supplier%20Tidak%20Tersedia%2FLead-Time%20Lama).%0A%0A*Action%20Required%20(Pencegahan%20Penalti%20Toko)*%3A%0A1.%20SEGERA%20MATIKAN%20IKLAN%20BERBAYAR%20(Ads%2FLive)%20untuk%20SKU%20ini.%0A2.%20Naikkan%20harga%20jual%20etalase%2015%25%20untuk%20mengerem%20laju%20order.%0A3.%20JANGAN%20sampai%20terjadi%20pembatalan%20pesanan%20massal%20(Non-Fulfillment%20Rate).
  ```

---

## 2. In-App Web Alerts & Multi-Sensory Notification

1. **Floating Toast & Emergency Banner (Visual Pulse):**
   - Muncul di pojok kanan atas atau atas tabel begitu kalkulasi CSV menemukan anomali `CRITICAL`.
   - Warna merah membara (`bg-red-600/95 text-white`) dengan animasi *pulse* halus.
   - Ringkasan instan: `"🚨 Terdeteksi 3 Kebocoran Margin Kritis! Total kerugian berjalan: Rp 2.450.000"`.
2. **Audio Chime Sintetis (Web Audio API):**
   - Menghasilkan nada lonceng peringatan halus (dual-tone 880Hz $\rightarrow$ 440Hz) via *browser oscillator* (tanpa file mp3 eksternal).
   - Dilengkapi *Toggle Sound* (Mute/Unmute) di navbar.
3. **Background Multi-Tasking (Dynamic Tab Title Flasher):**
   - Saat tab berada di latar belakang, judul browser berkedip:  
     `"(3) 🚨 SIRCLO Insight - Margin Bleed Terdeteksi!"`
   - Otomatis kembali normal saat jendela browser di-fokuskan kembali.
4. **Notification Bell Drawer (Header Center):**
   - Ikon lonceng di navbar dengan *counter badge* merah menyala.
   - Mengklik item notifikasi langsung melakukan *auto-scroll* dan *highlight* ke baris yang bersangkutan di tabel triase.

---

## 3. Shift Handover & Monthly Claim Report Generator (1-Click Copy)

Untuk memfasilitasi koordinasi antar 17 AM dan pelaporan pertanggungjawaban bulanan (*Monthly Business Report* / Claim Report):
- Tersedia tombol **"📋 Copy Shift Handover Report"** di atas tabel triase.
- Saat diklik, sistem langsung menyalin ringkasan teks terstruktur ke clipboard pengguna:

```text
==================================================
📋 SIRCLO INSIGHT - SHIFT HANDOVER & CLAIM REPORT
Tanggal: 30 September 2026, 15:35 WIB
Account Manager on Duty: AM-Omnichannel-Team
==================================================

🚨 TOTAL CRITICAL ISSUES: 2
⚠️ TOTAL WARNING ISSUES: 3
💰 TOTAL KERUGIAN BERJALAN: Rp 3.250.000

DAFTAR ANOMALI & STATUS TINDAKAN:
1. [SHOPEE] SKU: MS-WL-PRO-BLK
   - Masalah: CRITICAL MARGIN_BLEED (Rugi Rp20.000/unit)
   - Akumulasi Kerugian: Rp 2.000.000
   - Status: [✅ ESCALATED via WA ke PIC Pricing at 15:12]
   - Aksi: Voucher toko dinonaktifkan sementara.

2. [TIKTOK] SKU: SKU-VIRAL-SUNSCREEN
   - Masalah: CRITICAL OOS_RISK (Runway 1.5 Jam, Buffer 0)
   - Status: [✅ ESCALATED via WA ke PIC Ads at 15:20]
   - Aksi: Live ads diturunkan, harga dinaikkan 15%.

3. [SHOPEE] SKU: SKU-BEVERAGE-COFFEE
   - Masalah: WARNING OOS_RISK (Runway 4.0 Jam, Buffer 200)
   - Status: [⏳ PENDING ACTION]
   - Aksi: Butuh alokasi suntik 240 unit stok fisik.
==================================================
```
Rekap ini siap ditempelkan langsung ke grup koordinasi Slack/WhatsApp internal tim SIRCLO atau diarsipkan sebagai bukti klaim kompensasi promo ke pihak prinsipal brand.
