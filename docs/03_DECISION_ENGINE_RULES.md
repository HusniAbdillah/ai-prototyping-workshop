# 03. Decision Engine Rules (The Brain)

Dokumen ini mendeskripsikan logika algoritma pengambilan keputusan (*The Brain*). Saat Account Manager (AM) memasukkan CSV, engine ini memisahkan baris data aman (*Signal*) dari anomali berbahaya (*Noise*), serta memberikan rekomendasi tindakan mitigasi operasional yang presisi.

---

## 1. Rule 1: Net Realized Margin & Promo Budget Detector (Under COGS)
Algoritma ini mendeteksi kerugian finansial akibat kesalahan harga/diskon toko, dengan memperhitungkan biaya admin platform (*marketplace fee*) dan batas toleransi bakar uang promosi (*Intentional Marketing Burn*).

```python
def check_margin_and_budget(sku, sales_data_array, master_data, default_fee_rate=0.085):
    cogs = master_data['COGS']
    budget_cap = master_data.get('Promo_Budget_Cap', 0)
    fee_rate = master_data.get('Platform_Fee_Rate', default_fee_rate)
    cumulative_burn = 0
    total_revenue_loss = 0
    
    for row in sales_data_array:
        deal_price = row['Deal_Price']
        seller_voucher = row['Seller_Discount']
        platform_subsidy = row['Platform_Subsidy']
        
        # 1. Hitung potongan admin & layanan marketplace
        est_platform_fee = deal_price * fee_rate
        
        # 2. Net Realized Payout yang cair ke rekening
        net_payout = deal_price + platform_subsidy - seller_voucher - est_platform_fee
        
        # 3. True Net Margin
        true_net_margin = net_payout - cogs
        
        # Deteksi under COGS (kebocoran modal)
        if true_net_margin < 0:
            order_burn = abs(true_net_margin) * row['Quantity_Sold']
            cumulative_burn += order_burn
            total_revenue_loss += order_burn
            
    # Evaluasi Ambang Batas Budget Safe vs Breach
    if cumulative_burn == 0:
        return {'status': 'SAFE', 'severity': 'SAFE', 'burn': 0}
        
    burn_percentage = (cumulative_burn / budget_cap * 100) if budget_cap > 0 else float('inf')
    
    if budget_cap > 0 and burn_percentage <= 70:
        return {
            'status': 'BUDGET SAFE',
            'severity': 'SAFE',
            'info': f'Bakar uang terencana: {burn_percentage:.1f}% dari budget Rp{budget_cap:,.0f}',
            'burn_amount': cumulative_burn
        }
    elif budget_cap > 0 and burn_percentage <= 90:
        return {
            'status': 'WATCHLIST',
            'severity': 'WARNING',
            'info': f'Perhatian: Anggaran promo terserap {burn_percentage:.1f}%',
            'burn_amount': cumulative_burn
        }
    else:
        return {
            'status': 'CRITICAL BREACH',
            'severity': 'CRITICAL',
            'reason': 'Overburn melebihi Budget Promo atau SKU tanpa alokasi budget!',
            'burn_amount': cumulative_burn,
            'overspend': cumulative_burn - budget_cap if budget_cap > 0 else cumulative_burn
        }
```

---

## 2. Rule 2: Moving-Window Velocity & Sensitivity Presets
Algoritma ini menggunakan `Runrate per SKU` berbasis jendela waktu dinamis (*Moving Window*) untuk mendeteksi barang yang akan kehabisan stok.

