import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { StatusBadge, EventLeftoverBadge } from "../../components/ui/Badge";
import { Table, Thead, Th, Tbody, Tr, Td } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { PickupCountdown } from "../../components/ui/PickupCountdown";
import { formatDateTime, formatTimeLeft } from "../../utils/format";
import { EventLeftoverQuickPostModal } from "../../components/donor/EventLeftoverModal";
import {
  Plus, Search, Edit3, XCircle, Clock, MapPin, Eye,
  AlertTriangle, Package, Calendar, Sparkles, HeartHandshake, Phone, Send, Zap
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PENDING_APPROVAL", label: "Pending Approval" },
  { id: "AVAILABLE", label: "Available" },
  { id: "RESERVED", label: "Reserved" },
  { id: "COMPLETED", label: "Completed" },
  { id: "EXPIRED", label: "Expired" },
  { id: "REMOVED", label: "Removed" },
];

export default function DonorListingsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [listings, setListings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isQuickPostOpen, setIsQuickPostOpen] = useState(false);

  // Cancel modal state
  const [cancelModalItem, setCancelModalItem] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // Detail / History modal state
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [fullDetail, setFullDetail] = useState(null);

  // AI Matchmaker state
  const [matchModalItem, setMatchModalItem] = useState(null);
  const [matchList, setMatchList] = useState([]);
  const [matchLoading, setMatchLoading] = useState(false);

  const handleOpenMatchmaking = async (item) => {
    setMatchModalItem(item);
    setMatchLoading(true);
    try {
      const res = await api.get(`/ai/matchmaking/${item.id}`);
      setMatchList(res.data.top_matches || []);
    } catch (err) {
      toast({ message: "Failed to compute charity matches.", type: "error" });
    } finally {
      setMatchLoading(false);
    }
  };

  const fetchListings = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const url = selectedStatus === "ALL"
        ? "/listings/mine"
        : `/listings/mine?status=${selectedStatus}`;
      const res = await api.get(url);
      setListings(res.data.listings || []);
    } catch (err) {
      setLoadError("Failed to fetch listings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedStatus]);

  const handleOpenDetail = async (item) => {
    setDetailModalItem(item);
    setDetailLoading(true);
    try {
      const res = await api.get(`/listings/${item.id}`);
      setFullDetail(res.data.listing);
    } catch (err) {
      toast({ message: "Failed to load listing details.", type: "error" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelModalItem) return;
    setIsCancelling(true);
    try {
      await api.post(`/listings/${cancelModalItem.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      toast({ message: "Listing cancelled successfully.", type: "success" });
      setCancelModalItem(null);
      setCancelReason("");
      fetchListings();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to cancel listing.",
        type: "error",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const filteredListings = listings.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      (l.description && l.description.toLowerCase().includes(q)) ||
      (l.pickup_location && l.pickup_location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">My Food Listings</h1>
          <p className="text-sm text-grey-500">
            Track surplus food listings, manage pickup times, and review requests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => setIsQuickPostOpen(true)}
            className="border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100 font-semibold"
          >
            <Zap className="h-4 w-4 text-amber-600 fill-amber-500" />
            Event Leftover
          </Button>
          <Button onClick={() => navigate("/donor/listings/new")}>
            <Plus className="h-4 w-4" />
            New Listing
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedStatus(f.id)}
              className={`px-3 py-2 rounded text-xs font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                selectedStatus === f.id
                  ? "bg-green-600 text-white"
                  : "bg-white text-grey-600 border border-grey-200 hover:bg-grey-50"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="sm:ml-auto w-full sm:w-64 relative">
          <input
            type="text"
            placeholder="Search listings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded border border-grey-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 min-h-[44px]"
          />
          <Search className="h-3.5 w-3.5 text-grey-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Loading your listings..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchListings} />
      ) : filteredListings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={selectedStatus === "ALL" ? "No listings yet" : `No ${selectedStatus.toLowerCase()} listings`}
            message="List surplus food to connect with local charities and shelters."
            action={
              <Button onClick={() => navigate("/donor/listings/new")} size="sm">
                <Plus className="h-4 w-4" />
                Create First Listing
              </Button>
            }
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <Thead>
                <tr>
                  <Th>Item & Title</Th>
                  <Th>Quantity Left / Total</Th>
                  <Th>Pickup Window</Th>
                  <Th>Use By</Th>
                  <Th>Status</Th>
                  <Th>Requests</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {filteredListings.map((item) => {
                  const canEdit = !["COMPLETED", "REMOVED", "EXPIRED"].includes(item.status);
                  const canCancel = !["COMPLETED", "REMOVED"].includes(item.status);
                  return (
                    <Tr key={item.id}>
                      <Td className="font-medium text-grey-900 max-w-xs">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="truncate font-semibold">{item.title}</span>
                          {item.is_event_leftover && <EventLeftoverBadge />}
                        </div>
                        <div className="text-xs text-grey-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span>{item.pickup_location}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="font-semibold text-grey-900">{item.quantity_left}</span>
                        <span className="text-grey-400"> / {item.quantity_total} {item.unit}</span>
                      </Td>
                      <Td className="text-xs">
                        <div>{formatDateTime(item.pickup_start)}</div>
                        <div className="text-grey-400">to {formatDateTime(item.pickup_end)}</div>
                        {["AVAILABLE", "RESERVED"].includes(item.status) && (
                          <div className="mt-1">
                            <PickupCountdown pickupEnd={item.pickup_end} />
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs">
                        <div>{formatDateTime(item.use_by)}</div>
                      </Td>
                      <Td>
                        <StatusBadge status={item.status} />
                      </Td>
                      <Td>
                        {item.pending_requests_count > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                            {item.pending_requests_count} pending
                          </span>
                        ) : (
                          <span className="text-xs text-grey-400">
                            {item.requests_count} total
                          </span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenMatchmaking(item)}
                            title="AI Charity Matchmaker & Dispatch"
                            className="p-2 rounded text-green-700 hover:bg-green-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            <Sparkles className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDetail(item)}
                            title="View details"
                            className="p-2 rounded text-grey-500 hover:text-grey-900 hover:bg-grey-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEdit && (
                            <button
                              onClick={() => navigate(`/donor/listings/${item.id}/edit`)}
                              title="Edit listing"
                              className="p-2 rounded text-grey-500 hover:text-green-700 hover:bg-green-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                          )}
                          {canCancel && (
                            <button
                              onClick={() => {
                                setCancelModalItem(item);
                                setCancelReason("");
                              }}
                              title="Cancel listing"
                              className="p-2 rounded text-grey-400 hover:text-red-700 hover:bg-red-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>

          {/* Mobile Card List View (< 768px) */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredListings.map((item) => {
              const canEdit = !["COMPLETED", "REMOVED", "EXPIRED"].includes(item.status);
              const canCancel = !["COMPLETED", "REMOVED"].includes(item.status);

              return (
                <Card key={item.id} padding={false} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex flex-col gap-1">
                      <h3 className="font-semibold text-sm text-grey-900 leading-snug">
                        {item.title}
                      </h3>
                      {item.is_event_leftover && <EventLeftoverBadge />}
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={item.status} />
                      {["AVAILABLE", "RESERVED"].includes(item.status) && (
                        <PickupCountdown pickupEnd={item.pickup_end} />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-grey-600 mb-3">
                    <span className="font-semibold text-grey-900">
                      {item.quantity_left} of {item.quantity_total} {item.unit}
                    </span>
                    {item.pending_requests_count > 0 && (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-medium">
                        {item.pending_requests_count} pending request(s)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-1 text-xs text-grey-500 mb-4 bg-grey-50 p-2.5 rounded border border-grey-200">
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

                  <div className="flex flex-wrap items-center justify-end gap-2 border-t border-grey-100 pt-3">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenMatchmaking(item)}
                      className="text-green-700 border-green-200 hover:bg-green-50"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Match
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDetail(item)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Details
                    </Button>
                    {canEdit && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/donor/listings/${item.id}/edit`)}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setCancelModalItem(item);
                          setCancelReason("");
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Cancel
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Cancellation Confirmation Modal */}
      <Modal
        isOpen={!!cancelModalItem}
        onClose={() => setCancelModalItem(null)}
        title="Cancel Food Listing"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelModalItem(null)}
              disabled={isCancelling}
            >
              Keep Listing
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmCancel}
              isLoading={isCancelling}
            >
              Confirm Cancellation
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-600" />
            <div>
              <strong>Are you sure?</strong> Cancelling this listing will mark it as <strong>REMOVED</strong> and automatically cancel any pending recipient pickup requests.
            </div>
          </div>
          <p className="text-sm text-grey-700">
            Cancelling: <strong className="text-grey-900">{cancelModalItem?.title}</strong>
          </p>
          <Input
            label="Reason for cancellation (optional)"
            placeholder="e.g. Spoilage, accidental double entry, kitchen power loss"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Detail / Audit Modal */}
      <Modal
        isOpen={!!detailModalItem}
        onClose={() => {
          setDetailModalItem(null);
          setFullDetail(null);
        }}
        title="Listing Details & History"
        size="lg"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setDetailModalItem(null);
              setFullDetail(null);
            }}
          >
            Close
          </Button>
        }
      >
        {detailLoading ? (
          <LoadingState message="Loading details..." />
        ) : fullDetail ? (
          <div className="flex flex-col gap-4 text-sm">
            <div className="flex items-start justify-between border-b border-grey-200 pb-3">
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="font-semibold text-base text-grey-900">{fullDetail.title}</h3>
                  {fullDetail.is_event_leftover && <EventLeftoverBadge />}
                </div>
                <p className="text-xs text-grey-500 mt-0.5">ID #{fullDetail.id}</p>
              </div>
              <StatusBadge status={fullDetail.status} />
            </div>

            {fullDetail.status === "PENDING_APPROVAL" && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded text-xs text-purple-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-purple-700 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Awaiting Administrator Review:</strong> As part of our trust and safety policy for individual donors, initial listings undergo moderator review before being published to local charities.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs bg-grey-50 p-3 rounded border border-grey-200">
              <div>
                <span className="text-grey-400 block">Total Quantity:</span>
                <span className="font-semibold text-grey-800">{fullDetail.quantity_total} {fullDetail.unit}</span>
              </div>
              <div>
                <span className="text-grey-400 block">Quantity Left:</span>
                <span className="font-semibold text-grey-800">{fullDetail.quantity_left} {fullDetail.unit}</span>
              </div>
              <div>
                <span className="text-grey-400 block">Prepared At:</span>
                <span className="font-medium text-grey-800">{formatDateTime(fullDetail.prepared_at)}</span>
              </div>
              <div>
                <span className="text-grey-400 block">Use By:</span>
                <span className="font-medium text-grey-800">{formatDateTime(fullDetail.use_by)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-grey-400 block">Pickup Window:</span>
                <span className="font-medium text-grey-800">
                  {formatDateTime(fullDetail.pickup_start)} — {formatDateTime(fullDetail.pickup_end)}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-grey-400 block">Pickup Location:</span>
                <span className="font-medium text-grey-800">{fullDetail.pickup_location}</span>
              </div>
            </div>

            {fullDetail.description && (
              <div>
                <h4 className="text-xs font-semibold text-grey-700 uppercase mb-1">Description</h4>
                <p className="text-xs text-grey-600 bg-white p-2.5 rounded border border-grey-200 leading-relaxed">
                  {fullDetail.description}
                </p>
              </div>
            )}

            {/* Requests on this listing */}
            <div>
              <h4 className="text-xs font-semibold text-grey-700 uppercase mb-2">
                Requests ({fullDetail.requests?.length || 0})
              </h4>
              {(!fullDetail.requests || fullDetail.requests.length === 0) ? (
                <p className="text-xs text-grey-400 italic">No recipient requests received for this listing yet.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {fullDetail.requests.map((r) => (
                    <div key={r.id} className="p-2.5 rounded border border-grey-200 bg-white flex items-center justify-between text-xs">
                      <div>
                        <span className="font-semibold text-grey-900">{r.recipient_name || `Recipient #${r.recipient_id}`}</span>
                        <span className="text-grey-500 ml-2">({r.quantity} {fullDetail.unit})</span>
                        {r.note && <div className="text-grey-500 text-[11px] mt-0.5 italic">"{r.note}"</div>}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Audit History */}
            {fullDetail.status_history && fullDetail.status_history.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-grey-700 uppercase mb-2">Status Audit Trail</h4>
                <div className="border border-grey-200 rounded divide-y divide-grey-100">
                  {fullDetail.status_history.map((h) => (
                    <div key={h.id} className="p-2 text-xs flex items-center justify-between">
                      <div>
                        <span className="font-medium text-grey-800">
                          {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                        </span>
                        {h.note && <span className="text-grey-400 ml-2">({h.note})</span>}
                      </div>
                      <span className="text-grey-400">{formatDateTime(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* AI Charity Matchmaker & Dispatch Modal */}
      <Modal
        isOpen={!!matchModalItem}
        onClose={() => setMatchModalItem(null)}
        title="AI Charity Matchmaker & Dispatch"
        size="lg"
        footer={
          <Button variant="secondary" onClick={() => setMatchModalItem(null)}>
            Close Matchmaker
          </Button>
        }
      >
        {matchLoading ? (
          <LoadingState message="Analyzing recipient capacities, proximity routes, and dietary profiles..." />
        ) : matchModalItem ? (
          <div className="flex flex-col gap-4 text-xs">
            <div className="p-3 bg-green-50/50 rounded border border-green-200">
              <div className="flex items-center gap-1.5 font-semibold text-green-900 mb-1">
                <Sparkles className="h-4 w-4 text-green-700" />
                <span>Optimal Charity Distribution Engine</span>
              </div>
              <p className="text-grey-600">
                Evaluating best-fit recipient shelters for <strong>{matchModalItem.title}</strong> ({matchModalItem.quantity_left} {matchModalItem.unit} available).
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {matchList.length === 0 ? (
                <p className="text-grey-400 italic py-4 text-center">No active partner charities found in network.</p>
              ) : (
                matchList.map((m) => (
                  <div
                    key={m.recipient_id}
                    className="p-3.5 rounded border border-grey-200 bg-white hover:border-green-300 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-grey-900">{m.organization_name}</span>
                        <span className="px-2 py-0.5 rounded font-bold text-xs bg-green-100 text-green-800 border border-green-300">
                          {m.match_score}% Match
                        </span>
                      </div>
                      <div className="text-grey-600 flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                        <span>Contact: <strong>{m.contact_name}</strong></span>
                        {m.phone && (
                          <span className="flex items-center gap-1 text-grey-500">
                            <Phone className="h-3 w-3" />
                            {m.phone}
                          </span>
                        )}
                        <span className="text-grey-500">{m.service_capacity}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.match_reasons.map((r, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded bg-grey-50 text-grey-600 border border-grey-200 text-[11px]">
                            ✓ {r}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 sm:self-center">
                      <Button
                        size="sm"
                        onClick={() => {
                          toast({
                            message: `Direct surplus dispatch alert sent to ${m.organization_name}!`,
                            type: "success",
                          });
                        }}
                      >
                        <Send className="h-3.5 w-3.5" />
                        Dispatch Alert
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Quick-Post Modal */}
      <EventLeftoverQuickPostModal
        isOpen={isQuickPostOpen}
        onClose={() => setIsQuickPostOpen(false)}
        onCreated={() => fetchListings()}
      />
    </div>
  );
}
