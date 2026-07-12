import * as maintenanceService from '../services/maintenance.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
    const data = await maintenanceService.create(req.validated);

    res.status(201).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
    const data = await maintenanceService.list(req.queryValidated);

    res.status(200).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
    const data = await maintenanceService.getById(req.paramsValidated.id);

    res.status(200).json({ success: true, data });
});

export const close = asyncHandler(async (req, res) => {
    const data = await maintenanceService.close(req.paramsValidated.id);

    res.status(200).json({ success: true, data });
});
