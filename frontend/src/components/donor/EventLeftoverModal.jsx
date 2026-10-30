import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../utils/api";
import { Modal } from "../../components/ui/Modal";
import { Input, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { toDateTimeLocal } from "../../utils/format";
import {
  Zap, Clock, MapPin, Package, ShieldCheck, CheckSquare,
  AlertCircle, ShieldAlert
} from "lucide-react";

export function EventLeftoverQuickPostModal({ isOpen, onClose, onCreated }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const isIndividual = profile?.donor_type === "INDIVIDUAL";

  const getDefaults = () => {
    const now = new Date();
    const prepDefault = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
    const pickupStartDefault = new Date(now.getTime() + 15 * 60 * 1000); // +15 mins
    const pickupEndDefault = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3 hours
    const useByDefault = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 hours
    return {
      title: "",
      servings: isIndividual ? "10" : "15",
      cooked_time: toDateTimeLocal(prepDefault),
      address: profile?.address || "",
      pickup_start: toDateTimeLocal(pickupStartDefault),
      pickup_end: toDateTimeLocal(pickupEndDefault),
      use_by: toDateTimeLocal(useByDefault),
    };
  };

  const [form, setForm] = useState(getDefaults());
  const [checklist, setChecklist] = useState({
    covered: true,
    stored_properly: true,
    not_reheated: true,
    packaged_cleanly: true,
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const handleChecklistChange = (key) => {
    setChecklist((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setFieldErrors({});

    // Check handling checklist
    const allChecked = Object.values(checklist).every(Boolean);
    if (!allChecked) {
      setFormError("All 4 food handling safety checkpoints must be verified before posting.");
      return;
    }

    if (!form.address.trim()) {
      setFieldErrors((prev) => ({ ...prev, address: "Pickup address is required." }));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: `Event surplus food donation (${form.servings} servings). Quick-posted after gathering/event.`,
        quantity_total: parseInt(form.servings, 10),
        unit: "servings",
        prepared_at: new Date(form.cooked_time).toISOString(),
        use_by: new Date(form.use_by).toISOString(),
        pickup_start: new Date(form.pickup_start).toISOString(),
        pickup_end: new Date(form.pickup_end).toISOString(),
        pickup_location: form.address.trim(),
        is_event_leftover: true,
        handling_checklist: checklist,
      };

      const res = await api.post("/listings/", payload);
      const listing = res.data.listing;

      if (listing.status === "PENDING_APPROVAL") {
        toast({
          message: "Event leftover posted! Submitted for moderator safety approval.",
          type: "info",
        });
      } else {
        toast({
          message: "Event leftover posted live! Recipients can now request it.",
          type: "success",
        });
      }

      if (onCreated) {
        onCreated(listing);
      }
      onClose();
    } catch (err) {
      const resData = err.response?.data;
      if (resData?.fields) {
        setFieldErrors(resData.fields);
        setFormError("Please fix the highlighted errors.");
      } else {
        setFormError(resData?.error || "Failed to post event leftover. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t("event_leftover_modal_title")}
      size="md"
      footer={
        <div className="flex items-center justify-between w-full">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            {t("btn_cancel")}
          </Button>
          <Button onClick={handleSubmit} isLoading={isSubmitting}>
            <Zap className="h-4 w-4" />
            {t("btn_post_leftover_now")}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
          <Zap className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div>
            <strong>Quick Event Dispatch:</strong> {t("event_leftover_banner")}
          </div>
        </div>

        {formError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
            <div>{formError}</div>
          </div>
        )}

        {/* What */}
        <Input
          label={t("event_what_label")}
          placeholder="e.g. Mixed Rice, Paneer Curry & Naan from reception"
          value={form.title}
          onChange={(e) => handleFieldChange("title", e.target.value)}
          error={fieldErrors.title}
          required
        />

        {/* Servings */}
        <div>
          <Input
            label={t("field_servings")}
            type="number"
            min={isIndividual ? "10" : "1"}
            value={form.servings}
            onChange={(e) => handleFieldChange("servings", e.target.value)}
            error={fieldErrors.quantity_total}
            hint={isIndividual ? "Individual donors require a minimum of 10 servings." : "Number of portions available."}
            required
          />
        </div>

        {/* Cooked Time */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label={t("event_cooked_label")}
            type="datetime-local"
            value={form.cooked_time}
            onChange={(e) => handleFieldChange("cooked_time", e.target.value)}
            error={fieldErrors.prepared_at}
            hint="Must be within 4 hours."
            required
          />
          <Input
            label={t("event_pickup_end_label")}
            type="datetime-local"
            value={form.pickup_end}
            onChange={(e) => handleFieldChange("pickup_end", e.target.value)}
            error={fieldErrors.pickup_end}
            hint="Listing expires at this time."
            required
          />
        </div>

        {/* Address */}
        <Input
          label={t("field_address")}
          placeholder="Hall name, door number, street, landmark"
          value={form.address}
          onChange={(e) => handleFieldChange("address", e.target.value)}
          error={fieldErrors.pickup_location}
          required
        />

        {/* 4-Point Safety Checklist */}
        <div className="p-3 bg-grey-50 rounded border border-grey-200">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-grey-800 mb-2">
            <ShieldCheck className="h-4 w-4 text-green-700" />
            <span>{t("sec_checklist")}</span>
          </div>
          <div className="space-y-1.5 text-xs text-grey-700">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.covered}
                onChange={() => handleChecklistChange("covered")}
                className="h-3.5 w-3.5 text-green-600 rounded border-grey-300 focus:ring-green-600"
              />
              <span>{t("chk_covered")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.stored_properly}
                onChange={() => handleChecklistChange("stored_properly")}
                className="h-3.5 w-3.5 text-green-600 rounded border-grey-300 focus:ring-green-600"
              />
              <span>{t("chk_stored")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.not_reheated}
                onChange={() => handleChecklistChange("not_reheated")}
                className="h-3.5 w-3.5 text-green-600 rounded border-grey-300 focus:ring-green-600"
              />
              <span>{t("chk_not_reheated")}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={checklist.packaged_cleanly}
                onChange={() => handleChecklistChange("packaged_cleanly")}
                className="h-3.5 w-3.5 text-green-600 rounded border-grey-300 focus:ring-green-600"
              />
              <span>{t("chk_packaged")}</span>
            </label>
          </div>
        </div>
      </form>
    </Modal>
  );
}
