import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, Send, XCircle, LayoutGrid, List } from 'lucide-react';
import { tripsApi } from '../../api/trips.api';
import { vehiclesApi } from '../../api/vehicles.api';
import { driversApi } from '../../api/drivers.api';
import { TripStatus, TRIP_STATUS_COLORS } from '../../lib/constants';
import { cn, extractError, formatDate, formatNumber, zodErrorMap } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';

// ── Schemas ────────────────────────────────────────────────────────────────────
const createTripSchema = z.object({
  source: z.string().trim().min(1, 'Source is required'),
  destination: z.string().trim().min(1, 'Destination is required'),
  vehicleId: z.string().min(1, 'Vehicle is required'),
  driverId: z.string().min(1, 'Driver is required'),
  cargoWeight: z.coerce.number().positive('Must be a positive number'),
  plannedDistance: z.coerce.number().positive('Must be a positive number'),
  revenue: z.coerce.number().min(0).optional(),
});

const completeTripSchema = z.object({
  finalOdometer: z.coerce.number().positive('Final odometer is required'),
  fuelConsumed: z.coerce.number().positive('Fuel consumed is required'),
  actualDistance: z.coerce.number().positive().optional(),
  revenue: z.coerce.number().min(0).optional(),
});

// ── Table columns ─────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'route', label: 'Source → Destination', sortable: false,
    render: (row) => (
      <div>
        <p className="text-sm text-ink font-medium">{row.source}</p>
        <p className="text-xs text-ink-muted">→ {row.destination}</p>
      </div>
    ),
  },
  {
    key: 'vehicle', label: 'Vehicle', sortable: false,
    render: (row) => (
      <div>
        <p className="text-xs text-ink">{row.vehicle?.name ?? '—'}</p>
        <p className="text-xs text-ink-muted font-mono">{row.vehicle?.registrationNumber}</p>
      </div>
    ),
  },
  {
    key: 'driver', label: 'Driver', sortable: false,
    render: (row) => <span className="text-xs text-ink">{row.driver?.name ?? '—'}</span>,
  },
  {
    key: 'cargoWeight', label: 'Cargo (t)', sortable: false,
    render: (row) => <span className="font-mono text-xs">{formatNumber(row.cargoWeight, 2)}</span>,
  },
  {
    key: 'plannedDistance', label: 'Planned (km)', sortable: false,
    render: (row) => <span className="font-mono text-xs">{formatNumber(row.plannedDistance, 1)}</span>,
  },
  {
    key: 'status', label: 'Status', sortable: true,
    render: (row) => <Badge label={row.status} colorConfig={TRIP_STATUS_COLORS[row.status]} />,
  },
  {
    key: 'draftedAt', label: 'Created', sortable: true,
    render: (row) => <span className="text-xs text-ink-muted">{formatDate(row.draftedAt ?? row.createdAt)}</span>,
  },
];

