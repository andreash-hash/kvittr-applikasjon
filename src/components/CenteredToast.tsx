import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface ToastData {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextType {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const useToastNotification = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToastNotification must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 2 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Container - Fixed top with safe area offset */}
      <div 
        className="fixed left-0 right-0 pointer-events-none z-[9999] flex justify-center px-4"
        style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                pointer-events-auto
                w-full max-w-sm
                px-5 py-4
                rounded-xl
                shadow-lg
                flex items-center gap-3
                ${toast.type === 'success' 
                  ? 'bg-[#22c55e]' 
                  : 'bg-[#fecaca]'
                }
              `}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                toast.type === 'success' ? 'bg-white/20' : 'bg-[#991b1b]/20'
              }`}>
                {toast.type === 'success' ? (
                  <Check className="h-4 w-4 text-white" />
                ) : (
                  <X className="h-4 w-4 text-[#991b1b]" />
                )}
              </div>
              <span className={`font-medium text-[15px] flex-1 ${
                toast.type === 'success' ? 'text-white' : 'text-[#991b1b]'
              }`}>
                {toast.message}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

// Standalone toast function for use outside of React components
let globalShowToast: ((message: string, type: 'success' | 'error') => void) | null = null;

export const setGlobalToast = (fn: (message: string, type: 'success' | 'error') => void) => {
  globalShowToast = fn;
};

export const centeredToast = {
  success: (message: string) => globalShowToast?.(message, 'success'),
  error: (message: string) => globalShowToast?.(message, 'error'),
};
