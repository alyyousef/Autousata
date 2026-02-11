import React, { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext(null);

const getToastStyles = (type) => {
  const baseStyles = "px-4 py-3 rounded-2xl shadow-lg border text-sm font-bold animate-fade-in";

  switch (type) {
    case "success":
      return `${baseStyles} bg-emerald-50 border-emerald-200 text-emerald-700`;
    case "error":
      return `${baseStyles} bg-rose-50 border-rose-200 text-rose-700`;
    case "warning":
      return `${baseStyles} bg-amber-50 border-amber-200 text-amber-700`;
    case "info":
    default:
      return `${baseStyles} bg-slate-50 border-slate-200 text-slate-700`;
  }
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Toast Container */}
      <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={getToastStyles(toast.type)}
            style={{ pointerEvents: "auto" }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
};
