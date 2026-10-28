import { Loader2 } from "lucide-react";
import { clsx } from "../../utils/clsx";

const variants = {
  primary: "bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-600 border border-green-700",
  secondary: "bg-white text-grey-700 hover:bg-grey-50 focus-visible:ring-grey-400 border border-grey-300",
  danger: "bg-white text-red-700 hover:bg-red-50 focus-visible:ring-red-400 border border-red-300",
  ghost: "bg-transparent text-grey-600 hover:bg-grey-100 focus-visible:ring-grey-400 border border-transparent",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  type = "button",
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 rounded font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        "min-h-[44px]",
        variants[variant],
        sizes[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </button>
  );
}
