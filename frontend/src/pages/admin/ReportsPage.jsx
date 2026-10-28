import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/Badge";
import { Table, Thead, Th, Tbody, Tr, Td } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { formatDateTime } from "../../utils/format";
import {
  Flag, CheckCircle2, XCircle, AlertTriangle, Building2,
  Trash2, Eye, ShieldAlert, Check
} from "lucide-react";

const STATUS_FILTERS = [
  { id: "ALL", label: "All Reports" },
  { id: "OPEN", label: "Open (Action Required)" },
  { id: "REVIEWED", label: "Under Review" },
  { id: "RESOLVED", label: "Resolved" },
  { id: "DISMISSED", label: "Dismissed" },
];

export default function AdminReportsPage() {
  const { toast } = useToast();

  const [reports, setReports] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [processingId, setProcessingId] = useState(null);

  // Resolve with Removal Modal State
  const [removeReportTarget, setRemoveReportTarget] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  const fetchReports = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const url = selectedStatus === "ALL"
        ? "/admin/reports"
        : `/admin/reports?status=${selectedStatus}`;
      const res = await api.get(url);
      setReports(res.data.reports || []);
    } catch (err) {
      setLoadError("Failed to fetch moderation reports.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [selectedStatus]);

  const handleUpdateStatus = async (reportId, newStatus, action = null) => {
    setProcessingId(reportId);
    try {
      const res = await api.put(`/admin/reports/${reportId}`, {
        status: newStatus,
        action: action,
      });
      toast({
        message: res.data.listing_removed
          ? `Report marked ${newStatus} and offending listing removed.`
          : `Report status updated to ${newStatus}.`,
        type: "success",
      });
      fetchReports();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to update report status.",
        type: "error",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleConfirmResolveAndRemove = async () => {
    if (!removeReportTarget) return;
    setIsRemoving(true);
    try {
      await api.put(`/admin/reports/${removeReportTarget.id}`, {
        status: "RESOLVED",
        action: "remove_listing",
      });
      toast({
        message: `Report resolved and listing #${removeReportTarget.listing_id} taken down.`,
        type: "success",
      });
      setRemoveReportTarget(null);
      fetchReports();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to resolve report.",
        type: "error",
      });
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">Moderation Reports Queue</h1>
          <p className="text-sm text-grey-500">
            Handle community reports regarding food safety, hygiene, unresponsiveness, or inaccurate descriptions.
          </p>
        </div>
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
        <LoadingState message="Loading moderation queue..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchReports} />
      ) : reports.length === 0 ? (
        <Card>
          <EmptyState
            icon={Flag}
            title={selectedStatus === "ALL" ? "No reports on file" : `No ${selectedStatus.toLowerCase()} reports`}
            message="All food donations are currently in good standing."
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block">
            <Table>
              <Thead>
                <tr>
                  <Th>ID & Reason</Th>
                  <Th>Reported Listing & Donor</Th>
                  <Th>Reporter</Th>
                  <Th>Details / Notes</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {reports.map((r) => {
                  const isOpen = r.status === "OPEN";
                  const isReviewed = r.status === "REVIEWED";
                  const canTakeAction = isOpen || isReviewed;
                  const isWorking = processingId === r.id;

                  return (
                    <Tr key={r.id}>
                      <Td className="text-xs">
                        <span className="font-mono text-grey-400 mr-1">#{r.id}</span>
                        <span className="font-semibold text-grey-900 block">{r.reason}</span>
                        <span className="text-[11px] text-grey-400">{formatDateTime(r.created_at)}</span>
                      </Td>
                      <Td className="text-xs max-w-xs font-medium text-grey-900">
                        <div className="font-semibold truncate">{r.listing_title || `Listing #${r.listing_id}`}</div>
                        <div className="text-grey-500 flex items-center gap-1 mt-0.5">
                          <Building2 className="h-3 w-3 text-grey-400" />
                          <span>{r.donor_name || "Unknown Donor"}</span>
                        </div>
                        {r.listing_status && (
                          <div className="mt-1">
                            <StatusBadge status={r.listing_status} />
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs">
                        <div className="font-semibold text-grey-900">{r.reporter_name}</div>
                        <div className="text-grey-400">{r.reporter_email}</div>
                      </Td>
                      <Td className="text-xs max-w-xs">
                        {r.detail ? (
                          <p className="italic text-grey-700 bg-grey-50 p-2 rounded border border-grey-200 line-clamp-3">
                            "{r.detail}"
                          </p>
                        ) : (
                          <span className="text-grey-400 italic">No additional detail</span>
                        )}
                      </Td>
                      <Td>
                        <StatusBadge status={r.status} />
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {canTakeAction && (
                            <>
                              {isOpen && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  onClick={() => handleUpdateStatus(r.id, "REVIEWED")}
                                  disabled={isWorking}
                                  title="Mark as under review"
                                >
                                  Review
                                </Button>
                              )}
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => setRemoveReportTarget(r)}
                                disabled={isWorking}
                                title="Resolve report and remove offending listing"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Resolve & Takedown
                              </Button>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={() => handleUpdateStatus(r.id, "DISMISSED")}
                                disabled={isWorking}
                                title="Dismiss as non-violating"
                              >
                                <XCircle className="h-3.5 w-3.5" />
                                Dismiss
                              </Button>
                            </>
                          )}
                          {!canTakeAction && (
                            <span className="text-xs text-grey-400 italic">
                              Closed ({r.reviewer_email || "Admin"})
                            </span>
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
            {reports.map((r) => {
              const isOpen = r.status === "OPEN";
              const isReviewed = r.status === "REVIEWED";
              const canTakeAction = isOpen || isReviewed;
              const isWorking = processingId === r.id;

              return (
                <Card key={r.id} padding={false} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-xs text-grey-400 font-mono">Report #{r.id}</span>
                      <h3 className="font-semibold text-sm text-grey-900 leading-snug">
                        {r.reason}
                      </h3>
                      <div className="text-xs text-grey-500 mt-0.5">
                        Listing: <strong className="text-grey-800">{r.listing_title}</strong>
                      </div>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>

                  {r.detail && (
                    <div className="text-xs text-grey-700 italic bg-grey-50 p-2.5 rounded border border-grey-200 mb-3">
                      "{r.detail}"
                    </div>
                  )}

                  <div className="text-xs text-grey-400 mb-3">
                    Filer: {r.reporter_name} • {formatDateTime(r.created_at)}
                  </div>

                  {canTakeAction && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-grey-100">
                      {isOpen && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => handleUpdateStatus(r.id, "REVIEWED")}
                          disabled={isWorking}
                        >
                          Review
                        </Button>
                      )}
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setRemoveReportTarget(r)}
                        disabled={isWorking}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Takedown
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleUpdateStatus(r.id, "DISMISSED")}
                        disabled={isWorking}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmation Modal for Resolve & Takedown */}
      <Modal
        isOpen={!!removeReportTarget}
        onClose={() => setRemoveReportTarget(null)}
        title="Resolve Report & Takedown Listing"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setRemoveReportTarget(null)}
              disabled={isRemoving}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleConfirmResolveAndRemove}
              isLoading={isRemoving}
            >
              Confirm Takedown & Resolve
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-900 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-red-600 flex-shrink-0" />
            <div>
              <strong>Moderation Action:</strong> This will mark report #{removeReportTarget?.id} as <strong>RESOLVED</strong> and immediately take down the offending food listing (<strong>{removeReportTarget?.listing_title}</strong>).
            </div>
          </div>
          <p className="text-xs text-grey-600">
            Report Reason: <strong>{removeReportTarget?.reason}</strong>
          </p>
          {removeReportTarget?.detail && (
            <p className="text-xs text-grey-500 italic bg-grey-50 p-2.5 rounded border border-grey-200">
              "{removeReportTarget?.detail}"
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
