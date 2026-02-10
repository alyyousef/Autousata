import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, Info, XCircle } from "lucide-react";

const ToastContext = createContext(null);

const getToastStyles = (type) => {
  const baseStyles = "flex items-center gap-3 px-4 py-3 rounded-lg shadow-md border animate-fade-in";
  
  switch (type) {
    case "success":
      return `${baseStyles} bg-emerald-50 border-emerald-200 text-emerald-900`;
    case "error":
      return `${baseStyles} bg-red-50 border-red-200 text-red-900`;
    case "warning":
      return `${baseStyles} bg-amber-50 border-amber-200 text-amber-900`;
    case "info":
    default:
      return `${baseStyles} bg-blue-50 border-blue-200 text-blue-900`;
  }
};

const getIcon = (type) => {
  const iconProps = { className: "w-5 h-5 flex-shrink-0" };
  
  switch (type) {
    case "success":
      return <CheckCircle2 {...iconProps} className="w-5 h-5 flex-shrink-0 text-emerald-600" />;
    case "error":
      return <XCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-red-600" />;
    case "warning":
      return <AlertCircle {...iconProps} className="w-5 h-5 flex-shrink-0 text-amber-600" />;
    case "info":
    default:
      return <Info {...iconProps} className="w-5 h-5 flex-shrink-0 text-blue-600" />;
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
      <div className="fixed top-6 right-6 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={getToastStyles(toast.type)}
            style={{ pointerEvents: "auto" }}
          >
            {getIcon(toast.type)}
            <span className="text-sm font-medium">{toast.message}</span>
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
