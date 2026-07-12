import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Plus, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { fuelExpensesApi } from '../../api/fuelExpenses.api';
import { vehiclesApi } from '../../api/vehicles.api';

import { extractError, formatCurrency, formatDate, formatNumber, zodErrorMap } from '../../lib/utils';
import useAuthStore from '../../store/authStore';
import useThemeStore from '../../store/themeStore';

import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Skeleton from '../../components/ui/Skeleton';
import Badge from '../../components/ui/Badge';

// ── Validation ───────────────────────────────────────────────────────────────
const fuelLogSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle is required'),
  liters: z.coerce.number().positive('Liters must be positive'),
  cost: z.coerce.number().positive('Cost must be positive'),
  date: z.string().min(1, 'Date is required'),
});

const expenseSchema = z.object({
  vehicleId: z.string().trim().min(1, 'Vehicle is required'),
  type: z.enum(['Toll', 'Other']),
  amount: z.coerce.number().positive('Amount must be positive'),
  date: z.string().min(1, 'Date is required'),
});

// ── FuelLogForm Component ────────────────────────────────────────────────────
function FuelLogForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    vehicleId: '',
    liters: '',
    cost: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data } = await vehiclesApi.list({ limit: 100 });
        // Exclude retired vehicles
        setVehicles((data.data.items ?? []).filter(v => v.status !== 'Retired'));
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
    const result = fuelLogSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrorMap(result.error));
      return;
    }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate id="fuel-form">
      <div>
        <label htmlFor="fuel-vehicleId" className="form-label">Vehicle</label>
        <select
          id="fuel-vehicleId"
          className="form-input cursor-pointer"
          value={form.vehicleId}
          onChange={set('vehicleId')}
          disabled={loadingVehicles}
        >
          <option value="">{loadingVehicles ? 'Loading...' : 'Select vehicle'}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.registrationNumber})
            </option>
          ))}
        </select>
        {errors.vehicleId && <p className="field-error">{errors.vehicleId}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          id="liters"
          label="Liters Consumed"
          type="number"
          step="0.01"
          min="0"
          value={form.liters}
          onChange={set('liters')}
          error={errors.liters}
          placeholder="120"
        />
        <Input
          id="cost"
          label="Total Cost (₹)"
          type="number"
          step="0.01"
          min="0"
          value={form.cost}
          onChange={set('cost')}
          error={errors.cost}
          placeholder="10800"
        />
      </div>

      <Input
        id="fuel-date"
        label="Date"
        type="date"
        value={form.date}
        onChange={set('date')}
        error={errors.date}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Add Fuel Entry</Button>
      </div>
    </form>
  );
}

// ── ExpenseForm Component ────────────────────────────────────────────────────
function ExpenseForm({ onSave, onCancel, loading }) {
  const [form, setForm] = useState({
    vehicleId: '',
    type: 'Toll',
    amount: '',
    date: new Date().toISOString().split('T')[0],
  });
  const [errors, setErrors] = useState({});
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const { data } = await vehiclesApi.list({ limit: 100 });
        setVehicles((data.data.items ?? []).filter(v => v.status !== 'Retired'));
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
    const result = expenseSchema.safeParse(form);
    if (!result.success) {
      setErrors(zodErrorMap(result.error));
      return;
    }
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate id="expense-form">
      <div>
        <label htmlFor="exp-vehicleId" className="form-label">Vehicle</label>
        <select
          id="exp-vehicleId"
          className="form-input cursor-pointer"
          value={form.vehicleId}
          onChange={set('vehicleId')}
          disabled={loadingVehicles}
        >
          <option value="">{loadingVehicles ? 'Loading...' : 'Select vehicle'}</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} ({v.registrationNumber})
            </option>
          ))}
        </select>
        {errors.vehicleId && <p className="field-error">{errors.vehicleId}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Select
          id="type"
          label="Expense Type"
          value={form.type}
          onChange={set('type')}
          error={errors.type}
        >
          <option value="Toll">Toll</option>
          <option value="Other">Other</option>
        </Select>
        <Input
          id="amount"
          label="Amount (₹)"
          type="number"
          step="0.01"
          min="0"
          value={form.amount}
          onChange={set('amount')}
          error={errors.amount}
          placeholder="450"
        />
      </div>

      <Input
        id="exp-date"
        label="Date"
        type="date"
        value={form.date}
        onChange={set('date')}
        error={errors.date}
      />

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={loading}>Add Expense</Button>
      </div>
    </form>
  );
}

