import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { dashboardApi } from '../../api/dashboard.api';
import { extractError, formatNumber } from '../../lib/utils';
import Skeleton from '../../components/ui/Skeleton';

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
