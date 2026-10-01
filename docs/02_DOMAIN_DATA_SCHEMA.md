# 02. Domain Model & Data Schema

Dokumen ini adalah *Single Source of Truth* untuk menyeragamkan bahasa bisnis, variabel finansial, komisi marketplace, dan rumusan matematis yang digunakan oleh *Decision Engine*.

---

## 1. Mathematical Glossary & Business Rules

### A. Komponen Finansial (True Net Margin & Promo Budget)
Jangan pernah menggunakan harga display marketplace sebagai penentu untung/rugi, karena ada banyak variabel potongan, subsidi, dan komisi platform.

- **`Listed_Price`**: Harga pajang awal (coret) di marketplace.
- **`Deal_Price`** (atau Sale Price): Harga bersih yang dibayar konsumen sebelum voucher toko.
- **`Seller_Voucher`**: Diskon tambahan yang ditanggung oleh kita (penjual).
- **`Platform_Subsidy`**: Diskon tambahan yang ditanggung oleh marketplace (subsidi platform / Shopee Rebate / TikTok Subsidy).
- **`COGS`**: Cost of Goods Sold (Modal Dasar internal produk).
- **`Promo_Budget_Cap`**: Batas alokasi kerugian yang **disengaja/diizinkan** untuk keperluan marketing/bakar uang (*Intentional Burn*). Default = 0 jika tidak ada promo yang disetujui.
- **`Marketplace_Fee_Rate`**: (BARU) Estimasi total potongan biaya administrasi platform, biaya layanan, gratis ongkir xtra, dan payment gateway fee (misal Shopee Mall / Star+ berkisar **8.5%** dari Deal Price).

#### Formula True Net Margin:
1. **Net Realized Payout (Uang yang Riil Masuk ke Rekening Perusahaan):**
   $$\text{Estimated Platform Fee} = \text{Deal Price} \times \text{Marketplace Fee Rate}$$
   $$\text{Net Realized Payout} = \text{Deal Price} + \text{Platform Subsidy} - \text{Seller Voucher} - \text{Estimated Platform Fee}$$
2. **True Net Margin:**
   $$\text{True Net Margin} = \text{Net Realized Payout} - \text{COGS}$$
   *Catatan: Jika `True Net Margin < 0`, transaksi mengalami kerugian operasional dan masuk ke perhitungan Burn Budget.*

#### Formula Promo Burn Tracking:
$$\text{Cumulative Burn} = \sum (\left| \text{True Net Margin} \right| \times \text{Quantity Sold})$$
- Jika `Cumulative Burn <= 70%` dari `Promo_Budget_Cap` $\rightarrow$ **BUDGET SAFE** (Intentional Marketing Burn).
- Jika `70% < Cumulative Burn <= 90%` dari `Promo_Budget_Cap` $\rightarrow$ **WATCHLIST (WARNING)**.
- Jika `Cumulative Burn > Promo_Budget_Cap` (atau `Promo_Budget_Cap == 0`) $\rightarrow$ **CRITICAL BUDGET BREACH / MARGIN BLEED**.

---

### B. Komponen Logistik (Stock, Dynamic Runrate & Mitigation)
- **`Current_Marketplace_Stock`**: Sisa stok yang terdaftar di etalase Seller Center saat ini.
- **`Global_Buffer`**: Sisa stok pengaman fisik di gudang internal (WMS/ERP).
- **`Sales_Velocity (Runrate per SKU)`**: Kecepatan penjualan. Harus dihitung menggunakan **Moving Window** (dinamis), bukan rata-rata 24 jam agar akurat saat lonjakan traffic.
  $$\text{Sales Velocity} = \frac{\text{Total Qty Sold in Time Window}}{\text{Time Window Hours}}$$
- **`Stock_Runway`**: Waktu yang tersisa sampai stok etalase marketplace habis total (*Out of Stock*).
  $$\text{Stock Runway} = \frac{\text{Current Marketplace Stock}}{\text{Sales Velocity}}$$

#### Sensitivity Presets (Mode Operasional):
| Parameter | Normal Ops (Hari Biasa) | Mega Flash Sale (11.11 / Payday) |
| :--- | :--- | :--- |
| **Time Window** | 3 Jam terakhir | 1 Jam terakhir |
| **Warning Threshold** | Runway $\le 12$ Jam | Runway $\le 4$ Jam |
| **Critical Threshold** | Runway $\le 4$ Jam (atau Buffer $= 0$) | Runway $\le 1$ Jam (atau Buffer $= 0$) |

---

### C. Konvensi SKU Bundling (Paket Combo / Bundling)
Jika marketplace menjual SKU komposit (contoh: `BUNDLE-GLOWING-3IN1` yang terdiri dari 1x Serum + 1x Toner + 1x Facial Wash):
- Pada master data CSV internal, SKU bundling harus didaftarkan dengan nilai `COGS` akumulasi dari seluruh komponennya.
- Jika SKU transaksi belum terdaftar di Master Catalog, sistem menetapkan label **UNMATCHED_SKU** tanpa membuat aplikasi *crash*, dan memunculkan instruksi agar AM memverifikasi master data.

---

## 2. Omnichannel Data Normalization Schema

| Field Standar Internal | Kolom Asli Shopee | Kolom Asli TikTok | Kolom Master Data CSV | Tipe Data | Keterangan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Order_ID` | Order ID | Order ID | - | String | Identifier pesanan |
| `SKU` | SKU | Seller SKU | SKU | String | Kode unik barang |
| `Order_Time` | Order Creation Time | Created Time | - | Timestamp/Epoch | Digunakan untuk window filter |
| `Quantity_Sold` | Quantity | Quantity | - | Integer | Jumlah unit terjual |
| `Deal_Price` | Deal Price | Sale Price | - | Float/Integer | Harga beli konsumen |
| `Seller_Discount` | Seller Voucher | Discount (Seller) | - | Float/Integer | Voucher toko |
| `Platform_Subsidy` | Shopee Rebate | Platform Subsidy | - | Float/Integer | Subsidi diskon platform |
| `Current_Stock` | Stock | Available Stock | Current Stock | Integer | Stok etalase |
| `COGS` | - | - | COGS | Float/Integer | Modal pokok produk |
| `Global_Buffer` | - | - | Global Buffer Stock | Integer | Stok fisik gudang |
| `Promo_Budget_Cap` | - | - | Promo Budget Cap | Float/Integer | Alokasi bakar uang |
| `Platform_Fee_Rate` | - | - | (Opsional di Master) | Float | Default 0.085 (8.5%) |
