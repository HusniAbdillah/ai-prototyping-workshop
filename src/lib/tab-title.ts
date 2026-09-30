/**
 * Dynamic Tab Title Flasher — saat tab di latar belakang dan ada anomali
 * aktif, judul browser berkedip dengan prefix alert. Normal saat fokus.
 */

const BASE_TITLE = "SIRCLO Insight — Anomaly Detection";

/** Hitung judul tab berdasarkan jumlah anomali kritis aktif. */
export function computeTabTitle(criticalCount: number): string {
  if (criticalCount <= 0) return BASE_TITLE;
  return `(${criticalCount}) 🚨 SIRCLO Insight - Margin Bleed Terdeteksi!`;
}

/**
 * Kembalikan judul dasar saat tab difokuskan kembali.
 * (`isFocused` disediakan agar fungsi tetap pure & mudah diuji.)
 */
export function computeFocusedTitle(_isFocused: boolean): string {
  return BASE_TITLE;
}

export { BASE_TITLE };
