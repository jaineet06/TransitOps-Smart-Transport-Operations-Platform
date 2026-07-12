import api from './axios';

export const analyticsApi = {
  getFuelEfficiency: () => api.get('/analytics/fuel-efficiency'),
  getFleetUtilization: () => api.get('/analytics/fleet-utilization'),
  getOperationalCost: () => api.get('/analytics/operational-cost'),
  getVehicleRoi: () => api.get('/analytics/vehicle-roi'),
  exportCsv: (report) => api.get('/analytics/export/csv', { params: { report }, responseType: 'blob' }),
};
