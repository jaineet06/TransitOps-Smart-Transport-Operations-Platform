import { Router } from 'express';
import authRoutes from './auth.routes.js';
import vehicleRoutes from './vehicle.routes.js';
import driverRoutes from './driver.routes.js';
import tripRoutes from './trip.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import fuelLogRoutes from './fuelLog.routes.js';
import expenseRoutes from './expense.routes.js';
import analyticsRoutes from './analytics.routes.js';
import dashboardRoutes from './dashboard.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/drivers', driverRoutes);
router.use('/trips', tripRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/fuel-logs', fuelLogRoutes);
router.use('/expenses', expenseRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
