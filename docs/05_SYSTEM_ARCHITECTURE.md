# 05. System Architecture Blueprint

Blueprint ini menggambarkan arsitektur teknis dari produk, dimulai dari fase prototipe (Day 0) hingga skala produksi penuh (Day 180).

## 1. MVP Architecture (Day 0 Proof)
Pada fase MVP, kita menghindari pembuatan infrastruktur *cloud* dan *database* persisten. Tujuannya adalah memvalidasi kelayakan *Decision Engine* secepat mungkin di mesin lokal milik Account Manager.

**Tech Stack MVP:**
- **Frontend / Client:** HTML5, TailwindCSS, dan Vanilla JavaScript (atau React minimalis).
- **Parser Library:** PapaParse.js (untuk memproses ribuan baris CSV seketika di *browser* klien).
- **Processing:** Murni *In-Browser Array Iteration*. Data tidak dikirim ke server manapun (100% aman dan lolos *Security Review*).

**Flow MVP:**
1. AM *drag & drop* 3 file CSV.
2. JavaScript `PapaParse` mengubah CSV menjadi JSON Array.
3. Looping JSON `O(n)` dengan *Decision Engine Rules*.
4. Hasil *render* langsung ke tabel DOM.

---

## 2. Evolution Architecture (Day 180 - Full Automation)
Jika MVP sukses (AM ketagihan dan metrics Triage Time membaik), kita melangkah ke otomatisasi tanpa campur tangan CSV manusia.

```mermaid
graph TD
    subgraph External Platforms
        Shopee[Shopee Open API <br/> Webhooks]
        TikTok[TikTok Shop API <br/> Webhooks]
    end

    subgraph Internal Data Sources
        ERP[SIRCLO ERP / COGS Database]
    end

    subgraph Data Pipeline & Analytics (Cloud)
        EventBus[Kafka / PubSub <br/> Stream Processor]
        OLAP[(ClickHouse / BigQuery)]
        Airflow[Airflow ETL (Hourly Sync)]
    end

    subgraph Intelligence Core (Backend)
        Engine[Anomaly Rule Engine <br/> Node.js / Go]
        Allocator[Auto-Allocator Service]
    end

    Shopee -->|Live Order Events| EventBus
    TikTok -->|Live Order Events| EventBus
    ERP -->|Master Data| Airflow
    Airflow --> OLAP
    EventBus --> OLAP
    
    OLAP -->|Query per 5 mins| Engine
    Engine -->|Trigger Margin Bleed| TriageUI[Triage Dashboard]
    Engine -->|Trigger OOS| Allocator
    
    Allocator -->|POST Stock Update API| Shopee
    Allocator -->|POST Stock Update API| TikTok
```

**Perubahan Kunci di Fase 180 Hari:**
1. **No More CSV:** Diganti dengan Live Webhooks (pesanan masuk langsung dihitung *velocity*-nya).
2. **OLAP Database:** Perhitungan agregat (*total sold*, *velocity*) dilakukan secara masif dan efisien di ClickHouse.
3. **Closed-Loop Action:** Alih-alih eskalasi via WhatsApp untuk masalah OOS, `Auto-Allocator Service` akan otomatis mengeksekusi penambahan stok langsung via Shopee/TikTok API (*Zero Human Intervention*). WhatsApp hanya digunakan untuk masalah kritikal seperti Margin Bleed.