```python
def check_oos_risk(sku_data, recent_sales_data, mode='NORMAL'):
    # Konfigurasi Preset Sensitivitas
    config = {
        'NORMAL': {'window_hours': 3, 'warning_runway': 12, 'critical_runway': 4},
        'MEGA_CAMPAIGN': {'window_hours': 1, 'warning_runway': 4, 'critical_runway': 1}
    }
    preset = config.get(mode, config['NORMAL'])
    window_hours = preset['window_hours']
    
    # 1. Hitung Qty terjual HANYA dalam jendela waktu N jam terakhir
    total_sold_recent = sum([order['qty'] for order in recent_sales_data])
    
    # 2. Hitung Velocity (kecepatan per jam)
    velocity = total_sold_recent / window_hours
    if velocity == 0:
        return {'status': 'SAFE (Slow Moving)', 'severity': 'SAFE', 'velocity': 0}
        
    # 3. Hitung Runway (sisa jam hingga stok habis)
    runway = sku_data['Current_Stock'] / velocity
    global_buffer = sku_data.get('Global_Buffer', 0)
    
    # 4. Evaluasi Kondisi
    if runway <= preset['critical_runway'] or (runway <= preset['warning_runway'] and global_buffer <= 0):
        return {
            'status': 'CRITICAL OOS RISK',
            'severity': 'CRITICAL',
            'runway': runway,
            'velocity': velocity,
            'global_buffer': global_buffer
        }
    elif runway <= preset['warning_runway']:
        return {
            'status': 'WARNING (Rebalance Required)',
            'severity': 'WARNING',
            'runway': runway,
            'velocity': velocity,
            'recommended_rebalance': int(velocity * 24),
            'global_buffer': global_buffer
        }
        
    return {'status': 'SAFE', 'severity': 'SAFE', 'runway': runway}
```

---

## 3. Rule 3: The Cross-Channel Pareto Allocator
Jika SKU yang sama dijual di berbagai channel (misal TikTok Live dan Shopee Flash Sale) sementara buffer gudang terbatas:
$$\text{Allocation Ratio}_{\text{Channel}} = \frac{\text{Velocity}_{\text{Channel}}}{\sum \text{Velocity}_{\text{All Channels}}}$$
Stok buffer dialokasikan proporsional sesuai kecepatan riil channel agar channel dengan tarikan tercepat tidak mengalami OOS prematur.

---

## 4. Rule 4: Emergency Store Penalty Mitigation (Ketika Buffer Gudang Kosong & PO Di-Reject)
Kondisi ekstrem di mana:
- `Stock Runway <= 6 Jam`
- `Global Buffer Gudang == 0` (atau pengajuan Purchase Order / PO ke supplier ditolak / *Lead Time* pengiriman pabrik > 3 hari).

### Dampak Fatal Reputasi Toko:
Jika pesanan tetap mengalir saat stok fisik habis, toko akan membatalkan pesanan secara sepihak. Marketplace akan menjatuhkan **Poin Penalti Pembatalan (Non-Fulfillment Rate > 2%)** yang menyebabkan penalti pencabutan badge Shopee Mall / Star Seller dan pemblokiran fitur Flash Sale.

### Aksi Mitigasi Otomatis (Actionable Protocol):
Engine merekomendasikan dua tindakan darurat seketika pada teks eskalasi:
1. **Pengereman Laju Order (Price Bump):** Instruksikan admin toko untuk menaikkan harga etalase sebesar 10% - 20% untuk memperlambat *velocity* tanpa mematikan listing.
2. **Penghentian Belanja Iklan (Pause Ads):** Instruksikan tim ads/live streaming untuk mematikan kampanye berbayar untuk SKU terkait agar stok tersisa dapat dialokasikan hanya untuk pembeli organik.

---

## 5. Rule 5: Team Resolution State & Multi-AM Collision Guard
Untuk mengkoordinasikan **17 Account Manager** agar tidak terjadi tumpang-tindih eskalasi:
1. Setiap SKU memiliki status lokal di sesi browser: `PENDING_ACTION` atau `ESCALATED`.
2. Saat tombol `[Escalate to WA]` diklik, status berubah menjadi `ESCALATED` disertai cap waktu (misal: *Escalated at 15:42*).
3. Tabel triase menyediakan filter status `[Semua]`, `[Menunggu Aksi]`, dan `[Sudah Dieskalasi]`.
4. Tombol **"Copy Shift Handover"** mengekspor seluruh status insiden hari itu menjadi format teks rapi untuk laporan serah terima tim atau *Monthly Business Report* (Claim Report).
