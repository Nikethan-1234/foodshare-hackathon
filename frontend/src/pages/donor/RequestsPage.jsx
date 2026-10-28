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
import { formatDateTime } from "../../utils/format";
import {
  Inbox, CheckCircle2, XCircle, Clock, MapPin, Building2,
  Phone, History, AlertCircle, Check
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Requests" },
  { id: "PENDING", label: "Pending Review" },
  { id: "ACCEPTED", label: "Accepted (Awaiting Pickup)" },
  { id: "COMPLETED", label: "Completed" },
  { id: "REJECTED", label: "Rejected" },
  { id: "CANCELLED", label: "Cancelled" },
];

export default function DonorRequestsPage() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [requests, setRequests] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Action states
  const [processingId, setProcessingId] = useState(null);

  // Reject Modal State
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // History Modal State
  const [historyTarget, setHistoryTarget] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchRequests = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const url = selectedStatus === "ALL"
        ? "/requests/donor"
        : `/requests/donor?status=${selectedStatus}`;
      const res = await api.get(url);
      setRequests(res.data.requests || []);
    } catch (err) {
      setLoadError("Failed to fetch incoming requests.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [selectedStatus]);

  const handleAccept = async (req) => {
    setProcessingId(req.id);
    try {
      await api.post(`/requests/${req.id}/accept`);
      toast({
        message: `Request from ${req.recipient_name} accepted. ${req.quantity} ${req.unit} reserved!`,
        type: "success",
      });
      fetchRequests();
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.error || "Failed to accept request.";
      toast({ message: msg, type: "error" });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectTarget) return;
    setIsRejecting(true);
    try {
      await api.post(`/requests/${rejectTarget.id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast({ message: "Request rejected.", type: "info" });
      setRejectTarget(null);
      setRejectReason("");
      fetchRequests();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to reject request.",
        type: "error",
      });
    } finally {
      setIsRejecting(false);
    }
  };

  const handleCompletePickup = async (req) => {
    setProcessingId(req.id);
    try {
      await api.post(`/requests/${req.id}/complete`);
      toast({
        message: `Pickup confirmed for ${req.recipient_name}! Marked as COMPLETED.`,
        type: "success",
      });
      fetchRequests();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to complete pickup.",
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
          <h1 className="text-xl font-semibold text-grey-900">Incoming Food Requests</h1>
          <p className="text-sm text-grey-500">
            Review charity requests, lock portions, coordinate pickups, and confirm collection.
          </p>
        </div>
        <Button variant="secondary" onClick={() => navigate("/donor/listings")}>
          View My Listings
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
        <LoadingState message="Loading incoming charity requests..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchRequests} />
      ) : requests.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title={selectedStatus === "ALL" ? "No incoming requests" : `No ${selectedStatus.toLowerCase()} requests`}
            message="When certified charities or shelters request food from your surplus listings, they will appear here for your review."
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <Thead>
                <tr>
                  <Th>Charity & Food Listing</Th>
                  <Th>Quantity</Th>
                  <Th>Pickup Window</Th>
                  <Th>Recipient Note</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {requests.map((r) => {
                  const isPending = r.status === "PENDING";
                  const isAccepted = r.status === "ACCEPTED";
                  const isWorking = processingId === r.id;

                  return (
                    <Tr key={r.id}>
                      <Td className="max-w-xs font-medium text-grey-900">
                        <div className="font-semibold text-sm text-grey-900">{r.recipient_name}</div>
                        <div className="text-xs text-grey-500 truncate mt-0.5">
                          Listing: <span className="font-medium text-grey-700">{r.listing_title}</span>
                        </div>
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
                        {r.note ? (
                          <span className="italic text-grey-600 line-clamp-2">"{r.note}"</span>
                        ) : (
                          <span className="text-grey-300 italic">No note provided</span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={r.status} />
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {isPending && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAccept(r)}
                                isLoading={isWorking}
                                title="Accept request and lock quantity"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Accept
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => {
                                  setRejectTarget(r);
                                  setRejectReason("");
                                }}
                                disabled={isWorking}
                                title="Reject request"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Reject
                              </Button>
                            </>
                          )}
                          {isAccepted && (
                            <Button
                              size="sm"
                              variant="primary"
                              onClick={() => handleCompletePickup(r)}
                              isLoading={isWorking}
                              className="bg-sky-600 hover:bg-sky-700 border-sky-700 text-white"
                              title="Mark as picked up by recipient"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Confirm Picked Up
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
              const isPending = r.status === "PENDING";
              const isAccepted = r.status === "ACCEPTED";
              const isWorking = processingId === r.id;

              return (
                <Card key={r.id} padding={false} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-sm text-grey-900 leading-snug">
                        {r.recipient_name}
                      </h3>
                      <div className="text-xs text-grey-500 mt-0.5">
                        Listing: <span className="font-medium text-grey-800">{r.listing_title}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <StatusBadge status={r.status} />
                      {isAccepted && <PickupCountdown pickupEnd={r.pickup_end} />}
                    </div>
                  </div>

                  <div className="text-xs text-grey-800 font-semibold bg-grey-50 px-2.5 py-1.5 rounded border border-grey-200 mb-2">
                    Requested: {r.quantity} {r.unit}
                  </div>

                  {r.note && (
                    <div className="text-xs text-grey-600 italic bg-white p-2.5 rounded border border-grey-200 mb-3">
                      "{r.note}"
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-grey-500 mb-3">
                    <Clock className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                    <span>Pickup: {formatDateTime(r.pickup_start)} – {formatDateTime(r.pickup_end)}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-grey-100">
                    <button
                      onClick={() => handleOpenHistory(r)}
                      title="View audit trail"
                      className="p-2 rounded text-grey-400 hover:text-grey-700 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                    >
                      <History className="h-4 w-4" />
                    </button>
                    {isPending && (
                      <>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => {
                            setRejectTarget(r);
                            setRejectReason("");
                          }}
                          disabled={isWorking}
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAccept(r)}
                          isLoading={isWorking}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Accept
                        </Button>
                      </>
                    )}
                    {isAccepted && (
                      <Button
                        size="sm"
                        onClick={() => handleCompletePickup(r)}
                        isLoading={isWorking}
                        className="bg-sky-600 hover:bg-sky-700 text-white border-sky-700"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirm Picked Up
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        title="Reject Food Request"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRejectTarget(null)}
              disabled={isRejecting}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmReject}
              isLoading={isRejecting}
            >
              Confirm Rejection
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-grey-700">
            Rejecting request from <strong>{rejectTarget?.recipient_name}</strong> for{" "}
            <strong>{rejectTarget?.quantity} {rejectTarget?.unit}</strong> of {rejectTarget?.listing_title}.
          </p>
          <Input
            label="Reason for rejection (optional)"
            placeholder="e.g. Quantity already promised to another shelter, kitchen closure"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
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
              <div className="font-semibold text-grey-900">{historyTarget?.recipient_name}</div>
              <div className="text-grey-500">
                {historyTarget?.quantity} {historyTarget?.unit} • {historyTarget?.listing_title}
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
