import { ChevronDown } from "lucide-react";
import { clsx } from "../../utils/clsx";

export function Select({ label, error, hint, id, options = [], placeholder, className = "", required = false, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-grey-700">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
        <select
          id={inputId}
          className={clsx(
            "w-full appearance-none rounded border px-3 py-2 text-sm text-grey-900",
            "focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600",
            "disabled:bg-grey-100 disabled:cursor-not-allowed",
            "min-h-[44px] pr-8",
            error ? "border-red-400 bg-red-50" : "border-grey-300 bg-white",
            className
          )}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-grey-400" />
      </div>
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-grey-500">{hint}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
