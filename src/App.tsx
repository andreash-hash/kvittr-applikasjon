import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { PushNotificationService } from "@/services/pushNotificationService";
import { ToastProvider, setGlobalToast, useToastNotification } from "@/components/CenteredToast";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import ItemDetail from "./pages/ItemDetail";
import Settings from "./pages/Settings";
import Success from "./pages/Success";
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

const App = () => {
  useEffect(() => {
    // Apply saved theme on app load
    const savedTheme = localStorage.getItem('theme') || 'system';
    const root = document.documentElement;
    
    if (savedTheme === 'system') {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', systemPrefersDark);
    } else {
      root.classList.toggle('dark', savedTheme === 'dark');
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      if (localStorage.getItem('theme') === 'system') {
        root.classList.toggle('dark', e.matches);
      }
    };
    mediaQuery.addEventListener('change', handleChange);

    // Register Firebase Cloud Messaging service worker (for web)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/firebase-messaging-sw.js')
        .then((registration) => {
          console.log('Firebase Service Worker registered:', registration);
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Initialize native push notifications on auth state change
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Initialize push notifications when user signs in
        PushNotificationService.initialize();
      } else if (event === 'SIGNED_OUT') {
        // Clean up push token when user signs out
        PushNotificationService.removePushToken();
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <GlobalToastSetup />
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
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
