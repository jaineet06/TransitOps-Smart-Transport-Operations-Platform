import * as dashboardService from '../services/dashboard.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getKpis = asyncHandler(async (req, res) => {
    const data = await dashboardService.getKpis();

    res.status(200).json({ success: true, data });
});
