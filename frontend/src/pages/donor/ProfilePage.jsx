import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Button } from "../../components/ui/Button";
import { DonorTypeBadge } from "../../components/ui/Badge";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { Building2, Save } from "lucide-react";

const DONOR_TYPE_OPTIONS = [
  { value: "RESTAURANT", label: "Restaurant / Caterer / Shop" },
  { value: "INSTITUTION", label: "Institution (church, temple, hostel, canteen, function hall)" },
  { value: "INDIVIDUAL", label: "Individual (household / function host)" },
];

export default function DonorProfilePage() {
  const { profile, updateProfile, user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    organization_name: "",
    contact_name: "",
    phone: "",
    address: "",
    description: "",
    donor_type: "",
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  const fetchProfile = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/users/profile");
      const p = res.data.profile || {};
      setForm({
        organization_name: p.organization_name || "",
        contact_name: p.contact_name || "",
        phone: p.phone || "",
        address: p.address || "",
        description: p.description || "",
        donor_type: p.donor_type || "",
      });
      if (res.data.profile) {
        updateProfile(res.data.profile);
      }
    } catch (err) {
      setLoadError("Failed to load organization profile.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!form.organization_name.trim()) newErrors.organization_name = "Organization name is required.";
    if (!form.contact_name.trim()) newErrors.contact_name = "Contact name is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put("/users/profile", form);
      updateProfile(res.data.profile);
      toast({ message: "Profile updated successfully.", type: "success" });
    } catch (err) {
      const res = err.response?.data;
      if (res?.fields) {
        setErrors(res.fields);
      } else {
        toast({ message: res?.error || "Failed to update profile.", type: "error" });
      }
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading profile..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={fetchProfile} />;

  const isIndividual = form.donor_type === "INDIVIDUAL";

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-grey-900">Donor Profile</h1>
        <div className="flex items-center gap-2 mt-1">
          <p className="text-sm text-grey-500">
            Manage your contact info for food pickups.
          </p>
          {form.donor_type && <DonorTypeBadge donorType={form.donor_type} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            <CardTitle>{isIndividual ? "Personal Details" : "Organization Details"}</CardTitle>
          </div>
          <span className="text-xs bg-grey-100 text-grey-600 px-2 py-1 rounded font-mono">
            {user?.email}
          </span>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          {/* Donor type selector */}
          <Select
            label="Donor type"
            value={form.donor_type}
            onChange={handleChange("donor_type")}
            error={errors.donor_type}
            options={DONOR_TYPE_OPTIONS}
            placeholder="Select donor type"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isIndividual && (
              <Input
                label="Organization Name"
                value={form.organization_name}
                onChange={handleChange("organization_name")}
                error={errors.organization_name}
                placeholder="e.g. Green Leaf Restaurant"
                required
              />
            )}
            <Input
              label={isIndividual ? "Your Name" : "Contact Person"}
              value={form.contact_name}
              onChange={handleChange("contact_name")}
              error={errors.contact_name}
              placeholder={isIndividual ? "e.g. Ravi Patel" : "e.g. Marco Rossi"}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Phone Number"
              type="tel"
              value={form.phone}
              onChange={handleChange("phone")}
              error={errors.phone}
              placeholder="e.g. +1-555-0101"
              hint={isIndividual ? "Shown to recipients only after request accepted." : "Recipients will call this during scheduled pickup."}
            />
            <Input
              label="Address / Default Pickup Location"
              value={form.address}
              onChange={handleChange("address")}
              error={errors.address}
              placeholder="e.g. 42 Maple St, Springfield, IL"
              hint="Pre-populates the pickup location for new listings."
            />
          </div>

          {!isIndividual && (
            <Textarea
              label="About the Organization"
              value={form.description}
              onChange={handleChange("description")}
              error={errors.description}
              placeholder="e.g. Family-owned Italian restaurant. We regularly have surplus prepared meals at close of service."
              hint="Helps recipient organizations understand your kitchen and food handling."
            />
          )}

          <div className="flex justify-end pt-2">
            <Button type="submit" isLoading={isSaving}>
              <Save className="h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
