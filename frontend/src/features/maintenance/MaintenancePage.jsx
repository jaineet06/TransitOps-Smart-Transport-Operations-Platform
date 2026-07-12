import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, Check, LayoutGrid, List, Calendar, ChevronLeft, ChevronRight, Wrench } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { maintenanceApi } from '../../api/maintenance.api';
import { vehiclesApi } from '../../api/vehicles.api';

import { cn, extractError, formatCurrency, formatDate, zodErrorMap } from '../../lib/utils';
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

// ── MaintenanceDetailsModal Component ────────────────────────────────────────
function MaintenanceDetailsModal({ log, onClose, canWrite, handleCloseLog, actionLoading }) {
  if (!log) return null;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 border-b border-base-800 pb-4 text-xs">
        <div>
          <span className="text-ink-subtle block uppercase tracking-wider font-semibold text-3xs">Vehicle</span>
          <span className="font-medium text-ink text-sm block mt-0.5">{log.vehicle?.name || '—'}</span>
          <span className="font-mono text-ink-muted text-xs">{log.vehicle?.registrationNumber}</span>
        </div>
        <div>
          <span className="text-ink-subtle block uppercase tracking-wider font-semibold text-3xs">Status</span>
          <div className="mt-1">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-2xs font-semibold uppercase tracking-wider border",
              log.status === 'Active' ? 'bg-status-inshop-bg text-status-inshop border-status-inshop/20' : 'bg-status-available-bg text-status-available border-status-available/20'
            )}>
              <span className={cn("w-1.5 h-1.5 rounded-full", log.status === 'Active' ? 'bg-status-inshop' : 'bg-status-available')} />
              {log.status}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-ink-subtle block uppercase tracking-wider font-semibold text-3xs">Description / Work Details</span>
        <p className="text-sm text-ink bg-base-950 border border-base-800 p-3 rounded leading-relaxed whitespace-pre-wrap">
          {log.description}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 text-xs pt-2">
        <div>
          <span className="text-ink-subtle block uppercase tracking-wider font-semibold text-3xs">Cost</span>
          <span className="font-mono text-ink font-semibold text-sm block mt-0.5">{formatCurrency(log.cost)}</span>
        </div>
        <div>
          <span className="text-ink-subtle block uppercase tracking-wider font-semibold text-3xs">Start Date</span>
          <span className="font-medium text-ink block mt-0.5">{formatDate(log.startDate)}</span>
        </div>
        <div>
          <span className="text-ink-subtle block uppercase tracking-wider font-semibold text-3xs">End Date</span>
          <span className="font-medium text-ink block mt-0.5">{log.endDate ? formatDate(log.endDate) : '—'}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-base-800">
        <Button variant="ghost" onClick={onClose}>Close Window</Button>
        {log.status === 'Active' && canWrite && (
          <Button
            variant="outline"
            onClick={async () => {
              await handleCloseLog(log.id);
              onClose();
            }}
            loading={actionLoading === log.id}
          >
            <Check className="w-4 h-4 mr-1.5" /> Close Log
          </Button>
        )}
      </div>
    </div>
  );
}

