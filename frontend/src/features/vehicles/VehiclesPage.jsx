import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, X, LayoutGrid, List } from 'lucide-react';
import { vehiclesApi } from '../../api/vehicles.api';
import { VehicleStatus, VEHICLE_STATUS_COLORS } from '../../lib/constants';
import { cn, extractError, formatCurrency, formatNumber, zodErrorMap } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

// ── Validation ───────────────────────────────────────────────────────────────
const vehicleSchema = z.object({
  registrationNumber: z.string().trim().min(1, 'Registration number is required'),
  name: z.string().trim().min(1, 'Name is required'),
  model: z.string().trim().min(1, 'Model is required'),
  type: z.string().trim().min(1, 'Type is required'),
  maxLoadCapacity: z.coerce.number().positive('Must be a positive number'),
  odometer: z.coerce.number().min(0, 'Cannot be negative').optional(),
  acquisitionCost: z.coerce.number().positive('Must be a positive number'),
  status: z.enum(['Available', 'OnTrip', 'InShop', 'Retired']).optional(),
});

const VEHICLE_STATUS_OPTIONS = Object.values(VehicleStatus);

// ── Table columns ─────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'registrationNumber', label: 'Reg. Number', sortable: true,
    render: (row) => <span className="font-mono text-xs text-ink">{row.registrationNumber}</span>,
  },
  {
    key: 'name', label: 'Name / Model', sortable: true,
    render: (row) => (
      <div>
        <p className="text-ink font-medium text-sm">{row.name}</p>
        <p className="text-xs text-ink-muted">{row.model}</p>
      </div>
    ),
  },
  { key: 'type', label: 'Type', sortable: false },
  {
    key: 'status', label: 'Status', sortable: true,
    render: (row) => <Badge label={row.status} colorConfig={VEHICLE_STATUS_COLORS[row.status]} />,
  },
  {
    key: 'odometer', label: 'Odometer (km)', sortable: true,
    render: (row) => <span className="font-mono text-xs">{formatNumber(row.odometer, 1)}</span>,
  },
  {
    key: 'maxLoadCapacity', label: 'Capacity (t)', sortable: false,
    render: (row) => <span className="font-mono text-xs">{formatNumber(row.maxLoadCapacity, 2)}</span>,
  },
  {
    key: 'acquisitionCost', label: 'Acq. Cost', sortable: false,
    render: (row) => <span className="font-mono text-xs">{formatCurrency(row.acquisitionCost)}</span>,
  },
];

