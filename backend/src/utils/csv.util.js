function escapeCsvValue(value) {
    const str = value === null || value === undefined ? '' : String(value);

    if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
    }

    return str;
}

export function buildCsv(rows, columns) {
    const header = columns.map((col) => escapeCsvValue(col.header)).join(',');
    const lines = rows.map((row) =>
        columns.map((col) => escapeCsvValue(typeof col.accessor === 'function' ? col.accessor(row) : row[col.key])).join(',')
    );

    return [header, ...lines].join('\r\n');
}