// ── MaintenanceCard Component ────────────────────────────────────────────────
function MaintenanceCard({ log, canWrite, handleCloseLog, actionLoading, onClick }) {
  const isCloseActive = log.status === 'Active' && canWrite;

  return (
    <div
      onClick={onClick}
      className="bg-base-900 border border-base-700 hover:border-accent/40 rounded-lg p-4 flex flex-col justify-between cursor-pointer transition-all duration-150 group shadow-sm hover:shadow-md"
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-lg bg-base-800 border border-base-700 flex items-center justify-center text-ink-subtle group-hover:text-accent transition-colors duration-150">
            <Wrench className="w-5 h-5" />
          </div>
          <Badge
            label={log.status}
            colorConfig={
              log.status === 'Active'
                ? { bg: 'bg-status-inshop-bg', text: 'text-status-inshop', dot: 'bg-status-inshop' }
                : { bg: 'bg-status-available-bg', text: 'text-status-available', dot: 'bg-status-available' }
            }
          />
        </div>

        <div>
          <span className="font-mono text-2xs font-semibold text-ink-subtle uppercase tracking-wider block">
            {log.vehicle?.registrationNumber}
          </span>
          <h4 className="font-semibold text-ink text-sm mt-0.5 leading-tight group-hover:text-accent transition-colors duration-150">
            {log.vehicle?.name || '—'}
          </h4>
        </div>

        <p className="text-xs text-ink-muted line-clamp-2 min-h-8">
          {log.description}
        </p>

        <div className="grid grid-cols-2 gap-y-2 gap-x-3 pt-2 text-2xs border-t border-base-800">
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Cost</span>
            <span className="font-mono text-ink font-semibold">{formatCurrency(log.cost)}</span>
          </div>
          <div>
            <span className="text-3xs text-ink-subtle block uppercase tracking-wide">Timeline</span>
            <span className="text-ink font-medium">
              {formatDate(log.startDate)}
            </span>
          </div>
        </div>
      </div>

      {isCloseActive && (
        <div className="mt-3 pt-2 border-t border-base-800 flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              handleCloseLog(log.id);
            }}
            loading={actionLoading === log.id}
            className="text-xs px-2.5 py-1 h-7"
          >
            Close Log
          </Button>
        </div>
      )}
    </div>
  );
}

