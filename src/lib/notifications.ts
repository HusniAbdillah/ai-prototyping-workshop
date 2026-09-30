/**
 * Pure helper untuk notifikasi in-app — mudah diuji tanpa DOM.
 */

/** Judul toast darurat saat ada anomali kritis. */
export function computeCriticalToastTitle(criticalCount: number): string {
  return `Terdeteksi ${criticalCount} Kebocoran Margin Kritis!`;
}

/** ID elemen DOM baris triase untuk sebuah anomali (jump-to-row navigation). */
export function rowIdForAnomaly(anomalyId: string): string {
  return `row-${anomalyId}`;
}
