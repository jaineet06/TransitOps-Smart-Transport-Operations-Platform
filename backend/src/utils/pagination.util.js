export function parsePagination(query) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    return { page, limit, skip };
}

export function buildPaginationMeta(total, page, limit) {
    return {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 0,
    };
}

export function parseSort(query, allowedFields, defaultField = 'createdAt', defaultOrder = 'desc') {
    const sortBy = allowedFields.includes(query.sortBy) ? query.sortBy : defaultField;
    const sortOrder = query.sortOrder === 'asc' ? 'asc' : defaultOrder === 'asc' ? 'asc' : 'desc';

    return { [sortBy]: sortOrder };
}