// ── VehicleForm ───────────────────────────────────────────────────────────────
function VehicleForm({ initial, onSave, onCancel, loading }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    registrationNumber: initial?.registrationNumber ?? '',
    name: initial?.name ?? '',
    model: initial?.model ?? '',
    type: initial?.type ?? '',
    maxLoadCapacity: initial?.maxLoadCapacity ?? '',
    odometer: initial?.odometer ?? '',
    acquisitionCost: initial?.acquisitionCost ?? '',
    status: initial?.status ?? 'Available',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = vehicleSchema.safeParse(form);
    if (!result.success) { setErrors(zodErrorMap(result.error)); return; }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate id="vehicle-form">
      <div className="grid grid-cols-2 gap-4">
        <Input id="registrationNumber" label="Registration Number" value={form.registrationNumber}
          onChange={set('registrationNumber')} error={errors.registrationNumber}
          placeholder="MH12AB1234" />
        <Input id="veh-name" label="Vehicle Name" value={form.name}
          onChange={set('name')} error={errors.name} placeholder="Tata Prima" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="veh-model" label="Model" value={form.model}
          onChange={set('model')} error={errors.model} placeholder="4928.S" />
        <Input id="veh-type" label="Type" value={form.type}
          onChange={set('type')} error={errors.type} placeholder="Heavy Truck" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="maxLoadCapacity" label="Max Load Capacity (tonnes)" type="number" step="0.01" min="0"
          value={form.maxLoadCapacity} onChange={set('maxLoadCapacity')} error={errors.maxLoadCapacity} />
        <Input id="odometer" label="Odometer (km)" type="number" step="0.1" min="0"
          value={form.odometer} onChange={set('odometer')} error={errors.odometer} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="acquisitionCost" label="Acquisition Cost (₹)" type="number" step="1" min="0"
          value={form.acquisitionCost} onChange={set('acquisitionCost')} error={errors.acquisitionCost} />
        {isEdit && (
          <Select id="veh-status" label="Status" value={form.status} onChange={set('status')}>
            {VEHICLE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Create Vehicle'}</Button>
      </div>
    </form>
  );
}

// ── VehicleCard Component ───────────────────────────────────────────────────
function VehicleCard({ vehicle, canWrite, onEdit }) {
  const statusColor = VEHICLE_STATUS_COLORS[vehicle.status] || VEHICLE_STATUS_COLORS.Available;

  return (
    <div
      onClick={() => onEdit(vehicle)}
      className="bg-base-900 border border-base-700 hover:border-accent/40 rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all duration-150 group shadow-sm hover:shadow-md"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-base-800 border border-base-700 flex items-center justify-center text-ink-subtle group-hover:text-accent transition-colors duration-150">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M19 18h2a1 1 0 0 0 1-1v-5.14a1 1 0 0 0-.29-.71l-4.4-4.4a1 1 0 0 0-.7-.29H14"/><circle cx="7.5" cy="18.5" r="2.5"/><circle cx="16.5" cy="18.5" r="2.5"/></svg>
          </div>
          <Badge label={vehicle.status} colorConfig={statusColor} />
        </div>

        <div>
          <span className="font-mono text-2xs font-semibold text-ink-subtle uppercase tracking-wider block">
            {vehicle.registrationNumber}
          </span>
          <h4 className="font-semibold text-ink text-sm mt-0.5 leading-tight group-hover:text-accent transition-colors duration-150">
            {vehicle.name}
          </h4>
          <span className="text-xs text-ink-muted">{vehicle.model}</span>
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-2 text-2xs border-t border-base-800">
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Type</span>
            <span className="text-ink font-medium">{vehicle.type}</span>
          </div>
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Odometer</span>
            <span className="font-mono text-ink font-medium">{formatNumber(vehicle.odometer, 1)} km</span>
          </div>
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Capacity</span>
            <span className="font-mono text-ink font-medium">{formatNumber(vehicle.maxLoadCapacity, 2)} t</span>
          </div>
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Acq. Cost</span>
            <span className="font-mono text-ink font-medium">{formatCurrency(vehicle.acquisitionCost)}</span>
          </div>
        </div>
      </div>

      {canWrite && (
        <div className="mt-3 pt-2 border-t border-base-800 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(vehicle);
            }}
            className="opacity-90 group-hover:opacity-100 group-hover:bg-base-800 text-xs px-2.5 py-1 h-7"
          >
            Edit
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function VehiclesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'FleetManager';

  const [rows, setRows] = useState([]);
  // Backend pagination shape: { total, page, limit, totalPages }
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('list');

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchRef = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    const callId = ++fetchRef.current;
    try {
      const params = { page, limit: 20, sortBy, sortOrder };
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.type = filterType;

      const { data } = await vehiclesApi.list(params);
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
  }, [page, sortBy, sortOrder, filterStatus, filterType]);

  useEffect(() => { load(); }, [load]);

  const handleSort = (col, order) => { setSortBy(col); setSortOrder(order); setPage(1); };
  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (row) => { setEditTarget(row); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editTarget) {
        await vehiclesApi.update(editTarget.id, formData);
        toast.success('Vehicle updated');
      } else {
        await vehiclesApi.create(formData);
        toast.success('Vehicle created');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  // Client-side text search on current page
  const displayRows = search.trim()
    ? rows.filter(
        (r) =>
          r.registrationNumber?.toLowerCase().includes(search.toLowerCase()) ||
          r.name?.toLowerCase().includes(search.toLowerCase()) ||
          r.type?.toLowerCase().includes(search.toLowerCase()),
      )
    : rows;

  const actionColumn = canWrite
    ? [{
        key: '_actions', label: '',
        render: (row) => (
          <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Button>
        ),
      }]
    : [];

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">Vehicle Registry</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            {pagination.total} vehicle{pagination.total !== 1 ? 's' : ''} total
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="md" id="create-vehicle-btn">
            <Plus className="w-4 h-4" /> New Vehicle
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-subtle pointer-events-none" />
          <input
            className="form-input pl-8 pr-8 h-8 text-xs"
            placeholder="Search reg., name, type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="vehicle-search"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <select
          className="form-input h-8 text-xs w-36"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
          id="vehicle-filter-status"
        >
          <option value="">All Statuses</option>
          {VEHICLE_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          className="form-input h-8 text-xs w-36"
          placeholder="Filter by type…"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          id="vehicle-filter-type"
        />

        <div className="flex items-center border border-base-700 rounded h-8 overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              "px-2.5 h-full flex items-center justify-center transition-colors",
              viewMode === 'list' ? "bg-base-700 text-ink" : "text-ink-subtle hover:text-ink hover:bg-base-800"
            )}
            title="List View"
            id="vehicle-view-list"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={cn(
              "px-2.5 h-full flex items-center justify-center transition-colors",
              viewMode === 'grid' ? "bg-base-700 text-ink" : "text-ink-subtle hover:text-ink hover:bg-base-800"
            )}
            title="Grid View"
            id="vehicle-view-grid"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table / Grid */}
      {viewMode === 'list' ? (
        <div className="bg-base-900 border border-base-700 rounded-lg overflow-hidden">
          <Table
            columns={[...COLUMNS, ...actionColumn]}
            rows={displayRows}
            loading={loading}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSort={handleSort}
            emptyMessage="No vehicles match your filters."
            skeletonRows={8}
          />
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-base-700">
              <p className="text-xs text-ink-muted">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)} id="vehicle-prev-page">Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)} id="vehicle-next-page">Next</Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="bg-base-900 border border-base-700 rounded-lg p-4 space-y-4 animate-pulse">
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded bg-base-800" />
                    <div className="w-16 h-5 rounded bg-base-800" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-20 bg-base-800 rounded" />
                    <div className="h-5 w-36 bg-base-800 rounded" />
                    <div className="h-3.5 w-24 bg-base-800 rounded" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-base-800">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="space-y-1">
                        <div className="h-2 w-12 bg-base-800 rounded" />
                        <div className="h-3.5 w-16 bg-base-800 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : displayRows.length === 0 ? (
            <div className="bg-base-900 border border-base-700 rounded-lg p-12 text-center">
              <p className="text-ink-muted">No vehicles match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayRows.map((row) => (
                <VehicleCard key={row.id} vehicle={row} canWrite={canWrite} onEdit={openEdit} />
              ))}
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-base-900 border border-base-700 rounded-lg">
              <p className="text-xs text-ink-muted">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)} id="vehicle-grid-prev-page">Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)} id="vehicle-grid-next-page">Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={closeModal}
        title={editTarget ? 'Edit Vehicle' : 'Register New Vehicle'} size="lg">
        <VehicleForm initial={editTarget} onSave={handleSave} onCancel={closeModal} loading={saving} />
      </Modal>
    </div>
  );
}
