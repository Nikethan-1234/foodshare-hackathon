import { useState, useEffect } from "react";
import { Utensils, HeartHandshake, Building2, Package, Sparkles } from "lucide-react";
import api from "../../utils/api";
import { clsx } from "../../utils/clsx";

export function ImpactCounter({ className = "", compact = false }) {
  const [impact, setImpact] = useState({
    meals_redistributed: 0,
    portions_available: 0,
    total_donors: 0,
    total_recipients: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/impact")
      .then((res) => {
        if (isMounted && res.data) {
          setImpact(res.data);
        }
      })
      .catch(() => {
        // Fallback to initial zeros if network or server unavailable
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = [
    {
      label: "Meals Redistributed",
      value: impact.meals_redistributed,
      unit: "portions rescued",
      icon: Utensils,
      color: "text-green-700 bg-green-50 border-green-200",
    },
    {
      label: "Surplus Available",
      value: impact.portions_available,
      unit: "portions ready now",
      icon: Package,
      color: "text-amber-700 bg-amber-50 border-amber-200",
    },
    {
      label: "Food Donors",
      value: impact.total_donors,
      unit: "partner kitchens",
      icon: Building2,
      color: "text-grey-700 bg-grey-50 border-grey-200",
    },
    {
      label: "Charity Partners",
      value: impact.total_recipients,
      unit: "active shelters",
      icon: HeartHandshake,
      color: "text-grey-700 bg-grey-50 border-grey-200",
    },
  ];

  if (compact) {
    return (
      <div className={clsx("grid grid-cols-2 gap-2 text-left", className)}>
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="p-2.5 rounded bg-white border border-grey-200 flex items-center gap-2.5"
            >
              <div className={clsx("p-1.5 rounded border flex-shrink-0", s.color)}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-base font-bold text-grey-900 leading-tight">
                  {isLoading ? "…" : s.value.toLocaleString()}
                </div>
                <div className="text-[11px] text-grey-500 truncate">{s.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className={clsx("bg-white rounded border border-grey-200 shadow-sm p-4", className)}>
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-grey-100">
        <div className="flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-green-700" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-grey-700">
            Community Food Impact
          </h3>
        </div>
        <span className="text-[11px] text-grey-400 font-medium">Live platform metrics</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="p-3 rounded bg-grey-50 border border-grey-200 flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-medium text-grey-600 truncate">{s.label}</span>
                <div className={clsx("p-1 rounded border flex-shrink-0", s.color)}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
              </div>
              <div>
                <div className="text-xl md:text-2xl font-bold text-grey-900">
                  {isLoading ? "…" : s.value.toLocaleString()}
                </div>
                <div className="text-[10px] text-grey-400 mt-0.5">{s.unit}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
