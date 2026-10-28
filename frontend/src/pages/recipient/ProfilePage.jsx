import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Input, Textarea } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { HeartHandshake, Save } from "lucide-react";

export default function RecipientProfilePage() {
  const { profile, updateProfile, user } = useAuth();
  const { toast } = useToast();

  const [form, setForm] = useState({
    organization_name: "",
    contact_name: "",
    phone: "",
    address: "",
    description: "",
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
      });
      if (res.data.profile) {
        updateProfile(res.data.profile);
      }
    } catch (err) {
      setLoadError("Failed to load charity profile.");
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
    if (!form.contact_name.trim()) newErrors.contact_name = "Contact person name is required.";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSaving(true);
    try {
      const res = await api.put("/users/profile", form);
      updateProfile(res.data.profile);
      toast({ message: "Charity profile updated successfully.", type: "success" });
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

  if (isLoading) return <LoadingState message="Loading charity profile..." />;
  if (loadError) return <ErrorState message={loadError} onRetry={fetchProfile} />;

  return (
    <div className="p-4 md:p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-grey-900">Recipient Organization Profile</h1>
        <p className="text-sm text-grey-500">
          Manage your charity, shelter, or community kitchen contact details for food donors.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-5 w-5 text-green-600" />
            <CardTitle>Organization Details</CardTitle>
          </div>
          <span className="text-xs bg-grey-100 text-grey-600 px-2 py-1 rounded font-mono">
            {user?.email}
          </span>
        </CardHeader>

        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Organization Name"
              value={form.organization_name}
              onChange={handleChange("organization_name")}
              error={errors.organization_name}
              placeholder="e.g. Hope Community Kitchen"
              required
            />
            <Input
              label="Contact Person"
              value={form.contact_name}
              onChange={handleChange("contact_name")}
              error={errors.contact_name}
              placeholder="e.g. Sandra Brooks"
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
              placeholder="e.g. +1-555-0201"
              hint="Donors will contact this number regarding pickup."
            />
            <Input
              label="Physical Address / Distribution Center"
              value={form.address}
              onChange={handleChange("address")}
              error={errors.address}
              placeholder="e.g. 100 Main St, Springfield, IL"
            />
          </div>

          <Textarea
            label="Community Mission & Daily Needs"
            value={form.description}
            onChange={handleChange("description")}
            error={errors.description}
            placeholder="e.g. Community kitchen serving hot dinner to 150+ low-income residents and families daily. We have refrigeration for bulk donations."
            hint="Helps donors know how their surplus will be used."
          />

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
