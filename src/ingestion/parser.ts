/**
 * PapaParse Web Worker wrapper — parse CSV besar tanpa membekukan UI thread.
 * Konfigurasi sesuai docs/06: `worker: true`, `skipEmptyLines`, header-aware.
 */

import Papa from "papaparse";

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50MB (docs/06 §1.B.2)

export class FileTooLargeError extends Error {
  constructor(fileName: string) {
    super(`File "${fileName}" melebihi batas 50MB.`);
    this.name = "FileTooLargeError";
  }
}

/** Periksa batas ukuran file (strict edge boundary). */
export function assertFileSizeAllowed(file: File): void {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new FileTooLargeError(file.name);
  }
}

export interface ParsedCsv {
  /** Header mentah (urutan asli, tanpa BOM). */
  headers: string[];
  /** Baris data sebagai Record<string, unknown> keyed by header. */
  rows: Record<string, unknown>[];
  /** Jumlah baris valid. */
  count: number;
}

/**
 * Parse teks CSV menjadi array objek menggunakan PapaParse Web Worker.
 * BOM UTF-8 (\uFEFF) dibuang sebelum parsing untuk mencegah header korup.
 */
export function parseCsvText(
  rawText: string,
  opts: { header?: boolean } = { header: true },
): Promise<ParsedCsv> {
  const text = rawText.replace(/^\uFEFF/, "");

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(text, {
      header: opts.header ?? true,
      skipEmptyLines: "greedy",
      worker: true,
      complete: (result) => {
        const fields = (result.meta.fields ?? []).map((f) =>
          f.replace(/^\uFEFF/, "").trim(),
        );
        resolve({
          headers: fields,
          rows: result.data,
          count: result.data.length,
        });
      },
      error: (err: Error) => reject(err),
    });
  });
}
