import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Search, X, AlertTriangle, LayoutGrid, List } from 'lucide-react';
import { driversApi } from '../../api/drivers.api';
import { DriverStatus, DRIVER_STATUS_COLORS } from '../../lib/constants';
import { cn, daysUntil, extractError, formatDate, zodErrorMap } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';

// ── Validation ───────────────────────────────────────────────────────────────
const driverSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  email: z.string().trim().email('Invalid email address'),
  licenseNumber: z.string().trim().min(1, 'License number is required'),
  licenseCategory: z.string().trim().min(1, 'License category is required'),
  licenseExpiryDate: z.string().min(1, 'Expiry date is required').refine(
    (d) => new Date(d) > new Date(),
    'License expiry date must be in the future',
  ),
  contactNumber: z.string().trim().min(1, 'Contact number is required'),
  safetyScore: z.coerce.number().int().min(0).max(100).optional(),
  status: z.enum(['Available', 'OnTrip', 'OffDuty', 'Suspended']).optional(),
});

const DRIVER_STATUS_OPTIONS = Object.values(DriverStatus);

// ── License expiry cell ────────────────────────────────────────────────────────
function ExpiryCell({ date }) {
  const days = daysUntil(date);
  const isExpired = days !== null && days < 0;
  const isWarning = days !== null && days >= 0 && days <= 30;

  return (
    <div className="flex items-center gap-1.5">
      <span className={cn(
        'font-mono text-xs',
        isExpired ? 'text-status-suspended' : isWarning ? 'text-status-inshop' : '',
      )}>
        {formatDate(date)}
      </span>
      {(isExpired || isWarning) && (
        <AlertTriangle className={cn(
          'w-3.5 h-3.5 shrink-0',
          isExpired ? 'text-status-suspended' : 'text-status-inshop',
        )} />
      )}
      {isWarning && !isExpired && (
        <span className="text-2xs text-status-inshop">({days}d)</span>
      )}
      {isExpired && (
        <span className="text-2xs text-status-suspended">(expired)</span>
      )}
    </div>
  );
}

// ── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS = [
  {
    key: 'name', label: 'Name', sortable: true,
    render: (row) => <span className="font-medium text-ink">{row.name}</span>,
  },
  {
    key: 'email', label: 'Email', sortable: false,
    render: (row) => <span className="text-xs text-ink-subtle">{row.email}</span>,
  },
  {
    key: 'licenseNumber', label: 'License No.', sortable: false,
    render: (row) => <span className="font-mono text-xs">{row.licenseNumber}</span>,
  },
  { key: 'licenseCategory', label: 'Category', sortable: false },
  {
    key: 'licenseExpiryDate', label: 'Expiry Date', sortable: true,
    render: (row) => <ExpiryCell date={row.licenseExpiryDate} />,
  },
  {
    key: 'contactNumber', label: 'Contact', sortable: false,
    render: (row) => <span className="font-mono text-xs">{row.contactNumber}</span>,
  },
  {
    key: 'safetyScore', label: 'Safety Score', sortable: true,
    render: (row) => {
      const score = row.safetyScore;
      const color = score >= 80 ? 'text-status-available' : score >= 50 ? 'text-status-inshop' : 'text-status-suspended';
      return <span className={cn('font-mono text-sm font-semibold', color)}>{score}</span>;
    },
  },
  {
    key: 'status', label: 'Status', sortable: true,
    render: (row) => <Badge label={row.status} colorConfig={DRIVER_STATUS_COLORS[row.status]} />,
  },
];

