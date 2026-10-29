import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";

const DONOR_TYPE_OPTIONS = [
  { value: "RESTAURANT", label: "Restaurant / Caterer / Shop" },
  { value: "INSTITUTION", label: "Institution — church, temple, hostel, canteen, function hall" },
  { value: "INDIVIDUAL", label: "Individual — household or function host" },
];

export default function RegisterPage() {
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "", password: "", role: "", donor_type: "",
    organization_name: "", contact_name: "",
    phone: "", address: "", description: "",
  });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const ROLE_HOME = { donor: "/donor/dashboard", recipient: "/recipient/dashboard" };

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [field]: value };
      // Reset donor_type when switching away from donor
      if (field === "role" && value !== "donor") {
        next.donor_type = "";
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const isIndividual = form.role === "donor" && form.donor_type === "INDIVIDUAL";
  const isDonor = form.role === "donor";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setIsLoading(true);
    try {
      // For INDIVIDUAL donors, if they left org name blank, fill from contact_name
      const payload = { ...form };
      if (isIndividual && !payload.organization_name.trim()) {
        payload.organization_name = payload.contact_name.trim();
      }
      const data = await register(payload);
      toast({ message: "Account created. Welcome!", type: "success" });
      navigate(ROLE_HOME[data.user.role] || "/", { replace: true });
    } catch (err) {
      const res = err.response?.data;
      if (res?.fields) setErrors(res.fields);
      else setServerError(res?.error || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-grey-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <Leaf className="h-7 w-7 text-green-600" />
          <span className="text-xl font-semibold text-grey-900">FoodShare</span>
        </div>

        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          <strong>Demo environment.</strong> This is not a food-safety certification system.
        </div>

        <div className="bg-white rounded border border-grey-200 shadow-sm p-6">
          <h1 className="text-lg font-semibold text-grey-900 mb-4">Create account</h1>

          {serverError && (
            <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            {/* Step 1: Account type */}
            <Select
              label="Account type"
              value={form.role}
              onChange={set("role")}
              error={errors.role}
              placeholder="Select a role"
              options={[
                { value: "donor", label: "Donor — share your surplus food" },
                { value: "recipient", label: "Recipient — charity, community kitchen" },
              ]}
              required
            />

            {/* Step 2: Donor sub-type (only for donors) */}
            {isDonor && (
              <div>
                <Select
                  label="Donor type"
                  value={form.donor_type}
                  onChange={set("donor_type")}
                  error={errors.donor_type}
                  placeholder="Select your donor type"
                  options={DONOR_TYPE_OPTIONS}
                  required
                />
                {form.donor_type === "INDIVIDUAL" && (
                  <p className="mt-1.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                    Individual donors: your phone will be shown to recipients only after a request is accepted.
                    Food safety disclaimer applies — you remain responsible for safe handling.
                  </p>
                )}
              </div>
            )}

            {/* Common fields */}
            <Input label="Email" type="email" value={form.email} onChange={set("email")} error={errors.email} autoComplete="email" required />
            <Input label="Password" type="password" value={form.password} onChange={set("password")} error={errors.password} autoComplete="new-password" hint="At least 8 characters" required />

            {/* Name fields — adapt based on donor type */}
            {isIndividual ? (
              <>
                <Input
                  label="Your name"
                  value={form.contact_name}
                  onChange={set("contact_name")}
                  error={errors.contact_name}
                  placeholder="e.g. Ravi Patel"
                  required
                />
                <Input
                  label="Phone number"
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  error={errors.phone}
                  hint="Shown to recipients only after request accepted."
                />
                <Input
                  label="Pickup address"
                  value={form.address}
                  onChange={set("address")}
                  error={errors.address}
                  placeholder="e.g. 33 Birch Close, Springfield"
                />
              </>
            ) : (
              <>
                <Input label="Organization name" value={form.organization_name} onChange={set("organization_name")} error={errors.organization_name} required />
                <Input label="Contact person" value={form.contact_name} onChange={set("contact_name")} error={errors.contact_name} required />
                <Input label="Phone" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} />
                <Input label="Address" value={form.address} onChange={set("address")} error={errors.address} />
                <Textarea label="About your organization" value={form.description} onChange={set("description")} error={errors.description} />
              </>
            )}

            <Button type="submit" isLoading={isLoading} fullWidth className="mt-2">
              Create account
            </Button>
          </form>

          <p className="mt-4 text-sm text-grey-500 text-center">
            Already have an account?{" "}
            <Link to="/login" className="text-green-700 font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
