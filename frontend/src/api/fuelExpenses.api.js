import api from './axios';

export const fuelExpensesApi = {
  listFuelLogs: (params) => api.get('/fuel-logs', { params }),
  createFuelLog: (data) => api.post('/fuel-logs', data),
  listExpenses: (params) => api.get('/expenses', { params }),
  createExpense: (data) => api.post('/expenses', data),
};
