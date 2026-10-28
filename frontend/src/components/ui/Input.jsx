import { clsx } from "../../utils/clsx";

export function Input({
  label,
  error,
  hint,
  id,
  className = "",
  required = false,
  ...props
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-grey-700">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={clsx(
          "w-full rounded border px-3 py-2 text-sm text-grey-900 placeholder-grey-400",
          "focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600",
          "disabled:bg-grey-100 disabled:cursor-not-allowed",
          "min-h-[44px]",
          error ? "border-red-400 bg-red-50" : "border-grey-300 bg-white",
          className
        )}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-grey-500">{hint}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}

export function Textarea({ label, error, hint, id, className = "", required = false, ...props }) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-grey-700">
          {label}
          {required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        className={clsx(
          "w-full rounded border px-3 py-2 text-sm text-grey-900 placeholder-grey-400",
          "focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600",
          "disabled:bg-grey-100 disabled:cursor-not-allowed resize-y min-h-[88px]",
          error ? "border-red-400 bg-red-50" : "border-grey-300 bg-white",
          className
        )}
        aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
        aria-invalid={!!error}
        {...props}
      />
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-grey-500">{hint}</p>
      )}
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">{error}</p>
      )}
    </div>
  );
}
