import csv
import random
from datetime import datetime, timedelta

# Master Catalog
skus = [
    {"sku": "SKU-A01", "name": "Wireless Mouse X1", "cogs": 100000, "base_price": 150000},
    {"sku": "SKU-A02", "name": "Mechanical Keyboard K2", "cogs": 350000, "base_price": 500000},
    {"sku": "SKU-A03", "name": "USB-C Hub 7-in-1", "cogs": 150000, "base_price": 250000},
    {"sku": "SKU-B01", "name": "Laptop Stand Aluminum", "cogs": 120000, "base_price": 180000},
    {"sku": "SKU-B02", "name": "Webcam 1080p HD", "cogs": 200000, "base_price": 300000},
    {"sku": "SKU-C01", "name": "Gaming Headset G-Pro", "cogs": 400000, "base_price": 600000},
    {"sku": "SKU-C02", "name": "Mousepad RGB Large", "cogs": 50000, "base_price": 100000},
    {"sku": "SKU-D01", "name": "Bluetooth Speaker Mini", "cogs": 80000, "base_price": 150000},
]

start_time = datetime(2026, 9, 28, 0, 0, 0)

# Generate Shopee Sales
shopee_sales = []
for i in range(150):
    item = random.choice(skus)
    order_time = start_time + timedelta(minutes=random.randint(1, 4000))
    qty = random.choices([1, 2, 3], weights=[0.7, 0.2, 0.1])[0]
    
    # Introduce cases: normal, discount, extreme voucher (below COGS)
    scenario = random.choices(["normal", "discount", "flash_sale_abuse"], weights=[0.6, 0.3, 0.1])[0]
    
    if scenario == "normal":
        deal_price = item["base_price"]
        voucher = 0
    elif scenario == "discount":
        deal_price = item["base_price"] - random.randint(1, 3) * 10000
        voucher = 10000
    else: # flash_sale_abuse - below COGS
        deal_price = item["cogs"] - random.randint(10000, 30000)
        voucher = 50000

    shopee_sales.append({
        "Order ID": f"SHP{order_time.strftime('%Y%m%d')}{i:04d}",
        "Order Status": random.choices(["Completed", "Processing", "Cancelled"], weights=[0.8, 0.15, 0.05])[0],
        "Order Creation Time": order_time.strftime('%Y-%m-%d %H:%M:%S'),
        "Product Name": item["name"],
        "SKU": item["sku"],
        "Quantity": qty,
        "Original Price": item["base_price"],
        "Deal Price": deal_price,
        "Subtotal": deal_price * qty,
        "Seller Voucher": voucher,
        "Order Total": (deal_price * qty) - voucher
    })

# Sort by time
shopee_sales = sorted(shopee_sales, key=lambda x: x["Order Creation Time"])

with open('data/shopee_sales_report.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=shopee_sales[0].keys())
    writer.writeheader()
    writer.writerows(shopee_sales)

# Generate TikTok Sales
tiktok_sales = []
for i in range(120):
    item = random.choice(skus)
    order_time = start_time + timedelta(minutes=random.randint(1, 4000))
    qty = random.choices([1, 2, 3], weights=[0.8, 0.15, 0.05])[0]
    
    scenario = random.choices(["normal", "creator_promo", "platform_subsidy", "error_price"], weights=[0.5, 0.2, 0.2, 0.1])[0]
    
    if scenario == "normal":
        deal_price = item["base_price"]
        discount = 0
    elif scenario == "creator_promo":
        deal_price = item["base_price"] - 20000
        discount = 20000
    elif scenario == "platform_subsidy":
        deal_price = item["base_price"] # platform pays, seller gets base
        discount = 30000 
    else: # error_price - below COGS
        deal_price = int(item["cogs"] * 0.8) # 20% below COGS
        discount = item["base_price"] - deal_price

    tiktok_sales.append({
        "Order ID": f"TT{order_time.strftime('%Y%m%d')}{i:04d}",
        "Order Status": random.choices(["Delivered", "Awaiting Shipment", "Cancelled"], weights=[0.7, 0.2, 0.1])[0],
        "Created Time": order_time.strftime('%Y-%m-%d %H:%M:%S'),
        "Product Name": item["name"],
        "Seller SKU": item["sku"],
        "Quantity": qty,
        "Original Price": item["base_price"],
        "Sale Price": deal_price,
        "Discount": discount,
        "Total Amount": deal_price * qty
    })

tiktok_sales = sorted(tiktok_sales, key=lambda x: x["Created Time"])
with open('data/tiktok_sales_report.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=tiktok_sales[0].keys())
    writer.writeheader()
    writer.writerows(tiktok_sales)

# Generate Inventory and Internal Master
shopee_inv = []
tiktok_inv = []
internal_master = []

for item in skus:
    # Some items are OOS in shopee, some OOS in tiktok, some have high buffer
    shp_stock = random.choices([0, 5, 20, 50], weights=[0.2, 0.3, 0.3, 0.2])[0]
    tt_stock = random.choices([0, 3, 15, 40], weights=[0.2, 0.3, 0.3, 0.2])[0]
    buffer_stock = random.choices([0, 10, 50, 200], weights=[0.1, 0.3, 0.4, 0.2])[0]
    
    shopee_inv.append({
        "SKU": item["sku"],
        "Product Name": item["name"],
        "Price": item["base_price"],
        "Stock": shp_stock,
        "Reserved Stock": random.randint(0, 2) if shp_stock > 0 else 0,
        "Update Time": (start_time + timedelta(minutes=4000)).strftime('%Y-%m-%d %H:%M:%S')
    })
    
    tiktok_inv.append({
        "Seller SKU": item["sku"],
        "Product Name": item["name"],
        "Price": item["base_price"],
        "Available Stock": tt_stock,
        "Locked Stock": random.randint(0, 2) if tt_stock > 0 else 0,
        "Last Update": (start_time + timedelta(minutes=4000)).strftime('%Y-%m-%d %H:%M:%S')
    })
    
    internal_master.append({
        "SKU": item["sku"],
        "Product Name": item["name"],
        "COGS": item["cogs"],
        "Global Buffer Stock": buffer_stock,
        "Status": "Active"
    })

with open('data/shopee_inventory_report.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=shopee_inv[0].keys())
    writer.writeheader()
    writer.writerows(shopee_inv)

with open('data/tiktok_inventory_report.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=tiktok_inv[0].keys())
    writer.writeheader()
    writer.writerows(tiktok_inv)

with open('data/internal_master_data.csv', 'w', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=internal_master[0].keys())
    writer.writeheader()
    writer.writerows(internal_master)

print("Data generation complete.")
