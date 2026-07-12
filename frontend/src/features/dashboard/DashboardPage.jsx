import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { dashboardApi } from '../../api/dashboard.api';
import { extractError, formatNumber } from '../../lib/utils';
import Skeleton from '../../components/ui/Skeleton';
import useThemeStore from '../../store/themeStore';

function KpiCard({ label, value, sub, loading, accent }) {
  return (
    <div className="bg-base-900 border border-base-700 rounded-lg p-5">
      <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider mb-3">{label}</p>
      {loading ? (
        <>
          <Skeleton className="h-8 w-24 mb-2" />
          {sub && <Skeleton className="h-3 w-32" />}
        </>
      ) : (
        <>
          <p className={`text-3xl font-semibold font-mono ${accent ?? 'text-ink'}`}>{value}</p>
          {sub && <p className="text-xs text-ink-muted mt-1">{sub}</p>}
        </>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useThemeStore((s) => s.theme);

  const tooltipBg = theme === 'dark' ? '#161B27' : '#FFFFFF';
  const tooltipBorder = theme === 'dark' ? '#252D3D' : '#E2E8F0';
  const tooltipColor = theme === 'dark' ? '#E8EDF5' : '#0F172A';

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await dashboardApi.getKpis();
        setKpis(data.data);
      } catch (err) {
        toast.error(extractError(err));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const utilColor =
    !kpis ? 'text-ink'
    : kpis.fleetUtilization >= 70 ? 'text-status-available'
    : kpis.fleetUtilization >= 40 ? 'text-status-offduty'
    : 'text-status-suspended';

  const chartData = kpis?.vehicleStatusBreakdown ? [
    { name: 'Available', value: kpis.vehicleStatusBreakdown.Available, color: '#2ABF6F' },
    { name: 'On Trip', value: kpis.vehicleStatusBreakdown.OnTrip, color: '#5B8DEF' },
    { name: 'In Shop', value: kpis.vehicleStatusBreakdown.InShop, color: '#EAA220' },
    { name: 'Retired', value: kpis.vehicleStatusBreakdown.Retired, color: '#4E607A' },
  ] : [];

  const totalVehicles = kpis?.vehicleStatusBreakdown 
    ? kpis.vehicleStatusBreakdown.Available + 
      kpis.vehicleStatusBreakdown.OnTrip + 
      kpis.vehicleStatusBreakdown.InShop + 
      kpis.vehicleStatusBreakdown.Retired
    : 0;

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-xl font-semibold text-ink">Operations Overview</h2>
        <p className="text-sm text-ink-muted mt-0.5">Live fleet and trip KPIs</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Active Vehicles"
          value={loading ? '—' : formatNumber(kpis?.activeVehicles, 0)}
          sub="Available + On Trip + In Shop"
          loading={loading}
        />
        <KpiCard
          label="Available"
          value={loading ? '—' : formatNumber(kpis?.availableVehicles, 0)}
          sub="Ready to dispatch"
          loading={loading}
          accent="text-status-available"
        />
        <KpiCard
          label="In Maintenance"
          value={loading ? '—' : formatNumber(kpis?.vehiclesInMaintenance, 0)}
          sub="Currently in shop"
          loading={loading}
          accent={kpis?.vehiclesInMaintenance > 0 ? 'text-status-inshop' : 'text-ink'}
        />
        <KpiCard
          label="Fleet Utilization"
          value={loading ? '—' : `${kpis?.fleetUtilization}%`}
          sub="Vehicles on trip / non-retired"
          loading={loading}
          accent={utilColor}
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          label="Active Trips"
          value={loading ? '—' : formatNumber(kpis?.activeTrips, 0)}
          sub="Dispatched, en route"
          loading={loading}
          accent={kpis?.activeTrips > 0 ? 'text-status-dispatched' : 'text-ink'}
        />
        <KpiCard
          label="Pending Trips"
          value={loading ? '—' : formatNumber(kpis?.pendingTrips, 0)}
          sub="Draft, awaiting dispatch"
          loading={loading}
          accent={kpis?.pendingTrips > 0 ? 'text-status-inshop' : 'text-ink'}
        />
        <KpiCard
          label="Drivers On Duty"
          value={loading ? '—' : formatNumber(kpis?.driversOnDuty, 0)}
          sub="Available + On Trip"
          loading={loading}
        />
      </div>

      {/* Visual breakdown and details section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-base-900 border border-base-700 rounded-lg p-5 flex flex-col">
          <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">Fleet Status Breakdown</h3>
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Skeleton className="h-48 w-48 rounded-full" />
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
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
                    itemStyle={{ color: tooltipColor, fontSize: '0.875rem' }}
                    labelStyle={{ display: 'none' }}
                  />
                  <Legend
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value, entry) => (
                      <span className="text-xs font-semibold text-ink-muted mr-2">
                        {value}: <span className="font-mono text-ink">{entry.payload.value}</span>
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        
        <div className="bg-base-900 border border-base-700 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-ink uppercase tracking-wider mb-4">Active Operations</h3>
            <p className="text-xs text-ink-muted leading-relaxed">
              This panel shows live fleet status distribution. Status is synced automatically as drivers start, complete, or cancel their trips, and when vehicles enter or exit maintenance logs.
            </p>
          </div>
          <div className="pt-4 border-t border-base-800 space-y-3 mt-4">
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-ink-muted">Total Fleet Vehicles</span>
              <span className="font-mono text-ink font-semibold">{loading ? '—' : totalVehicles}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium text-ink-muted">Active Fleet Size</span>
              <span className="font-mono text-ink font-semibold">{loading ? '—' : kpis?.activeVehicles}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Zero state hint */}
      {!loading && kpis && Object.values(kpis).every((v) => v === 0) && (
        <div className="border border-base-700 rounded-lg p-8 text-center">
          <p className="text-sm font-medium text-ink mb-1">No operational data yet</p>
          <p className="text-sm text-ink-muted">
            Add vehicles and drivers, then create your first trip to see KPIs populate.
          </p>
        </div>
      )}
    </div>
  );
}

