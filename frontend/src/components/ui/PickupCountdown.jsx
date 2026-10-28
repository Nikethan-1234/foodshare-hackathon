import { useState, useEffect } from "react";
import { Clock, AlertTriangle } from "lucide-react";
import { clsx } from "../../utils/clsx";

export function PickupCountdown({ pickupEnd, className = "", showIcon = true }) {
  const calculate = () => {
    if (!pickupEnd) return { text: "—", status: "none", urgent: false };
    const diff = new Date(pickupEnd).getTime() - Date.now();
    if (diff <= 0) return { text: "Expired", status: "expired", urgent: false };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const isUrgent = diff < 30 * 60 * 1000; // under 30 minutes

    let text = "";
    if (hours > 0) {
      text = `${hours}h ${minutes}m left`;
    } else if (minutes > 0) {
      text = `${minutes}m left`;
    } else {
      text = `${seconds}s left`;
    }

    return {
      text,
      status: isUrgent ? "urgent" : "active",
      urgent: isUrgent,
    };
  };

  const [state, setState] = useState(calculate);

  useEffect(() => {
    const interval = setInterval(() => {
      setState(calculate());
    }, 1000);
    return () => clearInterval(interval);
  }, [pickupEnd]);

  if (state.status === "expired") {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-grey-100 text-grey-500 border border-grey-200",
          className
        )}
      >
        {showIcon && <Clock className="h-3 w-3" />}
        Expired
      </span>
    );
  }

  if (state.urgent) {
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-900 border border-amber-300 animate-pulse",
          className
        )}
      >
        {showIcon && <AlertTriangle className="h-3 w-3 text-amber-700" />}
        {state.text}
      </span>
    );
  }

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-800 border border-green-200",
        className
      )}
    >
      {showIcon && <Clock className="h-3 w-3 text-green-700" />}
      {state.text}
    </span>
  );
}
