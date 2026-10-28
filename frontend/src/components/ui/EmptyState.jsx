import { PackageOpen } from "lucide-react";

export function EmptyState({ icon: Icon = PackageOpen, title = "Nothing here yet", message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Icon className="h-10 w-10 text-grey-300 mb-3" />
      <h3 className="text-sm font-semibold text-grey-700 mb-1">{title}</h3>
      {message && <p className="text-sm text-grey-500 mb-4 max-w-xs">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
