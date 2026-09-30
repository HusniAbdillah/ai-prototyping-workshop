import { describe, expect, it } from "vitest";
import { BASE_TITLE, computeFocusedTitle, computeTabTitle } from "@/lib/tab-title";
import { computeCriticalToastTitle, rowIdForAnomaly } from "@/lib/notifications";

describe("In-App Web Alerts & Notifications", () => {
  it("CHK-NOTIF-001: menghasilkan judul toast darurat dengan total kerugian", () => {
    expect(computeCriticalToastTitle(2)).toBe(
      "Terdeteksi 2 Kebocoran Margin Kritis!",
    );
  });

  it("CHK-NOTIF-002: memperbarui judul tab dengan prefix alert & badge count", () => {
    expect(computeTabTitle(3)).toBe(
      "(3) 🚨 SIRCLO Insight - Margin Bleed Terdeteksi!",
    );
    expect(computeTabTitle(0)).toBe(BASE_TITLE);
    expect(computeFocusedTitle(true)).toBe(BASE_TITLE);
  });

  it("CHK-NOTIF-003: menghasilkan ID baris target untuk jump-to-row navigation", () => {
    expect(rowIdForAnomaly("ALT-01")).toBe("row-ALT-01");
    expect(rowIdForAnomaly("ANOM-MARGIN-SKU-A")).toBe("row-ANOM-MARGIN-SKU-A");
  });
});
