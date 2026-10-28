import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { PickupCountdown } from "../../components/ui/PickupCountdown";
import { ImpactCounter } from "../../components/ui/ImpactCounter";
import { formatDateTime, formatTimeLeft } from "../../utils/format";
import {
  Package, Clock, CheckCircle2, HeartHandshake, Phone,
  ArrowRight, ShieldCheck, MapPin, Building2, Truck
} from "lucide-react";

export default function RecipientDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/recipient/dashboard");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) return <LoadingState message="Loading charity dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { metrics, upcoming_pickups = [], recent_requests = [] } = data || {};

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">
            {profile?.organization_name || "Charity Dashboard"}
          </h1>
          <p className="text-sm text-grey-500">
            Surplus food pickup schedules & distribution tracker.
          </p>
        </div>
        <Button onClick={() => navigate("/recipient/browse")}>
          <Package className="h-4 w-4" />
          Browse Available Food
        </Button>
      </div>

      {/* Safety Notice Banner */}
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-amber-700 flex-shrink-0" />
        <div>
          <strong>Platform Disclaimer:</strong> All data is fictitious demonstration data. This application does not certify food safety, hygiene inspections, or cold-chain integrity. Recipients must independently inspect all received items before distribution.
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Upcoming Pickups</span>
            <Truck className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-700">{metrics?.accepted_pickups_count || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Accepted & ready</p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Pending Requests</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{metrics?.pending_requests_count || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Awaiting donor confirmation</p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-grey-900">{metrics?.completed_pickups_count || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Pickups fulfilled</p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Portions Received</span>
            <HeartHandshake className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-grey-900">{metrics?.total_portions_received || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Meals served to community</p>
        </Card>
      </div>

      {/* Platform Redistribution Impact Counter */}
      <ImpactCounter className="mb-6" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Scheduled Pickups Ready for Collection (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  <CardTitle>Pickups Ready for Collection</CardTitle>
                </div>
                <Link
                  to="/recipient/requests"
                  className="text-xs text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1"
                >
                  All requests
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>

            {upcoming_pickups.length === 0 ? (
              <div className="py-8 text-center text-xs text-grey-400">
                No active accepted pickups scheduled. Browse food donations to request items for your community.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {upcoming_pickups.map((p) => {
                  const timeLeft = formatTimeLeft(p.pickup_end);
                  return (
                    <div
                      key={p.id}
                      className="p-4 bg-green-50/50 border border-green-200 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-grey-900">{p.listing_title}</span>
                          <StatusBadge status="ACCEPTED" />
                        </div>
                        <div className="text-xs text-grey-700 mb-2">
                          <strong>{p.quantity} {p.unit}</strong> • From: <strong>{p.donor_name}</strong>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-grey-600">
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                            <span className="truncate">{p.pickup_location}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                            <span>Window: {formatDateTime(p.pickup_start)} – {formatDateTime(p.pickup_end)}</span>
                          </div>
                          {p.donor_phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                              <span>Donor contact: {p.donor_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2 flex-shrink-0 border-t sm:border-t-0 pt-2 sm:pt-0">
                        <PickupCountdown pickupEnd={p.pickup_end} />
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => navigate("/recipient/requests")}
                        >
                          View Schedule
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Recent Requests (1 col) */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Recent Requests</CardTitle>
                <Link
                  to="/recipient/requests"
                  className="text-xs text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1"
                >
                  View all
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>

            {recent_requests.length === 0 ? (
              <div className="py-8 text-center text-xs text-grey-400">
                No recent food requests made.
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {recent_requests.map((r) => (
                  <div key={r.id} className="p-3 bg-grey-50 rounded border border-grey-200 text-xs flex flex-col gap-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-grey-900 truncate max-w-[170px]">
                        {r.listing_title}
                      </span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-grey-600">
                      {r.quantity} {r.unit} • {r.donor_name}
                    </div>
                    <div className="text-[11px] text-grey-400 mt-1">
                      {formatDateTime(r.created_at)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Surplus Food Callout */}
          <Card className="bg-green-50/60 border-green-200">
            <h3 className="text-xs font-semibold text-green-900 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Package className="h-4 w-4 text-green-700" />
              Available Surplus Now
            </h3>
            <p className="text-xs text-grey-700 mb-3">
              There are currently <strong>{metrics?.available_listings_count || 0} listings</strong> of fresh surplus food available in your community.
            </p>
            <Button
              size="sm"
              fullWidth
              onClick={() => navigate("/recipient/browse")}
            >
              Browse Surplus Food
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