// ── Main Page Component ──────────────────────────────────────────────────────
export default function FuelExpensesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const canWrite = role === 'FinancialAnalyst';

  // Tabs: 'fuel' or 'expenses'
  const [activeTab, setActiveTab] = useState('fuel');
  const theme = useThemeStore((s) => s.theme);

  const tooltipBg = theme === 'dark' ? '#161B27' : '#FFFFFF';
  const tooltipBorder = theme === 'dark' ? '#252D3D' : '#E2E8F0';
  const tooltipColor = theme === 'dark' ? '#E8EDF5' : '#0F172A';
  const chartGrid = theme === 'dark' ? '#252D3D' : '#E2E8F0';
  const chartText = theme === 'dark' ? '#7B8FAD' : '#475569';

  // Lists
  const [fuelLogs, setFuelLogs] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [vehicles, setVehicles] = useState([]);

  // Pagination states
  const [fuelPagination, setFuelPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [expensePagination, setExpensePagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  const [loading, setLoading] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);

  // Filters
  const [filterVehicle, setFilterVehicle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fuelPage, setFuelPage] = useState(1);
  const [expensePage, setExpensePage] = useState(1);

  // Modals
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  // Fetch Trend Line Data (uses top 100 fuel logs)
  const loadTrend = useCallback(async () => {
    setLoadingTrend(true);
    try {
      const params = { limit: 100 };
      if (filterVehicle) params.vehicleId = filterVehicle;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const { data } = await fuelExpensesApi.listFuelLogs(params);
      const items = data.data.items ?? [];

      // Group by date
      const grouped = {};
      items.forEach(log => {
        const d = new Date(log.date).toISOString().split('T')[0];
        grouped[d] = (grouped[d] || 0) + parseFloat(log.cost);
      });

      const formatted = Object.keys(grouped).sort().map(date => ({
        date,
        cost: Number(grouped[date].toFixed(2)),
      }));

      setTrendData(formatted);
    } catch (err) {
      console.error('Failed to load fuel trend data:', err);
    } finally {
      setLoadingTrend(false);
    }
  }, [filterVehicle, startDate, endDate]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const callId = ++fetchRef.current;
    try {
      if (activeTab === 'fuel') {
        const params = { page: fuelPage, limit: 10 };
        if (filterVehicle) params.vehicleId = filterVehicle;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const { data } = await fuelExpensesApi.listFuelLogs(params);
        if (callId !== fetchRef.current) return;
        setFuelLogs(data.data.items ?? []);
        if (data.data.pagination) setFuelPagination(data.data.pagination);
      } else {
        const params = { page: expensePage, limit: 10 };
        if (filterVehicle) params.vehicleId = filterVehicle;
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;

        const { data } = await fuelExpensesApi.listExpenses(params);
        if (callId !== fetchRef.current) return;
        setExpenses(data.data.items ?? []);
        if (data.data.pagination) setExpensePagination(data.data.pagination);
      }
    } catch (err) {
      if (callId !== fetchRef.current) return;
      toast.error(extractError(err));
    } finally {
      if (callId === fetchRef.current) {
        setLoading(false);
      }
    }
  }, [activeTab, fuelPage, expensePage, filterVehicle, startDate, endDate]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  const handleSaveFuel = async (formData) => {
    setSaving(true);
    try {
      await fuelExpensesApi.createFuelLog(formData);
      toast.success('Fuel log entry added successfully.');
      setModalOpen(false);
      loadLogs();
      loadTrend();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveExpense = async (formData) => {
    setSaving(true);
    try {
      await fuelExpensesApi.createExpense(formData);
      toast.success('Expense entry added successfully.');
      setModalOpen(false);
      loadLogs();
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  };

  // PDF Export
  const handleExportPdf = () => {
    const doc = new jsPDF();
    
    // Header styling
    doc.setFont('Inter', 'normal');
    doc.setFontSize(18);
    doc.setTextColor(14, 17, 23); // base-950
    doc.text('Fuel & Expenses Summary Report', 14, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(123, 143, 173); // ink-muted
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 27);
    
    // Summary data calculation
    const totalFuelCost = fuelLogs.reduce((acc, curr) => acc + parseFloat(curr.cost), 0);
    const totalFuelLiters = fuelLogs.reduce((acc, curr) => acc + parseFloat(curr.liters), 0);
    const totalExpenseAmount = expenses.reduce((acc, curr) => acc + parseFloat(curr.amount), 0);

    doc.setFontSize(11);
    doc.setTextColor(14, 17, 23);
    doc.text(`Current View Fuel Cost Total: ${formatCurrency(totalFuelCost)}`, 14, 38);
    doc.text(`Current View Fuel Volume Total: ${totalFuelLiters.toFixed(1)} Liters`, 14, 44);
    doc.text(`Current View Expense Total: ${formatCurrency(totalExpenseAmount)}`, 14, 50);

    // Fuel logs section
    doc.setFontSize(12);
    doc.text('Fuel Logs', 14, 62);
    const fuelHeaders = [['Vehicle', 'Registration', 'Liters', 'Cost', 'Date']];
    const fuelData = fuelLogs.map(log => [
      log.vehicle?.name || '—',
      log.vehicle?.registrationNumber || '—',
      `${log.liters} L`,
      formatCurrency(log.cost),
      formatDate(log.date)
    ]);
    
    autoTable(doc, {
      startY: 66,
      head: fuelHeaders,
      body: fuelData,
      theme: 'grid',
      headStyles: { fillColor: [91, 141, 239], fontSize: 9 }, // Electric Blue
      bodyStyles: { fontSize: 8 }
    });

    const expensesStartY = doc.lastAutoTable.finalY + 12;
    doc.text('Expenses', 14, expensesStartY);
    const expenseHeaders = [['Vehicle', 'Registration', 'Type', 'Amount', 'Date']];
    const expenseData = expenses.map(exp => [
      exp.vehicle?.name || '—',
      exp.vehicle?.registrationNumber || '—',
      exp.type,
      formatCurrency(exp.amount),
      formatDate(exp.date)
    ]);

    autoTable(doc, {
      startY: expensesStartY + 4,
      head: expenseHeaders,
      body: expenseData,
      theme: 'grid',
      headStyles: { fillColor: [91, 141, 239], fontSize: 9 },
      bodyStyles: { fontSize: 8 }
    });

    doc.save(`fuel-expenses-report-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const FUEL_COLUMNS = [
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
      key: 'liters',
      label: 'Liters Consumed',
      sortable: false,
      render: (row) => <span className="font-mono text-xs text-ink">{formatNumber(row.liters, 1)} L</span>,
    },
    {
      key: 'cost',
      label: 'Fuel Cost',
      sortable: false,
      render: (row) => <span className="font-mono text-xs text-ink font-semibold">{formatCurrency(row.cost)}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      sortable: false,
      render: (row) => <span>{formatDate(row.date)}</span>,
    },
  ];

  const EXPENSE_COLUMNS = [
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
      key: 'type',
      label: 'Type',
      sortable: false,
      render: (row) => (
        <Badge
          label={row.type}
          colorConfig={
            row.type === 'Toll'
              ? { bg: 'bg-accent/10', text: 'text-accent', dot: 'bg-accent' }
              : { bg: 'bg-base-700', text: 'text-ink-muted', dot: 'bg-ink-subtle' }
          }
        />
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: false,
      render: (row) => <span className="font-mono text-xs text-ink font-semibold">{formatCurrency(row.amount)}</span>,
    },
    {
      key: 'date',
      label: 'Date',
      sortable: false,
      render: (row) => <span>{formatDate(row.date)}</span>,
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-ink">Fuel &amp; Expenses</h2>
          <p className="text-sm text-ink-muted mt-0.5">Track fuel logs and operational logistics expenses</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportPdf}>
            <FileText className="w-4 h-4" /> PDF Report
          </Button>
          {canWrite && (
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4" /> Add Entry
            </Button>
          )}
        </div>
      </div>

      {/* Fuel Cost Trend Chart */}
      <div className="bg-base-900 border border-base-700 rounded-lg p-5">
        <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">Total Fuel Cost Trend</h3>
        {loadingTrend ? (
          <Skeleton className="h-48 w-full" />
        ) : trendData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-xs text-ink-muted italic">
            No fuel log data available for trend chart
          </div>
        ) : (
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                <XAxis dataKey="date" stroke={chartText} fontSize={10} tickLine={false} />
                <YAxis stroke={chartText} fontSize={10} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderRadius: '0.375rem',
                  }}
                  itemStyle={{ color: tooltipColor, fontSize: '0.75rem' }}
                  labelStyle={{ color: chartText, fontSize: '0.75rem' }}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Fuel Cost (₹)"
                  stroke="#5B8DEF"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#5B8DEF', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Tabs and Toolbar */}
      <div className="bg-base-900 border border-base-700 rounded-lg overflow-hidden">
        {/* Navigation Tabs & Filters */}
        <div className="px-4 pt-3 border-b border-base-700 space-y-3">
          <div className="flex justify-between items-center">
            {/* Tabs */}
            <div className="flex border-b border-transparent gap-4">
              <button
                className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${activeTab === 'fuel' ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}
                onClick={() => setActiveTab('fuel')}
              >
                Fuel Logs
              </button>
              <button
                className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${activeTab === 'expenses' ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}
                onClick={() => setActiveTab('expenses')}
              >
                Expenses
              </button>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="pb-3 flex flex-wrap gap-3 items-center">
            <Select
              id="toolbar-vehicle"
              value={filterVehicle}
              onChange={(e) => { setFilterVehicle(e.target.value); setFuelPage(1); setExpensePage(1); }}
              containerClassName="w-48"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.registrationNumber})
                </option>
              ))}
            </Select>

            <div className="flex items-center gap-2">
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setFuelPage(1); setExpensePage(1); }}
                className="h-8 py-1 text-xs"
              />
              <span className="text-2xs text-ink-muted uppercase">to</span>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setFuelPage(1); setExpensePage(1); }}
                className="h-8 py-1 text-xs"
              />
            </div>
          </div>
        </div>

        {/* List Tables */}
        {activeTab === 'fuel' ? (
          <>
            <Table
              columns={FUEL_COLUMNS}
              rows={fuelLogs}
              loading={loading}
              emptyMessage="No fuel logs found for the selected criteria."
            />
            {fuelPagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-base-700 flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                  Showing <span className="font-semibold text-ink">{fuelLogs.length}</span> of{' '}
                  <span className="font-semibold text-ink">{fuelPagination.total}</span> entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fuelPage === 1}
                    onClick={() => setFuelPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={fuelPage === fuelPagination.totalPages}
                    onClick={() => setFuelPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <>
            <Table
              columns={EXPENSE_COLUMNS}
              rows={expenses}
              loading={loading}
              emptyMessage="No expense logs found for the selected criteria."
            />
            {expensePagination.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-base-700 flex items-center justify-between">
                <p className="text-xs text-ink-muted">
                  Showing <span className="font-semibold text-ink">{expenses.length}</span> of{' '}
                  <span className="font-semibold text-ink">{expensePagination.total}</span> entries
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={expensePage === 1}
                    onClick={() => setExpensePage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={expensePage === expensePagination.totalPages}
                    onClick={() => setExpensePage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Entry Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Add ${activeTab === 'fuel' ? 'Fuel Log' : 'Expense'}`}>
        {activeTab === 'fuel' ? (
          <FuelLogForm
            onSave={handleSaveFuel}
            onCancel={() => setModalOpen(false)}
            loading={saving}
          />
        ) : (
          <ExpenseForm
            onSave={handleSaveExpense}
            onCancel={() => setModalOpen(false)}
            loading={saving}
          />
        )}
      </Modal>
    </div>
  );
}
