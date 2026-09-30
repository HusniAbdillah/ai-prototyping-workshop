import { useCallback, useState, useEffect } from "react";
import { LayoutDashboard, ListTodo, Settings, Activity, Sun, Moon } from "lucide-react";
import { Dropzone } from "@/components/dropzone";
import { EmergencyBanner } from "@/components/emergency-banner";
import { NotificationBell } from "@/components/notification-bell";
import { SettingsPanel } from "@/components/settings-panel";
import { ShiftHandoverButton } from "@/components/shift-handover-button";
import { TriageTable } from "@/components/triage-table";
import { ingestFiles } from "@/ingestion/ingest";
import { runDecisionEngine } from "@/engine";

import { useCriticalSound } from "@/hooks/use-critical-sound";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { useTabTitle } from "@/hooks/use-tab-title";
import { cn } from "@/lib/utils";
import type { AnomalyResult, EscalationRoutingConfig, SensitivityMode } from "@/types/domain";
import type { EscalationMap } from "@/types/escalation-state";

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  
  // Navigation state
  const [activeTab, setActiveTab] = useState<"dashboard" | "triage">("dashboard");
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Domain state
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [anomalies, setAnomalies] = useState<AnomalyResult[]>([]);
  const [escalationMap, setEscalationMap] = useState<EscalationMap>({});
  
  // KPI state
  const [totalCritical, setTotalCritical] = useState(0);
  const [totalWarning, setTotalWarning] = useState(0);
  const [totalRunningLoss, setTotalRunningLoss] = useState(0);
  const [orphanSkusCount, setOrphanSkusCount] = useState(0);
  const [dataRecency, setDataRecency] = useState<number | null>(null);
  const [recognizedRoles, setRecognizedRoles] = useState<string[]>([]);
  const [skippedFiles, setSkippedFiles] = useState<string[]>([]);

  // Config
  const [routingConfig, setRoutingConfig] = useLocalStorage<EscalationRoutingConfig>(
    "agy:omnichannel:routing",
    { waPricing: "", waWarehouse: "" }
  );
  const [mode, setMode] = useState<SensitivityMode>("NORMAL");
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Background hooks
  useCriticalSound(totalCritical, soundEnabled);
  useTabTitle(totalCritical);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  // Run engine when files change
  const handleFilesChange = useCallback(
    async (incoming: File[]) => {
      setFiles(incoming);
      if (incoming.length === 0) {
        setAnomalies([]);
        setTotalCritical(0);
        setTotalWarning(0);
        setTotalRunningLoss(0);
        setOrphanSkusCount(0);
        setDataRecency(null);
        setRecognizedRoles([]);
        setSkippedFiles([]);
        stop();
        return;
      }

      setIsProcessing(true);
      try {
        const { dataset, inventory, recognizedRoles: rRoles, skippedFiles: sFiles } = await ingestFiles(incoming);
        setRecognizedRoles(rRoles);
        setSkippedFiles(sFiles);

        const out = runDecisionEngine({
          dataset,
          inventory,
          routingConfig,
          mode,
        });

        setAnomalies(out.anomalies);
        setTotalCritical(out.totalCritical);
        setTotalWarning(out.totalWarning);
        setTotalRunningLoss(out.totalRunningLoss);
        setOrphanSkusCount(out.unmatchedSkus.length);

        if (dataset.omnichannelSales.length > 0) {
          setDataRecency(Math.max(...dataset.omnichannelSales.map(s => s.orderTimestamp)));
        } else {
          setDataRecency(null);
        }
      } catch (err) {
        console.error("Gagal ingest data", err);
        alert("Gagal memproses CSV: " + (err instanceof Error ? err.message : String(err)));
      } finally {
        setIsProcessing(false);
      }
    },
    [routingConfig],
  );

  const loadDemoData = useCallback(async () => {
    setIsProcessing(true);
    try {
      const filesToFetch = [
        "shopee_sales_report.csv",
        "tiktok_sales_report.csv",
        "internal_master_data.csv",
        "shopee_inventory_report.csv",
        "tiktok_inventory_report.csv",
      ];
      const fetchedFiles: File[] = [];
      for (const name of filesToFetch) {
        const res = await fetch(`/data/${name}`);
        if (!res.ok) continue;
        const text = await res.text();
        fetchedFiles.push(new File([text], name, { type: "text/csv" }));
      }
      handleFilesChange(fetchedFiles);
    } catch (e) {
      console.error(e);
      alert("Failed to load demo data.");
    } finally {
      setIsProcessing(false);
    }
  }, [handleFilesChange]);

  // Actions
  const handleEscalate = useCallback(
    (anomaly: AnomalyResult, to: "PRICING" | "WAREHOUSE") => {
      setEscalationMap((prev) => ({
        ...prev,
        [anomaly.id]: {
          escalatedAt: Date.now(),
          escalatedTo: to,
        },
      }));
    },
    [],
  );

  const handleUndoEscalate = useCallback((anomalyId: string) => {
    setEscalationMap((prev) => {
      const copy = { ...prev };
      delete copy[anomalyId];
      return copy;
    });
  }, []);

  const navigateToAnomaly = useCallback((id: string) => {
    setActiveTab("triage");
    setTimeout(() => {
      const el = document.getElementById(`row-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 3000);
      }
    }, 100);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-black/90 text-foreground flex flex-col font-sans transition-colors duration-300">
      <EmergencyBanner criticalCount={totalCritical} totalRunningLoss={totalRunningLoss} />
      
      {/* Header - Apple Style */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-black dark:bg-white rounded-xl">
            <Activity className="w-5 h-5 text-white dark:text-black animate-pulse" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-black dark:text-white hidden sm:block">
            SIRCLO <span className="text-gray-500 dark:text-gray-400">Insight</span>
          </h1>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden md:flex bg-gray-100 dark:bg-white/10 p-1 rounded-full">
          {[
            { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
            { id: "triage", icon: ListTodo, label: "Triage Center" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-white dark:bg-black text-black dark:text-white shadow-sm" 
                  : "text-gray-500 hover:text-black dark:hover:text-white"
              )}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === "triage" && (totalCritical + totalWarning) > 0 && (
                <span className="ml-1 bg-red-500 text-white text-[10px] px-1.5 rounded-full">{totalCritical + totalWarning}</span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            {theme === "dark" ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-700" />}
          </button>
          
          <NotificationBell anomalies={anomalies} onNavigate={navigateToAnomaly} />

          <button 
            onClick={() => setSettingsOpen(true)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-700 dark:text-white" />
          </button>
        </div>
      </header>

      {/* Mobile Tabs */}
      <div className="md:hidden flex overflow-x-auto bg-white/70 dark:bg-black/70 backdrop-blur-xl border-b border-gray-200 dark:border-white/10 p-2 gap-2">
        {[
          { id: "dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { id: "triage", icon: ListTodo, label: "Triage Center" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex-shrink-0 flex-1 flex justify-center items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-300",
              activeTab === tab.id 
                ? "bg-black dark:bg-white text-white dark:text-black shadow-sm" 
                : "bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-2 mt-4 lg:mt-8">
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Omnichannel Overview</h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">Upload your sales report to automatically detect margin bleed and stockout risks with zero-backend processing.</p>
            </div>

            <section className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-6 lg:p-8 border border-gray-200 dark:border-white/10 shadow-sm max-w-3xl mx-auto text-center">
              <Dropzone files={files} onFilesChange={handleFilesChange} isLoading={isProcessing} />
              
              <div className="mt-4">
                <button
                  onClick={loadDemoData}
                  disabled={isProcessing}
                  className="px-6 py-2 rounded-xl border border-gray-300 dark:border-white/20 font-semibold hover:bg-gray-100 dark:hover:bg-white/10 transition-all text-sm text-gray-700 dark:text-gray-300"
                >
                  {isProcessing ? "Loading..." : "Load Demo Data"}
                </button>
              </div>

              {/* Feedback on File Processing */}
              {(recognizedRoles.length > 0 || skippedFiles.length > 0) && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 text-sm space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white">File Terdeteksi:</h3>
                  <ul className="text-gray-500 dark:text-gray-400 space-y-1">
                    {recognizedRoles.map(role => <li key={role}>✅ {role}</li>)}
                    {skippedFiles.map(skipped => <li key={skipped} className="text-yellow-600">⚠️ {skipped} (Dilewati, format tak dikenal)</li>)}
                  </ul>
                </div>
              )}
            </section>

            {/* KPI Section */}
            {files.length > 0 && (
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Critical Bleed</p>
                  <h2 className="text-4xl font-bold text-red-500 mt-2">{totalCritical}</h2>
                </div>
                <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Warning Risk</p>
                  <h2 className="text-4xl font-bold text-yellow-500 mt-2">{totalWarning}</h2>
                </div>
                <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Orphan SKUs</p>
                  <h2 className="text-4xl font-bold text-orange-500 mt-2">{orphanSkusCount}</h2>
                </div>
                <div className="bg-white dark:bg-white/5 rounded-3xl p-6 border border-gray-100 dark:border-white/10 shadow-sm">
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Akumulasi Burn</p>
                  <h2 className="text-2xl font-bold text-black dark:text-white mt-2">Rp {totalRunningLoss.toLocaleString('id-ID')}</h2>
                </div>
              </section>
            )}

            {dataRecency && (
              <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-4">
                Data Recency: {new Date(dataRecency).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            )}
          </div>
        )}

        {activeTab === "triage" && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Triage Action Center</h2>
                <p className="text-gray-500 dark:text-gray-400">Actionable items requiring immediate attention</p>
              </div>
              
              <div className="flex-shrink-0">
                <ShiftHandoverButton anomalies={anomalies} />
              </div>
            </div>

            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-1 border border-gray-200 dark:border-white/10 shadow-sm">
              <TriageTable 
                anomalies={anomalies}
                escalationMap={escalationMap}
                onEscalate={handleEscalate}
                onUndoEscalate={handleUndoEscalate}
              />
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal Component */}
      <SettingsPanel
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        routingConfig={routingConfig}
        onRoutingConfigChange={setRoutingConfig}
        mode={mode}
        onModeChange={setMode}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((p) => !p)}
      />
    </div>
  );
}
