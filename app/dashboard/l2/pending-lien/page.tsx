import { getPendingLienTickets } from '@/app/actions/lien';
import { PendingLienTable } from './PendingLienTable';

export default async function PendingLienPage() {
  const { tickets, error } = await getPendingLienTickets();

  if (error) return <div className="text-red-400">{error}</div>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <PendingLienTable tickets={tickets as any[]} />;
}