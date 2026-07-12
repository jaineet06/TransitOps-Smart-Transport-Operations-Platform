import * as fuelLogService from '../services/fuelLog.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
    const data = await fuelLogService.create(req.validated);

    res.status(201).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
    const data = await fuelLogService.list(req.queryValidated);

    res.status(200).json({ success: true, data });
});
