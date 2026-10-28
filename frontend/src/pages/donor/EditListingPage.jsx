import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { toDateTimeLocal } from "../../utils/format";
import { ArrowLeft, Clock, MapPin, Package, AlertCircle } from "lucide-react";

const UNIT_OPTIONS = [
  { value: "servings", label: "Servings / Portions" },
  { value: "boxes", label: "Boxes / Containers" },
  { value: "trays", label: "Trays" },
  { value: "sandwiches", label: "Sandwiches" },
  { value: "loaves", label: "Loaves" },
  { value: "kg", label: "Kilograms (kg)" },
];

export default function EditListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [listing, setListing] = useState(null);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const fetchListing = async () => {
    setIsLoading(true);
    setFetchError("");
    try {
      const res = await api.get(`/listings/${id}`);
      const l = res.data.listing;
      setListing(l);
      setForm({
        title: l.title || "",
        description: l.description || "",
        quantity_total: String(l.quantity_total || ""),
        unit: l.unit || "servings",
        pickup_location: l.pickup_location || "",
        prepared_at: toDateTimeLocal(l.prepared_at),
        use_by: toDateTimeLocal(l.use_by),
        pickup_start: toDateTimeLocal(l.pickup_start),
        pickup_end: toDateTimeLocal(l.pickup_end),
      });
    } catch (err) {
      setFetchError(err.response?.data?.error || "Failed to load listing details.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
  }, [id]);

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
    }

    const booked = (listing.quantity_total || 0) - (listing.quantity_left || 0);
    if (qty < booked) {
      errs.quantity_total = `Cannot reduce total below ${booked} ${listing.unit} (already reserved by accepted requests).`;
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
      };

      await api.put(`/listings/${id}`, payload);
      toast({ message: "Listing updated successfully!", type: "success" });
      navigate("/donor/listings");
    } catch (err) {
      const res = err.response?.data;
      if (res?.fields) {
        setErrors(res.fields);
        toast({ message: "Validation error. Check the highlighted fields.", type: "error" });
      } else {
        toast({ message: res?.error || "Failed to update listing.", type: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading listing details..." />;
  if (fetchError) return <ErrorState message={fetchError} onRetry={fetchListing} />;
  if (!listing) return null;

  const isLocked = ["COMPLETED", "REMOVED", "EXPIRED"].includes(listing.status);

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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-grey-900">Edit Listing</h1>
          <StatusBadge status={listing.status} />
        </div>
      </div>

      {isLocked && (
        <div className="mb-4 p-3 bg-grey-100 border border-grey-300 rounded text-xs text-grey-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0 text-grey-500" />
          <div>
            This listing is <strong>{listing.status}</strong> and can no longer be edited.
          </div>
        </div>
      )}

      <Card>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
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
                disabled={isLocked}
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
                  disabled={isLocked}
                  hint={`Currently booked: ${listing.quantity_total - listing.quantity_left} ${listing.unit}`}
                  required
                />
                <Select
                  label="Unit"
                  value={form.unit}
                  onChange={handleChange("unit")}
                  options={UNIT_OPTIONS}
                  disabled={isLocked}
                  required
                />
              </div>

              <Textarea
                label="Description & Allergens"
                value={form.description}
                onChange={handleChange("description")}
                error={errors.description}
                disabled={isLocked}
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
                disabled={isLocked}
                required
              />
              <Input
                label="Best Before / Use By"
                type="datetime-local"
                value={form.use_by}
                onChange={handleChange("use_by")}
                error={errors.use_by}
                disabled={isLocked}
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
                disabled={isLocked}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Pickup Window Start"
                  type="datetime-local"
                  value={form.pickup_start}
                  onChange={handleChange("pickup_start")}
                  error={errors.pickup_start}
                  disabled={isLocked}
                  required
                />
                <Input
                  label="Pickup Window End"
                  type="datetime-local"
                  value={form.pickup_end}
                  onChange={handleChange("pickup_end")}
                  error={errors.pickup_end}
                  disabled={isLocked}
                  required
                />
              </div>
            </div>
          </div>

          {!isLocked && (
            <div className="border-t border-grey-200 pt-4 flex items-center justify-end gap-3">
              <Button
                variant="secondary"
                type="button"
                onClick={() => navigate("/donor/listings")}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={isSubmitting}>
                Save Changes
              </Button>
            </div>
          )}
        </form>
      </Card>
    </div>
  );
}
