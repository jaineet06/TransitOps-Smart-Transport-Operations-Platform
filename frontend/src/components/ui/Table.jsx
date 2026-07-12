import { cn } from '../../lib/utils';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';
import Skeleton from './Skeleton';

function SortIcon({ column, sortBy, sortOrder }) {
  if (sortBy !== column) return <ChevronsUpDown className="w-3.5 h-3.5 text-ink-subtle" />;
  return sortOrder === 'asc'
    ? <ChevronUp className="w-3.5 h-3.5 text-accent" />
    : <ChevronDown className="w-3.5 h-3.5 text-accent" />;
}

/**
 * columns: Array<{ key, label, sortable?, render?, className?, headerClassName? }>
 * rows: Array<object>
 * sortBy, sortOrder, onSort: for sortable columns
 * loading: shows skeleton rows
 * emptyMessage: shown when rows is empty
 */
export default function Table({
  columns,
  rows,
  sortBy,
  sortOrder,
  onSort,
  loading,
  emptyMessage = 'No records found.',
  skeletonRows = 8,
  className,
}) {
  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    const nextOrder = sortBy === col.key && sortOrder === 'asc' ? 'desc' : 'asc';
    onSort(col.key, nextOrder);
  };

  return (
    <div className={cn('overflow-x-auto', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-base-700">
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={cn(
                  'px-4 py-3 text-left text-xs font-semibold text-ink-muted uppercase tracking-wider whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-ink',
                  col.headerClassName,
                )}
              >
                <span className="inline-flex items-center gap-1.5">
                  {col.label}
                  {col.sortable && (
                    <SortIcon column={col.key} sortBy={sortBy} sortOrder={sortOrder} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, i) => (
              <tr key={i} className="border-b border-base-800">
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    <Skeleton className="h-4 w-full" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-16 text-center text-ink-muted text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={row.id ?? i} className="border-b border-base-800 table-row-hover">
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn('px-4 py-3 text-ink whitespace-nowrap', col.className)}
                  >
                    {col.render ? col.render(row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