// ── CreateTripForm ─────────────────────────────────────────────────────────────
function CreateTripForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    source: '', destination: '', vehicleId: '', driverId: '',
    cargoWeight: '', plannedDistance: '', revenue: '',
  });
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loadingDropdowns, setLoadingDropdowns] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [vRes, dRes] = await Promise.all([
          vehiclesApi.listAvailable(),
          driversApi.listAvailable(),
        ]);
        // Backend: { success, data: { items: [...], pagination: {...} } }
        const vPayload = vRes.data.data;
        const dPayload = dRes.data.data;
        setVehicles(Array.isArray(vPayload.items) ? vPayload.items : []);
        setDrivers(Array.isArray(dPayload.items) ? dPayload.items : []);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoadingDropdowns(false);
      }
    };
    load();
  }, []);

  const set = (field) => (e) => {
    const value = e.target.value;
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
    if (field === 'vehicleId') {
      setSelectedVehicle(vehicles.find((v) => v.id === value) ?? null);
      setErrors((p) => ({ ...p, cargoWeight: undefined }));
    }
  };

  const cargoWeightNum = parseFloat(form.cargoWeight);
  const capacityExceeded =
    selectedVehicle &&
    !isNaN(cargoWeightNum) &&
    cargoWeightNum > parseFloat(selectedVehicle.maxLoadCapacity);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (capacityExceeded) {
      setErrors((p) => ({
        ...p,
        cargoWeight: `Exceeds vehicle capacity of ${selectedVehicle.maxLoadCapacity} t`,
      }));
      return;
    }
    // Build payload — omit empty optional revenue
    const payload = { ...form };
    if (!payload.revenue) delete payload.revenue;
    const result = createTripSchema.safeParse(payload);
    if (!result.success) { setErrors(zodErrorMap(result.error)); return; }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate id="create-trip-form">
      <div className="grid grid-cols-2 gap-4">
        <Input id="trip-source" label="Source" value={form.source} onChange={set('source')}
          error={errors.source} placeholder="Mumbai" />
        <Input id="trip-destination" label="Destination" value={form.destination}
          onChange={set('destination')} error={errors.destination} placeholder="Pune" />
      </div>

      {/* Vehicle select */}
      <div>
        <label htmlFor="trip-vehicleId" className="form-label">
          Vehicle
          {selectedVehicle && (
            <span className="text-ink-subtle normal-case tracking-normal font-normal ml-1">
              — capacity: <span className="font-mono text-accent">{selectedVehicle.maxLoadCapacity} t</span>
            </span>
          )}
        </label>
        <select
          id="trip-vehicleId"
          className={cn('form-input', errors.vehicleId && 'form-input-error')}
          value={form.vehicleId}
          onChange={set('vehicleId')}
          disabled={loadingDropdowns}
        >
          <option value="">{loadingDropdowns ? 'Loading…' : 'Select available vehicle'}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.registrationNumber}) — {v.maxLoadCapacity}t
            </option>
          ))}
        </select>
        {errors.vehicleId && <p className="field-error">{errors.vehicleId}</p>}
        {vehicles.length === 0 && !loadingDropdowns && (
          <p className="text-xs text-status-inshop mt-1">No available vehicles.</p>
        )}
      </div>

      {/* Driver select */}
      <div>
        <label htmlFor="trip-driverId" className="form-label">Driver</label>
        <select
          id="trip-driverId"
          className={cn('form-input', errors.driverId && 'form-input-error')}
          value={form.driverId}
          onChange={set('driverId')}
          disabled={loadingDropdowns}
        >
          <option value="">{loadingDropdowns ? 'Loading…' : 'Select available driver'}</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name} — {d.licenseCategory}
            </option>
          ))}
        </select>
        {errors.driverId && <p className="field-error">{errors.driverId}</p>}
        {drivers.length === 0 && !loadingDropdowns && (
          <p className="text-xs text-status-inshop mt-1">No available drivers.</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Input id="cargoWeight" label="Cargo Weight (tonnes)" type="number" step="0.01" min="0"
            value={form.cargoWeight} onChange={set('cargoWeight')} error={errors.cargoWeight} />
          {capacityExceeded && !errors.cargoWeight && (
            <p className="field-error">Exceeds vehicle max ({selectedVehicle.maxLoadCapacity} t)</p>
          )}
        </div>
        <Input id="plannedDistance" label="Planned Distance (km)" type="number" step="0.1" min="0"
          value={form.plannedDistance} onChange={set('plannedDistance')} error={errors.plannedDistance} />
      </div>

      <Input id="trip-revenue" label="Revenue (₹) — optional" type="number" step="1" min="0"
        value={form.revenue} onChange={set('revenue')} error={errors.revenue} />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Create Trip</Button>
      </div>
    </form>
  );
}

