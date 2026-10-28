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
  Package, Clock, CheckCircle2, AlertCircle, Plus,
  ArrowRight, ShieldCheck, UserCheck, Inbox,
  Sparkles, Leaf, Droplets, Award, Printer, Car
} from "lucide-react";

export default function DonorDashboardPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [esg, setEsg] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [resDash, resEsg] = await Promise.all([
        api.get("/donor/dashboard"),
        api.get("/ai/esg").catch(() => ({ data: { esg_metrics: null } }))
      ]);
      setData(resDash.data);
      if (resEsg.data?.esg_metrics) {
        setEsg(resEsg.data.esg_metrics);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (isLoading) return <LoadingState message="Loading donor dashboard..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { metrics, recent_listings = [], incoming_requests = [] } = data || {};

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">
            {profile?.organization_name || "Donor Dashboard"}
          </h1>
          <p className="text-sm text-grey-500">
            Surplus food management & distribution overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => navigate("/donor/listings/new")}>
            <Plus className="h-4 w-4" />
            List Surplus Food
          </Button>
        </div>
      </div>

      {/* Safety & Demo Banner */}
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 mt-0.5 text-amber-700 flex-shrink-0" />
        <div>
          <strong>Platform Disclaimer:</strong> All data in this environment is fictitious demo data. This system does not certify food safety, laboratory hygiene, or HACCP compliance. Donors remain solely responsible for the safety and handling of food distributed.
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Active Listings</span>
            <Package className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-grey-900">{metrics?.active_listings_count || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Available or reserved</p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Pending Requests</span>
            <Clock className="h-4 w-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{metrics?.pending_requests_count || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Awaiting donor review</p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Completed</span>
            <CheckCircle2 className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-grey-900">{metrics?.completed_donations_count || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Fulfilled pickups</p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Portions Donated</span>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-grey-900">{metrics?.total_portions_donated || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Total meals redistributed</p>
        </Card>
      </div>

      {/* Platform Redistribution Impact Counter */}
      <ImpactCounter className="mb-6" />

      {/* AI ESG & Climate Sustainability Hub */}
      {esg && (
        <Card className="mb-6 bg-gradient-to-r from-emerald-50/40 via-white to-green-50/20 border-emerald-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-grey-200">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded bg-emerald-100 text-emerald-800">
                <Leaf className="h-4 w-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-grey-900">Green Impact Hub — ESG Carbon & Climate Ledger</h3>
                  <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    {esg.esg_rating}
                  </span>
                </div>
                <p className="text-xs text-grey-500">Verified environmental offsets calculated via EPA WARM food waste mitigation models</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-white text-grey-700 border border-grey-300 hover:bg-grey-50 min-h-[44px]"
            >
              <Printer className="h-3.5 w-3.5 text-grey-500" />
              Print CSR Report
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 rounded bg-white border border-grey-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-grey-500">GHG Avoided</span>
                <Leaf className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <div className="text-xl font-bold text-emerald-900">{esg.co2_emissions_prevented_kg} kg</div>
              <div className="text-[10px] text-grey-400 mt-0.5">CO₂e greenhouse gases</div>
            </div>

            <div className="p-3 rounded bg-white border border-grey-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-grey-500">Water Conserved</span>
                <Droplets className="h-3.5 w-3.5 text-sky-600" />
              </div>
              <div className="text-xl font-bold text-sky-900">{esg.water_conserved_liters.toLocaleString()} L</div>
              <div className="text-[10px] text-grey-400 mt-0.5">Agricultural water footprint</div>
            </div>

            <div className="p-3 rounded bg-white border border-grey-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-grey-500">Car Miles Offset</span>
                <Car className="h-3.5 w-3.5 text-indigo-600" />
              </div>
              <div className="text-xl font-bold text-indigo-900">{esg.car_miles_equivalent} mi</div>
              <div className="text-[10px] text-grey-400 mt-0.5">Passenger car equivalent</div>
            </div>

            <div className="p-3 rounded bg-white border border-grey-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-grey-500">Landfill Diverted</span>
                <Award className="h-3.5 w-3.5 text-amber-600" />
              </div>
              <div className="text-xl font-bold text-amber-900">{esg.food_weight_diverted_kg} kg</div>
              <div className="text-[10px] text-grey-400 mt-0.5">Solid organic waste rescued</div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Recent Listings (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle>Recent Food Listings</CardTitle>
                <Link
                  to="/donor/listings"
                  className="text-xs text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1"
                >
                  View all ({metrics?.total_listings_count || 0})
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>

            {recent_listings.length === 0 ? (
              <div className="py-8 text-center text-xs text-grey-400">
                No food listings created yet. Click "List Surplus Food" above to get started.
              </div>
            ) : (
              <div className="divide-y divide-grey-100 -mx-4 md:-mx-6">
                {recent_listings.map((l) => (
                  <div key={l.id} className="p-4 hover:bg-grey-50 transition-colors flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-grey-900 truncate">{l.title}</span>
                        <StatusBadge status={l.status} />
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-grey-500">
                        <span>{l.quantity_left} / {l.quantity_total} {l.unit} left</span>
                        <span>•</span>
                        <span>Pickup: {formatDateTime(l.pickup_start)}</span>
                        {["AVAILABLE", "RESERVED"].includes(l.status) && (
                          <>
                            <span>•</span>
                            <PickupCountdown pickupEnd={l.pickup_end} />
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {l.pending_requests_count > 0 && (
                        <span className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded font-medium">
                          {l.pending_requests_count} pending
                        </span>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/donor/listings/${l.id}/edit`)}
                        disabled={["COMPLETED", "REMOVED"].includes(l.status)}
                      >
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Pending Requests Queue (1 col) */}
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-green-600" />
                  <CardTitle>Incoming Requests</CardTitle>
                </div>
                {incoming_requests.length > 0 && (
                  <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                    {incoming_requests.length}
                  </span>
                )}
              </div>
            </CardHeader>

            {incoming_requests.length === 0 ? (
              <div className="py-8 text-center text-xs text-grey-400">
                No pending requests right now. New charity requests will appear here.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {incoming_requests.map((r) => (
                  <div key={r.id} className="p-3 bg-grey-50 rounded border border-grey-200 text-xs flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-grey-900">{r.recipient_name}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-grey-600">
                      Requested <strong>{r.quantity}</strong> for: <span className="font-medium text-grey-800">{r.listing_title}</span>
                    </div>
                    {r.note && (
                      <p className="text-grey-500 italic bg-white p-2 rounded border border-grey-200 text-[11px]">
                        "{r.note}"
                      </p>
                    )}
                    <div className="flex items-center justify-between pt-1 border-t border-grey-200 mt-1">
                      <span className="text-grey-400 text-[11px]">{formatDateTime(r.created_at)}</span>
                      <Link
                        to="/donor/listings"
                        className="text-green-700 hover:underline font-medium text-[11px]"
                      >
                        Review in Listings →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick Info Box */}
          <Card className="bg-grey-50 border-grey-200">
            <h3 className="text-xs font-semibold text-grey-700 uppercase tracking-wide mb-2">
              Donor Workflow Reminder
            </h3>
            <ul className="text-xs text-grey-600 flex flex-col gap-1.5 list-disc pl-4">
              <li>Listings remain <strong>AVAILABLE</strong> until fully claimed or expired.</li>
              <li>When a charity requests food, review and accept in your listings.</li>
              <li>Once accepted, quantity is atomically reserved so double-booking cannot occur.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
