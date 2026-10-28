import { useEffect } from "react";
import { X } from "lucide-react";
import { clsx } from "../../utils/clsx";

export function Modal({ isOpen, onClose, title, children, footer, size = "md" }) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-2xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-grey-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Panel */}
      <div
        className={clsx(
          "relative w-full sm:rounded bg-white shadow-md",
          "flex flex-col max-h-[90vh] sm:max-h-[85vh]",
          sizes[size]
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-grey-200">
          <h2 id="modal-title" className="text-base font-semibold text-grey-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-grey-400 hover:text-grey-600 hover:bg-grey-100 min-touch focus:outline-none focus:ring-2 focus:ring-green-600"
            aria-label="Close modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-grey-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
