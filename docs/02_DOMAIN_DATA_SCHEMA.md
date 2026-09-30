# 02. Domain Model & Data Schema

Dokumen ini adalah *Single Source of Truth* untuk menyeragamkan bahasa bisnis dan rumusan matematis yang digunakan oleh *Decision Engine*.

## 1. Mathematical Glossary & Business Rules

### A. Komponen Finansial (Margin & Promo Budget)
Jangan pernah menggunakan harga display marketplace sebagai penentu untung/rugi, karena ada banyak variabel potongan dan subsidi.
- **`Listed_Price`**: Harga pajang awal (coret) di marketplace.
- **`Deal_Price`** (atau Sale Price): Harga yang dibayar pembeli.
- **`Seller_Voucher`**: Diskon tambahan yang ditanggung oleh kita (penjual).
- **`Platform_Subsidy`**: Diskon tambahan yang ditanggung oleh marketplace (subsidi platform).
- **`COGS`**: Cost of Goods Sold (Modal Dasar internal).
- **`Promo_Budget_Cap`**: (BARU) Batas alokasi kerugian yang **disengaja/diizinkan** untuk keperluan marketing/bakar uang.

**Formula True Margin (Under COGS):**
`Final_Revenue = Deal_Price + Platform_Subsidy - Seller_Voucher`
`True_Margin = Final_Revenue - COGS`
*Catatan: Jika `True_Margin < 0`, masuk ke perhitungan Burn Budget.*

**Formula Burn Tracking:**
`Cumulative_Burn = Sum(Abs(True_Margin) * Quantity_Sold)`
*Jika `Cumulative_Burn` melebihi `Promo_Budget_Cap`, maka terjadi Budget Breach.*

### B. Komponen Logistik (Stock & Runrate Calculation)
- **`Current_Marketplace_Stock`**: Sisa stok yang dipajang (Listed).
- **`Global_Buffer`**: Sisa stok pengaman di gudang internal.
- **`Sales_Velocity (Runrate per SKU)`**: Kecepatan penjualan. Harus dihitung menggunakan **Moving Window** (misal 3 jam terakhir), bukan rata-rata 24 jam agar akurat saat Flash Sale.
  - `Rumus: Total_Qty_Sold_In_Time_Window / Time_Window_Hours`
- **`Stock_Runway`**: Waktu yang tersisa sampai stok marketplace benar-benar 0 (Out of Stock).
  - `Rumus: Current_Marketplace_Stock / Sales_Velocity`

---

## 2. Omnichannel Data Normalization Schema

| Field Internal (Standard) | Kolom Asli Shopee | Kolom Asli TikTok | Kolom Internal CSV | Tipe Data |
| :--- | :--- | :--- | :--- | :--- |
| `Order_ID` | Order ID | Order ID | - | String |
| `SKU` | SKU | Seller SKU | SKU | String |
| `Order_Time` | Order Creation Time| Created Time | - | Datetime |
| `Quantity_Sold` | Quantity | Quantity | - | Integer |
| `Deal_Price` | Deal Price | Sale Price | - | Integer |
| `Seller_Discount` | Seller Voucher | Discount (Seller) | - | Integer |
| `Platform_Subsidy` | Shopee Rebate | Platform Subsidy | - | Integer |
| `Current_Stock` | Stock | Available Stock | - | Integer |
| `COGS` | - | - | COGS | Integer |
| `Global_Buffer` | - | - | Global Buffer Stock| Integer |
| `Promo_Budget_Cap`| - | - | Promo Budget Cap | Integer |
