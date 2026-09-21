'use client';

import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LienUpdateModal } from './LienUpdateModal';
import { ColumnDef } from '@tanstack/react-table';
import { Zap, Scale } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export interface PendingTicketRow {
  _id: string;
  complaintId: string;
  status: string;
  victimDetails: { name: string; contactNumber: string };
  categoryDetails: { category: string };
  totalFraudAmount: number;
  totalLienAmount: number;
  recoveryRate: number;
  isGoldenHour: boolean;
  transactions: Array<{
    _id: string;
    utrNumber: string;
    bankName: string;
    transactionAmount: number;
    nccrpAckNumber?: string;
    lienAmount?: number;
  }>;
  createdAt: string;
}

const columns: ColumnDef<PendingTicketRow, unknown>[] = [
  {
    accessorKey: 'complaintId',
    header: 'Complaint ID',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold flex items-center gap-1.5" style={{ color: '#2563EB' }}>
        {row.original.complaintId}
        {row.original.isGoldenHour && <Zap className="w-3 h-3 text-red-500 animate-pulse" />}
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
    accessorKey: 'totalFraudAmount',
    header: 'Fraud Amt',
    cell: ({ row }) => (
      <span className="text-xs font-semibold" style={{ color: '#D97706' }}>
        ₹{row.original.totalFraudAmount.toLocaleString('en-IN')}
      </span>
    ),
  },
  {
    accessorKey: 'totalLienAmount',
    header: 'Lien Amt',
    cell: ({ row }) =>
      row.original.totalLienAmount > 0 ? (
        <span className="text-xs font-semibold" style={{ color: '#16A34A' }}>
          ₹{row.original.totalLienAmount.toLocaleString('en-IN')}
        </span>
      ) : (
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Pending</span>
      ),
  },
  {
    accessorKey: 'recoveryRate',
    header: 'Recovery %',
    cell: ({ row }) => {
      const rate = row.original.recoveryRate;
      const color = rate >= 80 ? '#16A34A' : rate >= 40 ? '#D97706' : '#DC2626';
      return <span className="text-xs font-bold" style={{ color }}>{rate > 0 ? `${rate}%` : '—'}</span>;
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
      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
        {new Date(row.original.createdAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
        })}
      </span>
    ),
  },
  {
    id: 'actions',
    header: 'Action',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <LienUpdateModal ticket={row.original} />
        <Link href={`/dashboard/l2/tickets/${row.original._id}`}>
          <Button size="sm" variant="ghost" className="h-7 text-xs">
            View
          </Button>
        </Link>
      </div>
    ),
  },
];

export function PendingLienTable({ tickets }: { tickets: PendingTicketRow[] }) {
  return (
    <div className="w-full space-y-6 animate-fade-in-up">
      <div className="page-header">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Scale className="w-5 h-5" style={{ color: '#D97706' }} />
          </div>
          <div>
            <h1 className="page-title">Pending Lien Reconciliation</h1>
            <p className="page-subtitle">{tickets.length} tickets pending NCCRP filing / lien update</p>
          </div>
        </div>
      </div>
      <div className="form-section">
        <DataTable
          columns={columns}
          data={tickets}
          searchKey="complaintId"
          searchPlaceholder="Search complaint ID..."
          goldenHourKey="isGoldenHour"
        />
      </div>
    </div>
  );
}