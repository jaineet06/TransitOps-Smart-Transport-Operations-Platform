import * as analyticsService from '../services/analytics.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const getFuelEfficiency = asyncHandler(async (req, res) => {
    const data = await analyticsService.getFuelEfficiency();

    res.status(200).json({ success: true, data });
});

export const getFleetUtilization = asyncHandler(async (req, res) => {
    const data = await analyticsService.getFleetUtilization();

    res.status(200).json({ success: true, data });
});

export const getOperationalCost = asyncHandler(async (req, res) => {
    const data = await analyticsService.getOperationalCost();

    res.status(200).json({ success: true, data });
});

export const getVehicleRoi = asyncHandler(async (req, res) => {
    const data = await analyticsService.getVehicleRoi();

    res.status(200).json({ success: true, data });
});

export const exportCsv = asyncHandler(async (req, res) => {
    const { report } = req.queryValidated;
    const { filename, csv } = await analyticsService.exportCsvReport(report);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
});
