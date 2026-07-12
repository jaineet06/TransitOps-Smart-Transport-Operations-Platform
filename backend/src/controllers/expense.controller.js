import * as expenseService from '../services/expense.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const create = asyncHandler(async (req, res) => {
    const data = await expenseService.create(req.validated);

    res.status(201).json({ success: true, data });
});

export const list = asyncHandler(async (req, res) => {
    const data = await expenseService.list(req.queryValidated);

    res.status(200).json({ success: true, data });
});