// ── DriverForm ────────────────────────────────────────────────────────────────
function DriverForm({ initial, onSave, onCancel, loading }) {
  const isEdit = !!initial?.id;

  const toDateInput = (d) => {
    if (!d) return '';
    return new Date(d).toISOString().split('T')[0];
  };

  const [form, setForm] = useState({
    name: initial?.name ?? '',
    email: initial?.email ?? '',
    licenseNumber: initial?.licenseNumber ?? '',
    licenseCategory: initial?.licenseCategory ?? '',
    licenseExpiryDate: toDateInput(initial?.licenseExpiryDate),
    contactNumber: initial?.contactNumber ?? '',
    safetyScore: initial?.safetyScore ?? 100,
    status: initial?.status ?? 'Available',
  });
  const [errors, setErrors] = useState({});

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = driverSchema.safeParse(form);
    if (!result.success) { setErrors(zodErrorMap(result.error)); return; }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate id="driver-form">
      <div className="grid grid-cols-2 gap-4">
        <Input id="drv-name" label="Full Name" value={form.name}
          onChange={set('name')} error={errors.name} placeholder="Rajesh Kumar" />
        <Input id="drv-email" label="Email Address" type="email" value={form.email}
          onChange={set('email')} error={errors.email} placeholder="rajesh@transitops.com" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="licenseNumber" label="License Number" value={form.licenseNumber}
          onChange={set('licenseNumber')} error={errors.licenseNumber} placeholder="MH0120210012345" />
        <Input id="licenseCategory" label="License Category" value={form.licenseCategory}
          onChange={set('licenseCategory')} error={errors.licenseCategory} placeholder="HMV" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="licenseExpiryDate" label="License Expiry Date" type="date"
          value={form.licenseExpiryDate} onChange={set('licenseExpiryDate')}
          error={errors.licenseExpiryDate} />
        <Input id="contactNumber" label="Contact Number" value={form.contactNumber}
          onChange={set('contactNumber')} error={errors.contactNumber} placeholder="+91 9876543210" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="safetyScore" label="Safety Score (0–100)" type="number" min="0" max="100"
          value={form.safetyScore} onChange={set('safetyScore')} error={errors.safetyScore} />
        {isEdit ? (
          <Select id="drv-status" label="Status" value={form.status} onChange={set('status')}>
            {DRIVER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        ) : (
          <div />
        )}
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>{isEdit ? 'Save Changes' : 'Register Driver'}</Button>
      </div>
    </form>
  );
}