// ── CompleteTripForm ──────────────────────────────────────────────────────────
function CompleteTripForm({ trip, onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    finalOdometer: '', fuelConsumed: '', actualDistance: '', revenue: trip?.revenue ?? '',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      finalOdometer: form.finalOdometer,
      fuelConsumed: form.fuelConsumed,
      ...(form.actualDistance && { actualDistance: form.actualDistance }),
      ...(form.revenue !== '' && form.revenue != null && { revenue: form.revenue }),
    };
    const result = completeTripSchema.safeParse(payload);
    if (!result.success) { setErrors(zodErrorMap(result.error)); return; }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate id="complete-trip-form">
      <div className="p-3 bg-base-800 rounded border border-base-700 text-xs text-ink-muted">
        <p><span className="text-ink font-medium">Trip:</span> {trip?.source} → {trip?.destination}</p>
        <p><span className="text-ink font-medium">Vehicle:</span> {trip?.vehicle?.name} ({trip?.vehicle?.registrationNumber})</p>
        <p><span className="text-ink font-medium">Planned:</span> {formatNumber(trip?.plannedDistance, 1)} km</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="finalOdometer" label="Final Odometer (km)" type="number" step="0.1" min="0"
          value={form.finalOdometer} onChange={set('finalOdometer')} error={errors.finalOdometer} />
        <Input id="fuelConsumed" label="Fuel Consumed (L)" type="number" step="0.1" min="0"
          value={form.fuelConsumed} onChange={set('fuelConsumed')} error={errors.fuelConsumed} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="actualDistance" label="Actual Distance (km) — optional" type="number" step="0.1" min="0"
          value={form.actualDistance} onChange={set('actualDistance')} error={errors.actualDistance} />
        <Input id="complete-revenue" label="Revenue (₹) — optional" type="number" step="1" min="0"
          value={form.revenue} onChange={set('revenue')} error={errors.revenue} />
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Mark Complete</Button>
      </div>
    </form>
  );
}

