import { clsx } from "../../utils/clsx";
import { Zap } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

const STATUS_STYLES = {
  PENDING_APPROVAL: "bg-purple-50 text-purple-800 border-purple-200",
  AVAILABLE: "bg-green-50 text-green-700 border-green-200",
  RESERVED:  "bg-amber-50 text-amber-800 border-amber-200",
  COMPLETED: "bg-sky-50 text-sky-800 border-sky-200",
  EXPIRED:   "bg-grey-100 text-grey-500 border-grey-200",
  REMOVED:   "bg-red-50 text-red-800 border-red-200",
  PENDING:   "bg-amber-50 text-amber-800 border-amber-200",
  ACCEPTED:  "bg-green-50 text-green-700 border-green-200",
  REJECTED:  "bg-red-50 text-red-800 border-red-200",
  CANCELLED: "bg-grey-100 text-grey-500 border-grey-200",
  OPEN:      "bg-red-50 text-red-800 border-red-200",
  REVIEWED:  "bg-amber-50 text-amber-800 border-amber-200",
  RESOLVED:  "bg-sky-50 text-sky-800 border-sky-200",
  DISMISSED: "bg-grey-100 text-grey-500 border-grey-200",
};

const STATUS_DOTS = {
  PENDING_APPROVAL: "bg-purple-600",
  AVAILABLE: "bg-green-600",
  RESERVED:  "bg-amber-600",
  COMPLETED: "bg-sky-600",
  EXPIRED:   "bg-grey-400",
  REMOVED:   "bg-red-600",
  PENDING:   "bg-amber-600",
  ACCEPTED:  "bg-green-600",
  REJECTED:  "bg-red-600",
  CANCELLED: "bg-grey-400",
  OPEN:      "bg-red-600",
  REVIEWED:  "bg-amber-600",
  RESOLVED:  "bg-sky-600",
  DISMISSED: "bg-grey-400",
};

const STATUS_LABELS = {
  PENDING_APPROVAL: "Pending Approval",
  AVAILABLE: "Available",
  RESERVED:  "Reserved",
  COMPLETED: "Completed",
  EXPIRED:   "Expired",
  REMOVED:   "Removed",
  PENDING:   "Pending",
  ACCEPTED:  "Accepted",
  REJECTED:  "Rejected",
  CANCELLED: "Cancelled",
  OPEN:      "Open",
  REVIEWED:  "Reviewed",
  RESOLVED:  "Resolved",
  DISMISSED: "Dismissed",
};

export function StatusBadge({ status, className = "", showDot = true }) {
  const { t } = useLanguage();
  const style = STATUS_STYLES[status] || "bg-grey-100 text-grey-500 border-grey-200";
  const dot = STATUS_DOTS[status] || "bg-grey-400";

  const keyMap = {
    PENDING_APPROVAL: "status_pending_approval",
    AVAILABLE: "status_available",
    RESERVED: "status_reserved",
    COMPLETED: "status_completed",
    EXPIRED: "status_expired",
    REMOVED: "status_removed",
    PENDING: "status_pending",
    ACCEPTED: "status_accepted",
    REJECTED: "status_rejected",
    CANCELLED: "status_cancelled",
  };

  const label = keyMap[status] ? t(keyMap[status]) : (STATUS_LABELS[status] || status);

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border",
        style,
        className
      )}
    >
      {showDot && <span className={clsx("h-1.5 w-1.5 rounded-full flex-shrink-0", dot)} aria-hidden="true" />}
      {label}
    </span>
  );
}

export function RoleBadge({ role, className = "" }) {
  const styles = {
    donor: "bg-green-50 text-green-700 border-green-200",
    recipient: "bg-sky-50 text-sky-800 border-sky-200",
    admin: "bg-purple-50 text-purple-800 border-purple-200",
  };
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border capitalize", styles[role] || "bg-grey-100 text-grey-500", className)}>
      {role}
    </span>
  );
}

const DONOR_TYPE_STYLES = {
  RESTAURANT: "bg-orange-50 text-orange-800 border-orange-200",
  INSTITUTION: "bg-sky-50 text-sky-800 border-sky-200",
  INDIVIDUAL: "bg-purple-50 text-purple-700 border-purple-200",
};

const DONOR_TYPE_LABELS = {
  RESTAURANT: "Restaurant / Caterer",
  INSTITUTION: "Institution",
  INDIVIDUAL: "Individual",
};

export function DonorTypeBadge({ donorType, className = "" }) {
  const { t } = useLanguage();
  if (!donorType) return null;
  const style = DONOR_TYPE_STYLES[donorType] || "bg-grey-100 text-grey-500 border-grey-200";
  const labelMap = {
    RESTAURANT: t("donor_type_restaurant"),
    INSTITUTION: t("donor_type_institution"),
    INDIVIDUAL: t("donor_type_individual"),
  };
  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        style,
        className
      )}
    >
      {labelMap[donorType] || DONOR_TYPE_LABELS[donorType] || donorType}
    </span>
  );
}

export function EventLeftoverBadge({ className = "" }) {
  const { t } = useLanguage();
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border bg-amber-50 text-amber-900 border-amber-300",
        className
      )}
    >
      <Zap className="h-3 w-3 text-amber-600 flex-shrink-0" />
      {t("btn_event_leftover")}
    </span>
  );
}

export function FoodCategoryBadge({ foodType, className = "" }) {
  const { t } = useLanguage();
  const isVeg = foodType === "VEG";
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold border",
        isVeg
          ? "bg-green-50 text-green-800 border-green-300"
          : "bg-red-50 text-red-800 border-red-300",
        className
      )}
      title={isVeg ? t("food_veg") : t("food_non_veg")}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", isVeg ? "bg-green-600" : "bg-red-600")} />
      {isVeg ? t("food_veg") : t("food_non_veg")}
    </span>
  );
}

export function PrepStateBadge({ prepState, className = "" }) {
  const { t } = useLanguage();
  const isCooked = prepState === "COOKED";
  return (
    <span
      className={clsx(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border",
        isCooked
          ? "bg-amber-50 text-amber-800 border-amber-200"
          : "bg-blue-50 text-blue-800 border-blue-200",
        className
      )}
    >
      {isCooked ? t("food_cooked") : t("food_packaged")}
    </span>
  );
}
