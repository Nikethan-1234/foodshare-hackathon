import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { StatusBadge } from "../../components/ui/Badge";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { PickupCountdown } from "../../components/ui/PickupCountdown";
import { formatDateTime, formatTimeLeft } from "../../utils/format";
import {
  Search, Package, Clock, MapPin, Building2, CheckCircle2,
  Calendar, Eye, Send, ShieldAlert, Sparkles, Flag
} from "lucide-react";

const UNIT_FILTERS = [
  { id: "ALL", label: "All Types" },
  { id: "servings", label: "Servings" },
  { id: "boxes", label: "Boxes" },
  { id: "trays", label: "Trays" },
  { id: "sandwiches", label: "Sandwiches" },
  { id: "loaves", label: "Loaves" },
];

export default function BrowsePage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [listings, setListings] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUnit, setSelectedUnit] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Request Modal State
  const [requestTarget, setRequestTarget] = useState(null);
  const [requestQty, setRequestQty] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);

  // Detail Modal State
  const [detailItem, setDetailItem] = useState(null);

  // Report Modal State
  const [reportTarget, setReportTarget] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [reportDetail, setReportDetail] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportError, setReportError] = useState("");

  const fetchAvailableListings = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const url = selectedUnit === "ALL"
        ? "/listings/available"
        : `/listings/available?unit=${selectedUnit}`;
      const res = await api.get(url);
      setListings(res.data.listings || []);
    } catch (err) {
      setLoadError("Failed to load available food listings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAvailableListings();
  }, [selectedUnit]);

  const handleOpenRequest = (listing) => {
    setRequestTarget(listing);
    setRequestQty(String(listing.quantity_left)); // default to max available
    setRequestNote("");
    setRequestError("");
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!requestTarget) return;

    const qty = parseInt(requestQty, 10);
    if (!qty || qty <= 0) {
      setRequestError("Please enter a quantity of at least 1.");
      return;
    }
    if (qty > requestTarget.quantity_left) {
      setRequestError(`Cannot request more than ${requestTarget.quantity_left} ${requestTarget.unit}.`);
      return;
    }

    setIsSubmittingRequest(true);
    setRequestError("");
    try {
      await api.post("/requests/", {
        listing_id: requestTarget.id,
        quantity: qty,
        note: requestNote.trim(),
      });
      toast({
        message: `Request for ${qty} ${requestTarget.unit} submitted! Donor will be notified.`,
        type: "success",
      });
      setRequestTarget(null);
      if (detailItem && detailItem.id === requestTarget.id) {
        setDetailItem(null);
      }
      fetchAvailableListings();
    } catch (err) {
      const res = err.response?.data;
      if (res?.fields?.quantity) {
        setRequestError(res.fields.quantity);
      } else {
        setRequestError(res?.error || "Failed to submit request.");
      }
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  const handleOpenReport = (item) => {
    setReportTarget(item);
    setReportReason("");
    setReportDetail("");
    setReportError("");
  };

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportReason) {
      setReportError("Please select a reason for the report.");
      return;
    }
    setIsSubmittingReport(true);
    setReportError("");
    try {
      await api.post("/reports/", {
        listing_id: reportTarget.id,
        reason: reportReason,
        detail: reportDetail.trim(),
      });
      toast({ message: "Report submitted to platform moderators. Thank you.", type: "success" });
      setReportTarget(null);
      setReportReason("");
      setReportDetail("");
    } catch (err) {
      setReportError(err.response?.data?.error || "Failed to submit report.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const filteredListings = listings.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.donor_name && l.donor_name.toLowerCase().includes(q)) ||
      (l.pickup_location && l.pickup_location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">Browse Available Food</h1>
          <p className="text-sm text-grey-500">
            Fresh surplus prepared food, bakery goods, and produce from local donors ready for pickup.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/recipient/requests")}>
          View My Requests
        </Button>
      </div>

      {/* Safety Notice Banner */}
      <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 flex items-start gap-2">
        <ShieldAlert className="h-4 w-4 mt-0.5 text-amber-700 flex-shrink-0" />
        <div>
          <strong>Food Safety Reminder:</strong> Prototype platform demo. Verify packaging integrity, safe transport temperature, and allergen labeling upon pickup.
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            placeholder="Search by food name, donor restaurant, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded border border-grey-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 min-h-[44px]"
          />
          <Search className="h-4 w-4 text-grey-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>

        {/* Unit Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {UNIT_FILTERS.map((u) => (
            <button
              key={u.id}
              onClick={() => setSelectedUnit(u.id)}
              className={`px-3 py-2 rounded text-xs font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                selectedUnit === u.id
                  ? "bg-green-600 text-white"
                  : "bg-white text-grey-600 border border-grey-200 hover:bg-grey-50"
              }`}
            >
              {u.label}
            </button>
          ))}
        </div>
      </div>

      {/* Listing Cards Grid */}
      {isLoading ? (
        <LoadingState message="Scanning for available food donations..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchAvailableListings} />
      ) : filteredListings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No surplus food available"
            message={
              searchQuery
                ? "No listings match your search keywords. Try adjusting your query."
                : "Check back soon as local restaurants and caterers post surplus after meal services."
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredListings.map((item) => {
            const hasRequested = !!item.my_request;
            const timeLeft = formatTimeLeft(item.pickup_end);

            return (
              <Card key={item.id} padding={false} className="flex flex-col justify-between p-4 hover:border-grey-300 transition-colors">
                <div>
                  {/* Top Donor & Countdown */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 text-xs text-grey-600 font-medium truncate">
                      <Building2 className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                      <span className="truncate">{item.donor_name || "Food Donor"}</span>
                    </div>
                    <PickupCountdown pickupEnd={item.pickup_end} />
                  </div>

                  {/* Food Title */}
                  <h3 className="font-semibold text-base text-grey-900 leading-snug mb-1">
                    {item.title}
                  </h3>

                  {/* Description Preview */}
                  {item.description && (
                    <p className="text-xs text-grey-500 line-clamp-2 mb-3">
                      {item.description}
                    </p>
                  )}

                  {/* Quantity Highlight */}
                  <div className="mb-2 inline-flex items-center px-2.5 py-1 rounded bg-green-50 border border-green-200 text-green-800 text-xs font-semibold">
                    <Sparkles className="h-3.5 w-3.5 mr-1 text-green-600" />
                    {item.quantity_left} {item.unit} available
                  </div>

                  {/* AI Allergens & Dietary Badges */}
                  {(item.allergens?.length > 0 || item.dietary_tags?.length > 0) && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.dietary_tags?.map((d, i) => (
                        <span key={`diet-${i}`} className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-green-50 text-green-700 border border-green-200">
                          {d}
                        </span>
                      ))}
                      {item.allergens?.map((a, i) => (
                        <span key={`allg-${i}`} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          Contains: {a}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Logistics Info Box */}
                  <div className="flex flex-col gap-1 text-xs text-grey-500 bg-grey-50 p-2.5 rounded border border-grey-200 mb-4">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                      <span>Pickup: {formatDateTime(item.pickup_start)} – {formatDateTime(item.pickup_end)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                      <span>Use by: {formatDateTime(item.use_by)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                      <span className="truncate">{item.pickup_location}</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-grey-100">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setDetailItem(item)}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Details
                  </Button>

                  {hasRequested ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-grey-600">
                        {item.my_request.quantity} requested:
                      </span>
                      <StatusBadge status={item.my_request.status} />
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleOpenRequest(item)}
                      disabled={item.quantity_left <= 0}
                    >
                      <Send className="h-3.5 w-3.5" />
                      Request Food
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Request Food Modal */}
      <Modal
        isOpen={!!requestTarget}
        onClose={() => setRequestTarget(null)}
        title="Request Food for Pickup"
        size="md"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRequestTarget(null)}
              disabled={isSubmittingRequest}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitRequest}
              isLoading={isSubmittingRequest}
            >
              Submit Request
            </Button>
          </>
        }
      >
        {requestTarget && (
          <form onSubmit={handleSubmitRequest} className="flex flex-col gap-4 text-sm">
            <div className="p-3 bg-grey-50 rounded border border-grey-200">
              <h4 className="font-semibold text-grey-900">{requestTarget.title}</h4>
              <p className="text-xs text-grey-500 mt-0.5">
                From: <strong>{requestTarget.donor_name}</strong> • Available: <strong>{requestTarget.quantity_left} {requestTarget.unit}</strong>
              </p>
              <p className="text-xs text-grey-500 mt-0.5 flex items-center gap-1">
                <MapPin className="h-3 w-3 text-grey-400" />
                {requestTarget.pickup_location}
              </p>
            </div>

            {requestError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded" role="alert">
                {requestError}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm font-medium text-grey-700">
                  Quantity Desired ({requestTarget.unit})
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setRequestQty(String(requestTarget.quantity_left))}
                    className="text-xs text-green-700 hover:underline font-medium px-1.5 py-0.5 rounded bg-green-50"
                  >
                    All ({requestTarget.quantity_left})
                  </button>
                  {requestTarget.quantity_left > 1 && (
                    <button
                      type="button"
                      onClick={() => setRequestQty(String(Math.ceil(requestTarget.quantity_left / 2)))}
                      className="text-xs text-green-700 hover:underline font-medium px-1.5 py-0.5 rounded bg-green-50"
                    >
                      Half ({Math.ceil(requestTarget.quantity_left / 2)})
                    </button>
                  )}
                </div>
              </div>
              <Input
                type="number"
                min="1"
                max={requestTarget.quantity_left}
                step="1"
                value={requestQty}
                onChange={(e) => setRequestQty(e.target.value)}
                placeholder={`1 to ${requestTarget.quantity_left}`}
                required
              />
            </div>

            <Textarea
              label="Pickup Note / Special Logistics (Optional)"
              value={requestNote}
              onChange={(e) => setRequestNote(e.target.value)}
              placeholder="e.g. Hope Community Kitchen van will arrive around 2:30 PM. Driver contact: Dave (+1-555-0199). We will bring insulated food carriers."
              hint="Let the donor know your estimated arrival time and transport plan."
            />
          </form>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={!!detailItem}
        onClose={() => setDetailItem(null)}
        title="Food Surplus Details"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={() => setDetailItem(null)}>
              Close
            </Button>
            {detailItem && !detailItem.my_request && (
              <Button onClick={() => handleOpenRequest(detailItem)}>
                <Send className="h-4 w-4" />
                Request Food
              </Button>
            )}
          </div>
        }
      >
        {detailItem && (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-start justify-between border-b border-grey-200 pb-3">
              <div>
                <h3 className="font-semibold text-base text-grey-900">{detailItem.title}</h3>
                <p className="text-xs text-grey-500 mt-0.5">Offered by {detailItem.donor_name}</p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-green-50 border border-green-200 text-green-800">
                {detailItem.quantity_left} of {detailItem.quantity_total} {detailItem.unit} left
              </span>
            </div>

            {detailItem.description && (
              <div>
                <h4 className="text-xs font-semibold text-grey-700 uppercase mb-1">Description & Ingredients</h4>
                <p className="text-xs text-grey-700 bg-grey-50 p-3 rounded border border-grey-200 leading-relaxed">
                  {detailItem.description}
                </p>
              </div>
            )}

            {/* AI Allergen & Safety Screen */}
            {(detailItem.allergens?.length > 0 || detailItem.dietary_tags?.length > 0) && (
              <div className="p-3 bg-amber-50/50 rounded border border-amber-200 text-xs">
                <div className="flex items-center gap-1.5 font-semibold text-amber-900 mb-2">
                  <ShieldAlert className="h-4 w-4 text-amber-700" />
                  <span>AI Allergen & Dietary Safety Screening</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                  <span className="text-grey-500 font-medium">Dietary:</span>
                  {detailItem.dietary_tags?.length > 0 ? (
                    detailItem.dietary_tags.map((d, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-medium text-[11px]">
                        {d}
                      </span>
                    ))
                  ) : (
                    <span className="text-grey-400">Standard</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-grey-500 font-medium">Allergens Present:</span>
                  {detailItem.allergens?.length > 0 ? (
                    detailItem.allergens.map((a, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-semibold text-[11px]">
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-grey-400">None detected</span>
                  )}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-grey-50 p-3 rounded border border-grey-200">
              <div>
                <span className="text-grey-400 block">Prepared At:</span>
                <span className="font-medium text-grey-800">{formatDateTime(detailItem.prepared_at)}</span>
              </div>
              <div>
                <span className="text-grey-400 block">Use By Date:</span>
                <span className="font-medium text-grey-800">{formatDateTime(detailItem.use_by)}</span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-grey-400 block mb-0.5">Pickup Window:</span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-grey-800">
                    {formatDateTime(detailItem.pickup_start)} — {formatDateTime(detailItem.pickup_end)}
                  </span>
                  <PickupCountdown pickupEnd={detailItem.pickup_end} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <span className="text-grey-400 block">Pickup Location:</span>
                <span className="font-medium text-grey-800">{detailItem.pickup_location}</span>
              </div>
            </div>

            {detailItem.my_request && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs flex items-center justify-between">
                <div>
                  <strong>Your Active Request:</strong> {detailItem.my_request.quantity} {detailItem.unit}
                </div>
                <StatusBadge status={detailItem.my_request.status} />
              </div>
            )}

            <div className="border-t border-grey-200 pt-3 flex items-center justify-between text-xs">
              <span className="text-grey-400">Notice food safety or description issues?</span>
              <button
                type="button"
                onClick={() => handleOpenReport(detailItem)}
                className="text-red-700 hover:underline font-medium inline-flex items-center gap-1"
              >
                <Flag className="h-3.5 w-3.5" />
                Report this listing
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Report Modal */}
      <Modal
        isOpen={!!reportTarget}
        onClose={() => setReportTarget(null)}
        title="Report Food Listing"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setReportTarget(null)}
              disabled={isSubmittingReport}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmitReport}
              isLoading={isSubmittingReport}
            >
              Submit Report
            </Button>
          </>
        }
      >
        {reportTarget && (
          <form onSubmit={handleSubmitReport} className="flex flex-col gap-3 text-sm">
            <p className="text-xs text-grey-600">
              Reporting: <strong>{reportTarget.title}</strong> by {reportTarget.donor_name}.
              Platform administrators review every report promptly.
            </p>

            {reportError && (
              <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
                {reportError}
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-grey-700 mb-1 block">
                Primary Reason for Report
              </label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full text-xs rounded border border-grey-300 p-2 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
                required
              >
                <option value="">Select a reason</option>
                <option value="Temperature / Storage Violation">Temperature / Inadequate Chilling</option>
                <option value="Spoiled or Damaged Food">Spoiled, Stale or Damaged Packaging</option>
                <option value="Undeclared Allergens / Inaccurate Description">Undeclared Allergens / Ingredient Misrepresentation</option>
                <option value="Inaccurate Quantity Claimed">Inaccurate Quantity Claimed</option>
                <option value="Donor Unresponsive or Unsafe Location">Donor Unresponsive or Unsafe Pickup Location</option>
                <option value="Other Policy Violation">Other Policy or Safety Violation</option>
              </select>
            </div>

            <Textarea
              label="Additional Information"
              value={reportDetail}
              onChange={(e) => setReportDetail(e.target.value)}
              placeholder="Describe what you observed upon inspection or pickup..."
            />
          </form>
        )}
      </Modal>
    </div>
  );
}