// ── Trip Action Buttons ────────────────────────────────────────────────────────
function TripActions({ row, canWrite, onDispatch, onComplete, onCancel }) {
  if (!canWrite) return null;
  return (
    <div className="flex items-center gap-1">
      {row.status === TripStatus.Draft && (
        <>
          <button onClick={() => onDispatch(row)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-status-dispatched hover:bg-base-800 transition-colors"
            title="Dispatch">
            <Send className="w-3.5 h-3.5" /> Dispatch
          </button>
          <button onClick={() => onCancel(row)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-status-suspended hover:bg-base-800 transition-colors"
            title="Cancel">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </>
      )}
      {row.status === TripStatus.Dispatched && (
        <>
          <button onClick={() => onComplete(row)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-status-completed hover:bg-base-800 transition-colors"
            title="Complete">
            <CheckCircle className="w-3.5 h-3.5" /> Complete
          </button>
          <button onClick={() => onCancel(row)}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-status-suspended hover:bg-base-800 transition-colors"
            title="Cancel">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}

// ── TripCard Component ───────────────────────────────────────────────────────
function TripCard({ trip, canWrite, onDragStart, onDispatch, onComplete, onCancel }) {
  const statusColor = TRIP_STATUS_COLORS[trip.status];

  const getETA = (trip) => {
    if (trip.status === 'Draft') {
      return `Est. Transit: ~${Math.round(trip.plannedDistance / 60)} hrs`;
    }
    if (trip.status === 'Dispatched' && trip.dispatchedAt) {
      const dispatchTime = new Date(trip.dispatchedAt).getTime();
      const transitMs = (trip.plannedDistance / 60) * 3600 * 1000;
      const etaDate = new Date(dispatchTime + transitMs);
      return `ETA: ${etaDate.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}, ${etaDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (trip.status === 'Completed' && trip.completedAt) {
      return `Completed: ${formatDate(trip.completedAt)}`;
    }
    if (trip.status === 'Cancelled' && trip.cancelledAt) {
      return `Cancelled: ${formatDate(trip.cancelledAt)}`;
    }
    return `Transit: ~${Math.round(trip.plannedDistance / 60)} hrs`;
  };

  return (
    <div
      draggable={canWrite && (trip.status === 'Draft' || trip.status === 'Dispatched')}
      onDragStart={(e) => onDragStart(e, trip)}
      className={cn(
        "bg-base-900 border border-base-700 rounded-lg p-3 space-y-2 select-none shadow-sm transition-all duration-150",
        canWrite && (trip.status === 'Draft' || trip.status === 'Dispatched') ? "cursor-grab active:cursor-grabbing hover:border-accent/40" : "cursor-default"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-2xs text-ink-subtle">
          ID: {trip.id.substring(0, 8)}...
        </span>
        {canWrite && (trip.status === 'Draft' || trip.status === 'Dispatched') && (
          <div className="text-ink-subtle group hover:text-accent">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-grip-vertical"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs text-ink font-semibold flex items-center gap-1.5 flex-wrap">
          <span>{trip.source}</span>
          <span className="text-ink-subtle">→</span>
          <span>{trip.destination}</span>
        </p>
      </div>

      <div className="space-y-1 text-2xs text-ink-muted border-t border-base-800 pt-2">
        <div className="flex justify-between">
          <span>Vehicle:</span>
          <span className="font-mono text-ink font-medium">{trip.vehicle?.name || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span>Driver:</span>
          <span className="text-ink font-medium">{trip.driver?.name || '—'}</span>
        </div>
        <div className="flex justify-between">
          <span>Cargo Weight:</span>
          <span className="font-mono text-ink font-medium">{formatNumber(trip.cargoWeight, 2)} t</span>
        </div>
        <div className="flex justify-between text-accent font-semibold pt-0.5">
          <span>{trip.status === 'Draft' ? 'Est. Duration' : trip.status === 'Dispatched' ? 'ETA' : 'Timeline'}:</span>
          <span className="text-right">{getETA(trip)}</span>
        </div>
      </div>

      {canWrite && (trip.status === 'Draft' || trip.status === 'Dispatched') && (
        <div className="mt-2 pt-2 border-t border-base-800 flex justify-end gap-1">
          {trip.status === 'Draft' && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDispatch(trip); }}
                className="text-3xs px-2 py-1 rounded bg-status-dispatched-bg text-status-dispatched border border-status-dispatched/20 font-medium hover:bg-status-dispatched/20 transition-colors"
              >
                Dispatch
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCancel(trip); }}
                className="text-3xs px-2 py-1 rounded bg-status-cancelled-bg text-status-cancelled border border-status-cancelled/20 font-medium hover:bg-status-cancelled/20 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
          {trip.status === 'Dispatched' && (
            <>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onComplete(trip); }}
                className="text-3xs px-2 py-1 rounded bg-status-completed-bg text-status-completed border border-status-completed/20 font-medium hover:bg-status-completed/20 transition-colors"
              >
                Complete
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onCancel(trip); }}
                className="text-3xs px-2 py-1 rounded bg-status-cancelled-bg text-status-cancelled border border-status-cancelled/20 font-medium hover:bg-status-cancelled/20 transition-colors"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const TRIP_STATUS_OPTIONS = Object.values(TripStatus);

export default function TripsPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'Dispatcher';

  const [rows, setRows] = useState([]);
  // Backend pagination shape: { total, page, limit, totalPages }
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');
  const [dragOverCol, setDragOverCol] = useState(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [completeTrip, setCompleteTrip] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    const callId = ++fetchRef.current;
    try {
      const params = { page, limit: 20, sortBy, sortOrder };
      if (filterStatus) params.status = filterStatus;

      const { data } = await tripsApi.list(params);
      if (callId !== fetchRef.current) return;

      // Backend returns: { success, data: { items: [...], pagination: { total, page, limit, totalPages } } }
      const payload = data.data;
      setRows(Array.isArray(payload.items) ? payload.items : []);
      if (payload.pagination) setPagination(payload.pagination);
    } catch (err) {
      if (callId !== fetchRef.current) return;
      toast.error(extractError(err));
    } finally {
      if (callId === fetchRef.current) {
        setLoading(false);
      }
    }
  }, [page, sortBy, sortOrder, filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col, order) => { setSortBy(col); setSortOrder(order); setPage(1); };

  const handleCreate = async (formData) => {
    setActionLoading(true);
    try {
      await tripsApi.create(formData);
      toast.success('Trip created');
      setCreateOpen(false);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispatch = async (trip) => {
    setActionLoading(true);
    try {
      await tripsApi.dispatch(trip.id);
      toast.success('Trip dispatched');
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleComplete = async (formData) => {
    setActionLoading(true);
    try {
      await tripsApi.complete(completeTrip.id, formData);
      toast.success('Trip completed');
      setCompleteTrip(null);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (trip) => {
    if (!window.confirm(`Cancel trip: ${trip.source} → ${trip.destination}?`)) return;
    setActionLoading(true);
    try {
      await tripsApi.cancel(trip.id);
      toast.success('Trip cancelled');
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setActionLoading(false);
    }
  };

  const actionColumn = {
    key: '_actions', label: '',
    render: (row) => (
      <TripActions
        row={row}
        canWrite={canWrite}
        onDispatch={handleDispatch}
        onComplete={() => setCompleteTrip(row)}
        onCancel={handleCancel}
      />
    ),
  };

  // Drag and drop mechanics
  const handleDragStart = (e, trip) => {
    e.dataTransfer.setData('text/plain', trip.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, status) => {
    e.preventDefault();
    if (dragOverCol !== status) {
      setDragOverCol(status);
    }
  };

  const handleDragLeave = (e) => {
    setDragOverCol(null);
  };

  const handleDrop = (e, targetStatus) => {
    e.preventDefault();
    setDragOverCol(null);
    const tripId = e.dataTransfer.getData('text/plain');
    const trip = rows.find((r) => r.id === tripId);
    if (!trip) return;

    if (!canWrite) {
      toast.error('You do not have permission to dispatch or edit trips.');
      return;
    }

    if (trip.status === targetStatus) return;

    const VALID_TRANSITIONS = {
      Draft: ['Dispatched', 'Cancelled'],
      Dispatched: ['Completed', 'Cancelled'],
      Completed: [],
      Cancelled: [],
    };

    const allowed = VALID_TRANSITIONS[trip.status] || [];
    if (!allowed.includes(targetStatus)) {
      toast.error(`Invalid transition: Cannot move trip directly from ${trip.status} to ${targetStatus}`);
      return;
    }

    if (targetStatus === 'Dispatched') {
      handleDispatch(trip);
    } else if (targetStatus === 'Cancelled') {
      handleCancel(trip);
    } else if (targetStatus === 'Completed') {
      setCompleteTrip(trip);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">Trip Dispatcher</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            {pagination.total} trip{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        {canWrite && (
          <Button onClick={() => setCreateOpen(true)} size="md" id="create-trip-btn">
            <Plus className="w-4 h-4" /> New Trip
          </Button>
        )}
      </div>

      {/* Filters and Toggle */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        {/* Status filter pills */}
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => { setFilterStatus(''); setPage(1); }}
            className={cn(
              'px-3 py-1 rounded text-xs font-medium transition-colors',
              !filterStatus ? 'bg-accent text-white' : 'bg-base-800 text-ink-muted hover:text-ink',
            )}
            id="trip-filter-all"
          >
            All
          </button>
          {TRIP_STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setFilterStatus(s); setPage(1); }}
              className={cn(
                'px-3 py-1 rounded text-xs font-medium transition-colors',
                filterStatus === s
                  ? cn(TRIP_STATUS_COLORS[s]?.bg, TRIP_STATUS_COLORS[s]?.text)
                  : 'bg-base-800 text-ink-muted hover:text-ink',
              )}
              id={`trip-filter-${s.toLowerCase()}`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* View Toggle */}
        <div className="flex items-center border border-base-700 rounded h-8 overflow-hidden">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              "px-3 h-full flex items-center gap-1 text-xs transition-colors font-medium",
              viewMode === 'list' ? "bg-base-700 text-ink" : "text-ink-subtle hover:text-ink hover:bg-base-800"
            )}
            title="List View"
            id="trip-view-list"
          >
            <List className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={cn(
              "px-3 h-full flex items-center gap-1 text-xs transition-colors font-medium",
              viewMode === 'kanban' ? "bg-base-700 text-ink" : "text-ink-subtle hover:text-ink hover:bg-base-800"
            )}
            title="Kanban Board"
            id="trip-view-kanban"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Kanban</span>
          </button>
        </div>
      </div>

      {/* Table / Kanban Grid */}
      {viewMode === 'list' ? (
        <div className="bg-base-900 border border-base-700 rounded-lg overflow-hidden">
          <Table
            columns={[...COLUMNS, actionColumn]}
            rows={rows}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyMessage="No trips match your filters."
            skeletonRows={8}
          />
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-base-700">
              <p className="text-xs text-ink-muted">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)} id="trip-prev-page">Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)} id="trip-next-page">Next</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TRIP_STATUS_OPTIONS.map((status) => (
                <div key={status} className="bg-base-900 border border-base-700 rounded-lg p-3 space-y-3">
                  <div className="h-5 w-24 bg-base-800 rounded animate-pulse" />
                  <div className="h-28 bg-base-950 border border-base-800 rounded animate-pulse" />
                  <div className="h-28 bg-base-950 border border-base-800 rounded animate-pulse" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
              {TRIP_STATUS_OPTIONS.map((status) => {
                const colTrips = rows.filter((r) => r.status === status);
                const colorConfig = TRIP_STATUS_COLORS[status];
                const isOver = dragOverCol === status;

                return (
                  <div
                    key={status}
                    onDragOver={(e) => handleDragOver(e, status)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, status)}
                    className={cn(
                      "bg-base-950 border border-base-700 rounded-lg p-3 flex flex-col gap-3 min-h-[500px] transition-all duration-150",
                      isOver ? "border-accent bg-accent-muted/10 shadow-md scale-[1.01]" : ""
                    )}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-base-800">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2.5 h-2.5 rounded-full", colorConfig?.dot)} />
                        <span className="font-semibold text-ink text-sm">{status}</span>
                      </div>
                      <span className="text-2xs bg-base-800 text-ink-muted font-mono font-medium px-2 py-0.5 rounded-full">
                        {colTrips.length}
                      </span>
                    </div>

                    <div className="flex-1 flex flex-col gap-2 overflow-y-auto max-h-[600px] pr-1">
                      {colTrips.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center min-h-[100px] text-center border-2 border-dashed border-base-800 rounded-lg p-4">
                          <p className="text-2xs text-ink-subtle italic">No trips</p>
                        </div>
                      ) : (
                        colTrips.map((trip) => (
                          <TripCard
                            key={trip.id}
                            trip={trip}
                            canWrite={canWrite}
                            onDragStart={handleDragStart}
                            onDispatch={handleDispatch}
                            onComplete={(row) => setCompleteTrip(row)}
                            onCancel={handleCancel}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-base-900 border border-base-700 rounded-lg">
              <p className="text-xs text-ink-muted">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)} id="trip-kanban-prev-page">Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)} id="trip-kanban-next-page">Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create New Trip" size="lg">
        <CreateTripForm onSave={handleCreate} onCancel={() => setCreateOpen(false)} loading={actionLoading} />
      </Modal>

      {/* Complete Modal */}
      <Modal open={!!completeTrip} onClose={() => setCompleteTrip(null)} title="Complete Trip" size="md">
        <CompleteTripForm trip={completeTrip} onSave={handleComplete}
          onCancel={() => setCompleteTrip(null)} loading={actionLoading} />
      </Modal>
    </div>
  );
}
