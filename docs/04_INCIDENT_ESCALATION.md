# 04. Incident Escalation & Resolution (SOP)

Tujuan dari sistem ini bukan sekadar memberi tahu ada masalah, melainkan **mempercepat resolusi masalah**. Dokumen ini mengatur Standar Operasional Prosedur (SOP) paska-deteksi anomali.

## 1. Mekanisme 1-Click Triage
Setiap baris anomali yang dimunculkan oleh *Decision Engine* pada Dashboard UI akan dilengkapi tombol "Escalate". Tombol ini menggunakan Universal Link dari WhatsApp.

### A. Eskalasi Margin Bleeding
- **Dikirim Ke:** Tim Pricing & Kampanye (Group WA Khusus).
- **Format Otomatis (URL Payload):**
  ```text
  https://wa.me/628XXXXXXXXXX?text=🚨%20CRITICAL%20[SIRCLO%20Insight]%0A%0ATerjadi%20Bocor%20Margin!%0AChannel%3A%20{Channel}%0ASKU%3A%20{SKU}%0A%0AHarga%20Terjual%3A%20Rp{Deal_Price}%0AModal%20(COGS)%3A%20Rp{COGS}%0A❌%20Rugi%20per%20item%3A%20Rp{Loss_per_item}%0A%0A*Action%20Required%3A*%20Mohon%20cabut%20promo/flash-sale%20untuk%20SKU%20ini%20SEKARANG.
  ```

### B. Eskalasi Stock Rebalancing (OOS Risk)
- **Dikirim Ke:** Tim Warehouse & Operations (Group WA Khusus).
- **Format Otomatis (URL Payload):**
  ```text
  https://wa.me/628XXXXXXXXXX?text=⚠️%20WARNING%20[SIRCLO%20Insight]%0A%0ARisiko%20Out%20of%20Stock%20(OOS)%!%0AChannel%3A%20{Channel}%0ASKU%3A%20{SKU}%0A%0ARunway%3A%20Sisa%20{Runway}%20Jam%20lagi.%0ABuffer%20Tersedia%3A%20{Global_Buffer}%20Unit.%0A%0A*Action%20Required%3A*%20Mohon%20suntik/alokasikan%20{Recommended_Rebalance}%20unit%20stok%20fisik%20ke%20Seller%20Center%20sekarang.
  ```

## 2. Kenapa WhatsApp dan bukan Sistem Tiket (Jira/Zendesk)?
Berdasarkan pendekatan *Signal vs Noise*, ini adalah kondisi *urgent triage*.
Sistem tiket seperti Jira butuh waktu 5-10 menit untuk pembuatan *issue* (memasukkan field, *assignee*, label), dan butuh waktu lama untuk dinotice oleh tim operasional yang sedang repot di lapangan. WhatsApp berbunyi seketika di saku mereka. 
Tujuan kita adalah *Time-to-Resolution* dalam hitungan detik.
