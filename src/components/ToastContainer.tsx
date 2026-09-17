import React from 'react';
import { useStore } from '../store/useStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            id={`toast-${toast.id}`}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-2xl backdrop-blur-md border transition-all duration-300 animate-in slide-in-from-bottom-3 ${
              isError
                ? 'bg-stone-900/95 border-rose-800/60 text-stone-100 shadow-rose-950/20'
                : isSuccess
                ? 'bg-stone-900/95 border-emerald-800/60 text-stone-100 shadow-emerald-950/20'
                : 'bg-stone-900/95 border-stone-700/80 text-stone-100 shadow-black/40'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isError && <AlertCircle className="w-5 h-5 text-rose-400" />}
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
              {!isError && !isSuccess && <Info className="w-5 h-5 text-amber-400" />}
            </div>

            <div className="flex-1 text-sm">
              <p className="font-bold text-stone-100">{toast.title}</p>
              {toast.description && (
                <p className="text-xs text-stone-400 mt-0.5">{toast.description}</p>
              )}
            </div>

            <button
              id={`close-toast-${toast.id}`}
              onClick={() => removeToast(toast.id)}
              className="text-stone-400 hover:text-stone-200 transition-colors p-1 -mr-1"
              aria-label="إغلاق التنبيه"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
