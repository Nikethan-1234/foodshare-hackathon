import { useState, useEffect } from "react";
import { useToast } from "../../context/ToastContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../utils/api";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { RoleBadge } from "../../components/ui/Badge";
import { Table, Thead, Th, Tbody, Tr, Td } from "../../components/ui/Table";
import { Modal } from "../../components/ui/Modal";
import { EmptyState } from "../../components/ui/EmptyState";
import { LoadingState } from "../../components/ui/LoadingState";
import { ErrorState } from "../../components/ui/ErrorState";
import { formatDateTime } from "../../utils/format";
import {
  Users, Search, ShieldCheck, ShieldAlert, CheckCircle2,
  XCircle, Phone, Building2, MapPin
} from "lucide-react";

const ROLE_FILTERS = [
  { id: "ALL", label: "All Users" },
  { id: "donor", label: "Donors" },
  { id: "recipient", label: "Charities / Recipients" },
  { id: "admin", label: "Administrators" },
];

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Toggle user state modal
  const [toggleTarget, setToggleTarget] = useState(null);
  const [isToggling, setIsToggling] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setLoadError("");
    try {
      const res = await api.get("/users/");
      setUsers(res.data.users || []);
    } catch (err) {
      setLoadError("Failed to fetch registered platform users.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleConfirmToggleActive = async () => {
    if (!toggleTarget) return;
    setIsToggling(true);
    try {
      const res = await api.post(`/admin/users/${toggleTarget.id}/toggle-active`);
      toast({ message: res.data.message, type: "success" });
      setToggleTarget(null);
      fetchUsers();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to update user active status.",
        type: "error",
      });
    } finally {
      setIsToggling(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (selectedRole !== "ALL" && u.role !== selectedRole) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.organization_name && u.organization_name.toLowerCase().includes(q)) ||
      (u.contact_name && u.contact_name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900">User & Organization Registry</h1>
          <p className="text-sm text-grey-500">
            View registered donors and charity accounts, audit activity, and manage account authorization.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Role Filters */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {ROLE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSelectedRole(f.id)}
              className={`px-3 py-2 rounded text-xs font-medium whitespace-nowrap transition-colors min-h-[44px] ${
                selectedRole === f.id
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
            placeholder="Search email, organization, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded border border-grey-300 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 min-h-[44px]"
          />
          <Search className="h-3.5 w-3.5 text-grey-400 absolute left-3 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingState message="Loading users directory..." />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={fetchUsers} />
      ) : filteredUsers.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="No users found"
            message="No registered users match your search or role criteria."
          />
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden md:block">
            <Table>
              <Thead>
                <tr>
                  <Th>Organization & Contact</Th>
                  <Th>Account Email</Th>
                  <Th>Role</Th>
                  <Th>Phone & Address</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Account Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {filteredUsers.map((u) => {
                  const isSelf = currentUser && currentUser.id === u.id;
                  return (
                    <Tr key={u.id}>
                      <Td className="max-w-xs font-medium text-grey-900">
                        <div className="font-semibold text-sm">
                          {u.organization_name || u.email}
                        </div>
                        {u.contact_name && (
                          <div className="text-xs text-grey-500 mt-0.5">
                            Contact: {u.contact_name}
                          </div>
                        )}
                      </Td>
                      <Td className="text-xs font-mono text-grey-700">
                        {u.email}
                      </Td>
                      <Td>
                        <RoleBadge role={u.role} />
                      </Td>
                      <Td className="text-xs max-w-xs text-grey-600">
                        {u.phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3 text-grey-400" />
                            <span>{u.phone}</span>
                          </div>
                        )}
                        {u.address && (
                          <div className="flex items-center gap-1 truncate text-grey-500 mt-0.5">
                            <MapPin className="h-3 w-3 text-grey-400 flex-shrink-0" />
                            <span className="truncate">{u.address}</span>
                          </div>
                        )}
                        {!u.phone && !u.address && (
                          <span className="text-grey-300 italic">No phone/address</span>
                        )}
                      </Td>
                      <Td>
                        {u.is_active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
                            Suspended
                          </span>
                        )}
                      </Td>
                      <Td className="text-right whitespace-nowrap">
                        {!isSelf && (
                          <Button
                            variant={u.is_active ? "danger" : "secondary"}
                            size="sm"
                            onClick={() => setToggleTarget(u)}
                          >
                            {u.is_active ? "Suspend" : "Activate"}
                          </Button>
                        )}
                        {isSelf && (
                          <span className="text-xs text-grey-400 italic">
                            Current session
                          </span>
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden flex flex-col gap-3">
            {filteredUsers.map((u) => {
              const isSelf = currentUser && currentUser.id === u.id;
              return (
                <Card key={u.id} padding={false} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h3 className="font-semibold text-sm text-grey-900 leading-snug">
                        {u.organization_name || u.email}
                      </h3>
                      <div className="text-xs font-mono text-grey-500 mt-0.5">{u.email}</div>
                    </div>
                    <RoleBadge role={u.role} />
                  </div>

                  <div className="flex items-center justify-between text-xs text-grey-600 mb-3 bg-grey-50 p-2.5 rounded border border-grey-200">
                    <span>Contact: {u.contact_name || "—"}</span>
                    <span>{u.is_active ? "Status: Active" : "Status: Suspended"}</span>
                  </div>

                  {!isSelf && (
                    <div className="flex justify-end pt-2 border-t border-grey-100">
                      <Button
                        variant={u.is_active ? "danger" : "secondary"}
                        size="sm"
                        onClick={() => setToggleTarget(u)}
                      >
                        {u.is_active ? "Suspend Account" : "Activate Account"}
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </>
      )}

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!toggleTarget}
        onClose={() => setToggleTarget(null)}
        title={toggleTarget?.is_active ? "Suspend User Account" : "Reactivate User Account"}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setToggleTarget(null)}
              disabled={isToggling}
            >
              Cancel
            </Button>
            <Button
              variant={toggleTarget?.is_active ? "danger" : "primary"}
              onClick={handleConfirmToggleActive}
              isLoading={isToggling}
            >
              {toggleTarget?.is_active ? "Confirm Suspension" : "Confirm Activation"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3 text-sm">
          <p className="text-grey-700">
            {toggleTarget?.is_active ? (
              <>
                Are you sure you want to suspend <strong>{toggleTarget?.email}</strong> (<em>{toggleTarget?.organization_name}</em>)? They will no longer be able to log in or create listings and requests.
              </>
            ) : (
              <>
                Reactivate <strong>{toggleTarget?.email}</strong>? Their account access will be restored immediately.
              </>
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
}
