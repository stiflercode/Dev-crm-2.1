'use client';

import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';

export interface TicketRow {
  _id: string;
  complaintId: string;
  status: string;
  victimDetails: { name: string; contactNumber: string };
  categoryDetails: { category: string; subCategory: string };
  totalFraudAmount: number;
  totalLienAmount: number;
  recoveryRate: number;
  isGoldenHour: boolean;
  createdAt: string;
}

const columns: ColumnDef<TicketRow, unknown>[] = [
  {
    accessorKey: 'complaintId',
    header: 'Complaint ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold flex items-center gap-1.5" style={{ color: '#2563EB' }}>
        {row.original.complaintId}
        {row.original.isGoldenHour && (
          <Zap className="w-3 h-3 text-red-500 shrink-0 animate-pulse" />
        )}
      </span>
    ),
  },
  {
    accessorKey: 'victimDetails.name',
    header: 'Victim',
    cell: ({ row }) => (
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-heading)' }}>
          {row.original.victimDetails.name}
        </p>
        <p className="text-[11px] font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {row.original.victimDetails.contactNumber}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'categoryDetails.category',
    header: 'Category',
    cell: ({ row }) => (
      <div>
        <p className="text-xs font-semibold" style={{ color: 'var(--text-body)' }}>
          {row.original.categoryDetails.category}
        </p>
        <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {row.original.categoryDetails.subCategory}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'totalFraudAmount',
    header: 'Fraud Amt',
    cell: ({ row }) =>
      row.original.totalFraudAmount > 0 ? (
        <span className="text-xs font-semibold" style={{ color: '#D97706' }}>
          ₹{row.original.totalFraudAmount.toLocaleString('en-IN')}
        </span>
      ) : (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>—</span>
      ),
  },
  {
    accessorKey: 'recoveryRate',
    header: 'Recovery',
    cell: ({ row }) => {
      const r = row.original.recoveryRate;
      const color = r >= 80 ? '#16A34A' : r >= 40 ? '#D97706' : r > 0 ? '#DC2626' : 'var(--text-muted)';
      return <span className="text-xs font-bold" style={{ color }}>{r > 0 ? `${r}%` : '—'}</span>;
    },
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Filed',
    cell: ({ row }) => (
      <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
        {new Date(row.original.createdAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <Link href={`/dashboard/l2/tickets/${row.original._id}`}
        className="flex items-center gap-1 text-[11px] font-medium transition-colors"
        style={{ color: '#2563EB' }}>
        View <ArrowRight className="w-3 h-3" />
      </Link>
    ),
  },
];

export function AllTicketsTable({ tickets }: { tickets: TicketRow[] }) {
  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Tickets</h1>
          <p className="page-subtitle">{tickets.length} total complaint{tickets.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
      <div className="form-section">
        <DataTable
          columns={columns}
          data={tickets}
          searchKey="complaintId"
          searchPlaceholder="Search complaint ID..."
          goldenHourKey="isGoldenHour"
          emptyTitle="No tickets found"
          emptyDescription="No complaints have been registered yet."
        />
      </div>
    </div>
  );
}