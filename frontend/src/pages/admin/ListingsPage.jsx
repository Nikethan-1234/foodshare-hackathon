import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, Thead, Th, Tbody, Tr, Td } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { PickupCountdown } from "../../components/ui/PickupCountdown";
import { formatDateTime } from "../../utils/format";
import {
  Search, Package, Building2, MapPin, AlertTriangle,
  Eye, XCircle, ShieldAlert, CheckCircle2
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Listings" },
  { id: "AVAILABLE", label: "Available" },
  { id: "RESERVED", label: "Reserved" },
  { id: "COMPLETED", label: "Completed" },
  { id: "EXPIRED", label: "Expired" },
  { id: "REMOVED", label: "Removed" },
];

export default function AdminListingsPage() {
  const { toast } = useToast();

  const [listings, setListings] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Removal Modal State
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removalReason, setRemovalReason] = useState("");
  const [removalError, setRemovalError] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);

  // Detail / Audit Modal State
  const [detailTarget, setDetailTarget] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchListings = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const url = selectedStatus === "ALL"
        ? "/admin/listings"
        : `/admin/listings?status=${selectedStatus}`;
      const res = await api.get(url);
      setListings(res.data.listings || []);
    } catch (err) {
      setLoadError("Failed to fetch listings for moderation.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [selectedStatus]);

  const handleOpenDetail = async (item) => {
    setDetailTarget(item);
    setDetailLoading(true);
    try {
      const res = await api.get(`/listings/${item.id}`);
      setDetailData(res.data.listing);
    } catch (err) {
      toast({ message: "Failed to load listing audit details.", type: "error" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleConfirmRemoval = async () => {
    if (!removeTarget) return;
    if (!removalReason.trim()) {
      setRemovalError("A removal reason is mandatory for moderator records.");
      return;
    }

    setIsRemoving(true);
    setRemovalError("");
    try {
      await api.post(`/admin/listings/${removeTarget.id}/remove`, {
        reason: removalReason.trim(),
      });
      toast({
        message: `Listing #${removeTarget.id} removed from the platform.`,
        type: "success",
      });
      setRemoveTarget(null);
      setRemovalReason("");
      fetchListings();
    } catch (err) {
      setRemovalError(err.response?.data?.error || "Failed to remove listing.");
    } finally {
      setIsRemoving(false);
    }
  };

  const filteredListings = listings.filter((l) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.title.toLowerCase().includes(q) ||
      (l.donor_name && l.donor_name.toLowerCase().includes(q)) ||
      (l.pickup_location && l.pickup_location.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">Platform Listings Moderation</h1>
          <p className="text-sm text-grey-500">
            Audit surplus listings across all donors, inspect claims, and take down non-compliant items.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status Filters */}
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
        <div className="sm:ml-auto w-full sm:w-72 relative">
          <input
            type="text"
            placeholder="Search by title, donor, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded border border-grey-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 min-h-[44px]"
          />
          <Search className="h-3.5 w-3.5 text-grey-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Loading listings..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchListings} />
      ) : filteredListings.length === 0 ? (
        <Card>
          <EmptyState
            icon={Package}
            title={selectedStatus === "ALL" ? "No listings found" : `No ${selectedStatus.toLowerCase()} listings`}
            message="No platform food listings match your current filters."
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <Thead>
                <tr>
                  <Th>ID & Food Title</Th>
                  <Th>Donor Organization</Th>
                  <Th>Quantity Left / Total</Th>
                  <Th>Pickup Window</Th>
                  <Th>Status</Th>
                  <Th>Requests</Th>
                  <Th className="text-right">Moderation</Th>
                </tr>
              </Thead>
              <Tbody>
                {filteredListings.map((l) => {
                  const canRemove = l.status !== "REMOVED";
                  return (
                    <Tr key={l.id}>
                      <Td className="max-w-xs font-medium text-grey-900">
                        <span className="text-xs text-grey-400 font-mono mr-1.5">#{l.id}</span>
                        <span className="font-semibold truncate">{l.title}</span>
                        <div className="text-xs text-grey-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 flex-shrink-0" />
                          <span>{l.pickup_location}</span>
                        </div>
                      </Td>
                      <Td className="text-xs font-medium text-grey-800">
                        <div className="flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-grey-400 flex-shrink-0" />
                          <span className="truncate">{l.donor_name || "Unknown Donor"}</span>
                        </div>
                      </Td>
                      <Td>
                        <span className="font-semibold text-grey-900">{l.quantity_left}</span>
                        <span className="text-grey-400"> / {l.quantity_total} {l.unit}</span>
                      </Td>
                      <Td className="text-xs">
                        <div>{formatDateTime(l.pickup_start)}</div>
                        <div className="text-grey-400">to {formatDateTime(l.pickup_end)}</div>
                        {["AVAILABLE", "RESERVED"].includes(l.status) && (
                          <div className="mt-1">
                            <PickupCountdown pickupEnd={l.pickup_end} />
                          </div>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={l.status} />
                      </Td>
                      <Td className="text-xs text-grey-600">
                        {l.requests_count} total
                        {l.pending_requests_count > 0 && (
                          <span className="ml-1 text-amber-700 font-semibold">({l.pending_requests_count} pending)</span>
                        )}
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleOpenDetail(l)}
                            title="Inspect listing and audit trail"
                            className="p-2 rounded text-grey-500 hover:text-grey-900 hover:bg-grey-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canRemove && (
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => {
                                setRemoveTarget(l);
                                setRemovalReason("");
                                setRemovalError("");
                              }}
                              title="Administrative removal"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          )}
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
            {filteredListings.map((l) => {
              const canRemove = l.status !== "REMOVED";
              return (
                <Card key={l.id} padding={false} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs text-grey-400 font-mono">#{l.id}</span>
                      <h3 className="font-semibold text-sm text-grey-900 leading-snug">
                        {l.title}
                      </h3>
                      <div className="text-xs text-grey-500 flex items-center gap-1 mt-0.5">
                        <Building2 className="h-3 w-3 text-grey-400" />
                        <span>{l.donor_name}</span>
                      </div>
                    </div>
                    <StatusBadge status={l.status} />
                  </div>

                  <div className="text-xs text-grey-700 font-semibold bg-grey-50 p-2 rounded border border-grey-200 mb-3">
                    Quantity: {l.quantity_left} of {l.quantity_total} {l.unit} • {l.requests_count} request(s)
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-grey-100">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenDetail(l)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect
                    </Button>
                    {canRemove && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          setRemoveTarget(l);
                          setRemovalReason("");
                          setRemovalError("");
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Administrative Removal Modal */}
      <Modal
        isOpen={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        title="Administrative Listing Removal"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRemoveTarget(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmRemoval}
              isLoading={isRemoving}
            >
              Confirm Removal
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
            <div>
              <strong>Moderator Action:</strong> Removing this listing will immediately set its status to <strong>REMOVED</strong>, remove it from charity search results, and auto-cancel any pending requests. This action is permanently logged in the audit trail.
            </div>
          </div>

          <p className="text-grey-800">
            Target: <strong>{removeTarget?.title}</strong> (#{removeTarget?.id}) from <em>{removeTarget?.donor_name}</em>
          </p>

          {removalError && (
            <div className="p-2 bg-red-50 text-red-700 text-xs rounded border border-red-200">
              {removalError}
            </div>
          )}

          <Textarea
            label="Mandatory Removal Reason"
            placeholder="e.g. Reported hygiene violation, non-compliant packaging, expired food item, or violation of platform donation rules."
            value={removalReason}
            onChange={(e) => setRemovalReason(e.target.value)}
            required
          />
        </div>
      </Modal>

      {/* Inspect & Audit Trail Modal */}
      <Modal
        isOpen={!!detailTarget}
        onClose={() => {
          setDetailTarget(null);
          setDetailData(null);
        }}
        title="Admin Inspection & Audit Trail"
        size="lg"
        footer={
          <Button
            variant="secondary"
            onClick={() => {
              setDetailTarget(null);
              setDetailData(null);
            }}
          >
            Close
          </Button>
        }
      >
        {detailLoading ? (
          <LoadingState message="Loading inspection record..." />
        ) : detailData ? (
          <div className="flex flex-col gap-4 text-xs">
            <div className="flex items-start justify-between border-b border-grey-200 pb-3">
              <div>
                <h3 className="font-semibold text-sm text-grey-900">{detailData.title}</h3>
                <p className="text-grey-500 mt-0.5">Offered by {detailData.donor_name} (ID #{detailData.id})</p>
              </div>
              <StatusBadge status={detailData.status} />
            </div>

            <div className="grid grid-cols-2 gap-3 bg-grey-50 p-3 rounded border border-grey-200">
              <div>
                <span className="text-grey-400 block">Total Quantity:</span>
                <span className="font-semibold text-grey-900">{detailData.quantity_total} {detailData.unit}</span>
              </div>
              <div>
                <span className="text-grey-400 block">Remaining:</span>
                <span className="font-semibold text-grey-900">{detailData.quantity_left} {detailData.unit}</span>
              </div>
              <div>
                <span className="text-grey-400 block">Prepared:</span>
                <span>{formatDateTime(detailData.prepared_at)}</span>
              </div>
              <div>
                <span className="text-grey-400 block">Use By:</span>
                <span>{formatDateTime(detailData.use_by)}</span>
              </div>
              <div className="col-span-2">
                <span className="text-grey-400 block">Pickup Location:</span>
                <span>{detailData.pickup_location}</span>
              </div>
            </div>

            {/* Requests breakdown */}
            <div>
              <h4 className="font-semibold text-grey-700 uppercase tracking-wide mb-2">
                Requests on this Listing ({detailData.requests?.length || 0})
              </h4>
              {(!detailData.requests || detailData.requests.length === 0) ? (
                <p className="text-grey-400 italic">No requests recorded.</p>
              ) : (
                <div className="divide-y divide-grey-100 border border-grey-200 rounded bg-white">
                  {detailData.requests.map((r) => (
                    <div key={r.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-grey-900">{r.recipient_name}</span>
                        <span className="text-grey-500 ml-1.5">({r.quantity} {detailData.unit})</span>
                        {r.note && <div className="text-grey-400 text-[11px] italic mt-0.5">"{r.note}"</div>}
                      </div>
                      <StatusBadge status={r.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status History Trail */}
            <div>
              <h4 className="font-semibold text-grey-700 uppercase tracking-wide mb-2">
                Status History Audit
              </h4>
              {(!detailData.status_history || detailData.status_history.length === 0) ? (
                <p className="text-grey-400 italic">No history records.</p>
              ) : (
                <div className="border border-grey-200 rounded divide-y divide-grey-100">
                  {detailData.status_history.map((h) => (
                    <div key={h.id} className="p-2.5 flex items-start justify-between">
                      <div>
                        <span className="font-medium text-grey-900">
                          {h.from_status ? `${h.from_status} → ${h.to_status}` : h.to_status}
                        </span>
                        {h.note && <div className="text-grey-500 text-[11px] mt-0.5">"{h.note}"</div>}
                      </div>
                      <span className="text-grey-400 whitespace-nowrap">{formatDateTime(h.created_at)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