// ── DriverCard Component ────────────────────────────────────────────────────
function DriverCard({ driver, canWrite, onEdit }) {
  const statusColor = DRIVER_STATUS_COLORS[driver.status] || DRIVER_STATUS_COLORS.Available;
  const score = driver.safetyScore ?? 100;
  const scoreColor = score >= 80 ? 'text-status-available border-status-available/20 bg-status-available-bg' : score >= 50 ? 'text-status-inshop border-status-inshop/20 bg-status-inshop-bg' : 'text-status-suspended border-status-suspended/20 bg-status-suspended-bg';

  return (
    <div
      onClick={() => onEdit(driver)}
      className="bg-base-900 border border-base-700 hover:border-accent/40 rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all duration-150 group shadow-sm hover:shadow-md"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-full bg-base-800 border border-base-700 flex items-center justify-center text-ink font-semibold group-hover:text-accent group-hover:border-accent/30 transition-colors duration-150">
            {driver.name ? driver.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : '?'}
          </div>
          <Badge label={driver.status} colorConfig={statusColor} />
        </div>

        <div>
          <h4 className="font-semibold text-ink text-sm leading-tight group-hover:text-accent transition-colors duration-150">
            {driver.name}
          </h4>
          <span className="text-2xs font-mono text-ink-muted">Category: {driver.licenseCategory}</span>
        </div>

        <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-2 text-2xs border-t border-base-800">
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">License No.</span>
            <span className="font-mono text-ink font-medium">{driver.licenseNumber}</span>
          </div>
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">License Expiry</span>
            <div className="pt-0.5"><ExpiryCell date={driver.licenseExpiryDate} /></div>
          </div>
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Contact</span>
            <span className="font-mono text-ink font-medium">{driver.contactNumber}</span>
          </div>
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Safety Score</span>
            <span className={cn("inline-block text-3xs font-mono font-semibold px-1.5 py-0.5 rounded border mt-0.5", scoreColor)}>
              {score} / 100
            </span>
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
              onEdit(driver);
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
export default function DriversPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'SafetyOfficer';

  const [rows, setRows] = useState([]);
  // Backend pagination shape: { total, page, limit, totalPages }
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
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

      const { data } = await driversApi.list(params);
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
  const openCreate = () => { setEditTarget(null); setModalOpen(true); };
  const openEdit = (row) => { setEditTarget(row); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditTarget(null); };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      if (editTarget) {
        await driversApi.update(editTarget.id, formData);
        toast.success('Driver updated');
      } else {
        await driversApi.create(formData);
        toast.success('Driver registered');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const displayRows = search.trim()
    ? rows.filter(
        (r) =>
          r.name?.toLowerCase().includes(search.toLowerCase()) ||
          r.licenseNumber?.toLowerCase().includes(search.toLowerCase()) ||
          r.contactNumber?.includes(search),
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

  // Count expiry warnings
  const warningCount = rows.filter((r) => {
    const d = daysUntil(r.licenseExpiryDate);
    return d !== null && d <= 30;
  }).length;

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">Driver Management</h2>
          <p className="text-sm text-ink-muted mt-0.5">
            {pagination.total} driver{pagination.total !== 1 ? 's' : ''} total
            {warningCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-status-inshop">
                <AlertTriangle className="w-3 h-3" />
                {warningCount} license{warningCount !== 1 ? 's' : ''} expiring within 30 days
              </span>
            )}
          </p>
        </div>
        {canWrite && (
          <Button onClick={openCreate} size="md" id="create-driver-btn">
            <Plus className="w-4 h-4" /> New Driver
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-subtle pointer-events-none" />
          <input
            className="form-input pl-8 pr-8 h-8 text-xs"
            placeholder="Search name, license, contact…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="driver-search"
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
          id="driver-filter-status"
        >
          <option value="">All Statuses</option>
          {DRIVER_STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center border border-base-700 rounded h-8 overflow-hidden ml-auto">
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={cn(
              "px-2.5 h-full flex items-center justify-center transition-colors",
              viewMode === 'list' ? "bg-base-700 text-ink" : "text-ink-subtle hover:text-ink hover:bg-base-800"
            )}
            title="List View"
            id="driver-view-list"
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
            id="driver-view-grid"
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
            emptyMessage="No drivers match your filters."
            skeletonRows={8}
          />
          {!loading && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-base-700">
              <p className="text-xs text-ink-muted">
                Page {pagination.page} of {pagination.totalPages} — {pagination.total} total
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)} id="driver-prev-page">Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)} id="driver-next-page">Next</Button>
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
                    <div className="w-10 h-10 rounded-full bg-base-800" />
                    <div className="w-16 h-5 rounded bg-base-800" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-base-800 rounded" />
                    <div className="h-3 w-20 bg-base-800 rounded" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-base-800">
                    {[...Array(4)].map((_, j) => (
                      <div key={j} className="space-y-1">
                        <div className="h-2 w-12 bg-base-800 rounded" />
                        <div className="h-3 w-16 bg-base-800 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : displayRows.length === 0 ? (
            <div className="bg-base-900 border border-base-700 rounded-lg p-12 text-center">
              <p className="text-ink-muted">No drivers match your filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayRows.map((row) => (
                <DriverCard key={row.id} driver={row} canWrite={canWrite} onEdit={openEdit} />
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
                  onClick={() => setPage((p) => p - 1)} id="driver-grid-prev-page">Previous</Button>
                <Button variant="secondary" size="sm" disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)} id="driver-grid-next-page">Next</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      <Modal open={modalOpen} onClose={closeModal}
        title={editTarget ? 'Edit Driver' : 'Register New Driver'} size="lg">
        <DriverForm initial={editTarget} onSave={handleSave} onCancel={closeModal} loading={saving} />
      </Modal>
    </div>
  );
}
