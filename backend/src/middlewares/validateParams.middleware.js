export function validateParams(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.params);

        if (!result.success) {
            const firstIssue = result.error.issues[0];
            return res.status(400).json({
                success: false,
                error: firstIssue?.message || 'Parameter validation failed',
            });
        }

        req.paramsValidated = result.data;
        next();
    };
}