// ── MaintenanceCalendar Component ────────────────────────────────────────────
function MaintenanceCalendar({ rows, onEventClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const calendarCells = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      day: prevMonthDays - i,
      monthType: 'prev',
      date: new Date(year, month - 1, prevMonthDays - i)
    });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    calendarCells.push({
      day: i,
      monthType: 'current',
      date: new Date(year, month, i)
    });
  }

  const totalSlots = 42; 
  const nextMonthPadding = totalSlots - calendarCells.length;
  for (let i = 1; i <= nextMonthPadding; i++) {
    calendarCells.push({
      day: i,
      monthType: 'next',
      date: new Date(year, month + 1, i)
    });
  }

  const getLogsForDate = (cellDate) => {
    return rows.filter((log) => {
      const start = new Date(log.startDate);
      const cell = new Date(cellDate.getFullYear(), cellDate.getMonth(), cellDate.getDate());
      const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());

      let endDateOnly;
      if (log.endDate) {
        const end = new Date(log.endDate);
        endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      } else {
        const today = new Date();
        endDateOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      }

      return cell >= startDateOnly && cell <= endDateOnly;
    });
  };

  return (
    <div className="bg-base-900 border border-base-700 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-base-800">
        <h3 className="text-sm font-semibold text-ink uppercase tracking-wider">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-1.5">
          <Button variant="secondary" size="sm" onClick={prevMonth} className="px-1.5 h-8">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setCurrentDate(new Date())} className="text-xs h-8">
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={nextMonth} className="px-1.5 h-8">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center font-semibold text-2xs uppercase tracking-wider text-ink-subtle">
        {weekdays.map(d => <div key={d} className="py-1">{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1 bg-base-850 border border-base-800 rounded overflow-hidden">
        {calendarCells.map((cell, idx) => {
          const dateLogs = getLogsForDate(cell.date);
          const isToday = new Date().toDateString() === cell.date.toDateString();

          return (
            <div
              key={idx}
              className={cn(
                "min-h-[90px] p-1.5 flex flex-col justify-between border border-base-800/40 bg-base-900/90",
                cell.monthType !== 'current' ? "opacity-35 bg-base-950/20" : "",
                isToday ? "ring-1 ring-accent/30 bg-accent-muted/5" : ""
              )}
            >
              <div className="flex justify-between items-center mb-1">
                <span className={cn(
                  "text-2xs font-mono font-medium rounded-full w-5 h-5 flex items-center justify-center",
                  isToday ? "bg-accent text-white font-bold" : "text-ink-muted"
                )}>
                  {cell.day}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-1 overflow-y-auto max-h-[70px] pr-0.5">
                {dateLogs.map((log) => {
                  const isActive = log.status === 'Active';
                  return (
                    <button
                      key={log.id}
                      onClick={() => onEventClick(log)}
                      title={`${log.vehicle?.name}: ${log.description}`}
                      className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded border text-left truncate leading-tight font-medium font-sans uppercase tracking-wide block w-full transition-colors",
                        isActive
                          ? "bg-status-inshop-bg text-status-inshop border-status-inshop/20 hover:bg-status-inshop/15"
                          : "bg-status-available-bg text-status-available border-status-available/20 hover:bg-status-available/15"
                      )}
                    >
                      {log.vehicle?.name || 'V'}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

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
  const [viewMode, setViewMode] = useState('list');
  const [detailsLog, setDetailsLog] = useState(null);

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
        <div className="p-4 border-b border-base-700 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="flex-1 flex flex-wrap gap-3">
            <Select
              id="filter-vehicle"
              value={filterVehicle}
              onChange={(e) => { setFilterVehicle(e.target.value); setPage(1); }}
              containerClassName="w-full sm:max-w-xs"
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

          <div className="flex items-center border border-base-700 rounded h-8 overflow-hidden shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={cn(
                "px-2.5 h-full flex items-center justify-center transition-colors",
                viewMode === 'list' ? "bg-base-700 text-ink" : "text-ink-subtle hover:text-ink hover:bg-base-800"
              )}
              title="Table View"
              id="maintenance-view-list"
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
              title="Grid/Card View"
              id="maintenance-view-grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('calendar')}
              className={cn(
                "px-2.5 h-full flex items-center justify-center transition-colors",
                viewMode === 'calendar' ? "bg-base-700 text-ink" : "text-ink-subtle hover:text-ink hover:bg-base-800"
              )}
              title="Calendar View"
              id="maintenance-view-calendar"
            >
              <Calendar className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Table / Grid / Calendar */}
        {viewMode === 'list' && (
          <>
            <Table
              columns={COLUMNS}
              rows={rows}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              loading={loading}
              emptyMessage="No maintenance logs found matching the selected filters."
            />

            {!loading && pagination.totalPages > 1 && (
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
          </>
        )}

        {viewMode === 'grid' && (
          <div className="p-4 border-t border-base-700 bg-base-950/20 space-y-4">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-base-900 border border-base-700 rounded-lg p-4 space-y-4 animate-pulse">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded bg-base-800" />
                      <div className="w-16 h-5 rounded bg-base-800" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-3.5 w-24 bg-base-800 rounded" />
                      <div className="h-5 w-36 bg-base-800 rounded" />
                    </div>
                    <div className="h-10 w-full bg-base-800 rounded pt-2" />
                  </div>
                ))}
              </div>
            ) : rows.length === 0 ? (
              <div className="bg-base-900 border border-base-700 rounded-lg p-12 text-center">
                <p className="text-ink-muted">No maintenance logs found matching the selected filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rows.map((row) => (
                  <MaintenanceCard
                    key={row.id}
                    log={row}
                    canWrite={canWrite}
                    handleCloseLog={handleCloseLog}
                    actionLoading={actionLoading}
                    onClick={() => setDetailsLog(row)}
                  />
                ))}
              </div>
            )}

            {!loading && pagination.totalPages > 1 && (
              <div className="px-4 py-3 bg-base-900 border border-base-700 rounded-lg flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                  Showing <span className="font-semibold text-ink">{rows.length}</span> of{' '}
                  <span className="font-semibold text-ink">{pagination.total}</span> logs
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === 'calendar' && (
          <div className="p-4 border-t border-base-700 bg-base-950/20">
            {loading ? (
              <div className="bg-base-900 border border-base-700 rounded-lg p-12 text-center animate-pulse">
                <p className="text-ink-muted">Loading calendar view...</p>
              </div>
            ) : (
              <MaintenanceCalendar rows={rows} onEventClick={(log) => setDetailsLog(log)} />
            )}
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

      {/* Details Modal */}
      <Modal open={!!detailsLog} onClose={() => setDetailsLog(null)} title="Maintenance Record Details" size="md">
        <MaintenanceDetailsModal
          log={detailsLog}
          onClose={() => setDetailsLog(null)}
          canWrite={canWrite}
          handleCloseLog={handleCloseLog}
          actionLoading={actionLoading}
        />
      </Modal>
    </div>
  );
}
