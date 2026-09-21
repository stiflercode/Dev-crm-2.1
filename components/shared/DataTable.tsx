'use client';

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { useState } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  Search, AlertCircle, RotateCcw, InboxIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  searchKey?: string;
  searchPlaceholder?: string;
  pageSize?: number;
  /** Key of a boolean field on TData — when true the row gets the golden hour highlight */
  goldenHourKey?: keyof TData;
  onRowClick?: (row: TData) => void;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

function TableSkeleton({ columns, rows = 5 }: { columns: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <TableRow key={i} style={{ borderColor: 'var(--border-default)' }}>
          {Array.from({ length: columns }).map((_, j) => (
            <TableCell key={j} className="py-3">
              <div
                className="skeleton h-4 rounded"
                style={{ width: `${55 + Math.random() * 35}%` }}
              />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder = 'Search...',
  pageSize = 20,
  goldenHourKey,
  onRowClick,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalSearch, setGlobalSearch] = useState('');

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize } },
  });

  const totalFiltered = table.getFilteredRowModel().rows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  return (
    <div className="flex flex-col gap-3">
      {/* Search Bar */}
      {searchKey && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5"
            style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder={searchPlaceholder}
            value={(table.getColumn(searchKey)?.getFilterValue() as string) ?? ''}
            onChange={(e) => table.getColumn(searchKey)?.setFilterValue(e.target.value)}
            className="crm-input pl-9 h-9 text-sm"
          />
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl overflow-hidden" style={{
        border: '1px solid var(--border-default)',
        boxShadow: '0 1px 4px rgba(15,23,42,0.06)',
      }}>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow
                key={headerGroup.id}
                className="crm-table-header hover:opacity-100"
                style={{ borderColor: 'var(--border-default)' }}
              >
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 px-4 text-[11px] font-semibold uppercase tracking-wider"
                    style={{
                      color: 'var(--text-secondary)',
                      cursor: header.column.getCanSort() ? 'pointer' : 'default',
                    }}
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    <span className="flex items-center gap-1">
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getIsSorted() === 'asc' && (
                        <span className="opacity-60 text-blue-500">↑</span>
                      )}
                      {header.column.getIsSorted() === 'desc' && (
                        <span className="opacity-60 text-blue-500">↓</span>
                      )}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {/* Error state */}
            {error ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-36 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <AlertCircle className="w-7 h-7 text-red-400 opacity-60" />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-body)' }}>
                      Failed to load data
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{error}</p>
                    {onRetry && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={onRetry}
                        className="h-7 text-xs mt-1 gap-1.5"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <RotateCcw className="w-3 h-3" /> Retry
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              <TableSkeleton columns={columns.length} />
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'data-table-row',
                    onRowClick && 'cursor-pointer',
                    goldenHourKey && row.original[goldenHourKey] ? 'sla-breach' : ''
                  )}
                  style={{ borderColor: 'var(--border-default)' }}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className="py-3 px-4 text-sm"
                      style={{ color: 'var(--text-body)' }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              /* Empty state */
              <TableRow>
                <TableCell colSpan={columns.length} className="h-36 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <InboxIcon className="w-8 h-8" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                      {emptyTitle}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {!isLoading && !error && totalFiltered > pageSize && (
        <div className="flex items-center justify-between px-1">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {totalFiltered} record{totalFiltered !== 1 ? 's' : ''}
            {pageCount > 1 && ` · Page ${pageIndex + 1} of ${pageCount}`}
          </p>
          <div className="flex items-center gap-0.5">
            {[
              { icon: <ChevronsLeft className="h-3.5 w-3.5" />, fn: () => table.setPageIndex(0), disabled: !table.getCanPreviousPage() },
              { icon: <ChevronLeft className="h-3.5 w-3.5" />, fn: () => table.previousPage(), disabled: !table.getCanPreviousPage() },
              { icon: <ChevronRight className="h-3.5 w-3.5" />, fn: () => table.nextPage(), disabled: !table.getCanNextPage() },
              { icon: <ChevronsRight className="h-3.5 w-3.5" />, fn: () => table.setPageIndex(table.getPageCount() - 1), disabled: !table.getCanNextPage() },
            ].map((btn, i) => (
              <Button
                key={i}
                variant="ghost"
                size="icon"
                onClick={btn.fn}
                disabled={btn.disabled}
                className="h-7 w-7 disabled:opacity-30"
                style={{ color: 'var(--text-muted)' }}
              >
                {btn.icon}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
