import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ToastProvider, setGlobalToast, useToastNotification } from "@/components/CenteredToast";
import { useNativePushNotifications } from "@/hooks/useNativePushNotifications";
import { Capacitor } from "@capacitor/core";
import { initializeRevenueCat, syncSubscriptionStatus } from "@/lib/revenuecat";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
import { StartupDiagnostics } from "@/components/StartupDiagnostics";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import ItemDetail from "./pages/ItemDetail";
import Settings from "./pages/Settings";
import Success from "./pages/Success";
import Premium from "./pages/Premium";
import IconGenerator from "./pages/IconGenerator";
import ResetPassword from "./pages/ResetPassword";
import VerifySuccess from "./pages/VerifySuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to set up global toast
const GlobalToastSetup = () => {
  const { showToast } = useToastNotification();

  useEffect(() => {
    setGlobalToast(showToast);
  }, [showToast]);

  return null;
};

// Component to initialize native push notifications
const NativePushSetup = () => {
  useNativePushNotifications();
  return null;
};

// Component to initialize RevenueCat
const RevenueCatSetup = () => {
  useEffect(() => {
    const initRC = async () => {
      try {
        if (!Capacitor.isNativePlatform()) return;

        const {
          data: { session },
        } = await supabase.auth.getSession();
        await initializeRevenueCat(session?.user?.id);
      } catch (error) {
        console.error("RevenueCat setup error:", error);
      }
    };

    initRC();

    // Sync on app resume
    const handleResume = async () => {
      try {
        if (Capacitor.isNativePlatform()) {
          const {
            data: { session },
          } = await supabase.auth.getSession();
          if (session?.user?.id) {
            await syncSubscriptionStatus(session.user.id);
          }
        }
      } catch (error) {
        console.error("RevenueCat resume sync error:", error);
      }
    };

    document.addEventListener("resume", handleResume);
    return () => document.removeEventListener("resume", handleResume);
  }, []);

  return null;
};

const App = () => {
  useEffect(() => {
    try {
      // Apply saved theme on app load
      const savedTheme = localStorage.getItem("theme") || "system";
      const root = document.documentElement;

      if (savedTheme === "system") {
        const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", systemPrefersDark);
      } else {
        root.classList.toggle("dark", savedTheme === "dark");
      }

      // Disable automatic scroll restoration to prevent jump to top
      if ("scrollRestoration" in history) {
        history.scrollRestoration = "manual";
      }

      // Listen for system theme changes
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        if (localStorage.getItem("theme") === "system") {
          root.classList.toggle("dark", e.matches);
        }
      };
      mediaQuery.addEventListener("change", handleChange);

      // Register Firebase Cloud Messaging service worker (for web only, not native)
      if ("serviceWorker" in navigator && !Capacitor.isNativePlatform()) {
        navigator.serviceWorker
          .register("/firebase-messaging-sw.js")
          .then((registration) => {
            console.log("Firebase Service Worker registered:", registration);
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error);
          });
      }

      return () => {
        mediaQuery.removeEventListener("change", handleChange);
      };
    } catch (error) {
      console.error("App initialization error:", error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AppErrorBoundary>
        <StartupDiagnostics />
        <ToastProvider>
          <GlobalToastSetup />
          <NativePushSetup />
          <RevenueCatSetup />
          <TooltipProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/scan" element={<Scan />} />
                <Route path="/item/:id" element={<ItemDetail />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/success" element={<Success />} />
                <Route path="/premium" element={<Premium />} />
                <Route path="/icon-generator" element={<IconGenerator />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-success" element={<VerifySuccess />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </ToastProvider>
      </AppErrorBoundary>
    </QueryClientProvider>
  );
};

export default App;

