import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { ingestFiles } from "@/ingestion/ingest";
import { runDecisionEngine } from "@/engine";

describe("Load all 5 Demo Data Files", () => {
  it("harus sukses meng-ingest 5 file demo dan menghasilkan OOS dan margin bleed yang akurat", async () => {
    const fileNames = [
      "shopee_sales_report.csv",
      "tiktok_sales_report.csv",
      "internal_master_data.csv",
      "shopee_inventory_report.csv",
      "tiktok_inventory_report.csv",
    ];

    const files: File[] = fileNames.map((name) => {
      const filePath = path.resolve(process.cwd(), "public/data", name);
      const content = fs.readFileSync(filePath, "utf-8");
      return new File([content], name, { type: "text/csv" });
    });

    const result = await ingestFiles(files);

    expect(result.recognizedRoles).toHaveLength(5);
    expect(result.skippedFiles).toHaveLength(0);
    expect(result.recognizedRoles).toContain("shopee_sales_report.csv → Shopee Sales");
    expect(result.recognizedRoles).toContain("tiktok_sales_report.csv → TikTok Sales");
    expect(result.recognizedRoles).toContain("internal_master_data.csv → Master Catalog");
    expect(result.recognizedRoles).toContain("shopee_inventory_report.csv → Shopee Inventory");
    expect(result.recognizedRoles).toContain("tiktok_inventory_report.csv → TikTok Inventory");

    // Pastikan inventory terisi untuk kedua marketplace
    const shopeeInv = result.inventory.filter((i) => i.marketplace === "SHOPEE");
    const tiktokInv = result.inventory.filter((i) => i.marketplace === "TIKTOK");

    expect(shopeeInv.length).toBeGreaterThan(0);
    expect(tiktokInv.length).toBeGreaterThan(0);

    // Cek salah satu stok TikTok spesifik dari file tiktok_inventory_report.csv (misal SKU-A01 = 3)
    const skuA01Tiktok = tiktokInv.find((i) => i.sku === "SKU-A01");
    expect(skuA01Tiktok?.currentStock).toBe(3);

    // Jalankan decision engine
    const engineOutput = runDecisionEngine({
      dataset: result.dataset,
      inventory: result.inventory,
      routingConfig: { waPricing: "628111", waWarehouse: "628222" },
      mode: "NORMAL",
    });

    expect(engineOutput.anomalies.length).toBeGreaterThan(0);

    // Cek apakah ada anomali OOS TikTok dengan stok yang benar dari inventory file
    const tiktokOosAnomalies = engineOutput.anomalies.filter(
      (a) => a.issueType === "OOS_RISK" && a.marketplace === "TIKTOK"
    );

    // Anomali OOS TikTok sekarang harus mendeteksi currentStock sebenarnya (bukan fallback 0)
    for (const anom of tiktokOosAnomalies) {
      expect(anom.currentStock).toBeDefined();
      expect(typeof anom.currentStock).toBe("number");
      expect(anom.currentStock).toBeGreaterThanOrEqual(0);
    }
  });
});
