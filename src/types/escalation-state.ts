/**
 * State koordinasi eskalasi tim (17 AM) — dipersist ke localStorage.
 * Hanya menyimpan penanda status, bukan data penjualan.
 */

export interface EscalationRecord {
  escalatedAt: number;
  escalatedTo: "PRICING" | "WAREHOUSE";
}

export type EscalationMap = Record<string, EscalationRecord>;
