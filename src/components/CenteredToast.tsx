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
      
      {/* Toast Container - Fixed center of screen */}
      <div className="fixed inset-0 pointer-events-none z-[9999] flex items-center justify-center">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={`
                pointer-events-auto
                w-[80%] max-w-[340px]
                px-6 py-5
                rounded-2xl
                shadow-[0_4px_16px_rgba(0,0,0,0.24)]
                flex items-center gap-3
                ${toast.type === 'success' 
                  ? 'bg-[#10B981]' 
                  : 'bg-[#EF4444]'
                }
              `}
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                {toast.type === 'success' ? (
                  <Check className="h-5 w-5 text-white" />
                ) : (
                  <X className="h-5 w-5 text-white" />
                )}
              </div>
              <span className="text-white font-semibold text-base">
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
