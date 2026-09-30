/**
 * Formatting angka & mata uang Rupiah untuk UI triase dan payload WhatsApp.
 * Semua output menggunakan locale `id-ID` agar konsisten dengan SOP eskalasi.
 */

const idID = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Format angka menjadi Rupiah penuh tanpa desimal, e.g. 1250000 -> "Rp 1.250.000". */
export function formatRupiah(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `Rp ${idID.format(Math.round(safe))}`;
}

/** Format Rupiah dengan tanda negatif eksplisit untuk kerugian. */
export function formatRupiahSigned(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return safe < 0 ? `-Rp ${idID.format(Math.abs(Math.round(safe)))}` : formatRupiah(safe);
}

/** Format angka persen dengan 1 desimal. */
export function formatPercent(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(1)}%`;
}

/** Format jam runway dengan 1 desimal + satuan jam. */
export function formatRunway(hours: number): string {
  const safe = Number.isFinite(hours) ? hours : 0;
  return `${safe.toFixed(1)} jam`;
}

/** Format velocity unit per jam. */
export function formatVelocity(unitsPerHour: number): string {
  const safe = Number.isFinite(unitsPerHour) ? unitsPerHour : 0;
  return `${safe.toFixed(1)} unit/jam`;
}

/** Format timestamp epoch ms menjadi "15:35" WIB (atau lokal browser). */
export function formatClock(epochMs: number): string {
  const d = new Date(epochMs);
  return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}
