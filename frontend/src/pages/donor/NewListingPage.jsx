import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { toDateTimeLocal } from "../../utils/format";
import { ArrowLeft, Clock, MapPin, Package, ShieldAlert, Sparkles, Camera, CheckCircle2 } from "lucide-react";

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
  const { profile } = useAuth();
  const { toast } = useToast();

  const now = new Date();
  const prepDefault = new Date(now.getTime() - 60 * 60 * 1000); // 1 hour ago
  const pickupStartDefault = new Date(now.getTime() + 60 * 60 * 1000); // +1 hour
  const pickupEndDefault = new Date(now.getTime() + 4 * 60 * 60 * 1000); // +4 hours
  const useByDefault = new Date(now.getTime() + 8 * 60 * 60 * 1000); // +8 hours

  const [form, setForm] = useState({
    title: "",
    description: "",
    quantity_total: "",
    unit: "servings",
    pickup_location: profile?.address || "",
    prepared_at: toDateTimeLocal(prepDefault),
    use_by: toDateTimeLocal(useByDefault),
    pickup_start: toDateTimeLocal(pickupStartDefault),
    pickup_end: toDateTimeLocal(pickupEndDefault),
  });

  useEffect(() => {
    if (profile?.address && !form.pickup_location) {
      setForm((prev) => ({ ...prev, pickup_location: profile.address }));
    }
  }, [profile]);

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [aiDetectedInfo, setAiDetectedInfo] = useState(null);

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

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      handleAiScan(null, file);
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
    if (!form.quantity_total || Number(form.quantity_total) <= 0) {
      errs.quantity_total = "Quantity must be greater than 0.";
    }
    if (!form.pickup_location.trim()) {
      errs.pickup_location = "Pickup location is required.";
    }
    if (!form.prepared_at) errs.prepared_at = "Preparation time is required.";
    if (!form.use_by) errs.use_by = "Use-by time is required.";
    if (!form.pickup_start) errs.pickup_start = "Pickup start time is required.";
    if (!form.pickup_end) errs.pickup_end = "Pickup end time is required.";

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

    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      toast({ message: "Please correct the errors in the form.", type: "error" });
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
      };

      const res = await api.post("/listings/", payload);
      toast({ message: "Listing published successfully!", type: "success" });
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
          Make surplus food available to certified recipient organizations.
        </p>
      </div>

      <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-600" />
        <div>
          <strong>Food Safety & Quality Notice:</strong> Ensure food was prepared in a hygienic kitchen, packaged in food-grade containers, and maintained within safe temperature guidelines.
        </div>
      </div>

      {/* AI Food Vision & Auto-Drafting Hub */}
      <Card className="mb-4 bg-gradient-to-r from-green-50/40 via-white to-green-50/20 border-green-300">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-3 border-b border-grey-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded bg-green-100 text-green-800">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-grey-900">AI Food Scanner & Smart Draft</h2>
              <p className="text-xs text-grey-500">Auto-detect portions, allergens, and safe pickup windows from photo or sample</p>
            </div>
          </div>
          <label className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded text-xs font-medium bg-white text-grey-700 border border-grey-300 hover:bg-grey-50 cursor-pointer min-h-[44px]">
            <Camera className="h-4 w-4 text-green-700" />
            <span>Upload Food Photo</span>
            <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" disabled={isAiScanning} />
          </label>
        </div>

        <div>
          <span className="text-xs font-medium text-grey-600 block mb-2">Or test with 1-click kitchen presets:</span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              disabled={isAiScanning}
              onClick={() => handleAiScan("buffet")}
              className="px-3 py-2 rounded border border-grey-200 bg-white hover:border-green-400 hover:bg-green-50/50 text-left text-xs transition-colors min-h-[44px] flex flex-col justify-center"
            >
              <span className="font-semibold text-grey-800">Warm Buffet Trays</span>
              <span className="text-[11px] text-grey-500">Roasted veggies & farro</span>
            </button>
            <button
              type="button"
              disabled={isAiScanning}
              onClick={() => handleAiScan("pastry")}
              className="px-3 py-2 rounded border border-grey-200 bg-white hover:border-green-400 hover:bg-green-50/50 text-left text-xs transition-colors min-h-[44px] flex flex-col justify-center"
            >
              <span className="font-semibold text-grey-800">Artisan Bakery</span>
              <span className="text-[11px] text-grey-500">Sourdough & pastries</span>
            </button>
            <button
              type="button"
              disabled={isAiScanning}
              onClick={() => handleAiScan("lunchboxes")}
              className="px-3 py-2 rounded border border-grey-200 bg-white hover:border-green-400 hover:bg-green-50/50 text-left text-xs transition-colors min-h-[44px] flex flex-col justify-center"
            >
              <span className="font-semibold text-grey-800">Catering Boxed Meals</span>
              <span className="text-[11px] text-grey-500">Deli sandwich lunchboxes</span>
            </button>
          </div>
        </div>

        {isAiScanning && (
          <div className="mt-3 p-3 bg-green-50 rounded border border-green-200 text-xs text-green-800 flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-spin text-green-700" />
            <span>Scanning visual features, portion quantities, and allergen profiles...</span>
          </div>
        )}

        {aiDetectedInfo && (
          <div className="mt-3 pt-3 border-t border-grey-200 text-xs flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-grey-700">AI Detected Allergens:</span>
              {aiDetectedInfo.allergens?.length > 0 ? (
                aiDetectedInfo.allergens.map((a, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-medium text-[11px]">
                    {a}
                  </span>
                ))
              ) : (
                <span className="text-grey-400 italic">None detected</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-grey-700">Dietary Classification:</span>
              {aiDetectedInfo.dietary_tags?.map((d, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-green-50 text-green-800 border border-green-200 font-medium text-[11px]">
                  {d}
                </span>
              ))}
            </div>

            {aiDetectedInfo.storage_advice && (
              <div className="p-2 bg-grey-50 rounded border border-grey-200 text-grey-600">
                <strong>Handling & Transport Instruction:</strong> {aiDetectedInfo.storage_advice}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
          {/* Section 1: Item Details */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-grey-900 uppercase tracking-wide">Food Details</h2>
            </div>
            <div className="flex flex-col gap-3">
              <Input
                label="Listing Title"
                value={form.title}
                onChange={handleChange("title")}
                error={errors.title}
                placeholder="e.g. Grilled Chicken & Rice — 40 portions"
                hint="Be specific: name the dishes, portions, and packaging type."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Total Quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity_total}
                  onChange={handleChange("quantity_total")}
                  error={errors.quantity_total}
                  placeholder="e.g. 40"
                  required
                />
                <Select
                  label="Unit"
                  value={form.unit}
                  onChange={handleChange("unit")}
                  options={UNIT_OPTIONS}
                  required
                />
              </div>

              <Textarea
                label="Description & Allergens"
                value={form.description}
                onChange={handleChange("description")}
                error={errors.description}
                placeholder="List ingredients, dietary labels (Vegetarian, Halal, Gluten-Free), containers, or allergens."
                hint="Mention if recipient must bring their own pots or containers."
              />
            </div>
          </div>

          <div className="border-t border-grey-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-grey-900 uppercase tracking-wide">Preparation & Freshness</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Prepared At"
                type="datetime-local"
                value={form.prepared_at}
                onChange={handleChange("prepared_at")}
                error={errors.prepared_at}
                hint="When was this food cooked or packed?"
                required
              />
              <Input
                label="Best Before / Use By"
                type="datetime-local"
                value={form.use_by}
                onChange={handleChange("use_by")}
                error={errors.use_by}
                hint="Latest time food can safely be consumed."
                required
              />
            </div>
          </div>

          <div className="border-t border-grey-200 pt-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-green-600" />
              <h2 className="text-sm font-semibold text-grey-900 uppercase tracking-wide">Pickup Window & Location</h2>
            </div>
            <div className="flex flex-col gap-3">
              <Input
                label="Pickup Location & Instructions"
                value={form.pickup_location}
                onChange={handleChange("pickup_location")}
                error={errors.pickup_location}
                placeholder="e.g. 42 Maple St — back kitchen loading bay, ring bell"
                hint="Provide clear directions for the driver."
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Pickup Window Start"
                  type="datetime-local"
                  value={form.pickup_start}
                  onChange={handleChange("pickup_start")}
                  error={errors.pickup_start}
                  required
                />
                <Input
                  label="Pickup Window End"
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

          <div className="border-t border-grey-200 pt-4 flex items-center justify-end gap-3">
            <Button
              variant="secondary"
              type="button"
              onClick={() => navigate("/donor/listings")}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Publish Listing
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
