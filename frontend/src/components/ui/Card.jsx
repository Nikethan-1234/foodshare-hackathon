import { clsx } from "../../utils/clsx";

export function Card({ children, className = "", padding = true, ...props }) {
  return (
    <div
      className={clsx(
        "bg-white rounded border border-grey-200 shadow-sm",
        padding && "p-4 md:p-6",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "" }) {
  return (
    <div className={clsx("flex items-center justify-between mb-4", className)}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = "" }) {
  return (
    <h2 className={clsx("text-base font-semibold text-grey-900", className)}>
      {children}
    </h2>
  );
}
