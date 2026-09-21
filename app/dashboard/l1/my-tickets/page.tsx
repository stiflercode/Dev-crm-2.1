import { getMyTickets } from '@/app/actions/tickets';
import { MyTicketsTable } from './MyTicketsTable';

export default async function MyTicketsPage() {
  const { tickets, error } = await getMyTickets();

  if (error) {
    return <div className="text-red-400 p-4">{error}</div>;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <MyTicketsTable tickets={tickets as any[]} count={tickets.length} />;
}