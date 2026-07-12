import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { FileText, FileSpreadsheet, RefreshCw } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { analyticsApi } from '../../api/analytics.api';
import { tripsApi } from '../../api/trips.api';
import { extractError, formatCurrency, formatNumber, safeDivide } from '../../lib/utils';
import useThemeStore from '../../store/themeStore';
import Skeleton from '../../components/ui/Skeleton';

import Table from '../../components/ui/Table';
import Button from '../../components/ui/Button';

export default function AnalyticsPage() {
  // Tab states: 'efficiency', 'utilization', 'costs', 'roi', 'trips'
  const [activeTab, setActiveTab] = useState('efficiency');
  
  // Data states
  const [fuelEfficiency, setFuelEfficiency] = useState([]);
  const [fleetUtilization, setFleetUtilization] = useState(null);
  const [operationalCost, setOperationalCost] = useState([]);
  const [vehicleRoi, setVehicleRoi] = useState([]);
  const [tripTrend, setTripTrend] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);
  const theme = useThemeStore((s) => s.theme);

  const tooltipBg = theme === 'dark' ? '#161B27' : '#FFFFFF';
  const tooltipBorder = theme === 'dark' ? '#252D3D' : '#E2E8F0';
  const tooltipColor = theme === 'dark' ? '#E8EDF5' : '#0F172A';
  const chartGrid = theme === 'dark' ? '#252D3D' : '#E2E8F0';
  const chartText = theme === 'dark' ? '#7B8FAD' : '#475569';

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [feRes, fuRes, ocRes, roiRes, tripsRes] = await Promise.all([
        analyticsApi.getFuelEfficiency(),
        analyticsApi.getFleetUtilization(),
        analyticsApi.getOperationalCost(),
        analyticsApi.getVehicleRoi(),
        tripsApi.list({ limit: 100 }) // Load up to 100 trips for time-series trend calculation
      ]);

      setFuelEfficiency(feRes.data.data ?? []);
      setFleetUtilization(fuRes.data.data ?? null);
      setOperationalCost(ocRes.data.data ?? []);
      setVehicleRoi(roiRes.data.data ?? []);

      // Calculate Trip Trend
      const trips = tripsRes.data.data.items ?? [];
      const datesGrouped = {};
      
      // Initialize last 30 days
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const str = d.toISOString().split('T')[0];
        datesGrouped[str] = { date: str, created: 0, completed: 0 };
      }

      trips.forEach((trip) => {
        const cDate = new Date(trip.createdAt || trip.draftedAt).toISOString().split('T')[0];
        if (datesGrouped[cDate]) {
          datesGrouped[cDate].created += 1;
        }
        if (trip.completedAt) {
          const compDate = new Date(trip.completedAt).toISOString().split('T')[0];
          if (datesGrouped[compDate]) {
            datesGrouped[compDate].completed += 1;
          }
        }
      });

      const trendArray = Object.values(datesGrouped).sort((a, b) => a.date.localeCompare(b.date));
      setTripTrend(trendArray);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // CSV Export Handler
  const handleExportCsv = async (report) => {
    setExporting(report);
    try {
      const response = await analyticsApi.exportCsv(report);
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${report}-report.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      toast.success('CSV Report downloaded successfully');
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setExporting(null);
    }
  };

  // PDF Export Handler
  const handleExportPdf = (report) => {
    const doc = new jsPDF();
    doc.setFont('Inter', 'normal');
    
    // Header
    doc.setFontSize(18);
    doc.setTextColor(14, 17, 23); // base-950
    
    const formattedDate = new Date().toLocaleString();

    if (report === 'fuel-efficiency') {
      doc.text('Fuel Efficiency Report', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(123, 143, 173); // ink-muted
      doc.text(`Generated: ${formattedDate}`, 14, 27);
      
      const totalEfficiencySum = fuelEfficiency.reduce((acc, curr) => acc + (curr.fuelEfficiencyKmPerLiter || 0), 0);
      const validCount = fuelEfficiency.filter(v => v.fuelEfficiencyKmPerLiter).length;
      const avgEff = safeDivide(totalEfficiencySum, validCount, 0);
      doc.setFontSize(11);
      doc.setTextColor(14, 17, 23);
      doc.text(`Fleet Average Fuel Efficiency: ${Number(avgEff).toFixed(2)} km/L`, 14, 38);

      const headers = [['Vehicle', 'Registration', 'Total Distance (km)', 'Fuel Consumed (L)', 'Efficiency (km/L)']];
      const body = fuelEfficiency.map(item => [
        item.name,
        item.registrationNumber,
        formatNumber(item.totalDistance, 1),
        formatNumber(item.totalFuel, 1),
        item.fuelEfficiencyKmPerLiter ? `${formatNumber(item.fuelEfficiencyKmPerLiter, 2)} km/L` : '—'
      ]);
      autoTable(doc, {
        startY: 44,
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [91, 141, 239] }
      });
    }

    else if (report === 'utilization') {
      doc.text('Fleet Utilization Report', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(123, 143, 173);
      doc.text(`Generated: ${formattedDate}`, 14, 27);

      doc.setFontSize(11);
      doc.setTextColor(14, 17, 23);
      doc.text(`Current Fleet Utilization: ${fleetUtilization?.fleetUtilizationPercent ?? 0}%`, 14, 38);
      doc.text(`Active Vehicles on Trip: ${fleetUtilization?.vehiclesOnTrip ?? 0}`, 14, 44);
      doc.text(`Total Non-Retired Vehicles: ${fleetUtilization?.totalNonRetiredVehicles ?? 0}`, 14, 50);

      const headers = [['Metric', 'Value']];
      const body = [
        ['Vehicles Currently On Trip', fleetUtilization?.vehiclesOnTrip ?? 0],
        ['Total Active Non-Retired Vehicles', fleetUtilization?.totalNonRetiredVehicles ?? 0],
        ['Fleet Utilization Percentage', `${fleetUtilization?.fleetUtilizationPercent ?? 0}%`]
      ];
      autoTable(doc, {
        startY: 56,
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [91, 141, 239] }
      });
    }

    else if (report === 'operational-cost') {
      doc.text('Operational Cost Report', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(123, 143, 173);
      doc.text(`Generated: ${formattedDate}`, 14, 27);

      const totalCost = operationalCost.reduce((acc, curr) => acc + curr.totalOperationalCost, 0);
      doc.setFontSize(11);
      doc.setTextColor(14, 17, 23);
      doc.text(`Total Fleet Operational Cost: ${formatCurrency(totalCost)}`, 14, 38);

      const headers = [['Vehicle', 'Registration', 'Fuel Cost', 'Maintenance Cost', 'Total Cost']];
      const body = operationalCost.map(item => [
        item.name,
        item.registrationNumber,
        formatCurrency(item.fuelCost),
        formatCurrency(item.maintenanceCost),
        formatCurrency(item.totalOperationalCost)
      ]);
      autoTable(doc, {
        startY: 44,
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [91, 141, 239] }
      });
    }

    else if (report === 'roi') {
      doc.text('Vehicle ROI Ranking Report', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(123, 143, 173);
      doc.text(`Generated: ${formattedDate}`, 14, 27);

      const totalProfit = vehicleRoi.reduce((acc, curr) => acc + curr.netProfit, 0);
      doc.setFontSize(11);
      doc.setTextColor(14, 17, 23);
      doc.text(`Total Net Profit: ${formatCurrency(totalProfit)}`, 14, 38);

      const headers = [['Vehicle', 'Registration', 'Acquisition Cost', 'Revenue', 'Expenses', 'Net Profit', 'ROI']];
      const body = vehicleRoi.map(item => [
        item.name,
        item.registrationNumber,
        formatCurrency(item.acquisitionCost),
        formatCurrency(item.totalRevenue),
        formatCurrency(item.fuelCost + item.maintenanceCost),
        formatCurrency(item.netProfit),
        item.roi ? `${(item.roi * 100).toFixed(1)}%` : '—'
      ]);
      autoTable(doc, {
        startY: 44,
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [91, 141, 239] },
        bodyStyles: { fontSize: 8 }
      });
    }

    else if (report === 'trips') {
      doc.text('Trip Volume Trend Report (Last 30 Days)', 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(123, 143, 173);
      doc.text(`Generated: ${formattedDate}`, 14, 27);

      const totalCreated = tripTrend.reduce((acc, curr) => acc + curr.created, 0);
      const totalCompleted = tripTrend.reduce((acc, curr) => acc + curr.completed, 0);
      doc.setFontSize(11);
      doc.setTextColor(14, 17, 23);
      doc.text(`Total Trips Created: ${totalCreated}`, 14, 38);
      doc.text(`Total Trips Completed: ${totalCompleted}`, 14, 44);

      const headers = [['Date', 'Trips Created', 'Trips Completed']];
      const body = tripTrend.map(item => [
        item.date,
        item.created,
        item.completed
      ]);
      autoTable(doc, {
        startY: 50,
        head: headers,
        body: body,
        theme: 'grid',
        headStyles: { fillColor: [91, 141, 239] }
      });
    }

    doc.save(`${report}-report.pdf`);
  };

  // Loader is handled inline for layout charts and tables

  // Visualization preparations
  // 1. Efficiency Chart Data
  const efficiencyChartData = fuelEfficiency
    .filter(item => item.fuelEfficiencyKmPerLiter !== null)
    .map(item => ({
      name: item.name.split(' ')[0] + ' (' + item.registrationNumber.slice(-4) + ')',
      efficiency: parseFloat(item.fuelEfficiencyKmPerLiter.toFixed(2))
    }))
    .slice(0, 10); // show top 10

  // 2. Utilization Percent
  const utilizationPercent = fleetUtilization?.fleetUtilizationPercent ?? 0;

  // 3. Operational Costs Chart Data
  const costChartData = operationalCost.map(item => ({
    name: item.name.split(' ')[0] + ' (' + item.registrationNumber.slice(-4) + ')',
    fuel: item.fuelCost,
    maintenance: item.maintenanceCost
  })).slice(0, 10);

  // 4. ROI Chart Data
  const roiChartData = [...vehicleRoi]
    .sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0))
    .map(item => ({
      name: item.name.split(' ')[0] + ' (' + item.registrationNumber.slice(-4) + ')',
      roi: item.roi ? parseFloat((item.roi * 100).toFixed(1)) : 0,
      profit: item.netProfit
    }));

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-ink">Analytics &amp; Reports</h2>
          <p className="text-sm text-ink-muted mt-0.5">Fleet efficiency, ROI, utilization, and logistics intelligence</p>
        </div>
        <Button variant="outline" onClick={loadAllData}>
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Data
        </Button>
      </div>

      {/* Tabs */}
      <div className="bg-base-900 border border-base-700 rounded-lg overflow-hidden">
        <div className="px-4 pt-3 border-b border-base-700">
          <div className="flex border-b border-transparent gap-4">
            {[
              { id: 'efficiency', label: 'Fuel Efficiency' },
              { id: 'utilization', label: 'Fleet Utilization' },
              { id: 'costs', label: 'Operational Costs' },
              { id: 'roi', label: 'Vehicle ROI' },
              { id: 'trips', label: 'Trip Trends' }
            ].map((tab) => (
              <button
                key={tab.id}
                className={`pb-2.5 text-sm font-semibold border-b-2 transition-all ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Contents */}
        <div className="p-6">
          {/* TAB 1: FUEL EFFICIENCY */}
          {activeTab === 'efficiency' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">Vehicle Fuel Efficiency (km/L)</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Calculated from actual completed trip distances and fuel consumed.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExportCsv('fuel-efficiency')} loading={exporting === 'fuel-efficiency'}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportPdf('fuel-efficiency')}>
                    <FileText className="w-3.5 h-3.5" /> Export PDF
                  </Button>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 bg-base-950/40 p-4 rounded border border-base-800">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={efficiencyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="name" stroke={chartText} fontSize={10} tickLine={false} />
                      <YAxis stroke={chartText} fontSize={10} tickLine={false} label={{ value: 'km / Liter', angle: -90, position: 'insideLeft', fill: chartText, fontSize: 10, offset: 10 }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.375rem' }}
                        itemStyle={{ color: tooltipColor, fontSize: '0.75rem' }}
                        labelStyle={{ color: chartText, fontSize: '0.75rem' }}
                      />
                      <Bar dataKey="efficiency" fill="#5B8DEF" radius={[4, 4, 0, 0]} name="Efficiency (km/L)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Table */}
              <div className="border border-base-800 rounded">
                <Table
                  columns={[
                    { key: 'name', label: 'Vehicle' },
                    { key: 'registrationNumber', label: 'Registration', render: (row) => <span className="font-mono text-xs">{row.registrationNumber}</span> },
                    { key: 'totalDistance', label: 'Total Distance', render: (row) => <span className="font-mono text-xs">{formatNumber(row.totalDistance, 1)} km</span> },
                    { key: 'totalFuel', label: 'Total Fuel Used', render: (row) => <span className="font-mono text-xs">{formatNumber(row.totalFuel, 1)} L</span> },
                    { key: 'fuelEfficiencyKmPerLiter', label: 'Efficiency', render: (row) => <span className="font-mono text-xs font-semibold text-accent">{row.fuelEfficiencyKmPerLiter ? `${formatNumber(row.fuelEfficiencyKmPerLiter, 2)} km/L` : '—'}</span> },
                  ]}
                  rows={fuelEfficiency}
                  emptyMessage="No fuel logs found to calculate efficiency."
                />
              </div>
            </div>
          )}

          {/* TAB 2: FLEET UTILIZATION */}
          {activeTab === 'utilization' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">Fleet Utilization Gauge</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Percentage of non-retired vehicles currently on an active trip.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExportCsv('utilization')} loading={exporting === 'utilization'}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportPdf('utilization')}>
                    <FileText className="w-3.5 h-3.5" /> Export PDF
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                {/* Visual Gauge */}
                <div className="md:col-span-1 h-56 bg-base-950/40 border border-base-800 rounded p-4 flex flex-col items-center justify-center relative">
                  <span className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-2">Live Utilization</span>
                  {loading ? (
                    <Skeleton className="h-28 w-28 rounded-full" />
                  ) : (
                    <div className="w-full h-40 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { value: utilizationPercent },
                              { value: 100 - utilizationPercent }
                            ]}
                            cx="50%"
                            cy="70%"
                            startAngle={180}
                            endAngle={0}
                            innerRadius={60}
                            outerRadius={80}
                            dataKey="value"
                          >
                            <Cell key="cell-0" fill="#2ABF6F" />
                            <Cell key="cell-1" fill={theme === 'dark' ? '#1C2235' : '#F1F5F9'} />
                          </Pie>
                          <text
                            x="50%"
                            y="62%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-2xl font-bold font-mono"
                            fill={theme === 'dark' ? '#E8EDF5' : '#0F172A'}
                          >
                            {utilizationPercent}%
                          </text>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Utilization Info Cards */}
                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                  <div className="bg-base-950/40 border border-base-800 rounded p-5">
                    <span className="text-2xs font-semibold text-ink-subtle uppercase tracking-wider block">Vehicles on Trip</span>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <span className="text-3xl font-bold font-mono text-status-ontrip">{fleetUtilization?.vehiclesOnTrip ?? 0}</span>
                    )}
                    <span className="text-2xs text-ink-muted block mt-1">Currently dispatched</span>
                  </div>
                  <div className="bg-base-950/40 border border-base-800 rounded p-5">
                    <span className="text-2xs font-semibold text-ink-subtle uppercase tracking-wider block">Active Fleet Size</span>
                    {loading ? (
                      <Skeleton className="h-8 w-16 mt-1" />
                    ) : (
                      <span className="text-3xl font-bold font-mono text-ink">{fleetUtilization?.totalNonRetiredVehicles ?? 0}</span>
                    )}
                    <span className="text-2xs text-ink-muted block mt-1">Excludes retired vehicles</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OPERATIONAL COSTS */}
          {activeTab === 'costs' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">Operational Cost Stacked Bar Chart</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Sum of Fuel costs + Maintenance costs per vehicle.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExportCsv('operational-cost')} loading={exporting === 'operational-cost'}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportPdf('operational-cost')}>
                    <FileText className="w-3.5 h-3.5" /> Export PDF
                  </Button>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 bg-base-950/40 p-4 rounded border border-base-800">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="name" stroke={chartText} fontSize={10} tickLine={false} />
                      <YAxis stroke={chartText} fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.375rem' }}
                        itemStyle={{ color: tooltipColor, fontSize: '0.75rem' }}
                        labelStyle={{ color: chartText, fontSize: '0.75rem' }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={6}
                        formatter={(value) => <span className="text-xs text-ink-muted">{value}</span>}
                      />
                      <Bar dataKey="fuel" stackId="a" fill="#5B8DEF" name="Fuel Cost (₹)" />
                      <Bar dataKey="maintenance" stackId="a" fill="#EAA220" name="Maintenance Cost (₹)" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Table */}
              <div className="border border-base-800 rounded">
                <Table
                  columns={[
                    { key: 'name', label: 'Vehicle' },
                    { key: 'registrationNumber', label: 'Registration', render: (row) => <span className="font-mono text-xs">{row.registrationNumber}</span> },
                    { key: 'fuelCost', label: 'Fuel Cost', render: (row) => <span className="font-mono text-xs">{formatCurrency(row.fuelCost)}</span> },
                    { key: 'maintenanceCost', label: 'Maintenance Cost', render: (row) => <span className="font-mono text-xs">{formatCurrency(row.maintenanceCost)}</span> },
                    { key: 'totalOperationalCost', label: 'Total Operational Cost', render: (row) => <span className="font-mono text-xs font-semibold text-accent">{formatCurrency(row.totalOperationalCost)}</span> },
                  ]}
                  rows={operationalCost}
                  emptyMessage="No operational cost records found."
                />
              </div>
            </div>
          )}

          {/* TAB 4: VEHICLE ROI */}
          {activeTab === 'roi' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">Vehicle ROI Ranking Chart</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Horizontal representation of Net Profit vs Acquisition Cost. Green represents positive ROI, Red represents negative.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExportCsv('roi')} loading={exporting === 'roi'}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportPdf('roi')}>
                    <FileText className="w-3.5 h-3.5" /> Export PDF
                  </Button>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 bg-base-950/40 p-4 rounded border border-base-800">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={roiChartData} layout="vertical" margin={{ top: 5, right: 10, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis type="number" stroke={chartText} fontSize={10} tickLine={false} label={{ value: 'ROI %', position: 'bottom', fill: chartText, fontSize: 10 }} />
                      <YAxis dataKey="name" type="category" stroke={chartText} fontSize={8} tickLine={false} width={80} />
                      <Tooltip
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.375rem' }}
                        itemStyle={{ color: tooltipColor, fontSize: '0.75rem' }}
                        labelStyle={{ color: chartText, fontSize: '0.75rem' }}
                      />
                      <Bar dataKey="roi" name="ROI (%)">
                        {roiChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.roi >= 0 ? '#2ABF6F' : '#E0504A'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Table */}
              <div className="border border-base-800 rounded">
                <Table
                  columns={[
                    { key: 'name', label: 'Vehicle' },
                    { key: 'registrationNumber', label: 'Registration', render: (row) => <span className="font-mono text-xs">{row.registrationNumber}</span> },
                    { key: 'acquisitionCost', label: 'Acq. Cost', render: (row) => <span className="font-mono text-xs">{formatCurrency(row.acquisitionCost)}</span> },
                    { key: 'totalRevenue', label: 'Total Revenue', render: (row) => <span className="font-mono text-xs text-status-available">{formatCurrency(row.totalRevenue)}</span> },
                    { key: 'expenses', label: 'Total Cost', render: (row) => <span className="font-mono text-xs text-status-suspended">{formatCurrency(row.fuelCost + row.maintenanceCost)}</span> },
                    { key: 'netProfit', label: 'Net Profit', render: (row) => <span className={`font-mono text-xs font-semibold ${row.netProfit >= 0 ? 'text-status-available' : 'text-status-suspended'}`}>{formatCurrency(row.netProfit)}</span> },
                    { key: 'roi', label: 'ROI (%)', render: (row) => <span className={`font-mono text-xs font-bold ${row.roi >= 0 ? 'text-status-available' : 'text-status-suspended'}`}>{row.roi !== null && row.roi !== undefined ? `${(row.roi * 100).toFixed(1)}%` : '—'}</span> },
                  ]}
                  rows={vehicleRoi}
                  emptyMessage="No trip/operational data available to calculate ROI."
                />
              </div>
            </div>
          )}

          {/* TAB 5: TRIP VOLUME TRENDS */}
          {activeTab === 'trips' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h3 className="text-base font-semibold text-ink">Trip Volume Trend (Last 30 Days)</h3>
                  <p className="text-xs text-ink-muted mt-0.5">Comparison of new trips created vs trips marked completed daily.</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleExportCsv('trips')} loading={exporting === 'trips'}>
                    <FileSpreadsheet className="w-3.5 h-3.5" /> Export CSV
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleExportPdf('trips')}>
                    <FileText className="w-3.5 h-3.5" /> Export PDF
                  </Button>
                </div>
              </div>

              {/* Chart */}
              <div className="h-64 bg-base-950/40 p-4 rounded border border-base-800">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={tripTrend} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} />
                      <XAxis dataKey="date" stroke={chartText} fontSize={10} tickLine={false} />
                      <YAxis stroke={chartText} fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: tooltipBg, borderColor: tooltipBorder, borderRadius: '0.375rem' }}
                        itemStyle={{ color: tooltipColor, fontSize: '0.75rem' }}
                        labelStyle={{ color: chartText, fontSize: '0.75rem' }}
                      />
                      <Legend
                        iconType="circle"
                        iconSize={6}
                        formatter={(value) => <span className="text-xs text-ink-muted">{value}</span>}
                      />
                      <Line type="monotone" dataKey="created" name="Trips Created" stroke="#5B8DEF" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                      <Line type="monotone" dataKey="completed" name="Trips Completed" stroke="#2ABF6F" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Table */}
              <div className="border border-base-800 rounded">
                <Table
                  columns={[
                    { key: 'date', label: 'Date' },
                    { key: 'created', label: 'Trips Created', render: (row) => <span className="font-mono text-xs">{row.created}</span> },
                    { key: 'completed', label: 'Trips Completed', render: (row) => <span className="font-mono text-xs text-status-available font-semibold">{row.completed}</span> },
                  ]}
                  rows={tripTrend.filter(row => row.created > 0 || row.completed > 0)}
                  emptyMessage="No trips found in the last 30 days."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
