import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { PickupCountdown } from "../../components/ui/PickupCountdown";
import { formatDateTime } from "../../utils/format";
import {
  Users, Package, Flag, AlertTriangle, Play,
  Building2, ArrowRight, ShieldAlert, CheckCircle2, HeartHandshake
} from "lucide-react";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isRunningExpiry, setIsRunningExpiry] = useState(false);

  const fetchDashboard = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/admin/dashboard");
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load admin dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRunExpiry = async () => {
    setIsRunningExpiry(true);
    try {
      const res = await api.post("/jobs/expire");
      const r = res.data.result;
      toast({
        message: `Expiry check completed: ${r.expired_listings} listings expired, ${r.cancelled_requests} requests cancelled.`,
        type: "success",
      });
      fetchDashboard();
    } catch (err) {
      toast({ message: "Failed to run expiry job.", type: "error" });
    } finally {
      setIsRunningExpiry(false);
    }
  };

  if (isLoading) return <LoadingState message="Loading platform administration metrics..." />;
  if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

  const { metrics, recent_listings = [], recent_reports = [] } = data || {};

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">Platform Administration</h1>
          <p className="text-sm text-grey-500">
            System moderation, food safety audit oversight, user compliance & scheduled jobs.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleRunExpiry}
            isLoading={isRunningExpiry}
            title="Scan database for listings past pickup_end"
          >
            <Play className="h-3.5 w-3.5 text-green-700" />
            Run Expiry Check
          </Button>
          <Button onClick={() => navigate("/admin/reports")}>
            <Flag className="h-4 w-4" />
            Moderation Queue ({metrics?.open_reports_count || 0})
          </Button>
        </div>
      </div>

      {/* Safety Notice */}
      <div className="mb-6 p-3 bg-grey-100 border border-grey-300 rounded text-xs text-grey-800 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 mt-0.5 text-grey-600 flex-shrink-0" />
        <div>
          <strong>Administrator Moderation Portal:</strong> As a platform moderator, you can review flagged listings, remove non-compliant items, manage community kitchen access, and audit status history.
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Registered Users</span>
            <Users className="h-4 w-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-grey-900">{metrics?.total_users || 0}</div>
          <p className="text-xs text-grey-500 mt-1">
            {metrics?.donors_count || 0} donors • {metrics?.recipients_count || 0} charities
          </p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Active Listings</span>
            <Package className="h-4 w-4 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-700">{metrics?.active_listings || 0}</div>
          <p className="text-xs text-grey-400 mt-1">
            Total listings: {metrics?.total_listings || 0}
          </p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Meals Redistributed</span>
            <HeartHandshake className="h-4 w-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-grey-900">{metrics?.total_portions_distributed || 0}</div>
          <p className="text-xs text-grey-400 mt-1">Completed pickups</p>
        </Card>

        <Card padding={false} className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-grey-500 uppercase tracking-wide">Open Reports</span>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </div>
          <div className={`text-2xl font-bold ${metrics?.open_reports_count > 0 ? "text-red-700" : "text-grey-900"}`}>
            {metrics?.open_reports_count || 0}
          </div>
          <p className="text-xs text-grey-400 mt-1">Require moderation review</p>
        </Card>
      </div>

      {/* Breakdown Status Badges */}
      {metrics?.listings_by_status && (
        <Card className="mb-6 p-4">
          <div className="text-xs font-semibold text-grey-700 uppercase tracking-wide mb-3">
            System Inventory Status Breakdown
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(metrics.listings_by_status).map(([st, cnt]) => (
              <div key={st} className="flex items-center gap-1.5 bg-grey-50 border border-grey-200 px-3 py-1.5 rounded text-xs">
                <StatusBadge status={st} />
                <span className="font-bold text-grey-900">{cnt}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Open Moderation Reports */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Flag className="h-4 w-4 text-red-600" />
                <CardTitle>Moderation Reports</CardTitle>
              </div>
              <Link
                to="/admin/reports"
                className="text-xs text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1"
              >
                View all reports
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>

          {recent_reports.length === 0 ? (
            <div className="py-8 text-center text-xs text-grey-400">
              No reports filed yet. The community queue is clear.
            </div>
          ) : (
            <div className="divide-y divide-grey-100 -mx-4 md:-mx-6">
              {recent_reports.map((r) => (
                <div key={r.id} className="p-4 hover:bg-grey-50 transition-colors flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-grey-900">{r.reason}</span>
                      <StatusBadge status={r.status} />
                    </div>
                    <div className="text-grey-600 mb-1">
                      Listing: <strong className="text-grey-800">{r.listing_title || `#${r.listing_id}`}</strong>
                    </div>
                    {r.detail && (
                      <p className="text-grey-500 italic bg-grey-50 p-2 rounded border border-grey-200 text-[11px] mb-1">
                        "{r.detail}"
                      </p>
                    )}
                    <div className="text-[11px] text-grey-400">
                      Reported by {r.reporter_name} • {formatDateTime(r.created_at)}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate("/admin/reports")}
                  >
                    Moderate
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right Column: Platform Recent Listings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle>Platform Listings Stream</CardTitle>
              <Link
                to="/admin/listings"
                className="text-xs text-green-700 hover:text-green-800 font-medium inline-flex items-center gap-1"
              >
                Manage all ({metrics?.total_listings || 0})
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>

          {recent_listings.length === 0 ? (
            <div className="py-8 text-center text-xs text-grey-400">
              No listings currently registered in the database.
            </div>
          ) : (
            <div className="divide-y divide-grey-100 -mx-4 md:-mx-6">
              {recent_listings.map((l) => (
                <div key={l.id} className="p-4 hover:bg-grey-50 transition-colors flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-semibold text-grey-900 truncate">{l.title}</span>
                      <StatusBadge status={l.status} />
                    </div>
                    <div className="text-grey-500 truncate">
                      {l.donor_name} • {l.quantity_left} / {l.quantity_total} {l.unit}
                    </div>
                    <div className="flex flex-wrap items-center justify-between text-[11px] text-grey-400 mt-1 gap-1">
                      <span>Pickup: {formatDateTime(l.pickup_start)}</span>
                      {["AVAILABLE", "RESERVED"].includes(l.status) && (
                        <PickupCountdown pickupEnd={l.pickup_end} />
                      )}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => navigate("/admin/listings")}
                  >
                    Inspect
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
