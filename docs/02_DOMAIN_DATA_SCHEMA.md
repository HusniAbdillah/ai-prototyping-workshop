# 02. Domain Model & Data Schema

Dokumen ini adalah *Single Source of Truth* untuk menyeragamkan bahasa bisnis dan rumusan matematis yang digunakan oleh *Decision Engine*.

## 1. Mathematical Glossary & Business Rules

### A. Komponen Finansial (Margin Calculation)
Jangan pernah menggunakan harga display marketplace sebagai penentu untung/rugi, karena ada banyak variabel potongan dan subsidi.
- **`Listed_Price`**: Harga pajang awal (coret) di marketplace.
- **`Deal_Price`** (atau Sale Price): Harga yang dibayar pembeli.
- **`Seller_Voucher`**: Diskon tambahan yang ditanggung oleh kita (penjual).
- **`Platform_Subsidy`**: Diskon tambahan yang ditanggung oleh marketplace (pembeli bayar murah, tapi selisihnya diganti oleh marketplace ke kita).
- **`COGS`**: Cost of Goods Sold (Modal Dasar internal).

**Formula Rahasia (True Margin):**
`Final_Revenue = Deal_Price + Platform_Subsidy - Seller_Voucher`
`True_Margin = Final_Revenue - COGS`
*Catatan: Jika `True_Margin < 0`, maka terjadi Margin Bleeding.*

### B. Komponen Logistik (Stock & Runrate Calculation)
- **`Current_Marketplace_Stock`**: Sisa stok yang dipajang (Listed) di Shopee/TikTok.
- **`Global_Buffer`**: Sisa stok pengaman di gudang internal yang belum dipajang.
- **`Sales_Velocity (Runrate)`**: Kecepatan penjualan. 
  - `Rumus: Total_Item_Sold / Elapsed_Time_Hours` (Contoh: Laku 2 unit per jam).
- **`Stock_Runway`**: Waktu yang tersisa sampai stok marketplace benar-benar 0 (Out of Stock).
  - `Rumus: Current_Marketplace_Stock / Sales_Velocity` (Contoh: Sisa stok 10 / Runrate 2 = Habis dalam 5 jam).

---

## 2. Omnichannel Data Normalization Schema

Agar mesin bisa membaca data dari Shopee, TikTok, dan sistem internal sekaligus, kita menggunakan standarisasi (*mapper*) berikut:

| Field Internal (Standard) | Kolom Asli Shopee | Kolom Asli TikTok | Kolom Internal CSV | Tipe Data |
| :--- | :--- | :--- | :--- | :--- |
| `Order_ID` | Order ID | Order ID | - | String |
| `SKU` | SKU | Seller SKU | SKU | String |
| `Quantity_Sold` | Quantity | Quantity | - | Integer |
| `Deal_Price` | Deal Price | Sale Price | - | Integer |
| `Seller_Discount` | Seller Voucher | Discount (Seller) | - | Integer |
| `Platform_Subsidy` | Shopee Rebate | Platform Subsidy | - | Integer |
| `Current_Stock` | Stock | Available Stock | - | Integer |
| `COGS` | - | - | COGS | Integer |
| `Global_Buffer` | - | - | Global Buffer Stock| Integer |
