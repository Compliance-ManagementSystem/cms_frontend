import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Button from './Button';

// ── Column definition ──────────────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  header: string;
  accessor?: keyof T | ((row: T) => React.ReactNode);
  cell?: (row: T) => React.ReactNode;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
}

// ── Table props ────────────────────────────────────────────────────────────────

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    onPageChange: (page: number) => void;
  };
  onRowClick?: (row: T) => void;
  id?: string;
}

// ── Skeleton row ────────────────────────────────────────────────────────────────

const SkeletonRow: React.FC<{ cols: number }> = ({ cols }) => (
  <tr className="border-b border-slate-800">
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-4 py-3">
        <div className="skeleton h-4 rounded" />
      </td>
    ))}
  </tr>
);

// ── Table component ─────────────────────────────────────────────────────────────

function Table<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'No records found.',
  pagination,
  onRowClick,
  id = 'data-table',
}: TableProps<T>) {
  const getCellValue = (row: T, col: Column<T>): React.ReactNode => {
    if (col.cell) return col.cell(row);
    if (col.accessor) {
      if (typeof col.accessor === 'function') return col.accessor(row);
      return row[col.accessor] as React.ReactNode;
    }
    return null;
  };

  const totalPages = pagination
    ? Math.ceil(pagination.total / pagination.limit)
    : 1;

  return (
    <div className="flex flex-col gap-0 rounded-xl border border-slate-200 dark:border-slate-700/60 overflow-hidden bg-white dark:bg-slate-900/50 shadow-sm dark:shadow-none">
      {/* Table wrapper */}
      <div className="overflow-x-auto">
        <table id={id} className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/60">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={[
                    'px-4 py-3 font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider text-xs whitespace-nowrap',
                    col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                    col.width ? `w-[${col.width}]` : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={() => onRowClick?.(row)}
                  className={[
                    'border-b border-slate-100 dark:border-slate-800/60 transition-colors duration-100',
                    onRowClick
                      ? 'cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20',
                  ].join(' ')}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={[
                        'px-4 py-3 text-slate-700 dark:text-slate-300',
                        col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left',
                      ].join(' ')}
                    >
                      {getCellValue(row, col)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-800/30">
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Showing{' '}
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)}
            </span>
            {' – '}
            <span className="font-semibold text-slate-900 dark:text-slate-200">
              {Math.min(pagination.page * pagination.limit, pagination.total)}
            </span>
            {' of '}
            <span className="font-semibold text-slate-900 dark:text-slate-200">{pagination.total}</span>
          </p>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.page === 1}
              aria-label="First page"
            >
              <ChevronsLeft size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={14} />
            </Button>

            <span className="px-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
              {pagination.page} / {totalPages}
            </span>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(pagination.page + 1)}
              disabled={pagination.page === totalPages}
              aria-label="Next page"
            >
              <ChevronRight size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onPageChange(totalPages)}
              disabled={pagination.page === totalPages}
              aria-label="Last page"
            >
              <ChevronsRight size={14} />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Table;
