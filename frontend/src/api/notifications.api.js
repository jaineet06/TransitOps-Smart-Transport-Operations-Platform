import api from './axios';

export const notificationsApi = {
  getNotifications: () => api.get('/notifications'),
  sendLicenseReminders: () => api.post('/notifications/license-reminders/send'),
};
