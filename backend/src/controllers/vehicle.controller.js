import * as vehicleService from '../services/vehicle.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
    const data = await vehicleService.create(req.validated);

    res.status(201).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
    const data = await vehicleService.list(req.queryValidated);

    res.status(200).json({ success: true, data });
});

export const listAvailable = asyncHandler(async (req, res) => {
    const data = await vehicleService.listAvailable(req.queryValidated);

    res.status(200).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
    const data = await vehicleService.getById(req.paramsValidated.id);

    res.status(200).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
    const data = await vehicleService.update(req.paramsValidated.id, req.validated);

    res.status(200).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
    await vehicleService.remove(req.paramsValidated.id);

    res.status(200).json({ success: true, data: { message: 'Vehicle deleted successfully' } });
});

export const getTotalCost = asyncHandler(async (req, res) => {
    const data = await vehicleService.getTotalCost(req.paramsValidated.id);

    res.status(200).json({ success: true, data });
});
