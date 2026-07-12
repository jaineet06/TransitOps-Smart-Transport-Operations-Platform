export function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);

        if (!result.success) {
            const firstIssue = result.error.issues[0];
            return res.status(400).json({
                success: false,
                error: firstIssue?.message || 'Query validation failed',
            });
        }

        req.queryValidated = result.data;
        next();
    };
}
