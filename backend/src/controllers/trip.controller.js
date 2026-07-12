import * as tripService from '../services/trip.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
    const data = await tripService.create(req.validated);

    res.status(201).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
    const data = await tripService.list(req.queryValidated);

    res.status(200).json({ success: true, data });
});

export const getById = asyncHandler(async (req, res) => {
    const data = await tripService.getById(req.paramsValidated.id);

    res.status(200).json({ success: true, data });
});

export const dispatch = asyncHandler(async (req, res) => {
    const data = await tripService.dispatch(req.paramsValidated.id);

    res.status(200).json({ success: true, data });
});

export const complete = asyncHandler(async (req, res) => {
    const data = await tripService.complete(req.paramsValidated.id, req.validated);

    res.status(200).json({ success: true, data });
});

export const cancel = asyncHandler(async (req, res) => {
    const data = await tripService.cancel(req.paramsValidated.id);

    res.status(200).json({ success: true, data });
});
