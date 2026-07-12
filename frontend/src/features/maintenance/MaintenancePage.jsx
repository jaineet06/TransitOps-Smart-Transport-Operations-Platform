import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Check } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { maintenanceApi } from '../../api/maintenance.api';
import { vehiclesApi } from '../../api/vehicles.api';

import { extractError, formatCurrency, formatDate, zodErrorMap } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';
import Skeleton from '../../components/ui/Skeleton';

import Table from '../../components/ui/Table';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';


// ── Validation ───────────────────────────────────────────────────────────────
const maintenanceSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle is required'),
  description: z.string().trim().min(1, 'Description is required'),
  cost: z.coerce.number().positive('Cost must be a positive number'),
  startDate: z.string().min(1, 'Start date is required'),
});

const STATUS_COLORS = {
  Active: { bg: 'bg-status-inshop-bg', text: 'text-status-inshop', dot: 'bg-status-inshop' },
  Closed: { bg: 'bg-status-available-bg', text: 'text-status-available', dot: 'bg-status-available' },
};

// ── Form Component ──────────────────────────────────────────────────────────
function MaintenanceForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    vehicleId: '',
    description: '',
    cost: '',
    startDate: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        // Fetch vehicles list to choose from, limit to 100 for lookup
        const { data } = await vehiclesApi.list({ limit: 100 });
        const items = data.data.items ?? [];
        // Exclude vehicles already in active maintenance (InShop) and retired ones
        const selectable = items.filter(v => v.status !== 'InShop' && v.status !== 'Retired');
        setVehicles(selectable);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoadingVehicles(false);
      }
    };
    fetchVehicles();
  }, []);

  const set = (field) => (e) => {
    setForm((p) => ({ ...p, [field]: e.target.value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const result = maintenanceSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrorMap(result.error));
      return;
    }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate id="maintenance-form">
      <div>
        <label htmlFor="vehicleId" className="form-label">Vehicle</label>
        <select
          id="vehicleId"
          className="form-input cursor-pointer"
          value={form.vehicleId}
          onChange={set('vehicleId')}
          disabled={loadingVehicles}
        >
          <option value="">{loadingVehicles ? 'Loading...' : 'Select vehicle'}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.registrationNumber}) — {v.status}
            </option>
          ))}
        </select>
        {errors.vehicleId && <p className="field-error">{errors.vehicleId}</p>}
        {!loadingVehicles && vehicles.length === 0 && (
          <p className="text-xs text-status-inshop mt-1">No vehicles available for maintenance (all are currently in shop, on trip, or retired).</p>
        )}
      </div>

      <Input
        id="description"
        label="Description / Work Details"
        value={form.description}
        onChange={set('description')}
        error={errors.description}
        placeholder="Engine inspection, brake pad replacement..."
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="cost"
          label="Estimated Cost (₹)"
          type="number"
          step="0.01"
          min="0"
          value={form.cost}
          onChange={set('cost')}
          error={errors.cost}
          placeholder="15000"
        />
        <Input
          id="startDate"
          label="Start Date"
          type="date"
          value={form.startDate}
          onChange={set('startDate')}
          error={errors.startDate}
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Create Log</Button>
      </div>
    </form>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function MaintenancePage() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'FleetManager';

  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ active: 0, closed: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const theme = useThemeStore((s) => s.theme);

  const tooltipBg = theme === 'dark' ? '#161B27' : '#FFFFFF';
  const tooltipBorder = theme === 'dark' ? '#252D3D' : '#E2E8F0';
  const tooltipColor = theme === 'dark' ? '#E8EDF5' : '#0F172A';
  const [vehicles, setVehicles] = useState([]);

  // Filters
  const [filterVehicle, setFilterVehicle] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const fetchRef = useRef(0);

  // Load dropdown vehicles list (for filter lookup)
  useEffect(() => {
    const fetchVehiclesList = async () => {
      try {
        const { data } = await vehiclesApi.list({ limit: 100 });
        setVehicles(data.data.items ?? []);
      } catch (err) {
        console.error('Failed to load vehicles list:', err);
      }
    };
    fetchVehiclesList();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const callId = ++fetchRef.current;
    try {
      const params = { page, limit: 15, sortBy, sortOrder };
      if (filterVehicle) params.vehicleId = filterVehicle;
      if (filterStatus) params.status = filterStatus;

      const { data } = await maintenanceApi.list(params);
      if (callId !== fetchRef.current) return;

      const payload = data.data;
      setRows(payload.items ?? []);
      if (payload.pagination) setPagination(payload.pagination);
      if (payload.stats) setStats(payload.stats);
    } catch (err) {
      if (callId !== fetchRef.current) return;
      toast.error(extractError(err));
    } finally {
      if (callId === fetchRef.current) {
        setLoading(false);
      }
    }
  }, [page, sortBy, sortOrder, filterStatus, filterVehicle]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSort = (col, order) => {
    setSortBy(col);
    setSortOrder(order);
    setPage(1);
  };

  const handleCloseLog = async (id) => {
    if (!window.confirm('Are you sure you want to close this maintenance record? This will mark the vehicle as Available.')) {
      return;
    }
    setActionLoading(id);
    try {
      await maintenanceApi.close(id);
      toast.success('Maintenance record closed. Vehicle is now Available.');
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setActionLoading(null);
    }
  };

  const handleSave = async (formData) => {
    setSaving(true);
    try {
      await maintenanceApi.create(formData);
      toast.success('Maintenance record created. Vehicle is now In Shop.');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  // Recharts Chart Data
  const chartData = [
    { name: 'Active', value: stats.active, color: '#EAA220' },
    { name: 'Closed', value: stats.closed, color: '#2ABF6F' },
  ];

  // Table Columns
  const COLUMNS = [
    {
      key: 'vehicle',
      label: 'Vehicle',
      sortable: false,
      render: (row) => (
        <div>
          <p className="text-sm text-ink font-medium">{row.vehicle?.name ?? '—'}</p>
          <p className="text-xs text-ink-muted font-mono">{row.vehicle?.registrationNumber}</p>
        </div>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (row) => (
        <span className="text-xs text-ink break-words whitespace-normal max-w-md block">{row.description}</span>
      ),
    },
    {
      key: 'cost',
      label: 'Cost',
      sortable: true,
      render: (row) => <span className="font-mono text-xs text-ink">{formatCurrency(row.cost)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row) => <Badge label={row.status} colorConfig={STATUS_COLORS[row.status]} />,
    },
    {
      key: 'startDate',
      label: 'Start Date',
      sortable: true,
      render: (row) => <span className="text-xs">{formatDate(row.startDate)}</span>,
    },
    {
      key: 'endDate',
      label: 'End Date',
      sortable: false,
      render: (row) => <span className="text-xs text-ink-muted">{row.endDate ? formatDate(row.endDate) : '—'}</span>,
    },
  ];

  // Add Actions column if user is a FleetManager
  if (canWrite) {
    COLUMNS.push({
      key: 'actions',
      label: 'Actions',
      sortable: false,
      headerClassName: 'text-right',
      className: 'text-right',
      render: (row) => {
        if (row.status === 'Active') {
          return (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleCloseLog(row.id)}
              loading={actionLoading === row.id}
            >
              <Check className="w-3.5 h-3.5" /> Close Log
            </Button>
          );
        }
        return <span className="text-xs text-ink-subtle italic">No actions</span>;
      },
    });
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-ink">Maintenance Logs</h2>
          <p className="text-sm text-ink-muted mt-0.5">Manage fleet shop repairs and servicing</p>
        </div>
        {canWrite && (
          <Button onClick={() => setModalOpen(true)}>
            <Plus className="w-4 h-4" /> Add Record
          </Button>
        )}
      </div>

      {/* Summary Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-base-900 border border-base-700 rounded-lg p-5">
        <div className="md:col-span-2 flex flex-col justify-center space-y-4">
          <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">Service Summary</h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Track active vs completed vehicle repairs. Moving a vehicle into maintenance automatically updates its status to <span className="text-status-inshop font-semibold font-mono">InShop</span> in the registry, preventing dispatch. Closing a log releases the vehicle back to <span className="text-status-available font-semibold font-mono">Available</span> status.
          </p>
          <div className="flex gap-6 pt-2">
            <div className="bg-base-950 px-4 py-3 rounded border border-base-800 flex-1">
              <span className="text-2xs font-semibold text-ink-subtle uppercase tracking-wider block">Active Repairs</span>
              {loading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <span className="text-2xl font-semibold font-mono text-status-inshop">{stats.active}</span>
              )}
            </div>
            <div className="bg-base-950 px-4 py-3 rounded border border-base-800 flex-1">
              <span className="text-2xs font-semibold text-ink-subtle uppercase tracking-wider block">Closed Services</span>
              {loading ? (
                <Skeleton className="h-8 w-16 mt-1" />
              ) : (
                <span className="text-2xl font-semibold font-mono text-status-available">{stats.closed}</span>
              )}
            </div>
          </div>
        </div>

        <div className="h-40 flex items-center justify-center">
          {loading ? (
            <Skeleton className="h-24 w-24 rounded-full" />
          ) : stats.active === 0 && stats.closed === 0 ? (
            <span className="text-xs text-ink-subtle italic">No logs found to summarize</span>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={50}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '0.375rem',
                  }}
                  itemStyle={{ color: tooltipColor, fontSize: '0.75rem' }}
                  labelStyle={{ display: 'none' }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={6}
                  formatter={(value) => <span className="text-3xs text-ink-muted">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Filters and List */}
      <div className="bg-base-900 border border-base-700 rounded-lg overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 border-b border-base-700 flex flex-col sm:flex-row gap-3">
          <div className="flex-1 flex gap-3">
            <Select
              id="filter-vehicle"
              value={filterVehicle}
              onChange={(e) => { setFilterVehicle(e.target.value); setPage(1); }}
              containerClassName="flex-1 max-w-xs"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.registrationNumber})
                </option>
              ))}
            </Select>

            <Select
              id="filter-status"
              value={filterStatus}
              onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
              containerClassName="w-36"
            >
              <option value="">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Closed">Closed</option>
            </Select>
          </div>
        </div>

        {/* Table */}
        <Table
          columns={COLUMNS}
          rows={rows}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          loading={loading}
          emptyMessage="No maintenance logs found matching the selected filters."
        />

        {/* Pagination Footer */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-base-700 flex items-center justify-between">
            <p className="text-xs text-ink-muted">
              Showing <span className="font-semibold text-ink">{rows.length}</span> of{' '}
              <span className="font-semibold text-ink">{pagination.total}</span> logs
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page === pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Creation Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="New Maintenance Record">
        <MaintenanceForm
          onSave={handleSave}
          onCancel={() => setModalOpen(false)}
          loading={saving}
        />
      </Modal>
    </div>
  );
}
