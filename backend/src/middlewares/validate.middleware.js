export function validate(schema) {
    return (req, res, next) => {
        // req.body is undefined when no JSON body is sent (e.g. POST /auth/refresh
        // relies on the httpOnly cookie, not a body). Zod z.object() rejects undefined
        // with "expected object, received undefined" — default to {} to allow optional fields.
        const result = schema.safeParse(req.body ?? {});

        if (!result.success) {
            const firstIssue = result.error.issues[0];
            return res.status(400).json({
                success: false,
                error: firstIssue?.message || 'Validation failed',
            });
        }

        req.validated = result.data;
        next();
    };
}
