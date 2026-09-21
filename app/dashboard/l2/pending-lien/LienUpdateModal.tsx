'use client';

import { useState } from 'react';
import { updateTransactionLien } from '@/app/actions/lien';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Scale, IndianRupee } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Transaction {
  _id: string;
  utrNumber: string;
  bankName: string;
  transactionAmount: number;
  nccrpAckNumber?: string;
  lienAmount?: number;
}

interface Ticket {
  _id: string;
  complaintId: string;
  totalFraudAmount: number;
  transactions: Transaction[];
}

export function LienUpdateModal({ ticket }: { ticket: Ticket }) {
  const [open, setOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [nccrpAckNumber, setNccrpAckNumber] = useState('');
  const [lienAmount, setLienAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const openForTransaction = (txn: Transaction) => {
    setSelectedTxn(txn);
    setNccrpAckNumber(txn.nccrpAckNumber ?? '');
    setLienAmount(txn.lienAmount?.toString() ?? '');
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!selectedTxn || !nccrpAckNumber || !lienAmount) return;
    setIsSubmitting(true);
    try {
      const result = await updateTransactionLien(ticket._id, selectedTxn._id, {
        nccrpAckNumber,
        lienAmount: parseFloat(lienAmount),
      });

      if (result.success) {
        toast({
          title: 'Lien Updated',
          description: `Recovery Rate: ${result.recoveryRate}%`,
        });
        setOpen(false);
        router.refresh();
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      toast({ title: 'Error', description: String(err), variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        onClick={() => openForTransaction(ticket.transactions[0] ?? { _id: '', utrNumber: '', bankName: '', transactionAmount: 0 })}
        className="bg-emerald-800 hover:bg-emerald-700 text-white h-7 text-xs gap-1.5"
      >
        <Scale className="w-3.5 h-3.5" />
        Update Lien
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-cyber-900 border-cyber-700 text-cyber-50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-outfit text-lg text-cyber-100">
              Update Lien — {ticket.complaintId}
            </DialogTitle>
            <DialogDescription className="text-cyber-500">
              Enter NCCRP acknowledgement number and bank lien (frozen) amount
            </DialogDescription>
          </DialogHeader>

          {/* Transaction selector */}
          {ticket.transactions.length > 1 && (
            <div className="space-y-2">
              <Label className="text-xs text-cyber-400">Select Transaction</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {ticket.transactions.map((txn) => (
                  <button
                    key={txn._id}
                    onClick={() => openForTransaction(txn)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-colors ${
                      selectedTxn?._id === txn._id
                        ? 'border-cyber-500 bg-cyber-700/40'
                        : 'border-cyber-800 bg-cyber-900/40 hover:border-cyber-700'
                    }`}
                  >
                    <div className="flex justify-between">
                      <span className="text-cyber-300">{txn.bankName} · {txn.utrNumber}</span>
                      <span className="text-amber-400">₹{txn.transactionAmount.toLocaleString('en-IN')}</span>
                    </div>
                    {txn.nccrpAckNumber && <span className="text-emerald-400 text-[10px]">✓ NCCRP: {txn.nccrpAckNumber}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-cyber-300 text-xs mb-1.5 block">NCCRP ACK Number *</Label>
              <Input
                value={nccrpAckNumber}
                onChange={(e) => setNccrpAckNumber(e.target.value)}
                placeholder="e.g. NCCRP20241203XXXX"
                className="bg-cyber-800/50 border-cyber-700 text-cyber-50 placeholder:text-cyber-600 focus-visible:ring-cyber-400"
              />
            </div>
            <div>
              <Label className="text-cyber-300 text-xs mb-1.5 block">Lien / Blocked Amount (₹) *</Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyber-500" />
                <Input
                  value={lienAmount}
                  onChange={(e) => setLienAmount(e.target.value)}
                  type="number" min="0" step="1"
                  placeholder="0"
                  className="pl-9 bg-cyber-800/50 border-cyber-700 text-cyber-50 placeholder:text-cyber-600 focus-visible:ring-cyber-400"
                />
              </div>
            </div>
          </div>

          {/* Recovery preview */}
          {lienAmount && ticket.totalFraudAmount > 0 && (
            <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-lg p-3 text-sm">
              <span className="text-cyber-400">Estimated Recovery Rate: </span>
              <span className="text-emerald-400 font-bold">
                {Math.min(100, ((parseFloat(lienAmount) / ticket.totalFraudAmount) * 100)).toFixed(1)}%
              </span>
              <span className="text-cyber-500 text-xs ml-2">
                (₹{parseFloat(lienAmount || '0').toLocaleString('en-IN')} of ₹{ticket.totalFraudAmount.toLocaleString('en-IN')})
              </span>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} className="text-cyber-400 hover:text-cyber-200">
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !nccrpAckNumber || !lienAmount}
              className="bg-emerald-700 hover:bg-emerald-600 text-white gap-2"
            >
              {isSubmitting ? 'Saving...' : 'Save Lien Update'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
