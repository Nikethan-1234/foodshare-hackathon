import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { useLanguage } from "../../context/LanguageContext";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { toDateTimeLocal } from "../../utils/format";
import {
  ArrowLeft, Clock, MapPin, Package, ShieldAlert, Sparkles,
  Camera, CheckCircle2, ShieldCheck, Phone, AlertCircle, CheckSquare
} from "lucide-react";

const UNIT_OPTIONS = [
  { value: "servings", label: "Servings / Portions" },
  { value: "boxes", label: "Boxes / Containers" },
  { value: "trays", label: "Trays" },
  { value: "sandwiches", label: "Sandwiches" },
  { value: "loaves", label: "Loaves" },
  { value: "kg", label: "Kilograms (kg)" },
];

export default function NewListingPage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAuth();
  const { toast } = useToast();
  const { t } = useLanguage();

  const isIndividual = profile?.donor_type === "INDIVIDUAL";

  const now = new Date();
  const prepDefault = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const pickupStartDefault = new Date(now.getTime() + 30 * 60 * 1000); // +30 mins
  const pickupEndDefault = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3 hours
  const useByDefault = new Date(now.getTime() + 6 * 60 * 60 * 1000); // +6 hours

  const [form, setForm] = useState({
    title: "",
    description: "",
    quantity_total: isIndividual ? "10" : "",
    unit: "servings",
    pickup_location: profile?.address || "",
    prepared_at: toDateTimeLocal(prepDefault),
    use_by: toDateTimeLocal(useByDefault),
    pickup_start: toDateTimeLocal(pickupStartDefault),
    pickup_end: toDateTimeLocal(pickupEndDefault),
    category_food_type: "VEG",
    category_prep_state: "COOKED",
    allergen_notes: "",
    image_url: "",
  });

  // Phase 2: Handling checklist (all 4 required)
  const [checklist, setChecklist] = useState({
    covered: false,
    stored_properly: false,
    not_reheated: false,
    packaged_cleanly: false,
  });

  // Phase 2: Phone OTP verification state
  const [otpInput, setOtpInput] = useState("");
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentNotice, setOtpSentNotice] = useState("");

  useEffect(() => {
    if (profile?.address && !form.pickup_location) {
      setForm((prev) => ({ ...prev, pickup_location: profile.address }));
    }
  }, [profile]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiDetectedInfo, setAiDetectedInfo] = useState(null);

  const handleSendOtp = async () => {
    setIsSendingOtp(true);
    setOtpSentNotice("");
    try {
      const res = await api.post("/users/phone/send-otp");
      setOtpSentNotice(res.data.message || "Demo OTP: 123456");
      setOtpInput("123456"); // Pre-populate demo code for smooth testing
      toast({ message: "Demo OTP code generated: 123456", type: "success" });
    } catch (err) {
      toast({ message: err.response?.data?.error || "Failed to send OTP.", type: "error" });
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      toast({ message: "Please enter the OTP code.", type: "error" });
      return;
    }
    setIsVerifyingOtp(true);
    try {
      const res = await api.post("/users/phone/verify-otp", { otp: otpInput.trim() });
      if (res.data.profile) {
        updateProfile(res.data.profile);
      }
      toast({ message: "Phone number verified successfully (Demo)!", type: "success" });
      setOtpSentNotice("");
    } catch (err) {
      toast({ message: err.response?.data?.error || "Invalid OTP code.", type: "error" });
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleChecklistChange = (key) => (e) => {
    const checked = e.target.checked;
    setChecklist((prev) => ({ ...prev, [key]: checked }));
    if (errors.handling_checklist) {
      setErrors((prev) => ({ ...prev, handling_checklist: null }));
    }
  };

  const handleAiScan = async (presetKey, file = null) => {
    setIsAiScanning(true);
    try {
      const res = await api.post("/ai/scan", {
        preset: presetKey,
        filename: file?.name || presetKey,
        notes: form.description || form.title,
      });
      const d = res.data.draft;
      setAiDetectedInfo(d);
      setForm((prev) => ({
        ...prev,
        title: d.title || prev.title,
        description: d.description || prev.description,
        quantity_total: String(d.quantity_total || prev.quantity_total),
        unit: d.unit || prev.unit,
        prepared_at: d.suggested_times?.prepared_at ? toDateTimeLocal(d.suggested_times.prepared_at) : prev.prepared_at,
        use_by: d.suggested_times?.use_by ? toDateTimeLocal(d.suggested_times.use_by) : prev.use_by,
        pickup_start: d.suggested_times?.pickup_start ? toDateTimeLocal(d.suggested_times.pickup_start) : prev.pickup_start,
        pickup_end: d.suggested_times?.pickup_end ? toDateTimeLocal(d.suggested_times.pickup_end) : prev.pickup_end,
      }));
      toast({ message: "AI Food Scan complete! Form populated with portion & safety estimates.", type: "success" });
    } catch (err) {
      toast({ message: "AI scan failed. Please complete the form manually.", type: "error" });
    } finally {
      setIsAiScanning(false);
    }
  };

  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size <= 5MB
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Photo exceeds 5MB size limit. Please choose a smaller image.");
      return;
    }

    // Check extension
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setPhotoError("Invalid image type. Please select JPEG, PNG, or WEBP.");
      return;
    }

    setPhotoError("");
    setIsPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const res = await api.post("/listings/upload-photo", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setForm((prev) => ({ ...prev, image_url: res.data.image_url }));
      toast({ message: "Photo uploaded successfully!", type: "success" });
      handleAiScan(null, file);
    } catch (err) {
      setPhotoError(err.response?.data?.error || "Failed to upload photo.");
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = "Listing title is required.";

    const qty = Number(form.quantity_total);
    if (!form.quantity_total || qty <= 0) {
      errs.quantity_total = "Quantity must be greater than 0.";
    } else if (isIndividual && qty < 10) {
      errs.quantity_total = "Individual donors must list a minimum of 10 servings to ensure bulk redistribution efficiency.";
    }

    if (!form.pickup_location.trim()) {
      errs.pickup_location = "Pickup location is required.";
    }
    if (!form.prepared_at) errs.prepared_at = "Preparation time is required.";
    if (!form.use_by) errs.use_by = "Use-by time is required.";
    if (!form.pickup_start) errs.pickup_start = "Pickup start time is required.";
    if (!form.pickup_end) errs.pickup_end = "Pickup end time is required.";

    // Phase 2: Cooked food time limit (within 4 hours of prepared_at)
    if (form.prepared_at) {
      const prepDate = new Date(form.prepared_at);
      const hoursSincePrep = (Date.now() - prepDate.getTime()) / (1000 * 60 * 60);
      if (hoursSincePrep > 4) {
        errs.prepared_at = `Cooked food must be listed within 4 hours of preparation for food safety (prepared ${Math.round(hoursSincePrep * 10) / 10} hours ago).`;
      }
    }

    if (form.prepared_at && form.use_by && new Date(form.prepared_at) > new Date(form.use_by)) {
      errs.use_by = "Use-by time cannot be earlier than preparation time.";
    }

    if (form.pickup_start && form.pickup_end) {
      if (new Date(form.pickup_start) >= new Date(form.pickup_end)) {
        errs.pickup_end = "Pickup end time must be after pickup start time.";
      }
    }

    if (form.pickup_end && form.use_by) {
      if (new Date(form.pickup_end) > new Date(form.use_by)) {
        errs.pickup_end = "Pickup window cannot end after the food use-by time.";
      }
    }

    // Phase 2: Check all 4 safety checklist items
    if (!checklist.covered || !checklist.stored_properly || !checklist.not_reheated || !checklist.packaged_cleanly) {
      errs.handling_checklist = "All 4 food handling safety checklist boxes must be confirmed before posting.";
    }

    // Phase 2: Phone verification check for individuals
    if (isIndividual && !profile?.phone_verified) {
      errs.phone_verification = "Phone verification is required before individual donors can post listings.";
    }

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast({ message: "Please correct the safety and form validation errors.", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...form,
        quantity_total: parseInt(form.quantity_total, 10),
        prepared_at: new Date(form.prepared_at).toISOString(),
        use_by: new Date(form.use_by).toISOString(),
        pickup_start: new Date(form.pickup_start).toISOString(),
        pickup_end: new Date(form.pickup_end).toISOString(),
        allergens: aiDetectedInfo?.allergens || undefined,
        dietary_tags: aiDetectedInfo?.dietary_tags || undefined,
        handling_checklist: checklist,
        is_covered: checklist.covered,
        is_stored_properly: checklist.stored_properly,
        is_not_reheated: checklist.not_reheated,
        is_packaged_cleanly: checklist.packaged_cleanly,
      };

      const res = await api.post("/listings/", payload);
      const isPending = res.data.listing?.status === "PENDING_APPROVAL";
      toast({
        message: isPending
          ? "Listing submitted! Sent to platform moderators for safety review."
          : "Listing published successfully!",
        type: "success",
      });
      navigate("/donor/listings");
    } catch (err) {
      const res = err.response?.data;
      if (res?.fields) {
        setErrors(res.fields);
        toast({ message: "Validation error. Please review the highlighted fields.", type: "error" });
      } else {
        toast({ message: res?.error || "Failed to create listing.", type: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-4">
        <Link
          to="/donor/listings"
          className="inline-flex items-center gap-1.5 text-xs text-grey-500 hover:text-grey-900 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to My Listings
        </Link>
        <h1 className="text-xl font-semibold text-grey-900">List Surplus Food</h1>
        <p className="text-sm text-grey-500">
          Make surplus food available safely to certified recipient organizations.
        </p>
      </div>

      {/* Safety Notice Banner */}
      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
        <div>
          <strong>Food Safety & Quality Notice:</strong> FoodShare is not a food safety certifier.
          Ensure food was prepared cleanly, packaged in food-grade covered containers, and kept within safe temperature guidelines.
        </div>
      </div>

      {/* Phase 2: Individual Donor Phone Verification Card */}
      {isIndividual && !profile?.phone_verified && (
        <Card className="mb-4 border-amber-300 bg-amber-50/40">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded bg-amber-100 text-amber-800 mt-0.5">
              <Phone className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-grey-900">
                Phone Verification Required (Demo)
              </h3>
              <p className="text-xs text-grey-600 mt-0.5">
                To build trust and safety for community charities, individual donors must verify their phone number before listing food.
              </p>
              {profile?.phone && (
                <p className="text-xs font-mono text-grey-500 mt-1">
                  Registered number: <strong>{profile.phone}</strong>
                </p>
              )}

              {otpSentNotice && (
                <div className="mt-2 p-2 rounded bg-green-50 border border-green-200 text-xs text-green-800 font-medium">
                  {otpSentNotice}
                </div>
              )}

              {errors.phone_verification && (
                <div className="mt-2 text-xs text-red-600 font-medium">
                  {errors.phone_verification}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleSendOtp}
                  isLoading={isSendingOtp}
                >
                  Send Demo OTP
                </Button>

                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    placeholder="Enter code (123456)"
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    className="text-xs px-2.5 py-1.5 rounded border border-grey-300 w-36 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerifyOtp}
                    isLoading={isVerifyingOtp}
                  >
                    Verify Phone
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Phase 2: Trust Level Badge for Individuals */}
      {isIndividual && profile?.phone_verified && (
        <div className="mb-4 p-2.5 bg-purple-50 border border-purple-200 rounded text-xs text-purple-900 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-purple-600 flex-shrink-0" />
          <span>
            <strong>Individual Donor Trust Status:</strong> Phone verified. First-time listings undergo admin moderation review; after 3 completed donations, listings become auto-approved.
          </span>
        </div>
      )}

      {/* AI Food Vision & Auto-Drafting Hub */}
      <Card className="mb-4 bg-gradient-to-r from-green-50/40 via-white to-green-50/20 border-green-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-grey-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-green-100 text-green-800">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-grey-900">AI Multimodal Food Scanner & Quick Presets</h2>
              <p className="text-xs text-grey-500">Scan food surplus to auto-fill description, portions, allergens, and safe times.</p>
            </div>
          </div>
          <label className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded border border-green-700 bg-green-600 text-white text-xs font-medium cursor-pointer hover:bg-green-700 transition-colors">
            <Camera className="h-3.5 w-3.5" />
            <span>{isPhotoUploading ? "Uploading Photo..." : "Upload Photo (Max 5MB)"}</span>
            <input
              type="file"
              accept="image/png, image/jpeg, image/webp"
              className="hidden"
              onChange={handleFileUpload}
              disabled={isPhotoUploading}
            />
          </label>
        </div>

        {photoError && (
          <div className="mb-2 p-2 bg-red-50 border border-red-200 text-xs text-red-700 rounded flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{photoError}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-grey-500 self-center mr-1">Try quick demo presets:</span>
          {[
            { key: "curry_rice", label: "Curry & Rice Platter" },
            { key: "sandwich_tray", label: "Mixed Sandwich Tray" },
            { key: "bakery_loaves", label: "Bakery Sourdough & Pastry" },
            { key: "salad_produce", label: "Fresh Garden Salads" },
          ].map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => handleAiScan(preset.key)}
              disabled={isAiScanning}
              className="px-2.5 py-1 text-xs rounded bg-white border border-grey-300 text-grey-700 hover:border-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Section 1: Item Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-grey-900 uppercase tracking-wide">{t("sec_food_details")}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <Input
                label={t("field_title")}
                value={form.title}
                onChange={handleChange("title")}
                error={errors.title}
                placeholder="e.g. Function Leftovers — Chicken Biryani (25 portions)"
                hint="Be specific: name the dishes, portions, and packaging type."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={`${t("field_servings")} ${isIndividual ? "(Min 10)" : ""}`}
                  type="number"
                  min={isIndividual ? "10" : "1"}
                  step="1"
                  value={form.quantity_total}
                  onChange={handleChange("quantity_total")}
                  error={errors.quantity_total}
                  placeholder={isIndividual ? "e.g. 15 (min 10)" : "e.g. 40"}
                  hint={isIndividual ? "Minimum 10 servings required for individual donors." : undefined}
                  required
                />
                <Select
                  label={t("field_unit")}
                  value={form.unit}
                  onChange={handleChange("unit")}
                  options={UNIT_OPTIONS}
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Select
                  label="Dietary Category"
                  value={form.category_food_type}
                  onChange={handleChange("category_food_type")}
                  options={[
                    { value: "VEG", label: `🟢 ${t("food_veg")}` },
                    { value: "NON_VEG", label: `🔴 ${t("food_non_veg")}` },
                  ]}
                  required
                />
                <Select
                  label="Preparation State"
                  value={form.category_prep_state}
                  onChange={handleChange("category_prep_state")}
                  options={[
                    { value: "COOKED", label: `🍲 ${t("food_cooked")}` },
                    { value: "PACKAGED", label: `📦 ${t("food_packaged")}` },
                  ]}
                  required
                />
              </div>

              <Input
                label={t("field_allergen_notes")}
                value={form.allergen_notes}
                onChange={handleChange("allergen_notes")}
                placeholder="e.g. Contains nuts, dairy, mustard seeds, or gluten"
                hint="Specify any known food allergens for recipient safety."
              />

              {form.image_url && (
                <div className="flex items-center gap-3 p-2 bg-grey-50 border border-grey-200 rounded">
                  <img
                    src={form.image_url}
                    alt="Listing Preview"
                    className="h-16 w-16 object-cover rounded border border-grey-200"
                  />
                  <div className="text-xs text-grey-600">
                    <p className="font-medium text-grey-800">Photo Attached</p>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, image_url: "" }))}
                      className="text-red-600 hover:underline mt-1"
                    >
                      Remove photo
                    </button>
                  </div>
                </div>
              )}

              <Textarea
                label={t("field_description")}
                value={form.description}
                onChange={handleChange("description")}
                error={errors.description}
                placeholder="List ingredients, dietary labels (Vegetarian, Halal, Vegan), or packaging specifics."
                hint="Mention if recipient must bring their own containers or carriers."
              />
            </div>
          </div>

          {/* Section 2: Preparation & Safe Freshness Times */}
          <div className="border-t border-grey-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-grey-900 uppercase tracking-wide">{t("sec_prep_freshness")}</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label={`${t("field_cooked_time")} (Must be within 4 hours)`}
                type="datetime-local"
                value={form.prepared_at}
                onChange={handleChange("prepared_at")}
                error={errors.prepared_at}
                hint="Cooked food must be listed within 4 hours of preparation."
                required
              />
              <Input
                label={t("field_use_by")}
                type="datetime-local"
                value={form.use_by}
                onChange={handleChange("use_by")}
                error={errors.use_by}
                hint="Latest time food can safely be consumed."
                required
              />
            </div>
          </div>

          {/* Section 3: Pickup Location */}
          <div className="border-t border-grey-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-grey-900 uppercase tracking-wide">{t("sec_pickup_window")}</h2>
            </div>
            <div className="flex flex-col gap-3">
              <Input
                label={t("field_address")}
                value={form.pickup_location}
                onChange={handleChange("pickup_location")}
                error={errors.pickup_location}
                placeholder="e.g. 33 Birch Close — front door, ring bell"
                hint="Provide clear directions for the charity driver."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label={t("field_pickup_start")}
                  type="datetime-local"
                  value={form.pickup_start}
                  onChange={handleChange("pickup_start")}
                  error={errors.pickup_start}
                  required
                />
                <Input
                  label={t("field_pickup_end")}
                  type="datetime-local"
                  value={form.pickup_end}
                  onChange={handleChange("pickup_end")}
                  error={errors.pickup_end}
                  hint="Must be before or at food use-by date."
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 4: Phase 2 Required Handling Checklist */}
          <div className="border-t border-grey-200 pt-4">
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-grey-900 uppercase tracking-wide">
                {t("sec_checklist")}
              </h2>
            </div>
            <p className="text-xs text-grey-500 mb-3">
              {t("checklist_desc")}
            </p>

            {errors.handling_checklist && (
              <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{errors.handling_checklist}</span>
              </div>
            )}

            <div className="flex flex-col gap-2.5 bg-grey-50 p-3.5 rounded border border-grey-200 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.covered}
                  onChange={handleChecklistChange("covered")}
                  className="mt-0.5 h-4 w-4 rounded border-grey-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-grey-800">
                  {t("chk_covered")}
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.stored_properly}
                  onChange={handleChecklistChange("stored_properly")}
                  className="mt-0.5 h-4 w-4 rounded border-grey-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-grey-800">
                  {t("chk_stored")}
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.not_reheated}
                  onChange={handleChecklistChange("not_reheated")}
                  className="mt-0.5 h-4 w-4 rounded border-grey-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-grey-800">
                  {t("chk_not_reheated")}
                </span>
              </label>

              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checklist.packaged_cleanly}
                  onChange={handleChecklistChange("packaged_cleanly")}
                  className="mt-0.5 h-4 w-4 rounded border-grey-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-grey-800">
                  {t("chk_packaged")}
                </span>
              </label>
            </div>
          </div>

          <div className="border-t border-grey-200 pt-4 flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate("/donor/listings")}
            >
              {t("btn_cancel")}
            </Button>
            <Button
              type="submit"
              isLoading={isSubmitting}
              disabled={isIndividual && !profile?.phone_verified}
            >
              {t("btn_publish_listing")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
