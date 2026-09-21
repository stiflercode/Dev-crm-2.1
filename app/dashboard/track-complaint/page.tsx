'use client';

import { useState } from 'react';
import { searchTickets } from '@/app/actions/tickets';
import { DataTable } from '@/components/shared/DataTable';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ColumnDef } from '@tanstack/react-table';
import { Search, RotateCcw, Zap, InboxIcon } from 'lucide-react';
import { Combobox } from '@/components/shared/Combobox';
import { MAHARASHTRA_DISTRICTS } from '@/lib/taxonomy';
import { cn } from '@/lib/utils';

interface TicketRow {
  _id: string;
  complaintId: string;
  status: string;
  isDraft: boolean;
  isGoldenHour: boolean;
  priority?: boolean;
  sensitivity?: boolean;
  victimDetails: { name: string; contactNumber: string; district?: string };
  categoryDetails: { category: string; subCategory: string };
  totalFraudAmount: number;
  createdAt: string;
  registeredBy?: { name: string; extension?: string } | string;
}

const STATUS_OPTIONS = [
  { value: '',                   label: 'All Statuses' },
  { value: 'DRAFT',              label: 'Draft' },
  { value: 'L1_REGISTERED',      label: 'L1 Registered' },
  { value: 'L2_PENDING',         label: 'L2 Pending' },
  { value: 'REGISTERED_IN_NCCRP',label: 'NCCRP Filed' },
  { value: 'LIEN_CONFIRMED',     label: 'Lien Confirmed' },
];

const DISTRICT_OPTIONS = [
  { value: '', label: 'All Districts' },
  ...MAHARASHTRA_DISTRICTS.map((d) => ({ value: d, label: d })),
];

const columns: ColumnDef<TicketRow>[] = [
  {
    accessorKey: 'complaintId',
    header: 'Complaint No.',
    cell: ({ row }) => (
      <span className="font-mono text-xs font-semibold" style={{ color: '#2563EB' }}>
        {row.original.complaintId}
        {row.original.isGoldenHour && <Zap className="inline w-3 h-3 text-red-500 ml-1.5 animate-pulse" />}
        {row.original.priority && (
          <span className="ml-1.5 text-[9px] px-1 rounded font-bold"
            style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', border: '1px solid rgba(239,68,68,0.2)' }}>
            P
          </span>
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
        <p className="text-[10px] mt-0.5 font-mono" style={{ color: 'var(--text-muted)' }}>
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
        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {row.original.categoryDetails.subCategory}
        </p>
      </div>
    ),
  },
  {
    accessorKey: 'victimDetails.district',
    header: 'District',
    cell: ({ row }) => (
      <span className="text-xs" style={{ color: 'var(--text-body)' }}>
        {row.original.victimDetails.district || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'totalFraudAmount',
    header: 'Fraud Amount',
    cell: ({ row }) =>
      row.original.totalFraudAmount > 0 ? (
        <span className="text-xs font-semibold" style={{ color: '#D97706' }}>
          ₹ {row.original.totalFraudAmount.toLocaleString('en-IN')}
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
          day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit',
        })}
      </span>
    ),
  },
  {
    id: 'registeredBy',
    header: 'Agent',
    cell: ({ row }) => {
      const rb = row.original.registeredBy;
      const name = typeof rb === 'object' && rb !== null ? rb.name : (rb ?? '—');
      return <span className="text-xs" style={{ color: 'var(--text-body)' }}>{name as string}</span>;
    },
  },
];

const today = new Date().toISOString().slice(0, 10);

/* ─── Form field components ─── */
function FilterLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </label>
  );
}
function FilterInput({ label, ...props }: React.ComponentProps<'input'> & { label: string }) {
  return (
    <div>
      <FilterLabel>{label}</FilterLabel>
      <input className="crm-input h-9 text-sm" {...props} />
    </div>
  );
}
function FilterCombobox({
  label, options, value, onChange, placeholder, searchPlaceholder,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
}) {
  return (
    <div>
      <FilterLabel>{label}</FilterLabel>
      <Combobox options={options} value={value} onChange={onChange}
        placeholder={placeholder} searchPlaceholder={searchPlaceholder} />
    </div>
  );
}

