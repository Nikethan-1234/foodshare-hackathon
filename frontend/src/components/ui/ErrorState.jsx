import { AlertCircle } from "lucide-react";
import { Button } from "./Button";

export function ErrorState({ title = "Something went wrong", message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
      <h3 className="text-sm font-semibold text-grey-700 mb-1">{title}</h3>
      {message && <p className="text-sm text-grey-500 mb-4 max-w-xs">{message}</p>}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
