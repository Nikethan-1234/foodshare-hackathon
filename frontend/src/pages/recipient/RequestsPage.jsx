import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, Thead, Th, Tbody, Tr, Td } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { PickupCountdown } from "../../components/ui/PickupCountdown";
import { formatDateTime, formatTimeLeft } from "../../utils/format";
import {
  ClipboardList, Clock, MapPin, Building2, Phone,
  XCircle, AlertTriangle, ArrowRight, Package, CheckCircle2, History
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Requests" },
  { id: "PENDING", label: "Pending" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
  { id: "REJECTED", label: "Rejected" },
];

export default function RequestsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Cancel Modal State
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  // History Modal State
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const url = selectedStatus === "ALL"
        ? "/requests/mine"
        : `/requests/mine?status=${selectedStatus}`;
      const res = await api.get(url);
      setRequests(res.data.requests || []);
    } catch (err) {
      setLoadError("Failed to fetch your food requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedStatus]);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await api.post(`/requests/${cancelTarget.id}/cancel`, {
        reason: cancelReason.trim(),
      });
      toast({
        message: cancelTarget.status === "ACCEPTED"
          ? "Request cancelled. Portions have been returned to the donor listing."
          : "Request cancelled.",
        type: "success",
      });
      setCancelTarget(null);
      setCancelReason("");
      fetchRequests();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to cancel request.",
        type: "error",
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCompletePickup = async (req) => {
    setProcessingId(req.id);
    try {
      await api.post(`/requests/${req.id}/complete`);
      toast({
        message: `Pickup confirmed for ${req.listing_title}! Thank you for reducing food waste.`,
        type: "success",
      });
      fetchRequests();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to confirm pickup.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleOpenHistory = async (req) => {
    setHistoryTarget(req);
    setHistoryLoading(true);
    try {
      const res = await api.get(`/requests/${req.id}/history`);
      setHistoryList(res.data.history || []);
    } catch (err) {
      toast({ message: "Failed to load request audit history.", type: "error" });
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">My Food Requests</h1>
          <p className="text-sm text-grey-500">
            Track status of food requests, coordinate pickup schedules, and contact donors.
          </p>
        </div>
        <Button onClick={() => navigate("/recipient/browse")}>
          <Package className="h-4 w-4" />
          Browse Surplus Food
        </Button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 mb-6">
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

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Loading your food requests..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchRequests} />
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={ClipboardList}
            title={selectedStatus === "ALL" ? "No food requests yet" : `No ${selectedStatus.toLowerCase()} requests`}
            message="Browse available food donations from local restaurants and request portions for your community."
            action={
              <Button onClick={() => navigate("/recipient/browse")} size="sm">
                Browse Surplus Food
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
                  <Th>Food Item & Donor</Th>
                  <Th>Quantity</Th>
                  <Th>Pickup Window</Th>
                  <Th>Pickup Location & Contact</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {requests.map((r) => {
                  const isAccepted = r.status === "ACCEPTED";
                  const canCancel = ["PENDING", "ACCEPTED"].includes(r.status);
                  const isWorking = processingId === r.id;

                  return (
                    <Tr key={r.id}>
                      <Td className="max-w-xs font-medium text-grey-900">
                        <div className="font-semibold truncate">{r.listing_title}</div>
                        <div className="text-xs text-grey-500 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 flex-shrink-0" />
                          <span>{r.donor_name}</span>
                        </div>
                        {r.note && (
                          <div className="text-[11px] text-grey-400 italic truncate mt-1">
                            Note: "{r.note}"
                          </div>
                        )}
                      </Td>
                      <Td>
                        <span className="font-semibold text-grey-900">{r.quantity}</span>
                        <span className="text-grey-400 ml-1">{r.unit}</span>
                      </Td>
                      <Td className="text-xs">
                        <div>{formatDateTime(r.pickup_start)}</div>
                        <div className="text-grey-400">to {formatDateTime(r.pickup_end)}</div>
                        {isAccepted && (
                          <div className="mt-1">
                            <PickupCountdown pickupEnd={r.pickup_end} />
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs max-w-xs">
                        <div className="flex items-center gap-1 text-grey-700">
                          <MapPin className="h-3 w-3 text-grey-400 flex-shrink-0" />
                          <span className="truncate">{r.pickup_location}</span>
                        </div>
                        {r.donor_phone ? (
                          <div className="flex items-center gap-1 text-green-700 font-medium mt-0.5">
                            <Phone className="h-3 w-3 text-green-600 flex-shrink-0" />
                            <span>{r.donor_phone}</span>
                          </div>
                        ) : (
                          <div className="text-[10px] text-grey-400 italic mt-0.5">
                            🔒 Phone revealed upon acceptance
                          </div>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={r.status} />
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isAccepted && (
                            <Button
                              size="sm"
                              onClick={() => handleCompletePickup(r)}
                              isLoading={isWorking}
                              className="bg-sky-600 hover:bg-sky-700 border-sky-700 text-white"
                              title="Confirm food pickup received"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Confirm Received
                            </Button>
                          )}
                          {canCancel && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setCancelTarget(r);
                                setCancelReason("");
                              }}
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Cancel
                            </Button>
                          )}
                          <button
                            onClick={() => handleOpenHistory(r)}
                            title="View status history"
                            className="p-2 rounded text-grey-400 hover:text-grey-700 hover:bg-grey-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            <History className="h-4 w-4" />
                          </button>
                        </div>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden flex flex-col gap-3">
            {requests.map((r) => {
              const isAccepted = r.status === "ACCEPTED";
              const canCancel = ["PENDING", "ACCEPTED"].includes(r.status);
              const isWorking = processingId === r.id;

              return (
                <Card key={r.id} padding={false} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-sm text-grey-900 leading-snug">
                        {r.listing_title}
                      </h3>
                      <div className="text-xs text-grey-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-grey-400" />
                        <span>{r.donor_name}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={r.status} />
                      {isAccepted && <PickupCountdown pickupEnd={r.pickup_end} />}
                    </div>
                  </div>

                  <div className="text-xs text-grey-700 mb-3 font-semibold bg-grey-50 px-2.5 py-1.5 rounded border border-grey-200">
                    Requested: {r.quantity} {r.unit}
                  </div>

                  <div className="flex flex-col gap-1.5 text-xs text-grey-500 mb-4 bg-grey-50 p-2.5 rounded border border-grey-200">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                      <span>Pickup: {formatDateTime(r.pickup_start)} – {formatDateTime(r.pickup_end)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                      <span className="truncate">{r.pickup_location}</span>
                    </div>
                    {r.donor_phone ? (
                      <div className="flex items-center gap-1.5 text-green-700 font-medium">
                        <Phone className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
                        <span>{r.donor_phone}</span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-grey-400 italic">
                        🔒 Donor phone revealed upon request acceptance
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-grey-100">
                    <button
                      onClick={() => handleOpenHistory(r)}
                      title="View audit trail"
                      className="p-2 rounded text-grey-400 hover:text-grey-700 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    {isAccepted && (
                      <Button
                        size="sm"
                        onClick={() => handleCompletePickup(r)}
                        isLoading={isWorking}
                        className="bg-sky-600 hover:bg-sky-700 text-white border-sky-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirm Received
                      </Button>
                    )}
                    {canCancel && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setCancelTarget(r);
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

      {/* Cancellation Modal */}
      <Modal
        isOpen={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        title="Cancel Food Request"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setCancelTarget(null)}
              disabled={isCancelling}
            >
              Keep Request
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
        <div className="flex flex-col gap-3 text-sm">
          {cancelTarget?.status === "ACCEPTED" ? (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-700 flex-shrink-0" />
              <div>
                <strong>Notice:</strong> This request was already accepted by the donor. Cancelling it will immediately return <strong>{cancelTarget.quantity} {cancelTarget.unit}</strong> back to the donor's available surplus for other charities.
              </div>
            </div>
          ) : (
            <p className="text-grey-600 text-xs">
              This request is pending donor review. Cancelling will withdraw it from the donor's queue.
            </p>
          )}

          <p className="font-semibold text-grey-900">
            {cancelTarget?.listing_title} ({cancelTarget?.quantity} {cancelTarget?.unit})
          </p>

          <Input
            label="Reason for cancellation (optional)"
            placeholder="e.g. Schedule conflict, transportation unavailable"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </div>
      </Modal>

      {/* Audit History Modal */}
      <Modal
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title="Request Status History"
        size="md"
        footer={
          <Button variant="secondary" onClick={() => setHistoryTarget(null)}>
            Close
          </Button>
        }
      >
        {historyLoading ? (
          <LoadingState message="Loading status history..." />
        ) : (
          <div className="flex flex-col gap-3 text-xs">
            <div className="p-2.5 bg-grey-50 rounded border border-grey-200">
              <div className="font-semibold text-grey-900">{historyTarget?.listing_title}</div>
              <div className="text-grey-500">
                {historyTarget?.quantity} {historyTarget?.unit} from {historyTarget?.donor_name}
              </div>
            </div>

            <h4 className="font-semibold text-grey-700 uppercase tracking-wide">
              Audit Timeline
            </h4>

            {historyList.length === 0 ? (
              <p className="text-grey-400 italic">No audit records found.</p>
            ) : (
              <div className="border border-grey-200 rounded divide-y divide-grey-100">
                {historyList.map((h) => (
                  <div key={h.id} className="p-2.5 flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-grey-900">
                        {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                      </div>
                      {h.note && (
                        <div className="text-grey-500 italic mt-0.5">
                          "{h.note}"
                        </div>
                      )}
                    </div>
                    <span className="text-grey-400 whitespace-nowrap">
                      {formatDateTime(h.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