export default function TrackComplaintPage() {
  const [mobileNumber,    setMobileNumber]    = useState('');
  const [nccrpNumber,     setNccrpNumber]     = useState('');
  const [complaintNumber, setComplaintNumber] = useState('');
  const [district,        setDistrict]        = useState('');
  const [status,          setStatus]          = useState('');
  const [fromDate,        setFromDate]        = useState(today);
  const [toDate,          setToDate]          = useState(today);
  const [tickets,         setTickets]         = useState<TicketRow[]>([]);
  const [isLoading,       setIsLoading]       = useState(false);
  const [searched,        setSearched]        = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const handleSearch = async () => {
    setIsLoading(true); setError(null);
    try {
      const result = await searchTickets({
        mobileNumber, nccrpNumber, complaintNumber, district, status, fromDate, toDate,
      });
      if ('error' in result && result.error) {
        setError(result.error); setTickets([]);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setTickets((result.tickets ?? []) as any[]);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false); setSearched(true);
    }
  };

  const handleReset = () => {
    setMobileNumber(''); setNccrpNumber(''); setComplaintNumber('');
    setDistrict(''); setStatus(''); setFromDate(today); setToDate(today);
    setTickets([]); setSearched(false); setError(null);
  };

  return (
    <div className="w-full animate-fade-in-up space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Track Complaint</h1>
          <p className="page-subtitle">Search complaints using one or more filters below</p>
        </div>
        {searched && !error && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{
              background: tickets.length > 0 ? 'rgba(37,99,235,0.06)' : 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              color: tickets.length > 0 ? '#2563EB' : 'var(--text-muted)',
            }}>
            {tickets.length} complaint{tickets.length !== 1 ? 's' : ''} found
          </div>
        )}
      </div>

      {/* Filters Card */}
      <div className="form-section">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <FilterInput label="Mobile Number" value={mobileNumber}
            onChange={(e) => setMobileNumber(e.target.value)}
            placeholder="Victim mobile number" />
          <FilterInput label="NCCRP Number" value={nccrpNumber}
            onChange={(e) => setNccrpNumber(e.target.value)}
            placeholder="NCCRP acknowledgement no." />
          <FilterInput label="Complaint Number" value={complaintNumber}
            onChange={(e) => setComplaintNumber(e.target.value)}
            placeholder="e.g. MH2026..." />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <FilterCombobox label="District" options={DISTRICT_OPTIONS} value={district}
            onChange={setDistrict} placeholder="All Districts" searchPlaceholder="Search districts..." />
          <FilterCombobox label="Status" options={STATUS_OPTIONS} value={status}
            onChange={setStatus} placeholder="All Statuses" searchPlaceholder="Search statuses..." />
          <FilterInput label="From Date" type="date" value={fromDate}
            onChange={(e) => setFromDate(e.target.value)} />
          <FilterInput label="To Date" type="date" value={toDate}
            onChange={(e) => setToDate(e.target.value)} />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2 border-t" style={{ borderColor: 'var(--border-default)' }}>
          <button onClick={handleSearch} disabled={isLoading}
            className="btn-primary h-9 px-5 text-sm gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Search
          </button>
          <button onClick={handleReset}
            className="flex items-center gap-2 h-9 px-4 text-sm font-medium rounded-lg border transition-colors"
            style={{ borderColor: 'var(--border-default)', color: 'var(--text-body)', background: 'var(--bg-surface)' }}>
            <RotateCcw className="w-4 h-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-3"
          style={{ color: '#DC2626', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
          {error}
        </div>
      )}

      {/* Results */}
      {searched && !error && (
        tickets.length > 0 ? (
          <div className="form-section">
            <DataTable
              columns={columns}
              data={tickets}
              goldenHourKey="isGoldenHour"
              searchKey="complaintId"
              searchPlaceholder="Filter results by complaint ID..."
              pageSize={20}
            />
          </div>
        ) : (
          <div className="form-section py-16 text-center">
            <InboxIcon className="w-10 h-10 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
            <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-secondary)' }}>
              No complaints found
            </p>
            <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
              Try changing your filters
            </p>
            <button onClick={handleReset}
              className="btn-primary h-9 px-5 text-sm mx-auto">
              Clear Filters
            </button>
          </div>
        )
      )}
    </div>
  );
}
