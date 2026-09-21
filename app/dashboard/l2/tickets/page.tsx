import { getAllTickets } from '@/app/actions/tickets';
import { AllTicketsTable } from './AllTicketsTable';

export default async function AllTicketsPage() {
  const { tickets, error } = await getAllTickets();

  if (error) return <div className="text-red-400">{error}</div>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <AllTicketsTable tickets={tickets as any[]} />;
}