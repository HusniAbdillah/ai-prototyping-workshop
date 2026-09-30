# 03. Decision Engine Rules (The Brain)

Dokumen ini mendeskripsikan logika algoritma pengambilan keputusan. Saat AM memasukkan CSV, sistem ini yang akan memisahkan mana baris data yang aman, dan mana yang menjadi anomali.

## 1. Rule 1: Margin Bleeding & Budget Safe Detector (Under COGS)
Algoritma ini mendeteksi kerugian finansial akibat kesalahan harga/promo, sambil menghargai "Intentional Marketing Burn" (Bakar Uang yang disengaja).

```python
def check_margin_and_budget(sku, sales_data_array, master_data):
    cogs = master_data['COGS']
    budget_cap = master_data.get('Promo_Budget_Cap', 0)
    cumulative_burn = 0
    
    for row in sales_data_array:
        final_revenue = row['Deal_Price'] + row['Platform_Subsidy'] - row['Seller_Discount']
        true_margin = final_revenue - cogs
        
        # Deteksi under COGS
        if true_margin < 0:
            cumulative_burn += (abs(true_margin) * row['Quantity_Sold'])
            
    # Evaluasi Budget Safe vs Breach
    burn_percentage = (cumulative_burn / budget_cap) * 100 if budget_cap > 0 else float('inf')
    
    if cumulative_burn == 0:
        return {'status': 'SAFE (Profitable)'}
    elif burn_percentage <= 70:
        return {'status': 'BUDGET SAFE', 'info': f'Burned {burn_percentage}%'}
    elif burn_percentage <= 90:
        return {'status': 'WATCHLIST', 'info': 'Budget hampir habis'}
    else:
        return {
            'status': 'CRITICAL BREACH', 
            'reason': 'Loss melebihi Budget Promo atau SKU tidak punya budget!',
            'burn_amount': cumulative_burn
        }
```

---

## 2. Rule 2: Time-Windowed Runrate & OOS Detector
Algoritma ini menggunakan `Runrate per SKU` berbasis *Moving Window* (dinamis berdasarkan 3 jam terakhir, bukan 24 jam) untuk mendeteksi produk yang akan segera kehabisan stok.

```python
def check_oos_risk(sku_data, recent_sales_data, time_window_hours=3):
    # Hitung Qty terjual HANYA dalam jendela waktu N jam terakhir
    total_sold_recent = sum([order.qty for order in recent_sales_data])
    
    # Runrate per SKU (Velocity)
    velocity = total_sold_recent / time_window_hours
    if velocity == 0:
        return {'status': 'SAFE (Slow Moving)'} 
        
    runway = sku_data['Current_Stock'] / velocity
    
    if runway < 12 and sku_data['Global_Buffer'] > 0:
        return {
            'status': 'WARNING',
            'reason': f'OOS dalam {runway} jam. Runrate: {velocity}/jam.',
            'recommended_rebalance': int(velocity * 24) 
        }
    return {'status': 'SAFE'}
```

---

## 3. Rule 3: The Rebalancing Allocator (Pareto Distribution)
Sistem mengalokasikan stok gudang berdasarkan perbandingan *Runrate per SKU* lintas channel secara proporsional. Jika Runrate TikTok lebih tinggi dari Shopee, TikTok akan mendapat alokasi buffer lebih banyak.
