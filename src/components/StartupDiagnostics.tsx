import { useState, useEffect } from "react";
import { Capacitor } from "@capacitor/core";

interface DiagnosticLog {
  timestamp: string;
  type: "info" | "error" | "warn";
  message: string;
}

export function StartupDiagnostics() {
  const [logs, setLogs] = useState<DiagnosticLog[]>([]);
  const [visible, setVisible] = useState(true);
  const [hasErrors, setHasErrors] = useState(false);

  useEffect(() => {
    const diagnosticLogs: DiagnosticLog[] = [];

    const addLog = (type: DiagnosticLog["type"], message: string) => {
      const log = {
        timestamp: new Date().toISOString().split("T")[1].split(".")[0],
        type,
        message,
      };
      diagnosticLogs.push(log);
      setLogs([...diagnosticLogs]);
      if (type === "error") setHasErrors(true);
    };

    // Start diagnostics
    addLog("info", "Diagnostics started");
    addLog("info", `Platform: ${Capacitor.getPlatform()}`);
    addLog("info", `Native: ${Capacitor.isNativePlatform()}`);

    // Check window object
    try {
      addLog("info", `Window ready: ${typeof window !== "undefined"}`);
      addLog("info", `Document ready: ${document.readyState}`);
    } catch (e) {
      addLog("error", `Window check failed: ${e}`);
    }

    // Check React root
    try {
      const root = document.getElementById("root");
      addLog("info", `Root element: ${root ? "found" : "missing"}`);
      if (root) {
        addLog("info", `Root children: ${root.childNodes.length}`);
      }
    } catch (e) {
      addLog("error", `Root check failed: ${e}`);
    }

    // Check Supabase env
    try {
      const hasSupabaseUrl = !!import.meta.env.VITE_SUPABASE_URL;
      const hasSupabaseKey = !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      addLog("info", `Supabase URL: ${hasSupabaseUrl ? "set" : "missing"}`);
      addLog("info", `Supabase Key: ${hasSupabaseKey ? "set" : "missing"}`);
    } catch (e) {
      addLog("error", `Env check failed: ${e}`);
    }

    // Capture global errors
    const errorHandler = (event: ErrorEvent) => {
      addLog("error", `Global error: ${event.message}`);
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      addLog("error", `Unhandled rejection: ${event.reason}`);
    };

    window.addEventListener("error", errorHandler);
    window.addEventListener("unhandledrejection", rejectionHandler);

    // Check if app renders within 3 seconds
    const timeout = setTimeout(() => {
      const root = document.getElementById("root");
      const hasContent = root && root.innerHTML.length > 100;
      if (!hasContent) {
        addLog("error", "App did not render within 3s");
      } else {
        addLog("info", "App rendered successfully");
      }
    }, 3000);

    return () => {
      window.removeEventListener("error", errorHandler);
      window.removeEventListener("unhandledrejection", rejectionHandler);
      clearTimeout(timeout);
    };
  }, []);

  // Only show on native or if there are errors
  if (!Capacitor.isNativePlatform() && !hasErrors) {
    return null;
  }

  // Auto-hide after 10s if no errors
  useEffect(() => {
    if (!hasErrors) {
      const timer = setTimeout(() => setVisible(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [hasErrors]);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[99999] max-h-[50vh] overflow-auto bg-black/90 p-3 font-mono text-xs"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 20px)" }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-white font-bold">Startup Diagnostics</span>
        <button
          onClick={() => setVisible(false)}
          className="text-white bg-white/20 px-2 py-1 rounded"
        >
          Close
        </button>
      </div>
      <div className="space-y-1">
        {logs.map((log, i) => (
          <div
            key={i}
            className={`${
              log.type === "error"
                ? "text-red-400"
                : log.type === "warn"
                ? "text-yellow-400"
                : "text-green-400"
            }`}
          >
            [{log.timestamp}] {log.message}
          </div>
        ))}
      </div>
    </div>
  );
}
