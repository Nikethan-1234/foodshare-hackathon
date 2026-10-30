import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import api from "../../utils/api";
import { Card, CardHeader, CardTitle } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Input, Textarea } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Modal } from "../../components/ui/Modal";
import { Table, Thead, Th, Tbody, Tr, Td } from "../../components/ui/Table";
import { LoadingState } from "../../components/ui/LoadingState";
import { EmptyState } from "../../components/ui/EmptyState";
import { ErrorState } from "../../components/ui/ErrorState";
import {
  Repeat, Plus, Pause, Play, XCircle, Zap, Clock,
  Calendar, MapPin, AlertCircle, Building2, ShieldCheck, CheckCircle2
} from "lucide-react";

const DAY_OPTIONS = [
  { value: "0", label: "Every Monday" },
  { value: "1", label: "Every Tuesday" },
  { value: "2", label: "Every Wednesday" },
  { value: "3", label: "Every Thursday" },
  { value: "4", label: "Every Friday" },
  { value: "5", label: "Every Saturday" },
  { value: "6", label: "Every Sunday" },
];

export default function RecurringDonationsPage() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const isEligible = ["INSTITUTION", "RESTAURANT"].includes(profile?.donor_type);

  const [recurringList, setRecurringList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [createForm, setCreateForm] = useState({
    title: "",
    description: "",
    day_of_week: "0",
    usual_time: "14:00",
    expected_servings: "30",
    unit: "servings",
    pickup_location: profile?.address || "",
    pickup_window_hours: "3",
  });

  // Edit Servings Modal
  const [editItem, setEditItem] = useState(null);
  const [editServings, setEditServings] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const fetchRecurring = async () => {
    setIsLoading(true);
    setError("");
    try {
      const res = await api.get("/recurring/");
      setRecurringList(res.data.recurring || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load recurring donation series.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecurring();
  }, []);

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setIsSubmitting(true);
    try {
      await api.post("/recurring/", {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        day_of_week: parseInt(createForm.day_of_week, 10),
        usual_time: createForm.usual_time,
        expected_servings: parseInt(createForm.expected_servings, 10),
        unit: createForm.unit,
        pickup_location: createForm.pickup_location.trim(),
        pickup_window_hours: parseInt(createForm.pickup_window_hours, 10),
      });
      toast({ message: "Recurring donation schedule created successfully!", type: "success" });
      setIsCreateOpen(false);
      setCreateForm({
        title: "",
        description: "",
        day_of_week: "0",
        usual_time: "14:00",
        expected_servings: "30",
        unit: "servings",
        pickup_location: profile?.address || "",
        pickup_window_hours: "3",
      });
      fetchRecurring();
    } catch (err) {
      setFormError(err.response?.data?.error || "Failed to create recurring donation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const nextStatus = item.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    try {
      await api.put(`/recurring/${item.id}`, { status: nextStatus });
      toast({
        message: `Recurring schedule ${nextStatus === "ACTIVE" ? "resumed" : "paused"}.`,
        type: "success",
      });
      fetchRecurring();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to update series status.",
        type: "error",
      });
    }
  };

  const handleCancelSeries = async (item) => {
    if (!window.confirm(`Are you sure you want to cancel the series "${item.title}"?`)) return;
    try {
      await api.put(`/recurring/${item.id}`, { status: "CANCELLED" });
      toast({ message: "Recurring series cancelled.", type: "success" });
      fetchRecurring();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to cancel series.",
        type: "error",
      });
    }
  };

  const handleOpenEditServings = (item) => {
    setEditItem(item);
    setEditServings(String(item.expected_servings));
  };

  const handleSaveEditServings = async (e) => {
    e.preventDefault();
    if (!editItem) return;
    setIsSavingEdit(true);
    try {
      await api.put(`/recurring/${editItem.id}`, {
        expected_servings: parseInt(editServings, 10),
      });
      toast({ message: "Expected servings updated for upcoming listings.", type: "success" });
      setEditItem(null);
      fetchRecurring();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to update servings.",
        type: "error",
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleGenerateNow = async (item) => {
    try {
      const res = await api.post(`/recurring/${item.id}/generate`);
      toast({
        message: `Live listing generated! (${res.data.listing?.title})`,
        type: "success",
      });
      fetchRecurring();
    } catch (err) {
      toast({
        message: err.response?.data?.error || "Failed to generate live listing.",
        type: "error",
      });
    }
  };

  if (!isEligible) {
    return (
      <div className="p-4 md:p-6 max-w-4xl">
        <Card className="p-6 text-center">
          <Building2 className="h-10 w-10 text-grey-400 mx-auto mb-3" />
          <h2 className="text-lg font-semibold text-grey-900 mb-1">
            Institutional Feature
          </h2>
          <p className="text-sm text-grey-500 max-w-md mx-auto mb-4">
            Recurring donation schedules are reserved for institutional donors (churches, temples, hostels, canteens, function halls) and caterers with predictable weekly surplus.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-semibold text-grey-900 flex items-center gap-2">
            <Repeat className="h-5 w-5 text-green-600" />
            Recurring Donations
          </h1>
          <p className="text-sm text-grey-500">
            Set up predictable weekly surplus schedules. The system auto-generates live listings for local charities.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4" />
          New Schedule
        </Button>
      </div>

      {/* Info card */}
      <div className="mb-6 p-4 bg-sky-50 border border-sky-200 rounded text-xs text-sky-900 flex items-start gap-2.5">
        <Repeat className="h-4 w-4 mt-0.5 text-sky-700 flex-shrink-0" />
        <div>
          <strong>How Recurring Schedules Work:</strong> Institutional commitments help soup kitchens and food banks plan their weekly logistics in advance. You can adjust expected servings prior to each occurrence, pause during holidays, or trigger an on-demand listing dispatch anytime.
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Loading recurring schedules..." />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchRecurring} />
      ) : recurringList.length === 0 ? (
        <Card>
          <EmptyState
            icon={Repeat}
            title="No recurring schedules yet"
            message="Create a weekly recurring schedule for consistent post-service or post-event surplus donation."
            action={
              <Button onClick={() => setIsCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                Create First Schedule
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="hidden md:block">
            <Table>
              <Thead>
                <tr>
                  <Th>Schedule & Title</Th>
                  <Th>Frequency & Time</Th>
                  <Th>Expected Quantity</Th>
                  <Th>Pickup Location</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </Thead>
              <Tbody>
                {recurringList.map((item) => (
                  <Tr key={item.id}>
                    <Td className="font-semibold text-grey-900">
                      <div>{item.title}</div>
                      {item.description && (
                        <div className="text-xs text-grey-400 truncate max-w-xs">{item.description}</div>
                      )}
                    </Td>
                    <Td className="text-xs">
                      <div className="font-medium text-grey-800">{item.day_name}</div>
                      <div className="text-grey-400">at {item.usual_time} ({item.pickup_window_hours}h window)</div>
                    </Td>
                    <Td>
                      <span className="font-semibold text-grey-900">{item.expected_servings}</span>
                      <span className="text-grey-500 text-xs"> {item.unit}</span>
                      {item.status === "ACTIVE" && (
                        <button
                          onClick={() => handleOpenEditServings(item)}
                          className="ml-2 text-xs text-green-700 hover:underline"
                        >
                          Edit
                        </button>
                      )}
                    </Td>
                    <Td className="text-xs text-grey-600 max-w-xs truncate">
                      {item.pickup_location}
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                          item.status === "ACTIVE"
                            ? "bg-green-50 text-green-700 border-green-200"
                            : item.status === "PAUSED"
                            ? "bg-amber-50 text-amber-800 border-amber-200"
                            : "bg-grey-100 text-grey-500 border-grey-200"
                        }`}
                      >
                        {item.status}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        {item.status === "ACTIVE" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleGenerateNow(item)}
                            title="Generate a normal live listing right now"
                            className="text-green-700 border-green-200 hover:bg-green-50"
                          >
                            <Zap className="h-3.5 w-3.5" />
                            Dispatch Live
                          </Button>
                        )}
                        {item.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleToggleStatus(item)}
                            title={item.status === "ACTIVE" ? "Pause series" : "Resume series"}
                            className="p-2 rounded text-grey-500 hover:text-grey-900 hover:bg-grey-100 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            {item.status === "ACTIVE" ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                          </button>
                        )}
                        {item.status !== "CANCELLED" && (
                          <button
                            onClick={() => handleCancelSeries(item)}
                            title="Cancel series permanently"
                            className="p-2 rounded text-red-500 hover:bg-red-50 min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden space-y-3">
            {recurringList.map((item) => (
              <Card key={item.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-sm text-grey-900">{item.title}</h3>
                    <div className="text-xs text-grey-500 flex items-center gap-1 mt-0.5">
                      <Calendar className="h-3.5 w-3.5 text-grey-400" />
                      <span>{item.day_name} at {item.usual_time}</span>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${
                      item.status === "ACTIVE"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : item.status === "PAUSED"
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-grey-100 text-grey-500 border-grey-200"
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                <div className="text-xs text-grey-600 bg-grey-50 p-2.5 rounded border border-grey-200 space-y-1">
                  <div><strong>Expected:</strong> {item.expected_servings} {item.unit}</div>
                  <div className="truncate"><strong>Location:</strong> {item.pickup_location}</div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-grey-100">
                  {item.status === "ACTIVE" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleGenerateNow(item)}
                      className="text-green-700 border-green-200"
                    >
                      <Zap className="h-3.5 w-3.5" />
                      Dispatch Live
                    </Button>
                  )}
                  {item.status !== "CANCELLED" && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleToggleStatus(item)}
                    >
                      {item.status === "ACTIVE" ? "Pause" : "Resume"}
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create Recurring Donation Series"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubmit} isLoading={isSubmitting}>
              Create Schedule
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-sm">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-800 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
              <div>{formError}</div>
            </div>
          )}

          <Input
            label="Schedule Title"
            placeholder="e.g. Sunday Parish Lunch Surplus"
            value={createForm.title}
            onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
            required
          />

          <Textarea
            label="Description (Optional)"
            placeholder="Types of food typically donated, e.g. vegetarian stew, rice, and freshly baked bread."
            value={createForm.description}
            onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Day of the Week"
              options={DAY_OPTIONS}
              value={createForm.day_of_week}
              onChange={(e) => setCreateForm({ ...createForm, day_of_week: e.target.value })}
              required
            />
            <Input
              label="Usual Time"
              type="time"
              value={createForm.usual_time}
              onChange={(e) => setCreateForm({ ...createForm, usual_time: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Expected Servings"
              type="number"
              min="1"
              value={createForm.expected_servings}
              onChange={(e) => setCreateForm({ ...createForm, expected_servings: e.target.value })}
              required
            />
            <Input
              label="Pickup Window (Hours)"
              type="number"
              min="1"
              max="12"
              value={createForm.pickup_window_hours}
              onChange={(e) => setCreateForm({ ...createForm, pickup_window_hours: e.target.value })}
              required
            />
          </div>

          <Input
            label="Pickup Address / Hall Entrance"
            placeholder="Specific entrance or loading dock"
            value={createForm.pickup_location}
            onChange={(e) => setCreateForm({ ...createForm, pickup_location: e.target.value })}
            required
          />
        </form>
      </Modal>

      {/* Edit Servings Modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Edit Expected Servings"
        size="sm"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button variant="secondary" onClick={() => setEditItem(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEditServings} isLoading={isSavingEdit}>
              Save Servings
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveEditServings} className="space-y-3 text-sm">
          <p className="text-xs text-grey-500">
            Adjust the planned quantity for <strong>{editItem?.title}</strong> before the next occurrence goes live.
          </p>
          <Input
            label="Expected Servings"
            type="number"
            min="1"
            value={editServings}
            onChange={(e) => setEditServings(e.target.value)}
            required
          />
        </form>
      </Modal>
    </div>
  );
}
