import { useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info } from "lucide-react";
import { clsx } from "../../utils/clsx";

const ICONS = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
};

const STYLES = {
  success: "bg-green-50 border-green-200 text-green-800",
  error: "bg-red-50 border-red-200 text-red-800",
  info: "bg-sky-50 border-sky-200 text-sky-800",
};

export function Toast({ id, message, type = "info", onDismiss, duration = 4000 }) {
  const Icon = ICONS[type];

  useEffect(() => {
    const t = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(t);
  }, [id, onDismiss, duration]);

  return (
    <div
      className={clsx(
        "flex items-start gap-3 w-full max-w-sm rounded border px-4 py-3 shadow-md",
        STYLES[type]
      )}
      role="alert"
      aria-live="assertive"
    >
      <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <p className="flex-1 text-sm">{message}</p>
      <button
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 -mt-0.5 -mr-1 p-1 rounded hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current"
        aria-label="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss }) {
  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
