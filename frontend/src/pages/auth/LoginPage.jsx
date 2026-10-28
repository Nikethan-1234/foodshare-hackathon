import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Leaf, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { ImpactCounter } from "../../components/ui/ImpactCounter";

const DEMO_ACCOUNTS = [
  { label: "Donor", email: "donor@demo.local", role: "Green Leaf Restaurant" },
  { label: "Recipient", email: "recipient@demo.local", role: "Hope Community Kitchen" },
  { label: "Admin", email: "admin@demo.local", role: "Platform Administration" },
];

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const ROLE_HOME = { donor: "/donor/dashboard", recipient: "/recipient/dashboard", admin: "/admin/dashboard" };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setServerError("");
    setIsLoading(true);
    try {
      const data = await login(email, password);
      toast({ message: `Welcome back, ${data.profile?.contact_name || data.user.email}`, type: "success" });
      navigate(from || ROLE_HOME[data.user.role] || "/", { replace: true });
    } catch (err) {
      const res = err.response?.data;
      if (res?.fields) setErrors(res.fields);
      else setServerError(res?.error || "Login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemo = (demoEmail) => {
    setEmail(demoEmail);
    setPassword("demo1234");
    setErrors({});
    setServerError("");
  };

  return (
    <div className="min-h-screen bg-grey-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <Leaf className="h-7 w-7 text-green-600" />
          <span className="text-xl font-semibold text-grey-900">FoodShare</span>
        </div>

        {/* Demo notice */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
          <strong>Demo environment.</strong> This is not a food-safety certification system. Data is fictitious.
        </div>

        <div className="bg-white rounded border border-grey-200 shadow-sm p-6">
          <h1 className="text-lg font-semibold text-grey-900 mb-4">Sign in</h1>

          {serverError && (
            <div className="flex items-start gap-2 mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700" role="alert">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              autoComplete="email"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={errors.password}
              autoComplete="current-password"
              required
            />
            <Button type="submit" isLoading={isLoading} fullWidth className="mt-2">
              Sign in
            </Button>
          </form>

          <p className="mt-4 text-sm text-grey-500 text-center">
            No account?{" "}
            <Link to="/register" className="text-green-700 font-medium hover:underline">
              Register
            </Link>
          </p>
        </div>

        {/* Demo quick-fill */}
        <div className="mt-4 bg-white rounded border border-grey-200 shadow-sm p-4">
          <p className="text-xs font-medium text-grey-500 mb-2">Demo accounts — click to fill</p>
          <div className="flex flex-col gap-1">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="flex items-center justify-between px-3 py-2 rounded border border-grey-200 hover:bg-grey-50 text-sm text-left min-h-[44px]"
              >
                <span className="font-medium text-grey-700">{a.label}</span>
                <span className="text-grey-400 text-xs">{a.role}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Live Community Impact */}
        <div className="mt-4">
          <ImpactCounter compact />
        </div>
      </div>
    </div>
  );
}
