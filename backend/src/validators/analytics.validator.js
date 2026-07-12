import { z } from 'zod';

export const exportCsvQuerySchema = z.object({
    report: z.enum(['fuel-efficiency', 'utilization', 'operational-cost', 'roi'], {
        errorMap: () => ({ message: 'Report must be one of: fuel-efficiency, utilization, operational-cost, roi' }),
    }),
});
