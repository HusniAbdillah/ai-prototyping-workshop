# 03. Decision Engine Rules (The Brain)

Dokumen ini mendeskripsikan logika algoritma pengambilan keputusan. Saat AM memasukkan CSV, sistem ini yang akan memisahkan mana baris data yang aman, dan mana yang menjadi anomali.

## 1. Rule 1: Margin Bleeding Detector
Algoritma ini mendeteksi kerugian finansial akibat kesalahan harga/promo.

```python
def is_margin_bleeding(row):
    final_revenue = row['Deal_Price'] + row['Platform_Subsidy'] - row['Seller_Discount']
    true_margin = final_revenue - row['COGS']
    
    if true_margin < 0:
        return {
            'status': 'CRITICAL',
            'reason': 'Harga Jual di Bawah Modal',
            'loss_per_item': abs(true_margin)
        }
    return {'status': 'SAFE'}
```
**False Alarm Filter:** Banyak AM manual yang panik saat melihat harga jual jauh di bawah COGS. Sistem ini mencegah kepanikan palsu tersebut karena variabel `Platform_Subsidy` ikut dihitung (meski harga murah, selisihnya ditanggung TikTok/Shopee).

---

## 2. Rule 2: Stock Runway OOS Detector
Algoritma ini mendeteksi produk yang akan segera kehabisan stok (*Loss of Opportunity*).

```python
def check_oos_risk(sku_data, time_window_hours=12):
    velocity = sku_data['total_sold_in_window'] / time_window_hours
    if velocity == 0:
        return {'status': 'SAFE'} # Tidak laku, aman dari OOS
        
    runway = sku_data['Current_Stock'] / velocity
    
    # Trigger jika runway < 12 jam (akan habis kurang dari setengah hari)
    if runway < 12 and sku_data['Global_Buffer'] > 0:
        return {
            'status': 'WARNING',
            'reason': f'OOS dalam {runway} jam, Buffer tersedia {sku_data["Global_Buffer"]}',
            'recommended_rebalance': int(velocity * 24) # Rekomendasi stok untuk 24 jam ke depan
        }
    return {'status': 'SAFE'}
```

---

## 3. Rule 3: The Rebalancing Allocator (Pareto Distribution)
Apa yang terjadi jika Channel A dan Channel B sama-sama berisiko OOS, tapi Total Permintaan (Demand) melebihi ketersediaan `Global_Buffer`?

**Kasus:**
- Shopee butuh 30 unit. TikTok butuh 70 unit (Total Demand = 100).
- Buffer Gudang hanya ada 50 unit.

**Algoritma Alokasi (Pro-Rata by Velocity):**
Sistem tidak membagi rata 25-25. Sistem mengalokasikan berdasarkan porsi kecepatan terjual.
- Proporsi Shopee = 30 / 100 = 30%
- Proporsi TikTok = 70 / 100 = 70%
- **Alokasi Shopee:** 30% x 50 (Buffer) = **15 Unit**
- **Alokasi TikTok:** 70% x 50 (Buffer) = **35 Unit**

Pendekatan ini memaksimalkan serapan inventori dan meminimalisir sisa stok mati di platform yang penjualannya lambat.
