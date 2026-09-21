'use client';

import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface TicketRow {
  _id: string;
  complaintId: string;
  status: string;
  victimDetails: { name: string; contactNumber: string };
  categoryDetails: { category: string; subCategory: string };
  totalFraudAmount: number;
  isGoldenHour: boolean;
  createdAt: string;
}

const columns: ColumnDef<TicketRow>[] = [
  {
    accessorKey: 'complaintId',
    header: 'Complaint ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold flex items-center gap-1.5" style={{ color: '#2563EB' }}>
        {row.original.complaintId}
        {row.original.isGoldenHour && (
          <Zap className="inline w-3 h-3 text-red-500 ml-0.5 animate-pulse" />
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
        <p className="text-xs font-mono mt-0.5" style={{ color: 'var(--text-muted)' }}>
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
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {row.original.categoryDetails.subCategory}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'totalFraudAmount',
    header: 'Fraud Amount',
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
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Filed At',
    cell: ({ row }) => (
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        {new Date(row.original.createdAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </span>
    ),
  },
];

export function MyTicketsTable({ tickets, count }: { tickets: TicketRow[]; count: number }) {
  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Tickets</h1>
          <p className="page-subtitle">{count} complaint{count !== 1 ? 's' : ''} registered by you</p>
        </div>
        <Link href="/dashboard/l1/new-complaint">
          <Button className="btn-primary h-9 text-sm gap-1.5">
            + New Complaint
          </Button>
        </Link>
      </div>

      <div className="form-section">
        <DataTable
          columns={columns}
          data={tickets}
          searchKey="complaintId"
          searchPlaceholder="Search by complaint ID..."
          goldenHourKey="isGoldenHour"
        />
      </div>
    </div>
  );
}