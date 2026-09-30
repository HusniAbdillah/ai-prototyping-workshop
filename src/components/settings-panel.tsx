import { Settings2, Volume2, VolumeX, X } from "lucide-react";
import type { EscalationRoutingConfig, SensitivityMode } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface SettingsPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routingConfig: EscalationRoutingConfig;
  onRoutingConfigChange: (config: EscalationRoutingConfig) => void;
  mode: SensitivityMode;
  onModeChange: (mode: SensitivityMode) => void;
  soundEnabled: boolean;
  onSoundToggle: () => void;
}

const MODES: { key: SensitivityMode; label: string; desc: string }[] = [
  { key: "NORMAL", label: "Normal Ops", desc: "Window 3 jam · Warning ≤ 12 jam" },
  {
    key: "MEGA_CAMPAIGN",
    label: "Mega Flash Sale",
    desc: "Window 1 jam · Warning ≤ 4 jam",
  },
];

/**
 * Panel konfigurasi: nomor WA PIC (Pricing & Warehouse), preset sensitivitas,
 * dan toggle suara. Disimpan di localStorage.
 */
export function SettingsPanel({
  open,
  onOpenChange,
  routingConfig,
  onRoutingConfigChange,
  mode,
  onModeChange,
  soundEnabled,
  onSoundToggle,
}: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 text-card-foreground shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Settings2 className="h-5 w-5" /> Pengaturan
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Tutup pengaturan"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nomor WA PIC Pricing / Ads</label>
            <input
              type="tel"
              value={routingConfig.waPricing}
              onChange={(e) =>
                onRoutingConfigChange({
                  ...routingConfig,
                  waPricing: e.target.value.replace(/[^\d]/g, ""),
                })
              }
              placeholder="628123456789"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Nomor WA PIC Warehouse</label>
            <input
              type="tel"
              value={routingConfig.waWarehouse}
              onChange={(e) =>
                onRoutingConfigChange({
                  ...routingConfig,
                  waWarehouse: e.target.value.replace(/[^\d]/g, ""),
                })
              }
              placeholder="628987654321"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Preset Sensitivitas</label>
            <div className="grid grid-cols-2 gap-2">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onModeChange(m.key)}
                  className={cn(
                    "rounded-md border p-3 text-left transition-colors",
                    mode === m.key
                      ? "border-primary bg-accent"
                      : "border-input hover:bg-accent",
                  )}
                >
                  <p className="text-sm font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Audio Chime</p>
              <p className="text-xs text-muted-foreground">
                Bunyikan alarm saat anomali kritis terdeteksi
              </p>
            </div>
            <Button
              variant={soundEnabled ? "default" : "outline"}
              size="sm"
              onClick={onSoundToggle}
            >
              {soundEnabled ? (
                <Volume2 className="h-4 w-4" />
              ) : (
                <VolumeX className="h-4 w-4" />
              )}
              {soundEnabled ? "On" : "Off"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
