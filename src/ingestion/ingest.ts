/**
 * Ingestion orchestrator — membaca File CSV, mendeteksi peran, parsing via
 * PapaParse Web Worker, lalu normalisasi ke dataset standar.
 */

import type { ParsedDataset } from "@/types/domain";
import { assertFileSizeAllowed, parseCsvText } from "./parser";
import {
  detectFileRole,
  normalizeInventoryRows,
  normalizeMasterRows,
  normalizeSalesRows,
  type InventoryRow,
} from "./normalize";

export interface IngestionResult {
  dataset: ParsedDataset;
  inventory: InventoryRow[];
  /** Peran file yang berhasil dikenali (untuk UI feedback). */
  recognizedRoles: string[];
  /** File yang tidak dikenali perannya (perlu verifikasi AM). */
  skippedFiles: string[];
}

/**
 * Konsumsi satu atau lebih file CSV dan hasilkan dataset standar.
 * Data hidup 100% di memori (tidak dikirim ke backend).
 */
export async function ingestFiles(files: File[]): Promise<IngestionResult> {
  const dataset: ParsedDataset = {
    omnichannelSales: [],
    masterCatalog: [],
  };
  const inventory: InventoryRow[] = [];
  const recognizedRoles: string[] = [];
  const skippedFiles: string[] = [];

  for (const file of files) {
    assertFileSizeAllowed(file);
    const text = await file.text();
    const parsed = await parseCsvText(text);
    if (parsed.headers.length === 0) {
      skippedFiles.push(file.name);
      continue;
    }

    const role = detectFileRole(parsed.headers);
    switch (role) {
      case "SHOPEE_SALES":
        dataset.omnichannelSales.push(
          ...normalizeSalesRows(parsed.rows, parsed.headers, "SHOPEE"),
        );
        recognizedRoles.push(`${file.name} → Shopee Sales`);
        break;
      case "TIKTOK_SALES":
        dataset.omnichannelSales.push(
          ...normalizeSalesRows(parsed.rows, parsed.headers, "TIKTOK"),
        );
        recognizedRoles.push(`${file.name} → TikTok Sales`);
        break;
      case "MASTER":
        dataset.masterCatalog.push(
          ...normalizeMasterRows(parsed.rows, parsed.headers),
        );
        recognizedRoles.push(`${file.name} → Master Catalog`);
        break;
      case "SHOPEE_INVENTORY":
        inventory.push(
          ...normalizeInventoryRows(parsed.rows, parsed.headers, "SHOPEE"),
        );
        recognizedRoles.push(`${file.name} → Shopee Inventory`);
        break;
      case "TIKTOK_INVENTORY":
        inventory.push(
          ...normalizeInventoryRows(parsed.rows, parsed.headers, "TIKTOK"),
        );
        recognizedRoles.push(`${file.name} → TikTok Inventory`);
        break;
      default:
        skippedFiles.push(file.name);
    }
  }

  return { dataset, inventory, recognizedRoles, skippedFiles };
}
